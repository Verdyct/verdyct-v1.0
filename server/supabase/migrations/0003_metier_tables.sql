-- =============================================================================
-- 0003 — Tables métier (sections 2-5 spec L2 + sections 1.3/2.3/5.2/6.1 spec L3)
-- Dépend de : 0002_tenancy (organizations, users)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Section 2 — Parties
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Section 3 — Dossiers
-- ---------------------------------------------------------------------------

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

CREATE INDEX lignes_dossier_idx ON lignes_dossier(dossier_id, numero_ligne);
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

-- ---------------------------------------------------------------------------
-- Section 4 — CBAM
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Section 5 — Opérations
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Spec L3 section 1.3 — Stripe webhook idempotence
-- ---------------------------------------------------------------------------

CREATE TABLE stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Spec L3 section 2.3 — Inbound email idempotence
-- ---------------------------------------------------------------------------

CREATE TABLE inbound_email_log (
  message_id TEXT PRIMARY KEY,
  to_address TEXT NOT NULL,
  from_address TEXT,
  organization_id UUID REFERENCES organizations(id),
  dossier_id UUID REFERENCES dossiers(id),
  status TEXT NOT NULL,                -- 'created', 'matched_relance', 'ignored'
  received_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Spec L3 section 5.2 — Onboarding funnel tracking
-- ---------------------------------------------------------------------------

CREATE TABLE onboarding_funnel (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  signup_started_at TIMESTAMPTZ,
  signup_completed_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  org_created_at TIMESTAMPTZ,
  bureau_configured_at TIMESTAMPTZ,
  checkout_started_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  email_setup_seen_at TIMESTAMPTZ,
  first_dossier_created_at TIMESTAMPTZ,
  first_ligne_validated_at TIMESTAMPTZ,
  first_declaration_generated_at TIMESTAMPTZ,
  team_invited_at TIMESTAMPTZ,
  fully_activated_at TIMESTAMPTZ,         -- quand toutes les étapes obligatoires + premier dossier validé
  abandoned_at_step TEXT
);

-- ---------------------------------------------------------------------------
-- Spec L3 section 6.1 — Invitations
-- ---------------------------------------------------------------------------

CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_member_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,           -- random token in URL
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX invitations_org ON invitations(organization_id) WHERE status = 'pending';
CREATE INDEX invitations_token ON invitations(token);
