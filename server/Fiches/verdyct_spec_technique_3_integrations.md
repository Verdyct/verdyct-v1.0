# Verdyct — Spécification Technique #3
## Intégrations Externes + Audit Trail + Onboarding

*Livraison 3 sur 3*
*Mai 2026 · Issa & Julius*

---

## Comment lire ce document

Même format que les livraisons précédentes. Cette livraison s'appuie sur les livraisons 1 (cascade + référentiels) et 2 (data model + workers + Server Actions). Toutes les tables et conventions définies précédemment sont supposées en place.

Cette livraison couvre tout ce qui touche au monde extérieur : payer (Stripe), envoyer/recevoir des emails (Resend), enrichir des données métier (Pappers, INSEE, EORI), produire un audit trail défendable (PDF), accueillir un nouveau broker (onboarding), et observer le système (Sentry, métriques).

---

## 1. Stripe — Billing et plans

### Explication

Stripe gère trois choses : les paiements récurrents (abonnements), le portail client (où le broker peut changer son moyen de paiement, télécharger ses factures, upgrader son plan), et les webhooks qui synchronisent l'état de l'abonnement avec notre table `subscriptions`.

Le flow de signup se termine par un Stripe Checkout (page hébergée par Stripe, on n'entre jamais nos mains dans la donnée carte). Une fois payé, le webhook `checkout.session.completed` arrive, on crée la `subscription` row, et l'utilisateur a accès au produit.

Pour les changements de plan, désabonnements, échecs de paiement, on ne fait rien d'autre que recevoir les webhooks et mettre à jour notre row `subscriptions`. Stripe est la source de vérité.

Les **quotas** sont appliqués côté applicatif en lisant la `subscriptions.plan` courante : Starter = 1 user et 0 portail client, Pro = 3 users + portail client + CBAM, Team = 10 users + tout. Voir section 1.4.

### Spec

#### 1.1 — Configuration des produits Stripe

À créer manuellement dans le Dashboard Stripe (ou via Stripe CLI / Terraform en Phase 2) :

```
Product: Verdyct Starter
  Price: 149€/mo, 1490€/an (-17%), recurring
  Metadata: { plan: 'starter', max_users: 1, cbam: 'false' }

Product: Verdyct Pro
  Price: 249€/mo, 2490€/an (-17%), recurring
  Metadata: { plan: 'pro', max_users: 3, cbam: 'true' }

Product: Verdyct Team
  Price: 499€/mo, 4990€/an (-17%), recurring
  Metadata: { plan: 'team', max_users: 10, cbam: 'true' }
```

**Variables d'environnement** :
```
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_STARTER_MONTHLY=price_…
STRIPE_PRICE_STARTER_YEARLY=price_…
STRIPE_PRICE_PRO_MONTHLY=price_…
STRIPE_PRICE_PRO_YEARLY=price_…
STRIPE_PRICE_TEAM_MONTHLY=price_…
STRIPE_PRICE_TEAM_YEARLY=price_…
STRIPE_PORTAL_CONFIGURATION_ID=bpc_…  # Customer Portal config
```

#### 1.2 — Server Action `createCheckoutSession`

```typescript
async function createCheckoutSession(input: {
  plan: 'starter' | 'pro' | 'team';
  billing_interval: 'monthly' | 'yearly';
  trial_days?: number;  // default 7 for first signup
}): Promise<{ checkout_url: string }>;
```

**Logique** :
1. Récupérer organization courante.
2. Si pas encore de `stripe_customer_id` sur l'org : créer un `customer` Stripe avec email du user + metadata `{ organization_id }`.
3. Créer la session : `mode: 'subscription'`, `payment_method_types: ['card', 'sepa_debit']`, prix correspondant, `success_url` = `/onboarding/billing/success`, `cancel_url` = `/onboarding/billing/cancel`, `subscription_data: { trial_period_days: 7 }` si premier signup, metadata `{ organization_id, plan }`.
4. Retourner `session.url`.

#### 1.3 — Webhook handler `/api/webhooks/stripe`

**Sécurité** :
```typescript
import Stripe from 'stripe';

const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  await request.text(),
  sig!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**Idempotence** :
```sql
CREATE TABLE stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```
Skip si `event_id` déjà présent et `processed_at` non-null.

**Événements traités** :

| Type | Action |
|------|--------|
| `checkout.session.completed` | Créer `subscription` row si nouvelle, sync plan/status |
| `customer.subscription.updated` | UPDATE `subscriptions` (plan, status, periods) |
| `customer.subscription.deleted` | UPDATE status → 'canceled' |
| `invoice.payment_failed` | UPDATE status → 'past_due', email notification au broker |
| `invoice.paid` | UPDATE current_period_end, cleanup status si revient à `active` |
| `customer.subscription.trial_will_end` | Email notification 3 jours avant fin de trial |

**Mapping** : le `subscription.items.data[0].price.metadata.plan` Stripe donne le plan (`starter`/`pro`/`team`).

#### 1.4 — Quota gates (côté applicatif)

```typescript
// packages/billing/quotas.ts
export const PLAN_QUOTAS = {
  starter: { max_users: 1, cbam: false, client_portal: false, api_access: false },
  pro: { max_users: 3, cbam: true, client_portal: true, api_access: false },
  team: { max_users: 10, cbam: true, client_portal: true, api_access: true },
} as const;

export async function assertCanInviteUser(org_id: string): Promise<void> {
  const sub = await getSubscription(org_id);
  const quota = PLAN_QUOTAS[sub.plan];
  const currentCount = await countMembers(org_id);
  if (currentCount >= quota.max_users) {
    throw new VerdyctError('VALIDATION', `Limite atteinte : ${quota.max_users} utilisateurs sur le plan ${sub.plan}.`);
  }
}

export async function assertHasFeature(org_id: string, feature: 'cbam' | 'client_portal' | 'api_access'): Promise<void> {
  const sub = await getSubscription(org_id);
  if (!PLAN_QUOTAS[sub.plan][feature]) {
    throw new VerdyctError('FORBIDDEN', `Feature ${feature} non incluse dans le plan ${sub.plan}.`);
  }
}
```

À appeler dans toutes les Server Actions concernées (CBAM, invitations, etc.).

#### 1.5 — Customer portal

```typescript
async function createPortalSession(): Promise<{ portal_url: string }> {
  const org = await getCurrentOrganization();
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${BASE_URL}/parametres/facturation`,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
  });
  return { portal_url: session.url };
}
```

Configuration Customer Portal à activer dans le Dashboard Stripe : changement de plan autorisé, annulation autorisée (avec rétention 30 jours), téléchargement factures, mise à jour moyen de paiement.

---

## 2. Resend — Emails sortants et inbound

### Explication

Resend gère deux flux distincts : les emails qu'on envoie (transactionnels, relances importateur) et les emails qu'on reçoit (le forwarding broker → dossiers automatiques).

Pour le **sortant**, on utilise un sous-domaine dédié `mail.verdyct.io` configuré avec SPF, DKIM, DMARC pour la délivrabilité. Tous les emails partent de cette adresse. Les templates sont gérés côté code (pas dans le dashboard Resend) parce que on veut pouvoir les versionner avec les migrations.

Pour l'**inbound**, on configure un autre sous-domaine `in.verdyct.io` qui pointe vers Resend Inbound. Resend reçoit l'email, valide la signature, et POST sur notre endpoint `/api/webhooks/resend/inbound`. À nous d'extraire l'organization à partir de l'adresse de destination, parser les pièces jointes, créer le dossier.

### Spec

#### 2.1 — DNS et configuration domaine

**Sous-domaine sortant** : `mail.verdyct.io`
- Records DNS à ajouter (Resend les fournit dans le dashboard) :
  - SPF : `v=spf1 include:_spf.resend.com ~all`
  - DKIM : 3 records CNAME fournis par Resend
  - DMARC : `v=DMARC1; p=quarantine; rua=mailto:dmarc@verdyct.io`

**Sous-domaine entrant** : `in.verdyct.io`
- Records MX pointant vers Resend Inbound (fournis par Resend)
- Pattern d'adresse : `dossiers+{organization_slug}@in.verdyct.io`

#### 2.2 — Templates transactionnels

Stockés dans `packages/emails/templates/`, un fichier par template. Format : composant React (utiliser `@react-email/components` pour le rendu).

Templates MVP :
- `welcome.tsx` — Bienvenue après inscription confirmée
- `email_verification.tsx` — Lien magic link pour vérification
- `password_reset.tsx` — Reset password
- `team_invitation.tsx` — Invitation d'un nouveau membre
- `dossier_ready_to_validate.tsx` — Notification dossier prêt
- `cascade_clarification_needed.tsx` — Cascade demande input broker
- `relance_importateur.tsx` — Relance générée pour l'importateur (utilisé par draftRelanceForLigne)
- `cbam_quarter_deadline.tsx` — Rappel deadline CBAM trimestriel
- `payment_failed.tsx` — Échec paiement Stripe
- `subscription_canceled.tsx` — Confirmation annulation

**Helper d'envoi** :
```typescript
// packages/emails/send.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail<T>(input: {
  to: string | string[];
  template: keyof EmailTemplates;
  data: EmailTemplates[T];
  reply_to?: string;
  cc?: string[];
  metadata?: Record<string, string>;
}): Promise<{ message_id: string }> {
  const { subject, react } = await renderTemplate(input.template, input.data);
  const result = await resend.emails.send({
    from: 'Verdyct <noreply@mail.verdyct.io>',
    to: input.to,
    cc: input.cc,
    reply_to: input.reply_to,
    subject,
    react,
    headers: {
      'X-Verdyct-Template': input.template,
      ...(input.metadata ? { 'X-Verdyct-Metadata': JSON.stringify(input.metadata) } : {}),
    },
    tags: [
      { name: 'template', value: input.template },
      ...(input.metadata?.organization_id ? [{ name: 'org', value: input.metadata.organization_id }] : []),
    ],
  });
  return { message_id: result.data!.id };
}
```

#### 2.3 — Webhook inbound `/api/webhooks/resend/inbound`

**Sécurité** : vérifier la signature HMAC avec `RESEND_INBOUND_SECRET` (header `X-Resend-Signature`).

**Logique** :

```typescript
// 1. Parse payload Resend Inbound
const { from, to, subject, text, html, attachments, message_id, in_reply_to } = payload;

// 2. Détection : nouveau dossier OU réponse à une relance ?
if (in_reply_to) {
  // C'est une réponse à un email qu'on a envoyé
  const relance = await findRelanceByMessageId(in_reply_to);
  if (relance) {
    return await processRelanceReply(relance, payload);
  }
}

// 3. Sinon : nouveau dossier
// Extraire le slug de l'adresse to: 'dossiers+broker-7f2a@in.verdyct.io' → 'broker-7f2a'
const slug = extractSlug(to);
const inboundConfig = await db.query.email_inbound_addresses.findFirst({
  where: eq(email_inbound_addresses.slug, slug),
});
if (!inboundConfig || !inboundConfig.is_active) {
  return Response.json({ status: 'ignored', reason: 'unknown_recipient' });
}

// 4. Créer le dossier shell
const dossier = await createDossierShell({
  organization_id: inboundConfig.organization_id,
  source: 'email_forward',
  source_metadata: { from, message_id, subject },
});

// 5. Sauvegarder body + attachments dans Storage
await saveDocumentsFromInboundEmail(dossier.id, { text, html, attachments });

// 6. Émettre événement
await inngest.send({ name: 'dossier.created', data: { dossier_id: dossier.id } });

// 7. Retour 200
return Response.json({ status: 'created', dossier_id: dossier.id });
```

**Idempotence** : `INSERT ... ON CONFLICT DO NOTHING` sur `message_id` (table `inbound_email_log`).

```sql
CREATE TABLE inbound_email_log (
  message_id TEXT PRIMARY KEY,
  to_address TEXT NOT NULL,
  from_address TEXT,
  organization_id UUID REFERENCES organizations(id),
  dossier_id UUID REFERENCES dossiers(id),
  status TEXT NOT NULL,                -- 'created', 'matched_relance', 'ignored'
  received_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.4 — Génération de l'inbound email slug

À la création de l'organization :
```typescript
function generateInboundSlug(): string {
  const random = crypto.randomBytes(6).toString('base64url').toLowerCase();
  return `broker-${random}`;
}
```

Stocké dans `organizations.inbound_email_slug`. Affiché dans l'UI de création de dossier avec un bouton "copier".

---

## 3. Pappers et INSEE — Enrichissement SIREN

### Explication

Quand un nouveau SIREN apparaît dans un dossier (importateur ou fournisseur français), on veut enrichir automatiquement la row `parties` avec : raison sociale officielle, forme juridique, code NAF, adresse, dirigeants. Deux sources possibles : Pappers (payant, données riches, API simple) et INSEE Sirene (gratuit, données core uniquement, API Insee).

Stratégie : Pappers en primary, INSEE en fallback gratuit pour les cas où Pappers échoue ou est down. Un cache de 30 jours évite de re-payer pour le même SIREN.

### Spec

#### 3.1 — Variables d'environnement

```
PAPPERS_API_KEY=…
INSEE_CLIENT_ID=…
INSEE_CLIENT_SECRET=…  # Auth OAuth2 INSEE
```

#### 3.2 — Worker `enrich_partie_pappers`

**Trigger** : événement `partie.needs_enrichment` (depuis `extract_structured_data` ou création manuelle).

**Input** : `{ partie_id }`.

**Logique** :
```
1. Charger la row parties.
2. Si déjà enriched et enriched_at > now() - 30 days, skip.
3. Si SIREN présent et pays = 'FR' :
   - GET https://api.pappers.fr/v2/entreprise?siren={siren}&api_token={key}
   - Parser response : raison_sociale, forme_juridique, code_naf, adresse, code_postal, ville
   - UPDATE parties avec ces champs + enriched_via='pappers' + enriched_at=now()
4. Si Pappers fail (5xx ou 429) :
   - Fallback vers INSEE Sirene API
   - GET https://api.insee.fr/entreprises/sirene/V3/siren/{siren}
   - Parser et UPDATE avec enriched_via='insee'
5. Si SIREN absent mais EORI présent :
   - Trigger enrich_partie_eori à la place
6. Émettre metric_event 'partie.enriched' ou 'partie.enrichment_failed'
```

**Rate limiting** : Pappers limite à 10 req/s sur le plan API standard. INSEE limite à 30 req/min. Implémenté via un token bucket dans `packages/external/rate_limit.ts`.

#### 3.3 — Worker `enrich_partie_eori`

**Trigger** : événement `partie.needs_eori_validation`.

**Logique** :
```
1. Appel SOAP au service EORI EU :
   - URL : https://ec.europa.eu/taxation_customs/dds2/eos/services/eori
   - Méthode : 'validateEORI'
   - Payload XML SOAP avec le numéro EORI
2. Si EORI valide : récupérer raison_sociale et adresse (fournis par certains pays UE)
3. UPDATE parties avec eori_validated_at=now() + données si dispo
4. Si invalide : flag dans parties.notes, alerter le broker via notification
```

**Note** : le service EU EORI est notoirement instable. Implémenter avec timeout court (10s) et 2 retries seulement.

---

## 4. Audit trail — Export PDF

### Explication

Le `decision_log` (livraison 2 section 3) contient toutes les décisions prises sur un dossier — qui (broker, IA, système), quand, sur quelle source. C'est append-only au niveau base. Quand le broker a besoin de défendre un dossier en contrôle douanier (parfois 18 mois après les faits), il génère un PDF exportable.

Le PDF doit être professionnel (logo Verdyct, en-tête formel, mise en page propre), exhaustif (toutes les décisions chronologiquement), et lisible par un agent des douanes (langage clair, sources cliquables si numérique, sources en clair sinon).

### Spec

#### 4.1 — Server Action `exportAuditTrail`

```typescript
async function exportAuditTrail(dossier_id: string): Promise<{ pdf_url: string; expires_at: string }>;
```

**Logique** :
1. Vérifier que le dossier appartient bien à l'organization courante (RLS automatique).
2. Charger le dossier avec ses parties, lignes, documents, et `decision_log` complet ordonné chronologiquement.
3. Générer le PDF (voir 4.2).
4. Stocker dans Supabase Storage à `audit_trails/{org_id}/{dossier_id}/{timestamp}.pdf`.
5. Générer une signed URL valable 7 jours.
6. Retourner.

#### 4.2 — Génération PDF

Librairie : `@react-pdf/renderer`. Composant React qui produit un PDF.

**Structure du PDF** :

Page 1 — Page de garde
- Logo Verdyct
- Titre : "Piste d'audit douanière — Dossier {reference_interne}"
- Date d'émission du rapport
- Bandeau identifiant l'organization du broker (raison sociale, SIREN, EORI, bureau de douane principal)

Page 2 — Synthèse du dossier
- Référence interne, date de création, date de validation, date de soumission
- Importateur (raison sociale, SIREN, EORI, adresse)
- Fournisseur (idem)
- Bureau de douane, incoterm, devise, valeur totale
- Statut final (accepté/refusé en douane, avec date)

Pages 3+ — Détail par ligne marchandise
Pour chaque ligne :
- Numéro de ligne, description produit complète
- Quantité, valeur, poids
- Code HS final retenu, régime douanier, origine
- **Tableau chronologique des décisions** : pour chaque entrée du `decision_log` concernant cette ligne :
  - Horodatage (UTC + Europe/Paris)
  - Acteur (broker {nom complet} / agent IA / cascade L1 / cascade L2)
  - Champ modifié, ancienne valeur → nouvelle valeur
  - Source utilisée (citation : "Match historique : 47 dossiers Renault → 7318.15.95, taux acceptation 100%" / "BTI FRBTI-2024-12345, similarité 0.93" / "Agent IA Mistral Large 2, 6 itérations, sources : note explicative SH 84.56, jurisprudence DGDDI 2024-08")
  - Score de confiance affiché au broker au moment de la décision

Dernière page — Annexes
- Liste des documents qui composaient le dossier (nom, type, date d'ajout)
- Hash SHA-256 de chaque document (pour intégrité)
- Signature : "Document généré le {date} par Verdyct {version}. Toutes les décisions y figurant sont issues d'un journal append-only stocké dans une base de données ne permettant ni modification ni suppression."

#### 4.3 — Intégrité cryptographique (optionnel MVP, recommandé Phase 2)

Pour un audit trail vraiment défendable, on peut :
1. Hasher chaque PDF généré (SHA-256).
2. Stocker le hash + timestamp dans une table `audit_trail_hashes`.
3. (Phase 2) Ancrer les hashs sur une blockchain publique (Bitcoin via Open Timestamps) pour pouvoir prouver, devant un juge, que le PDF n'a pas été modifié.

Pour le MVP, le hash + le caractère append-only de la DB suffit. L'ancrage blockchain est un argument de vente Phase 2 (€20-50/mois supplémentaire pour la fonctionnalité "preuve cryptographique").

---

## 5. Onboarding flow broker

### Explication

Le parcours qu'un nouveau broker traverse entre "il clique sur 'S'inscrire' depuis verdyct.io" et "il a son premier dossier validé et payé". L'enjeu : le faire arriver à la valeur (un dossier traité) le plus vite possible. Notre métrique nord = temps entre signup et première validation. Cible : moins de 30 minutes.

Le flow est composé de 7 étapes obligatoires + 1 optionnelle. Chaque étape est trackée comme un événement métrique pour qu'on sache où les gens drop.

### Spec

#### 5.1 — Étapes

**Étape 1 — Signup**
- Formulaire : email pro, mot de passe (ou magic link), prénom, nom
- Validation : email pro (refuser gmail.com, hotmail.fr, etc. — proposer "use work email")
- Action : créer user dans Supabase Auth, envoyer email_verification
- Métrique : `signup.started`, `signup.completed`

**Étape 2 — Vérification email**
- Lien magique cliqué → connexion auto
- Métrique : `email_verified`

**Étape 3 — Création de l'organization**
- Formulaire : raison sociale (auto-suggestion à partir du SIREN), SIREN, EORI (optionnel mais encouragé)
- Vérification SIREN : appel synchrone à Pappers, affichage de la raison sociale officielle, demande confirmation
- Action : créer organizations row, organization_members (role='owner'), génération inbound_email_slug
- Métrique : `org_created`

**Étape 4 — Configuration bureau de douane principal**
- Liste déroulante des bureaux de douane français (référentiel statique : Le Havre, Marseille, Roissy, Lyon, etc.)
- Optionnel mais fortement encouragé (pré-remplit le bureau dans les futurs dossiers)
- Métrique : `bureau_configured` (ou skipped)

**Étape 5 — Choix du plan + Stripe checkout**
- Page de pricing : 3 plans côte à côte (Starter / Pro / Team) avec free trial 7 jours
- Bouton "Commencer mon essai gratuit" → createCheckoutSession
- Stripe gère carte, redirige vers `/onboarding/billing/success` ou `/cancel`
- Métrique : `checkout_started`, `checkout_completed`, `trial_started`

**Étape 6 — Setup adresse email forwarding**
- Affichage de l'adresse `dossiers+{slug}@in.verdyct.io`
- Bouton "copier"
- Encart explicatif : "Forwarde un email reçu d'un client à cette adresse pour créer un dossier automatiquement"
- Optionnel : bouton "envoyer un email de test à cette adresse depuis ma boîte mail" qui ouvre le client mail
- Métrique : `email_setup_seen`

**Étape 7 — Premier dossier guidé**
- Bouton "Créer mon premier dossier (5 min, on vous guide)"
- Walkthrough interactif :
  - Étape A : "Uploadez un PDF facture + BL d'un dossier réel ou utilisez notre exemple"
  - Étape B : "Le système parse... regardez les lignes extraites" (montre la cascade en cours en temps réel)
  - Étape C : "Pour la première ligne, voici ce que la cascade propose. Validez en 1 clic" (cascade en mode L2 puisque pas d'historique)
  - Étape D : "Vous pouvez maintenant générer la déclaration au format DELTA"
  - Étape E : "Bravo, votre premier dossier est traité. Voilà ce que vous gagnez en temps."
- Métrique : `first_dossier_created`, `first_ligne_validated`, `first_declaration_generated`

**Étape 8 (optionnelle) — Inviter ses collègues**
- "Vous voulez inviter Marc, Sophie, et Jean ?"
- Champs email + rôle (admin / member)
- Affichage : "Invitations envoyées"
- Métrique : `team_invited`

#### 5.2 — Tracking de funnel

```sql
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
```

Dashboard admin (réservé Issa/Julius) qui affiche le funnel : combien à chaque étape, taux de conversion, drop point principal.

---

## 6. Team management & invitations

### Explication

Pour Pro et Team, plusieurs utilisateurs collaborent sur la même organization. L'owner (le premier inscrit) peut inviter par email. L'invité reçoit un email avec un lien magique qui le connecte directement, choisit son mot de passe, et atterrit dans l'organization existante.

### Spec

#### 6.1 — Tables

```sql
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
```

#### 6.2 — Server Actions

```typescript
async function inviteMember(input: { email: string; role: 'admin' | 'member' }): Promise<{ invitation_id: string }> {
  // 1. Check quota (max_users du plan)
  await assertCanInviteUser(currentOrgId());
  // 2. Check si email déjà invité (status='pending') → return existing
  // 3. Insérer invitation avec token = crypto.randomUUID()
  // 4. Envoyer team_invitation email avec lien /invite/accept?token=…
  // 5. Métrique
}

async function acceptInvitation(token: string): Promise<{ organization_id: string }> {
  // 1. Charger invitation, vérifier expires_at et status='pending'
  // 2. Si user pas connecté : déclencher signup/login flow avec retour sur cette URL
  // 3. Si user connecté : créer organization_members, marquer invitation accepted
  // 4. Si c'était le default org du user (premier login), update users.default_organization_id
}

async function revokeInvitation(invitation_id: string): Promise<void>;
async function listPendingInvitations(): Promise<Invitation[]>;
```

#### 6.3 — Flow utilisateur

1. Owner va dans Paramètres → Équipe → "Inviter".
2. Saisit email + rôle, soumet.
3. Invité reçoit email "{Owner} vous invite à rejoindre {Organization} sur Verdyct".
4. Clic sur lien → `/invite/accept?token=xyz`.
5. Si pas de compte : étapes 1-2 du flow d'onboarding (signup + email_verified), puis auto-jointure à l'org.
6. Si compte existant : login, jointure auto à l'org, redirection vers le dashboard.

**Expiration** : 7 jours par défaut. Cron quotidien `expire_old_invitations` qui passe les invitations en `expired`.

---

## 7. Observabilité et monitoring

### Explication

Trois plans d'observation : les **erreurs** (Sentry), les **métriques métier** (notre table `metric_events`), les **runs de workers** (Inngest natif). Chaque plan a son audience : Sentry pour le dev, métriques pour le business, Inngest pour le débugging d'un job qui foire.

### Spec

#### 7.1 — Sentry

```
SENTRY_DSN_FRONT=…
SENTRY_DSN_BACK=…
```

Setup :
- Frontend : `@sentry/nextjs` avec source maps upload au build
- Workers Inngest : `@sentry/node` initialisé en début de chaque worker
- Capture automatique : erreurs non-handled, latency p95 des Server Actions, breadcrumbs
- Tags par défaut : `organization_id`, `dossier_id` (si applicable), `worker_name`

**Filtres d'erreurs** à ignorer (réduire le bruit) :
- `VerdyctError` avec code `VALIDATION` ou `NOT_FOUND` (erreurs business attendues)
- Network errors transitoires (`ETIMEDOUT`, `ECONNRESET`) — Sentry les flag mais on n'alerte pas

#### 7.2 — Métriques métier

Helper `recordMetric` :
```typescript
async function recordMetric(input: {
  event_type: string;
  organization_id?: string;
  user_id?: string;
  properties?: Record<string, unknown>;
}): Promise<void>;
```

Événements à instrumenter (liste non exhaustive) :
- `signup.completed`, `org_created`, `subscription.created`, `subscription.canceled`
- `dossier.created`, `dossier.validated`, `dossier.declaration_generated`
- `cascade.layer_1_hit`, `cascade.layer_2_hit`, `cascade.layer_3_hit`, `cascade.escalated_to_broker`
- `relance.sent`, `relance.replied`
- `cbam.report_generated`
- `audit_trail.exported`

#### 7.3 — Dashboard admin Verdyct

Page interne `/admin/dashboard` (gated par `admin_users` table — seulement Issa et Julius). Affiche, en lecture seule :

**Vue d'ensemble** :
- Nombre d'organizations actives, total users, total dossiers traités
- MRR courant, MRR du mois précédent, churn rate
- Top 5 brokers par volume de dossiers
- Funnel d'onboarding (% à chaque étape)

**Vue cascade (la plus stratégique)** :
- Hit rate par couche (L1 / L2 / L3) sur les 30 derniers jours
- Latence moyenne par couche
- Coût LLM par broker (cumul Mistral + GPT-5 fallback)
- Top des cas où la cascade a escaladé au broker (analyser pour améliorer L2/L3)

**Vue health** :
- Workers Inngest : taux de succès/échec sur 24h
- API externes : latency p95 Pappers, INSEE, Mistral, Stripe
- Sentry : top 10 erreurs des 7 derniers jours

#### 7.4 — Alerting (Phase 2)

Pour le MVP, on regarde les dashboards manuellement. Phase 2 : Sentry alerts vers Slack pour les erreurs critiques + alerte si MRR drops > 5% / semaine.

---

## 8. Sécurité, secrets, RGPD

### Spec

#### 8.1 — Variables d'environnement

Chaque environnement (dev, staging, prod) a son propre fichier `.env`. Pas de secret dans le repo. Stockés dans :
- Vercel : Project Settings → Environment Variables
- Inngest : Dashboard
- Supabase : Project Settings → API

Liste des secrets nécessaires :
```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # uniquement workers

# Mistral / OpenAI
MISTRAL_API_KEY=
OPENAI_API_KEY=                    # fallback

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PORTAL_CONFIGURATION_ID=
STRIPE_PRICE_*=                     # 6 prix

# Resend
RESEND_API_KEY=
RESEND_INBOUND_SECRET=

# Pappers / INSEE
PAPPERS_API_KEY=
INSEE_CLIENT_ID=
INSEE_CLIENT_SECRET=

# Sentry
SENTRY_DSN_FRONT=
SENTRY_DSN_BACK=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Misc
ENCRYPTION_KEY_AT_REST=             # pour chiffrer les emails contacts en DB
JWT_SECRET=                         # signing additionnel si besoin
BASE_URL=https://app.verdyct.io
```

#### 8.2 — Rotation

Tous les secrets sont rotés une fois par an minimum, ou immédiatement en cas de fuite suspectée. Procédure documentée dans `docs/security/secret_rotation.md`.

#### 8.3 — RGPD

**Data residency** : tout stocké en EU (Supabase région Frankfurt ou Paris, Vercel régions EU only, Inngest EU region). Aucun transit hors UE pour les données des dossiers.

**Right to access** : Server Action `exportMyData(user_id)` qui produit un ZIP avec tous les dossiers, lignes, decisions, factures Stripe d'un user — accessible depuis Paramètres → Données.

**Right to erasure** : Server Action `requestAccountDeletion()` qui :
1. Marque l'user `deleted_at = now()`.
2. Lance un worker `delete_user_data` programmé pour 30 jours plus tard (période de grâce + sauvegardes légales pour les déclarations douanières — la DGDDI exige 3 ans de conservation pour les dossiers soumis).
3. À la fin des 30 jours : suppression irréversible des données personnelles. Les dossiers soumis sont conservés 3 ans après leur date d'opération (obligation légale) puis supprimés.

**Cookie** : un seul cookie d'authentification (`sb-access-token` Supabase). Pas de tracking tiers, pas de Google Analytics — Plausible Analytics (EU) en alternative si analytics web nécessaire.

**Mention légale** : pages `/legal/cgu`, `/legal/privacy`, `/legal/dpa` à rédiger avec un avocat (hors scope cette spec).

---

## 9. Rate limiting et résilience

### Explication

Toutes nos dépendances externes ont des limites : Mistral plafonne en TPM, Pappers à 10 req/s, Stripe à 100 req/s, Resend à des seuils variables. Si on les dépasse, on prend des 429. Si elles sont down, on prend des 5xx. Notre code doit survivre à tout ça sans corrompre l'état.

### Spec

#### 9.1 — Stratégie générale

- **Tous les appels externes passent par un wrapper** dans `packages/external/{provider}/client.ts`.
- **Tous les wrappers ont** : timeout (30s par défaut), retry exponentiel (3 retries, base 500ms), circuit breaker (ouvre après 5 échecs en 60s, half-open après 5min), métrique enregistrée (`external.{provider}.{outcome}`).
- **Tous les workers Inngest** : retries natifs (3 par défaut, configurable), idempotence par clé.

#### 9.2 — Token bucket pour rate limits

```typescript
// packages/external/rate_limit.ts
class TokenBucket {
  constructor(private capacity: number, private refillRatePerSec: number) {}
  async take(count = 1): Promise<void> { /* impl avec Redis ou in-memory selon scale */ }
}

export const pappersBucket = new TokenBucket(20, 10);  // 10 req/s, burst de 20
export const mistralLargeBucket = new TokenBucket(...);
```

#### 9.3 — Fallback chains

| Service primaire | Fallback |
|------------------|----------|
| Mistral Large 2 (cascade L3) | GPT-5 |
| Mistral Small 3 (coherence/extract) | GPT-5-mini ou équiv. cheap |
| Mistral Embed | OpenAI text-embedding-3-large |
| Pappers | INSEE Sirene |
| Resend (outbound) | (pas de fallback MVP, alerter si down) |

Switch automatique en cas de circuit breaker open. Émettre un metric_event quand on bascule sur fallback (visibilité).

---

## 10. Notes pour Claude Code

**Ce qui est figé** :
- Le découpage des intégrations externes.
- Les schémas SQL de cette livraison (`stripe_webhook_events`, `inbound_email_log`, `invitations`, `onboarding_funnel`).
- Les signatures des Server Actions.
- La liste des templates email à créer.
- Les variables d'environnement.
- Les étapes du flow d'onboarding (8 étapes obligatoires + 1 optionnelle).

**Ce qui est laissé à ton jugement** :
- Le design HTML/React des templates email (faire propre, sobre, aligné avec la charte Verdyct que Julius produira).
- L'implémentation interne des wrappers d'API externes (mais respecter le contrat : timeout, retries, circuit breaker, métriques).
- La maquette du dashboard admin (juste les KPIs listés section 7.3 sont obligatoires).
- Le format précis du PDF d'audit trail (respecter le contenu obligatoire, le design est libre).

**Ordre d'implémentation recommandé** :
1. Stripe : produits + webhook handler + Server Actions billing (section 1).
2. Resend : DNS + sending helper + premiers templates (welcome, email_verification, payment_failed) (section 2.1-2.2).
3. Onboarding flow : étapes 1-5 (signup → checkout) (section 5.1).
4. Resend Inbound (section 2.3) et flow étapes 6-7 (premier dossier guidé).
5. Pappers + INSEE (section 3).
6. Audit trail PDF (section 4).
7. Team management (section 6).
8. Observabilité (section 7).
9. RGPD endpoints + rate limiting (sections 8-9).

**Choses à NE PAS faire en MVP** :
- Pas d'ancrage blockchain de l'audit trail (section 4.3 est Phase 2).
- Pas d'alerting Slack (Phase 2).
- Pas de pages `/legal/*` codées : just des pages statiques avec le texte fourni par avocat (hors scope spec).
- Pas d'onboarding par invitation pour le tout premier user (le owner crée toujours l'org). L'invitation, c'est uniquement après.

---

## Conclusion des 3 livraisons

Avec les livraisons 1, 2 et 3, tu as :
- **Livraison 1** : la cascade engine, les référentiels publics, l'ingestion data.
- **Livraison 2** : le data model métier complet, RLS, pipeline de parsing, workers Inngest, contrat des Server Actions.
- **Livraison 3** : Stripe, Resend, Pappers/INSEE/EORI, audit trail PDF, onboarding, team management, observabilité.

L'ensemble couvre tout ce qui est nécessaire pour aller de zéro à un broker payant qui valide et soumet des dossiers en production.

Le doc suivant à produire (qui n'est PAS une livraison technique) est le **guide d'exécution** pour Issa : qu'est-ce qu'il code lui-même, et comment il parle à Claude Code pour le reste.

---

*Fin de la livraison 3.*
