# Verdyct — Spécification Technique #2
## Data Model Métier + RLS + Pipeline de Parsing + Workers

*Livraison 2 sur 3*
*Mai 2026 · Issa & Julius*

---

## Comment lire ce document

Même format que la livraison 1 : chaque section commence par une explication accessible, puis donne la spec précise (schémas SQL, types TypeScript, algorithmes). Les exemples concrets sont là pour ancrer les idées.

Cette livraison s'appuie sur la livraison 1 (cascade + référentiels publics). Tout ce qui n'est pas explicitement redéfini ici suit les conventions de la livraison 1.

---

## 0. Vue d'ensemble du data model

### Explication

Le data model de Verdyct se structure en six couches, du général au spécifique :

**(1) Tenancy** — qui a accès à quoi. Une `organization` est un broker (entreprise cliente de Verdyct). Plusieurs `users` peuvent appartenir à une organization via `organization_members` avec des rôles différents. Les abonnements Stripe vivent au niveau de l'organization.

**(2) Parties** — toutes les entreprises qui apparaissent dans les dossiers : importateurs, fournisseurs, transporteurs, expéditeurs. Une partie est globale (par SIREN/EORI), mais chaque broker a sa propre relation avec elle (nom personnalisé, notes, contacts, régime habituel) via `partie_relations`. Ça évite de dupliquer les données publiques tout en gardant une isolation stricte des données métier.

**(3) Dossiers** — l'unité centrale du métier. Un dossier représente une opération douanière (généralement un import). Il contient des `dossier_documents` (PDFs, Excel, emails reçus) et des `lignes_dossier` (les marchandises à déclarer, une ligne par item ou par groupe d'items du même code HS).

**(4) Suggestions et décisions** — pour chaque ligne, la cascade produit une ou plusieurs `suggestions` (couche 1, 2, 3). Le broker en valide une, ce qui crée une entrée dans `decision_log`. Cette table est **append-only** et constitue la piste d'audit.

**(5) CBAM** — données spécifiques aux marchandises en scope CBAM (acier, aluminium, ciment, engrais, hydrogène, électricité). Une ligne CBAM a des données d'émissions associées dans `cbam_data`. Au niveau dossier, des rapports trimestriels sont générés dans `cbam_quarterly_reports`.

**(6) Opérations** — adresses email inbound, relances envoyées aux importateurs, notifications utilisateurs, événements de métriques internes.

Toutes les tables métier ont un `organization_id` qui sert à la fois à l'isolation RLS et aux index. Les tables de référence publique (CN8, TARIC, EBTI, notes explicatives) n'ont **pas** d'`organization_id` — elles sont partagées.

### Diagramme relationnel (simplifié)

```
organizations ─┬─ organization_members ── users
               ├─ subscriptions
               ├─ email_inbound_addresses
               ├─ partie_relations ── parties (global)
               │     └─ partie_contacts
               ├─ bureaux_douane_config
               ├─ dossiers ─┬─ dossier_documents
               │            ├─ lignes_dossier ─┬─ suggestions
               │            │                  ├─ decision_log
               │            │                  └─ cbam_data
               │            └─ relances
               ├─ cbam_quarterly_reports
               ├─ notifications
               └─ metric_events
```

---

## 1. Tables de tenancy

### Explication

`organizations` est la racine. Tout ce qui appartient à un broker est lié à une organization. Quand un broker s'inscrit, on crée la row `organization` et on lui attache un `organization_member` avec rôle `owner`.

`users` est la table d'auth (synchronisée avec Supabase Auth). On stocke un `default_organization_id` pour gérer le cas où un user appartient à plusieurs orgs (rare au début, mais on prépare).

`organization_members` est la jointure many-to-many avec un `role`. Pour MVP : `owner` (l'inscrit) et `member` (employé invité). Phase 3 ajoutera `admin` et des permissions plus fines.

`subscriptions` est la projection locale de l'abonnement Stripe (synchronisée par webhook). On l'a en local pour pouvoir gate des features sans appeler Stripe à chaque request.

### Spec

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  siren VARCHAR(9) UNIQUE,                 -- vérifié à l'inscription
  eori VARCHAR(17),                        -- numéro EORI du broker
  bureau_douane_principal VARCHAR(8),      -- code bureau de douane principal (FR…)
  inbound_email_slug VARCHAR(32) NOT NULL UNIQUE,  -- ex 'broker-7f2a' → dossiers+broker-7f2a@in.verdyct.io
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX organizations_siren ON organizations(siren) WHERE deleted_at IS NULL;
CREATE INDEX organizations_inbound_slug ON organizations(inbound_email_slug);

CREATE TABLE users (
  id UUID PRIMARY KEY,                     -- = auth.users.id (Supabase Auth)
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  default_organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX org_members_user ON organization_members(user_id);

CREATE TYPE subscription_plan AS ENUM ('starter', 'pro', 'team');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_org ON subscriptions(organization_id);
CREATE INDEX subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

**JWT custom claim** : à l'authentification, Supabase injecte `organization_id` dans le JWT via un auth hook qui lit `default_organization_id` du user. Ce claim est utilisé par toutes les RLS policies.

---

## 2. Tables des parties (importateurs, fournisseurs, etc.)

### Explication

Une partie est une entreprise. Renault est une partie. Un même Renault peut être client de plusieurs brokers — donc on ne duplique pas. La row `parties` contient uniquement les données publiques de registre (SIREN, EORI, raison sociale, adresse, code NAF) — celles-là, pas de souci à les partager.

Chaque broker a une relation propre avec la partie via `partie_relations` : alias personnalisé ("Renault SAS Boulogne" devient "Renault BB" pour ce broker), régime douanier habituel pour ce client, notes internes, type de relation (importateur / fournisseur / transporteur / expéditeur).

Les contacts (emails et téléphones de personnes chez la partie) vivent dans `partie_contacts`, scopés au broker — parce que les emails de Marc chez Renault ne devraient pas être visibles d'un autre broker.

Les BTI déposés par le broker pour cette partie vivent dans `bti_records` (à ne pas confondre avec la table publique `ebti_cases` qui contient les BTI de toute l'UE).

### Spec

```sql
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siren VARCHAR(9),
  eori VARCHAR(17),
  raison_sociale TEXT NOT NULL,
  forme_juridique VARCHAR(64),             -- 'SAS', 'SARL', 'GmbH', etc.
  pays CHAR(2) NOT NULL,                   -- ISO 3166-1
  adresse TEXT,
  code_postal VARCHAR(16),
  ville TEXT,
  code_naf VARCHAR(8),
  enriched_via TEXT,                       -- 'pappers', 'insee', 'manual', 'eori_eu'
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (siren, pays),
  UNIQUE NULLS NOT DISTINCT (eori)
);

CREATE INDEX parties_siren ON parties(siren) WHERE siren IS NOT NULL;
CREATE INDEX parties_eori ON parties(eori) WHERE eori IS NOT NULL;
CREATE INDEX parties_raison_sociale_trgm ON parties USING gin (raison_sociale gin_trgm_ops);

CREATE TYPE partie_relation_type AS ENUM ('importateur', 'fournisseur', 'transporteur', 'expediteur', 'autre');

CREATE TABLE partie_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partie_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  type partie_relation_type NOT NULL,
  alias TEXT,                              -- nom interne du broker pour cette partie
  regime_douanier_habituel VARCHAR(4),     -- ex '40', '42'
  origine_preferentielle_attendue CHAR(2), -- ISO du pays d'origine habituel
  notes TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  dossier_count INT NOT NULL DEFAULT 0,    -- maintenu via trigger
  archived_at TIMESTAMPTZ,
  UNIQUE (organization_id, partie_id, type)
);

CREATE INDEX partie_rel_org ON partie_relations(organization_id) WHERE archived_at IS NULL;
CREATE INDEX partie_rel_partie ON partie_relations(partie_id);

CREATE TABLE partie_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partie_relation_id UUID NOT NULL REFERENCES partie_relations(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT,                               -- 'logistique', 'achats', 'compta', 'douane'
  email TEXT,
  phone TEXT,
  is_default_for_relances BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partie_contacts_relation ON partie_contacts(partie_relation_id);
CREATE INDEX partie_contacts_default ON partie_contacts(partie_relation_id) WHERE is_default_for_relances;

CREATE TABLE bti_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partie_relation_id UUID REFERENCES partie_relations(id),
  bti_reference TEXT NOT NULL,             -- ex 'FRBTI-2024-12345'
  hs_code VARCHAR(10) NOT NULL,
  product_description TEXT NOT NULL,
  emitted_by_country CHAR(2) NOT NULL,
  emitted_at DATE NOT NULL,
  valid_until DATE NOT NULL,
  pdf_storage_path TEXT,                   -- lien vers Supabase Storage
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bti_records_org ON bti_records(organization_id);
CREATE INDEX bti_records_hs ON bti_records(organization_id, hs_code);
```

### Exemple

Renault est dans `parties` avec son SIREN 441295176, sa raison sociale et son code NAF (3110Z). Le broker A a une `partie_relation` (type 'importateur', alias 'Renault BB', régime habituel '40') et 2 contacts (`logistique@renault.com` et `import-douane@renault.com` marqué `is_default_for_relances`). Si le broker B a aussi Renault comme client, il a sa propre `partie_relation` avec ses propres alias, contacts et notes — mais ils partagent la même row `parties`.

---

## 3. Tables des dossiers

### Explication

`dossiers` est l'unité centrale. Un dossier représente une opération douanière, généralement un import définitif (régime 40), parfois un transit, un entrepôt, etc. Il a un statut (`brouillon`, `en_attente_info`, `pret_a_valider`, `valide`, `envoye`, `accepte`, `refuse`).

`dossier_documents` contient les fichiers attachés au dossier (les PDFs reçus de l'importateur, les Excel, les emails, mais aussi les fichiers générés par Verdyct comme la déclaration XML finale). On stocke leur chemin Supabase Storage et le résultat du parsing.

`lignes_dossier` contient les lignes marchandises. Une ligne = une marchandise (ou un groupe de marchandises identiques). Une ligne a des champs métier (description, quantité, valeur, code HS, régime, origine) qui sont remplis progressivement : d'abord par le parser initial qui extrait des PDFs, puis par la cascade qui suggère, puis par le broker qui valide.

`suggestions` contient une ligne par tour de cascade (donc potentiellement plusieurs par ligne_dossier — historique des suggestions, pas seulement la dernière). Quand le broker valide une suggestion, on crée une entrée dans `decision_log`.

`decision_log` est append-only. Chaque modification d'un champ métier d'une ligne (validation initiale ou correction ultérieure) y est tracée. C'est ce qui permet l'export PDF de piste d'audit en cas de contrôle douanier.

### Spec

```sql
CREATE TYPE dossier_source AS ENUM ('email_forward', 'upload', 'manual', 'api');
CREATE TYPE dossier_status AS ENUM (
  'brouillon',                -- créé, parsing en cours
  'en_attente_info',          -- attente de réponse importateur
  'pret_a_valider',           -- toutes lignes ont des suggestions, attend broker
  'valide',                   -- broker a tout validé
  'envoye',                   -- déclaration générée et exportée
  'accepte',                  -- accepté par les douanes
  'refuse',                   -- refusé par les douanes
  'archive'
);

CREATE TABLE dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reference_interne VARCHAR(64) NOT NULL,  -- ex 'D-2026-00142', généré côté serveur
  source dossier_source NOT NULL,
  source_metadata JSONB,                   -- { from_email, message_id } pour email
  status dossier_status NOT NULL DEFAULT 'brouillon',

  -- parties
  importateur_relation_id UUID REFERENCES partie_relations(id),
  fournisseur_relation_id UUID REFERENCES partie_relations(id),
  expediteur_relation_id UUID REFERENCES partie_relations(id),

  -- dossier-level fields
  date_operation DATE,
  bureau_douane_code VARCHAR(8),
  incoterm VARCHAR(3),                     -- 'FOB', 'CIF', 'DAP', etc.
  lieu_incoterm TEXT,
  devise CHAR(3),
  valeur_totale_facturee NUMERIC(14, 2),
  valeur_totale_en_douane NUMERIC(14, 2),  -- calculée

  -- declaration output
  declaration_xml_storage_path TEXT,
  declaration_xml_format VARCHAR(16),      -- 'delta-g', 'edi', etc.
  declaration_generated_at TIMESTAMPTZ,
  delta_reference TEXT,                    -- réf de soumission DELTA si applicable

  -- meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id),
  archived_at TIMESTAMPTZ,
  UNIQUE (organization_id, reference_interne)
);

CREATE INDEX dossiers_org_status ON dossiers(organization_id, status) WHERE archived_at IS NULL;
CREATE INDEX dossiers_importateur ON dossiers(importateur_relation_id);
CREATE INDEX dossiers_created ON dossiers(organization_id, created_at DESC);

CREATE TYPE document_type AS ENUM (
  'facture', 'bl', 'cmr', 'packing_list', 'eur1', 'rex', 'co_origine_non_pref',
  'lcv', 'awb', 'connaissement', 'email_body', 'email_attachment_other',
  'declaration_xml', 'autre'
);

CREATE TABLE dossier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  document_type document_type NOT NULL DEFAULT 'autre',
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,              -- Supabase Storage path
  mime_type TEXT,
  size_bytes BIGINT,
  parsed_at TIMESTAMPTZ,
  parsed_text TEXT,                        -- texte brut extrait
  parsed_structured JSONB,                 -- données structurées extraites par LLM
  parse_error TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES users(id)
);

CREATE INDEX dossier_docs_dossier ON dossier_documents(dossier_id);

CREATE TYPE ligne_status AS ENUM (
  'extracted',                -- extraite des docs, pas encore passée dans la cascade
  'cascade_running',          -- cascade en cours
  'suggestion_ready',         -- suggestion prête, attend broker
  'awaiting_clarification',   -- l'agent IA a demandé une info
  'awaiting_importer',        -- relance envoyée à l'importateur
  'validated',                -- broker a validé
  'flagged'                   -- problème détecté (incohérence, anti-dumping, etc.)
);

CREATE TABLE lignes_dossier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  numero_ligne SMALLINT NOT NULL,          -- ordre dans le dossier
  status ligne_status NOT NULL DEFAULT 'extracted',

  -- description
  description_produit TEXT NOT NULL,
  description_normalisee TEXT,             -- générée à la validation
  description_normalisee_hash CHAR(64),    -- sha256 de la description normalisée
  marque TEXT,
  reference_fabricant TEXT,
  embedding VECTOR(1024),                  -- généré à la validation

  -- quantité & valeur
  quantite NUMERIC(14, 4),
  unite_quantite VARCHAR(16),              -- 'kg', 'p/st', 'l', etc.
  poids_brut_kg NUMERIC(14, 4),
  poids_net_kg NUMERIC(14, 4),
  valeur_unitaire NUMERIC(14, 4),
  devise CHAR(3),
  valeur_totale NUMERIC(14, 2),

  -- classification (rempli au fil de la cascade et de la validation)
  hs_code VARCHAR(10),
  regime VARCHAR(4),
  pays_origine CHAR(2),
  pays_origine_non_preferentielle CHAR(2),
  origine_preferentielle_revendiquee BOOLEAN,
  preuve_origine_type VARCHAR(16),         -- 'eur1', 'rex', 'invoice_declaration', etc.

  -- meta
  flags JSONB DEFAULT '[]'::jsonb,         -- tableau d'alertes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX lignes_dossier ON lignes_dossier(dossier_id, numero_ligne);
CREATE INDEX lignes_status ON lignes_dossier(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX lignes_hash ON lignes_dossier(organization_id, description_normalisee_hash) WHERE validated_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX lignes_embedding_hnsw ON lignes_dossier USING hnsw (embedding vector_cosine_ops);
CREATE INDEX lignes_hs_code ON lignes_dossier(organization_id, hs_code) WHERE validated_at IS NOT NULL;

CREATE TYPE suggestion_layer AS ENUM ('1', '2', '3');

CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ligne_id UUID NOT NULL REFERENCES lignes_dossier(id) ON DELETE CASCADE,
  layer suggestion_layer NOT NULL,
  rank SMALLINT NOT NULL DEFAULT 1,        -- 1 = top suggestion, 2-N = alternatives

  hs_code VARCHAR(10),
  regime VARCHAR(4),
  pays_origine CHAR(2),
  confidence NUMERIC(4, 3) NOT NULL,       -- 0.000 to 1.000
  source JSONB NOT NULL,                   -- voir Layer1Result/2/3 de la livraison 1

  presented_at TIMESTAMPTZ,
  was_accepted BOOLEAN,                    -- null si pas encore traité
  accepted_at TIMESTAMPTZ,
  edited_before_accept JSONB,              -- diff entre suggestion et version validée

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX suggestions_ligne ON suggestions(ligne_id);

CREATE TYPE decision_actor AS ENUM ('user', 'system', 'agent_ia', 'cascade_l1', 'cascade_l2');

CREATE TABLE decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  ligne_id UUID REFERENCES lignes_dossier(id) ON DELETE CASCADE,

  actor decision_actor NOT NULL,
  user_id UUID REFERENCES users(id),       -- null si actor != 'user'
  field_name TEXT NOT NULL,                -- 'hs_code', 'regime', 'origine', 'valeur', etc.
  old_value TEXT,
  new_value TEXT,
  source JSONB,                            -- même format que suggestions.source si applicable
  reasoning TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX decision_log_dossier ON decision_log(dossier_id, occurred_at);
CREATE INDEX decision_log_ligne ON decision_log(ligne_id, occurred_at);

-- Append-only enforcement (database-level)
REVOKE UPDATE, DELETE ON decision_log FROM PUBLIC;
-- Inserts only via service role or specific server actions
```

### Exemple

Le dossier `D-2026-00142` est créé via `email_forward` (un email reçu de Renault contient 2 PDFs). Status initial : `brouillon`. Après parsing, on a :
- 2 entrées dans `dossier_documents` (la facture en PDF + le BL en PDF)
- 3 entrées dans `lignes_dossier` (3 produits différents sur la facture), status `extracted`
- Le worker `cascade.process_line` tourne sur chaque ligne
- Pour la ligne 1 : Layer 1 trouve un match exact (47 dossiers passés), confidence 0.95 → 1 row dans `suggestions` (layer 1, rank 1)
- Pour la ligne 2 : Layer 1 ne trouve rien, Layer 2 trouve un BTI similaire à 0.91, confidence 0.84 → 1 row dans `suggestions` (layer 2, rank 1) + 2 alternatives (rank 2 et 3)
- Pour la ligne 3 : Layer 3 demande une clarification au broker → status `awaiting_clarification`, 1 row dans `suggestions` (layer 3) avec source.pending_question

Quand le broker valide la ligne 1, on crée une entrée dans `decision_log` avec `actor='user'`, `field_name='hs_code'`, `old_value=null`, `new_value='7318.15.95'`, source pointant vers la suggestion. Le `validated_at` et `validated_by` de la ligne sont remplis. L'embedding et le `description_normalisee_hash` sont calculés. La suggestion est marquée `was_accepted=true`.

---

## 4. Tables CBAM

### Explication

CBAM (Mécanisme d'Ajustement Carbone aux Frontières) impose aux importateurs de produits carbo-intensifs (acier, alu, ciment, engrais, hydrogène, électricité) de déclarer trimestriellement les émissions associées et d'acheter des certificats CBAM. Concrètement :

- Pour chaque ligne CBAM dans un dossier, on doit collecter les **données d'émissions** auprès du fournisseur (kg CO2 par tonne de produit, ventilées par type d'émission directe/indirecte).
- Si le fournisseur ne fournit pas, on utilise des **valeurs par défaut** publiées par la Commission, plus pénalisantes.
- À la fin de chaque trimestre, on génère un **rapport trimestriel** au format XML du Registre Transitoire CBAM, que le broker (ou l'importateur) soumet à la Commission.

`cbam_data` stocke les données par ligne. `cbam_quarterly_reports` stocke l'agrégation trimestrielle.

### Spec

```sql
CREATE TYPE cbam_emissions_source AS ENUM ('declared_by_supplier', 'calculated', 'default_values');

CREATE TABLE cbam_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ligne_id UUID NOT NULL REFERENCES lignes_dossier(id) ON DELETE CASCADE,

  -- emissions
  emissions_directes_kg_co2_per_t NUMERIC(14, 4),
  emissions_indirectes_kg_co2_per_t NUMERIC(14, 4),
  emissions_total_kg_co2 NUMERIC(14, 2),    -- calculé : (directes + indirectes) * tonnage
  emissions_source cbam_emissions_source NOT NULL DEFAULT 'default_values',
  emissions_methodology TEXT,               -- description de la méthode si calculated

  -- supplier info (peut différer du fournisseur principal du dossier)
  installation_name TEXT,
  installation_country CHAR(2),
  installation_address TEXT,

  -- data collection
  collected_at TIMESTAMPTZ,
  collected_via VARCHAR(32),                -- 'email_relance', 'manual', 'auto_default'
  data_status VARCHAR(32) DEFAULT 'missing', -- 'missing', 'collected', 'validated'
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cbam_data_ligne ON cbam_data(ligne_id);
CREATE INDEX cbam_data_status ON cbam_data(organization_id, data_status);

CREATE TYPE cbam_report_status AS ENUM ('draft', 'finalized', 'submitted', 'amended');

CREATE TABLE cbam_quarterly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  importateur_relation_id UUID NOT NULL REFERENCES partie_relations(id),
  year SMALLINT NOT NULL,
  quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),

  status cbam_report_status NOT NULL DEFAULT 'draft',
  total_emissions_kg_co2 NUMERIC(14, 2),
  lignes_count INT,
  missing_data_count INT,                  -- combien de lignes encore en data_status='missing'

  xml_storage_path TEXT,
  generated_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submission_reference TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, importateur_relation_id, year, quarter)
);

CREATE INDEX cbam_reports_org ON cbam_quarterly_reports(organization_id, year DESC, quarter DESC);
```

**Helper function** `is_cbam_scope(hs_code)` : table de correspondance des codes en scope CBAM (acier 7203-7229 sauf exceptions, aluminium 7601-7616, ciment 2523, engrais 2808+2814+3102+3105 partiel, hydrogène 2804.10, électricité 2716). À implémenter comme fonction SQL `IMMUTABLE` pour pouvoir l'utiliser dans des index partiels et des CHECK constraints. La table de mapping vit en `cbam_scope_codes` avec date de validité (le scope s'élargit en 2028 aux voitures, machines).

---

## 5. Tables d'opérations

### Explication

Cette section regroupe les tables qui ne sont pas du domaine métier strict mais qui sont nécessaires au fonctionnement quotidien de l'app : adresses email d'inbound, relances envoyées aux importateurs, notifications utilisateur, métriques internes.

### Spec

```sql
CREATE TABLE email_inbound_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug VARCHAR(48) NOT NULL UNIQUE,         -- la partie locale, ex 'broker-7f2a-imports'
  partie_relation_id UUID REFERENCES partie_relations(id),  -- null = générique broker, sinon dédié à un client
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX email_inbound_org ON email_inbound_addresses(organization_id) WHERE is_active;

CREATE TYPE relance_status AS ENUM ('draft', 'sent', 'opened', 'replied', 'bounced', 'expired');

CREATE TABLE relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  ligne_id UUID REFERENCES lignes_dossier(id),
  partie_relation_id UUID NOT NULL REFERENCES partie_relations(id),
  contact_id UUID REFERENCES partie_contacts(id),

  status relance_status NOT NULL DEFAULT 'draft',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  to_email TEXT NOT NULL,
  cc_emails TEXT[],
  question_summary TEXT,                    -- ce qu'on demande
  missing_info_fields TEXT[],               -- ['composition_matiere', 'origine']

  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_message_id TEXT,
  reply_parsed_response JSONB,

  resend_message_id TEXT,                   -- ID Resend pour tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX relances_dossier ON relances(dossier_id);
CREATE INDEX relances_status ON relances(organization_id, status);
CREATE INDEX relances_resend_msg ON relances(resend_message_id);

CREATE TYPE notification_kind AS ENUM (
  'dossier_ready_to_validate',
  'importer_replied',
  'cascade_needs_clarification',
  'cbam_quarter_deadline',
  'subscription_payment_failed',
  'system'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  related_dossier_id UUID REFERENCES dossiers(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE metric_events (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,                 -- 'dossier.created', 'cascade.completed', 'broker.signed_up', etc.
  properties JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX metric_events_type_time ON metric_events(event_type, occurred_at);
```

---

## 6. RLS policies

### Explication

Le principe de RLS (Row Level Security) Postgres est simple : pour chaque ligne d'une table, Postgres vérifie si l'utilisateur courant a le droit de la lire/modifier. On définit ce droit via une `policy` qui est essentiellement un `WHERE` automatique appliqué à chaque query.

Pour Verdyct, la règle universelle est : **un user ne voit que les rows de son organization**. On lit l'`organization_id` de l'utilisateur depuis le JWT, et on compare à la colonne `organization_id` de chaque table.

Trois exceptions :
1. Les tables de référence publique (CN8, TARIC, EBTI, notes explicatives) — pas de RLS, lecture libre, aucune écriture client.
2. Le service role (utilisé par les workers Inngest) — bypass RLS pour pouvoir écrire/lire transversalement.
3. Les admins Anthropic Verdyct (Issa, Julius) — table séparée `admin_users`, accès via service role + check applicatif.

### Spec

**JWT custom claim setup (Supabase Auth Hook)** :

```sql
CREATE OR REPLACE FUNCTION public.add_organization_to_jwt(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  org_id uuid;
BEGIN
  user_id := (event->>'user_id')::uuid;
  claims := event->'claims';

  SELECT default_organization_id INTO org_id
  FROM public.users
  WHERE id = user_id;

  IF org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{organization_id}', to_jsonb(org_id::text));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Enable in Supabase Dashboard → Authentication → Hooks → Custom Access Token
```

**Helper function** :

```sql
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb->>'organization_id', '')::uuid;
$$;
```

**Policies (pattern unique pour toutes les tables métier)** :

```sql
-- Activer RLS sur toutes les tables avec organization_id
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_dossier ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE partie_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partie_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bti_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbam_quarterly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_inbound_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureaux_douane_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy générique : SELECT only same-org
CREATE POLICY "select_same_org" ON dossiers
  FOR SELECT USING (organization_id = public.current_org_id());

CREATE POLICY "insert_same_org" ON dossiers
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "update_same_org" ON dossiers
  FOR UPDATE USING (organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

-- Pas de DELETE policy : les deletes passent par soft-delete (deleted_at)
-- ou via service role (workers Inngest, admin tools)
```

**Pattern à appliquer à TOUTES les tables avec `organization_id`** :
- `SELECT` : `using (organization_id = public.current_org_id())`
- `INSERT` : `with check (organization_id = public.current_org_id())`
- `UPDATE` : `using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id())`
- Pas de `DELETE` policy → soft-delete obligatoire en prod

**Cas spéciaux** :

`organizations` : un user ne voit que son org.
```sql
CREATE POLICY "select_own_org" ON organizations
  FOR SELECT USING (id = public.current_org_id());
```

`organization_members` : un user voit les autres membres de son org.
```sql
CREATE POLICY "select_org_members" ON organization_members
  FOR SELECT USING (organization_id = public.current_org_id());
```

`users` : un user voit son propre profil et les profils des autres membres de son org.
```sql
CREATE POLICY "select_self_or_org_member" ON users
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (SELECT user_id FROM organization_members WHERE organization_id = public.current_org_id())
  );
```

`parties` : pas de RLS — données publiques (registre).
```sql
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON parties TO authenticated;
```

`decision_log` : SELECT same-org seulement, INSERT via service role uniquement (les workers et server actions cleanly authentifiés écrivent dedans), pas d'UPDATE ni DELETE.
```sql
CREATE POLICY "select_same_org" ON decision_log
  FOR SELECT USING (organization_id = public.current_org_id());

REVOKE INSERT, UPDATE, DELETE ON decision_log FROM authenticated;
GRANT INSERT ON decision_log TO service_role;
```

---

## 7. Pipeline de parsing initial

### Explication

Quand un dossier est créé (par n'importe quel canal), il faut transformer les inputs bruts (PDFs, Excel, email body) en données structurées exploitables par la cascade : la liste des `dossier_documents`, les champs dossier (incoterm, date, parties), et la liste des `lignes_dossier`.

Le pipeline est un enchaînement de workers Inngest, chacun traitant un aspect. Chaque étape déclenche la suivante via un événement, ce qui permet de la réessayer indépendamment en cas d'échec.

```
[création dossier]
     │
     ▼
[parse_documents]  ──── extraction texte brut + classification type doc
     │
     ▼
[extract_structured_data]  ──── LLM Mistral Small : champs dossier + lignes
     │
     ▼
[coherence_check_documents]  ──── LLM léger : incohérences inter-docs
     │
     ▼
[per ligne: cascade.process_line]  ──── livraison 1
     │
     ▼
[cross_line_coherence]  ──── rule-based, post-cascade
     │
     ▼
[dossier prêt à valider]
```

Chaque étape persiste son output. Le dashboard côté broker affiche en temps réel l'avancement via subscription Supabase Realtime.

### Spec

Voir le catalogue complet des workers en section 9. Ici, juste la séquence d'événements :

**Événements émis et workers déclenchés** :
| Événement | Trigger Inngest | Worker(s) |
|-----------|-----------------|-----------|
| `dossier.created` | manuel/upload/email | `parse_documents` |
| `dossier.documents_parsed` | fin parse_documents | `extract_structured_data` |
| `dossier.structured` | fin extract_structured_data | `coherence_check_documents` (parallèle) + déclenche cascade par ligne |
| `dossier.lines_extracted` | quand toutes les lignes sont créées | fan-out `cascade.process_line` (1 par ligne) |
| `cascade.line_processed` | fin de cascade pour une ligne | check si toutes lignes ok → trigger `cross_line_coherence` |
| `dossier.coherence_checked` | fin cross_line_coherence | update status `pret_a_valider`, notification user |

---

## 8. Catalogue des workers Inngest

### Explication

Tous les jobs longs ou asynchrones passent par Inngest. Chaque worker est défini dans `workers/{name}/index.ts`, est idempotent, gère ses retries, et logge un `metric_event` à chaque étape clé.

Les workers sont regroupés par domaine.

### Spec

#### 8.1 — Domaine : ingestion email

**`parse_inbound_email`**
- Trigger : webhook Resend Inbound (POST `/api/webhooks/resend/inbound`)
- Input : payload Resend (from, to, subject, body, attachments)
- Logique :
  1. Extraire le slug de l'adresse de destination (`dossiers+broker-7f2a@in.verdyct.io` → `broker-7f2a`)
  2. Lookup `email_inbound_addresses` → récupérer `organization_id`
  3. Identifier l'expéditeur : check si email de l'expéditeur match un `partie_contact` connu
  4. Créer `dossier` avec `source='email_forward'` et metadata
  5. Sauvegarder body et chaque attachment dans Supabase Storage + créer `dossier_documents`
  6. Émettre `dossier.created`
- Idempotence : key = Resend `message_id` (pas de double-création si webhook re-fired)

#### 8.2 — Domaine : parsing

**`parse_documents`**
- Trigger : événement `dossier.created`
- Input : `{ dossier_id }`
- Logique : pour chaque `dossier_document` du dossier :
  1. Si PDF : OCR + extraction texte via `pdfplumber` + fallback Tesseract si scan
  2. Si Excel : extraction via `xlsx` library
  3. Si image : OCR via Tesseract
  4. Si email body : déjà du texte, juste nettoyage HTML
  5. Stocker dans `dossier_documents.parsed_text`
  6. Classer le type de document via heuristiques (regex sur mots-clés "facture", "invoice", "bill of lading"...) puis fallback LLM Small si ambigu
- Émet : `dossier.documents_parsed`
- Idempotence : key = `dossier_id` + hash des fichiers

**`extract_structured_data`**
- Trigger : événement `dossier.documents_parsed`
- Modèle : Mistral Small 3
- Input : `{ dossier_id }`, charge tous les `dossier_documents.parsed_text` du dossier
- Logique : prompt structuré qui extrait :
  - Champs dossier : importateur (raison sociale, SIREN si présent), fournisseur, expéditeur, incoterm, lieu, date, devise, valeur totale facture
  - Liste de lignes : description produit, quantité, unité, valeur unitaire, valeur totale, marque, référence, pays origine déclarée
- Output : JSON structuré, validé par schéma
- Side effects :
  - `parties` (insert si nouveaux SIREN/EORI) + `partie_relations` créées au besoin
  - Trigger workflow `enrich_partie_pappers` pour les nouvelles parties FR sans données
  - `lignes_dossier` créées avec status `extracted`
- Émet : `dossier.structured` puis `dossier.lines_extracted`

**`coherence_check_documents`**
- Trigger : événement `dossier.structured` (parallèle à la cascade par ligne)
- Modèle : Mistral Small 3
- Logique : prompt qui compare les champs cohérents entre docs (poids facture vs BL, valeur facture vs BL, origine déclarée CO vs facture, etc.) et retourne JSON typé `DocCoherenceResult` (livraison 1 section 5)
- Side effects : flags ajoutés à `dossiers.flags` ou aux lignes concernées ; `medium`/`high` bloquent la génération de déclaration

#### 8.3 — Domaine : cascade

(spec complète en livraison 1, sections 1-5)

**`cascade.process_line`**, **`cross_line_coherence`**

#### 8.4 — Domaine : enrichissement parties

**`enrich_partie_pappers`**
- Trigger : événement `partie.needs_enrichment` (émis par extract_structured_data ou par création manuelle)
- Input : `{ partie_id, siren }`
- Logique : appel API Pappers, normalisation, UPDATE de la row `parties`
- Idempotence : ne re-enrichit pas si `enriched_at` < 30 jours

**`enrich_partie_eori`**
- Trigger : si EORI fourni mais pas vérifié
- Logique : appel à la base EORI publique européenne, validation existence, UPDATE de la row

#### 8.5 — Domaine : génération déclaration

**`generate_declaration_xml`**
- Trigger : Server Action `generateDeclaration(dossier_id)` après validation broker
- Input : `{ dossier_id }`
- Logique :
  1. Vérifier que toutes les lignes sont `validated` et qu'aucun flag bloquant
  2. Construire le XML format DELTA-G selon spec officielle DGDDI
  3. Stocker dans Supabase Storage
  4. Update `dossiers.declaration_xml_storage_path` et `declaration_generated_at`
- Output : `{ download_url }` retourné via Server Action

#### 8.6 — Domaine : relances importateur

**`relance_send`**
- Trigger : Server Action `sendRelanceImporter`
- Input : `{ relance_id }`
- Logique : envoi via Resend, stockage du `resend_message_id`, update status `sent`

**`relance_parse_response`**
- Trigger : webhook Resend Inbound, mais le message_id de la réponse correspond à un `In-Reply-To` connu
- Logique :
  1. Match au `relances.resend_message_id` original via threading
  2. Parser la réponse (texte + PJ éventuelles avec extract_structured_data réutilisé)
  3. Update `relances.reply_parsed_response`
  4. Si la réponse comble les `missing_info_fields`, update les `lignes_dossier` concernées et reprogrammer la cascade
  5. Si nouvelles PJ : les attacher au `dossier_documents` du dossier et relancer parsing

#### 8.7 — Domaine : CBAM

**`cbam_quarterly_collect`**
- Trigger : cron, 1er du mois suivant chaque trimestre (1er avril, 1er juillet, etc.)
- Logique : pour chaque `partie_relations` (importateur) ayant des lignes CBAM dans le trimestre :
  1. Identifier les lignes en `cbam_data.data_status = 'missing'`
  2. Générer une relance globale au fournisseur(s) avec template officiel CBAM
  3. Créer un draft `cbam_quarterly_reports` en `draft`

**`cbam_quarterly_generate`**
- Trigger : Server Action ou cron 14e jour du mois suivant trimestre
- Logique : si toutes les données collectées (ou défaut appliqué), générer XML Registre Transitoire CBAM, stocker, marquer `finalized`

#### 8.8 — Domaine : Stripe

**`stripe_webhook_handler`** — pas un worker Inngest mais un route handler `/api/webhooks/stripe`. Détaillé en livraison 3.

#### 8.9 — Domaine : notifications

**`notification_dispatcher`**
- Trigger : événement custom `notification.queued`
- Logique : crée la row `notifications` + envoie email transactionnel via Resend si `kind` est high-priority

#### 8.10 — Conventions communes

- Tous les workers utilisent `step.run('label', () => ...)` pour découper en étapes idempotentes.
- Tous les workers émettent un `metric_event` au début et à la fin (`{event_type: 'worker.{name}.started/completed/failed'}`).
- Tous les workers loggent `dossier_id` et/ou `ligne_id` dans tous les logs.
- Les retries sont configurés au niveau Inngest (3 retries par défaut, exponentiel, max 30 min).
- Les payloads d'événements incluent un `correlation_id` pour traçage cross-worker.

---

## 9. Server Actions exposées (contrat avec le frontend)

### Explication

Le frontend (Julius) consomme le backend via des Server Actions Next.js. Voici la liste des actions principales avec leur signature. C'est le contrat — Julius peut prototyper son UI contre des mocks qui respectent ces types.

### Spec

```typescript
// === Dossiers ===
async function createDossierFromUpload(input: {
  files: File[];
  importateur_relation_id?: string;
  fournisseur_relation_id?: string;
}): Promise<{ dossier_id: string }>;

async function createDossierManual(input: {
  importateur_relation_id?: string;
  importateur_data?: { raison_sociale: string; siren?: string };
  fournisseur_relation_id?: string;
  date_operation?: string;
  incoterm?: string;
  devise?: string;
}): Promise<{ dossier_id: string }>;

async function getDossier(dossier_id: string): Promise<DossierWithRelations>;

async function listDossiers(filters: {
  status?: dossier_status[];
  importateur_relation_id?: string;
  date_from?: string;
  date_to?: string;
  cbam_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<{ items: DossierSummary[]; total: number }>;

async function deleteDossier(dossier_id: string): Promise<void>; // soft delete

// === Lignes & cascade ===
async function getLigneWithSuggestions(ligne_id: string): Promise<LigneWithSuggestions>;

async function validateLigne(input: {
  ligne_id: string;
  suggestion_id?: string;       // si validation directe d'une suggestion
  edits?: {                     // ou edits manuels par le broker
    hs_code?: string;
    regime?: string;
    pays_origine?: string;
    valeur_unitaire?: number;
  };
}): Promise<{ ligne: Ligne; new_decision_log_id: string }>;

async function answerCascadeClarification(input: {
  ligne_id: string;
  pending_question_id: string;
  selected_option: string;
  free_text?: string;
}): Promise<{ ligne: Ligne }>;

async function rerunCascade(ligne_id: string): Promise<void>;

// === Relances ===
async function draftRelanceForLigne(input: {
  ligne_id: string;
  contact_id?: string;
  custom_question?: string;
}): Promise<{ relance_id: string; draft: { subject: string; body_html: string } }>;

async function sendRelance(input: {
  relance_id: string;
  edits?: { subject?: string; body_html?: string };
}): Promise<{ sent_at: string }>;

async function listRelancesForDossier(dossier_id: string): Promise<Relance[]>;

// === Déclaration ===
async function generateDeclaration(dossier_id: string): Promise<{ download_url: string; expires_at: string }>;

async function markDossierAsSent(input: {
  dossier_id: string;
  delta_reference?: string;
}): Promise<void>;

async function markDossierAsAccepted(input: {
  dossier_id: string;
  acceptance_date: string;
}): Promise<void>;

// === Parties ===
async function searchPartie(input: {
  query: string;
  type?: partie_relation_type;
}): Promise<PartieSearchResult[]>;

async function createPartieRelation(input: {
  type: partie_relation_type;
  partie_data: {
    siren?: string;
    eori?: string;
    raison_sociale?: string;
  };
  alias?: string;
  regime_douanier_habituel?: string;
}): Promise<{ partie_relation_id: string }>;

async function getImportateurFiche(partie_relation_id: string): Promise<ImportateurFiche>;

async function listProduitsRecurrents(partie_relation_id: string): Promise<ProduitRecurrent[]>;

// === CBAM ===
async function listCbamLignesForQuarter(input: {
  year: number;
  quarter: number;
  importateur_relation_id?: string;
}): Promise<CbamLigneSummary[]>;

async function updateCbamData(input: {
  cbam_data_id: string;
  emissions_directes_kg_co2_per_t?: number;
  emissions_indirectes_kg_co2_per_t?: number;
  emissions_source: cbam_emissions_source;
  installation_name?: string;
  installation_country?: string;
}): Promise<void>;

async function generateCbamReport(input: {
  importateur_relation_id: string;
  year: number;
  quarter: number;
}): Promise<{ report_id: string; download_url: string }>;

// === Audit trail ===
async function exportAuditTrail(dossier_id: string): Promise<{ pdf_url: string; expires_at: string }>;

async function getDecisionLog(dossier_id: string): Promise<DecisionLogEntry[]>;

// === Org & users ===
async function getCurrentOrganization(): Promise<Organization>;

async function inviteMember(input: {
  email: string;
  role: 'admin' | 'member';
}): Promise<{ invitation_id: string }>;

async function listMembers(): Promise<OrganizationMember[]>;

async function updateOrganization(input: {
  name?: string;
  bureau_douane_principal?: string;
}): Promise<void>;
```

**Tous ces appels sont** :
- Authentifiés (cookie Supabase)
- Scopés à l'organization courante (RLS)
- Retournent des erreurs typées (pas de `throw "string"`)
- Logent un `metric_event` pour les actions importantes (créations, validations, soumissions)

---

## 10. Conventions et patterns

### Spec

**Soft-delete uniformément** : aucune table n'utilise `DELETE FROM`. Toutes les "suppressions" sont des UPDATE de `deleted_at`. Les requêtes filtrent toujours `deleted_at IS NULL`.

**UUIDs partout** : sauf pour `metric_events` (BIGSERIAL pour la perf) et pour les codes externes (CN8 string, BTI ID string).

**Timestamps** : `TIMESTAMPTZ`, jamais `TIMESTAMP`. Stockés en UTC.

**Devises** : code ISO 4217 (3 lettres). Montants en `NUMERIC(14, 2)` ou `NUMERIC(14, 4)` selon précision requise. Pas de `FLOAT`.

**Idempotence des workers** : tout worker doit être idempotent (relancer le même payload donne le même résultat). Implémenté via clés d'idempotence (Inngest natif) + colonnes `*_at` pour skip si déjà fait.

**Erreurs typées** :
```typescript
class VerdyctError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'EXTERNAL_API_FAILED' | 'CONFLICT' | 'UNKNOWN',
    message: string,
    public details?: object
  ) { super(message); }
}
```

**Logs structurés** : tous les logs contiennent `organization_id`, `user_id` (si applicable), `dossier_id` (si applicable), `correlation_id`. Format JSON.

**Migrations** : versionnées dans `packages/db/migrations/{NNNN}_{name}.sql`. Reversible quand possible. Jamais de migration destructive (DROP COLUMN) en MVP — préférer ajouter une colonne `deprecated_at` et la supprimer dans une release ultérieure.

**Seed data dev** : `packages/db/seed/` avec des scripts qui créent : 1 organization de test, 5 users, 50 parties, 100 dossiers historiques avec lignes validées (pour tester la couche 1 de la cascade), 200 BTI exemples (sous-ensemble d'EBTI).

---

## 11. Notes pour Claude Code

**Ce qui est figé** :
- Tous les schémas SQL de cette livraison.
- Toutes les RLS policies.
- Le séquencement des workers.
- Le contrat des Server Actions (signatures et types).

**Ce qui est laissé à ton jugement** :
- L'organisation interne du code des workers (helpers, sub-functions).
- La forme exacte des prompts LLM dans `extract_structured_data` (la spec dit ce qu'on attend en output, pas comment l'obtenir).
- La gestion d'erreur dans les bordures (rate limits Mistral, timeout Pappers, etc.) — utiliser des retries Inngest + circuit breakers, mais le détail t'appartient.

**Ordre d'implémentation recommandé** :
1. Migrations Drizzle pour toutes les tables tenancy + parties + dossiers + lignes (sections 1-3 hors CBAM).
2. RLS policies (section 6).
3. Worker `parse_inbound_email` + endpoint webhook Resend (le plus simple à tester de bout en bout).
4. Worker `parse_documents` + `extract_structured_data` (parsing pipeline).
5. Tables CBAM + workers CBAM (section 4 + 8.7).
6. Server Actions par domaine (dossiers d'abord, puis lignes, puis parties, puis CBAM).
7. Workers de relance + génération déclaration.

**Ce qui n'est PAS dans cette livraison** :
- Stripe : webhooks, plans, customer portal → livraison 3.
- Resend Inbound config exacte (domaine, DNS, signing) → livraison 3.
- Pappers / INSEE : intégration concrète → livraison 3.
- Onboarding flow → livraison 3.

---

*Fin de la livraison 2. La livraison 3 (intégrations externes + audit trail PDF + Stripe + onboarding) suit.*
