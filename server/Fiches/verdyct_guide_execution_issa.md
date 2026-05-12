# Verdyct — Guide d'exécution pour Issa

*Quoi coder toi-même, quoi déléguer à Claude Code, et comment lui parler*
*Mai 2026*

---

## Comment utiliser ce guide

Ce doc est ton manuel d'opération pour les 4 prochaines semaines. Il est volontairement **opérationnel** : peu de prose, beaucoup de listes, de commandes shell, de templates copiables.

**Trois parties** :

- **Partie A** — Setup irréductible. ~Une demi-journée. Tout ce qui implique tes credentials personnels, la configuration de services externes, des DNS, ou des décisions stratégiques. **Tout le reste, tu délègues à Claude Code dès le jour 1.**
- **Partie B** — Comment parler à Claude Code. Templates de prompts à copier-coller, un par type de tâche.
- **Partie C** — Les pièges classiques à éviter quand tu reviews une PR Claude Code.

**Règle générale** : tu ne donnes JAMAIS à Claude Code "lis la spec et code tout". Tu lui donnes une tâche scopée à la fois, avec le bout de spec concerné.

**Mental model** : à partir du moment où le setup Partie A est fait, ton job ce n'est plus de coder. C'est d'être **lead tech + product owner** d'un projet où Claude Code est ton dev. Tu pilotes, tu reviews, tu tranches. C'est un rôle qui demande de la rigueur, pas de la dactylographie.

---

# PARTIE A — Setup irréductible (que toi)

Liste de ce qui ne **peut pas** être délégué à Claude Code, parce que ça implique des comptes, des secrets, des cartes bancaires, des DNS, ou des configurations cliquables dans des dashboards. Une demi-journée. Après, tu n'écris plus de code de ta vie sur ce projet — tu le pilotes.

## A.1. Création des comptes externes (1h)

Tout commence par tes credentials. Crée ces comptes, récupère les clés, colle-les dans un `.env.local` que tu garderas localement (Claude Code créera le fichier dans le repo plus tard).

| Service | Action | Récupérer |
|---------|--------|-----------|
| **Supabase** | Créer un projet en région **Frankfurt (eu-central-1)** ou **Paris (eu-west-3)** | URL + anon key + service role key + DB URL |
| **Vercel** | Créer un compte, créer un projet (vide) | Project ID + token CLI |
| **Inngest** | Créer un compte + un environnement | Event key + signing key |
| **Resend** | Créer un compte, ajouter le domaine `verdyct.io` | API key (les DNS records viennent en A.4) |
| **Stripe** | Compte (mode test d'abord, live en semaine 2-3) | Secret key + webhook secret |
| **Mistral** | Compte sur la-plateforme.mistral.ai | API key |
| **OpenAI** | Compte (uniquement pour fallback) | API key |
| **Pappers** | Compte développeur | API key |
| **Sentry** | Projet Next.js + Node | DSN front + DSN back |

## A.2. Authentification CLI locale (15 min)

Les CLIs ont besoin de toi (et seulement toi) pour s'authentifier sur ta machine. Pas un truc que Claude Code peut faire.

```bash
npm install -g supabase vercel stripe @inngest/cli
supabase login
supabase link --project-ref <ton-ref>
vercel login
vercel link
stripe login
```

À refaire chaque fois que tu changes de machine.

## A.3. Configuration des produits Stripe dans le dashboard (30 min)

Stripe ne se configure pas par code en MVP (Terraform plus tard). Va dans le dashboard Stripe et crée :

- Product **Verdyct Starter** : prix 149€/mo + 1490€/an (-17%), metadata `{ plan: 'starter', max_users: '1', cbam: 'false' }`
- Product **Verdyct Pro** : 249€/mo + 2490€/an, metadata `{ plan: 'pro', max_users: '3', cbam: 'true' }`
- Product **Verdyct Team** : 499€/mo + 4990€/an, metadata `{ plan: 'team', max_users: '10', cbam: 'true' }`

**Customer Portal** : Settings → Billing → Customer portal → activer changement de plan, annulation (avec rétention 30 jours), mise à jour CB. Récupère le `STRIPE_PORTAL_CONFIGURATION_ID`.

Récupère les **6 `price_id`** (3 produits × 2 intervals mensuel/annuel) et colle-les dans tes secrets d'env.

## A.4. Configuration DNS (15 min, à faire après que Resend te file les records)

Quand Resend te génère les DNS records pour `mail.verdyct.io` (sortant) et `in.verdyct.io` (inbound), va chez ton registrar (OVH, Cloudflare, peu importe) et colle-les.

Records à ajouter (Resend te donne les valeurs exactes) :
- `mail.verdyct.io` : SPF (TXT), DKIM (3 CNAMEs), DMARC (TXT)
- `in.verdyct.io` : MX records pointant vers Resend Inbound

Vérifier la propagation dans le dashboard Resend (peut prendre 1-24h selon le registrar).

## A.5. Pousser les secrets dans les environnements (15 min)

Pour chaque environnement (dev, preview, prod), pousser les secrets aux bons endroits.

- **Vercel** : Project Settings → Environment Variables → coller toutes les `*_KEY`, `*_SECRET`, `*_URL`, `*_PRICE_*` du `.env.local`. Ne pas oublier de cocher "Production" + "Preview" + "Development" selon le scope.
- **Inngest** : Dashboard → Environment → Secrets → coller les clés Mistral, OpenAI, et la `SUPABASE_SERVICE_ROLE_KEY` (les workers en ont besoin).
- **Supabase** : Project Settings → Edge Functions → Secrets si tu utilises des Edge Functions (probablement pas en MVP).

Liste exhaustive des secrets nécessaires : voir spec technique 3 section 8.1.

## A.6. Activer le JWT custom claim hook dans Supabase (5 min)

Une fois que Claude Code a écrit la fonction SQL `add_organization_to_jwt` (déléguée), il y a un clic à faire toi-même : Dashboard Supabase → Authentication → Hooks → Custom Access Token → activer + sélectionner la fonction.

Sans ça, le claim `organization_id` n'apparaît pas dans le JWT et toutes tes RLS policies échouent silencieusement. C'est manuel parce que c'est dans le dashboard, pas par code.

## A.7. Lancer manuellement les migrations et le bootstrap EBTI

Ce sont des opérations sensibles que tu déclenches toi-même (pas en CI auto).

- `supabase db push` après chaque vague de nouvelles migrations validées en review
- Trigger manuel du worker `ingest_ebti_full` dans le dashboard Inngest **vendredi soir** de la semaine 1 (le scraping prend 6-8 jours)
- Trigger manuel du bootstrap initial pour `ingest_cn8` et `ingest_taric_full`

C'est la seule "activité de codeur" qui te reste : appuyer sur le bouton qui lance les workers une fois qu'ils sont validés.

## A.8. Ce qui te reste pour TOUT le reste du projet

À partir d'ici, ton boulot ce n'est plus de coder. C'est :

1. **Reviewer chaque PR de Claude Code avec rigueur**, en utilisant la checklist Partie C. C'est là que tu apportes ta vraie valeur — Claude Code écrit du code, toi tu garantis qu'il respecte la spec, qu'il ne dérive pas, qu'il n'introduit pas de bug subtil.
2. **Faire les acceptance tests manuels**. Ouvrir le browser, simuler un broker qui crée son premier dossier, sentir si le produit est cohérent. Aucun test unitaire ne remplace ça.
3. **Trancher les décisions stratégiques** quand Claude Code (ou la spec) hésite. C'est toi le métier.
4. **Garder la spec à jour**. Quand l'implémentation révèle un trou ou une mauvaise décision dans la spec, tu pingues (moi ou ton outil) pour amender, et tu mets à jour le doc avant de continuer.
5. **Lancer les CLIs sensibles** (déploiements en prod, migrations en prod, triggers de workers).

C'est un rôle de **lead technique + product owner** sur un projet où Claude Code est ton dev. Ça demande de la rigueur, de la lecture de diff précise, et de la patience. Pas de la dactylographie.

## A.9. Les 10 prompts à exécuter dans l'ordre, prêts à coller

Tu suis cette section comme un playbook. Chaque sous-section est un prompt complet et autonome que tu copies-colles directement dans Claude Code (avec le bon modèle indiqué). Tu lances, tu attends, tu reviews avec la checklist Partie C, tu commit, tu passes au suivant.

La Partie B après contient des **templates génériques** pour les tâches qui apparaîtront plus tard (nouvelles features, bugs, refactors). Mais pour les 10 premières étapes, **utilise les prompts ci-dessous tels quels**, pas la Partie B.

### Étape 1 — Bootstrap initial du repo

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : Verdyct est un SaaS B2B pour commissionnaires en douane français.
Stack figé : Next.js 15 (App Router) + Supabase (Postgres + Auth + Storage) + Drizzle ORM
+ Inngest (workers async) + Mistral (LLMs prod) + Vercel (hosting EU).
Monorepo Turborepo + pnpm. TypeScript strict partout.

**Ta tâche** : initialiser le repo monorepo vide à la racine. C'est la toute première étape, rien n'existe encore.

**Outputs attendus** — créer à la racine du repo :
- `package.json` (workspaces pnpm, scripts turbo dev/build/lint/type-check + db:generate/db:migrate)
- `pnpm-workspace.yaml` (packages : `apps/*`, `packages/*`, `workers/*`)
- `turbo.json` (tasks build/dev/lint/type-check)
- `tsconfig.base.json` (target ES2022, module ESNext, strict, noUncheckedIndexedAccess)
- `.gitignore` (node_modules, .next, .turbo, dist, .env*, *.log, .DS_Store)
- `.npmrc` si nécessaire pour Turborepo
- Structure de dossiers vides : `apps/web/`, `packages/db/`, `packages/shared-types/`, `packages/ai/`, `packages/customs/`, `packages/billing/`, `packages/emails/`, `packages/external/`, `workers/`, `supabase/migrations/`
- Un `.gitkeep` dans chaque dossier vide pour qu'ils soient committables

**Versions** : pnpm 9.x, turbo 2.x, typescript 5.5+, Node 22 LTS.

**Contraintes** :
- Aucun package.json dans les sous-packages encore
- Aucune dépendance npm hors devDependencies racine (turbo, typescript, prettier, @types/node)
- Pas de README.md, pas de docs

**Critères de succès** :
- `pnpm install` ne crash pas
- `pnpm type-check` ne crash pas (juste pas de fichiers à check encore)

**À ne PAS faire** :
- Pas de Next.js bootstrappé (étape 6)
- Pas de schéma Drizzle (étape 4)
- Pas de migration SQL (étape 3)
- Pas de fichier d'exemple ou de skeleton dans les sous-dossiers
```

---

### Étape 2 — Setup du package Drizzle

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : Verdyct monorepo Turborepo + pnpm. Le repo est setupé.
Stack : Next.js 15 + Supabase Postgres + Drizzle ORM. TypeScript strict.

**Ta tâche** : initialiser le package `@verdyct/db` dans `packages/db/`. Pas encore de schéma — juste l'infrastructure.

**Outputs attendus** :
- `packages/db/package.json` avec name `@verdyct/db`, private, deps `drizzle-orm` et `postgres`, devDeps `drizzle-kit` et `@types/pg`. Scripts `generate` et `migrate`.
- `packages/db/tsconfig.json` qui extend `../../tsconfig.base.json`
- `packages/db/drizzle.config.ts` pointant vers `./src/schema/*.ts`, output `./drizzle`, dialect `postgresql`, dbCredentials lisant `process.env.SUPABASE_DB_URL`
- `packages/db/src/client.ts` exportant `db` initialisé avec `drizzle(postgres(connectionString, { prepare: false }))`
- `packages/db/src/index.ts` qui re-exporte `db`
- `packages/db/src/schema/.gitkeep`

**Versions** : drizzle-orm ^0.30.0+, postgres ^3.4.0, drizzle-kit ^0.22.0+.

**Contraintes** :
- Aucune dépendance hors liste
- `prepare: false` obligatoire (Supabase pgbouncer en mode transaction)
- Pas de schémas — juste l'infrastructure

**Critères de succès** :
- `pnpm install` à la racine installe les deps proprement
- `pnpm type-check` passe sur `packages/db`

**À ne PAS faire** :
- Pas de schéma SQL ou Drizzle
- Pas d'ajout de drizzle-zod ou autre extension
- Pas de migration générée
```

---

### Étape 3 — Migrations Supabase 0001 + 0002 (extensions, helpers, tenancy)

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : Verdyct monorepo. Le repo et le package `@verdyct/db` sont setupés.

**Ta tâche** : créer les deux premières migrations SQL Supabase, qui posent les fondations DB.

**Spec à suivre** : `verdyct_spec_technique_2_data_model.md`, section 1 (tenancy) et section 6 (helpers RLS).

**Outputs attendus** :
- `supabase/migrations/0001_extensions_and_helpers.sql` :
  - Extensions : `uuid-ossp`, `pg_trgm`, `unaccent`, `vector`
  - Fonction `public.current_org_id()` (recopier exactement spec L2 section 6)
  - Fonction `public.add_organization_to_jwt(event jsonb)` (recopier exactement spec L2 section 6)
- `supabase/migrations/0002_tenancy.sql` :
  - Tables `organizations`, `users`, `organization_members`, `subscriptions` (SQL exact spec L2 section 1)
  - Indexes spécifiés
  - Enums `org_member_role`, `subscription_plan`, `subscription_status`

**Contraintes** :
- Recopier EXACTEMENT le SQL de la spec — pas d'invention
- `CREATE EXTENSION IF NOT EXISTS` pour les extensions
- `CREATE OR REPLACE FUNCTION` pour les fonctions
- Préfixe numérique 0001, 0002 (pas de timestamps)

**Critères de succès** :
- `supabase db push` (que je lance moi) ne crash pas
- Tables et fonctions créées
- `SELECT public.current_org_id()` retourne NULL en SQL editor (normal)

**À ne PAS faire** :
- Pas de tables métier (étape suivante)
- Pas de RLS policies (étape 5)
- Pas d'activation du JWT hook (je le fais manuellement, A.6)
```

---

### Étape 4 — Schémas Drizzle de toutes les tables

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : Verdyct monorepo. Le package `@verdyct/db` et les migrations 0001-0002 sont setupés.

**Ta tâche** : créer tous les schémas Drizzle correspondants à toutes les tables Verdyct (tenancy + métier + référentiels), même si les migrations SQL des tables métier ne sont pas encore écrites. Le schéma Drizzle est la source de vérité TypeScript.

**Spec à suivre** :
- `verdyct_spec_technique_1_cascade.md` sections 6.1-6.4 (référentiels publics)
- `verdyct_spec_technique_2_data_model.md` sections 1-5 (tenancy, parties, dossiers, CBAM, ops)
- `verdyct_spec_technique_3_integrations.md` section 6.1 (invitations) + autres tables annexes

**Outputs attendus** dans `packages/db/src/schema/` :
- `tenancy.ts` : organizations, users, organization_members, subscriptions
- `parties.ts` : parties, partie_relations, partie_contacts, bti_records
- `dossiers.ts` : dossiers, dossier_documents, lignes_dossier, suggestions, decision_log
- `cbam.ts` : cbam_data, cbam_quarterly_reports
- `ops.ts` : email_inbound_addresses, relances, notifications, metric_events, invitations, onboarding_funnel, stripe_webhook_events, inbound_email_log
- `referentials.ts` : cn_codes, taric_measures, ebti_cases, explanatory_notes
- `index.ts` : re-exporte tout

**Contraintes** :
- Conversion mécanique SQL → Drizzle
- Noms de table et colonne EXACTS
- Mapping types : `NUMERIC(p,s)` → `numeric({ precision: p, scale: s })`, `TIMESTAMPTZ` → `timestamp({ withTimezone: true })`, `VARCHAR(N)` → `varchar({ length: N })`, `TEXT` → `text`, `UUID` → `uuid`, `JSONB` → `jsonb`, `VECTOR(N)` → `vector({ dimensions: N })`
- Enums Postgres → `pgEnum` Drizzle
- Indexes spécifiés (avec WHERE partials) → index Drizzle
- FK → `references`
- Exporter `$inferSelect` et `$inferInsert` pour chaque table
- Pas de `relations()` Drizzle pour l'instant

**Critères de succès** :
- `pnpm type-check` passe
- Les types `OrganizationSelect`, `OrganizationInsert`, `DossierSelect`, etc. sont exportés
- Aucune table de la spec manquante

**À ne PAS faire** :
- Pas d'invention de colonne ou relation
- Pas de modification de nullabilité ou default
- Pas de génération de migration Drizzle
- Pas de packages externes (drizzle-zod, etc.)
```

---

### Étape 5 — Migrations Supabase 0003 (tables métier) + 0004 (RLS policies)

**Modèle** : **Sonnet 4.6**. Review **TRÈS rigoureuse** car la sécurité (RLS) est critique.

```markdown
**Contexte projet** : Le repo, les schémas Drizzle, et les migrations 0001-0002 sont en place.

**Spec à suivre** :
- `verdyct_spec_technique_2_data_model.md` sections 2-5 (parties, dossiers, CBAM, ops)
- `verdyct_spec_technique_2_data_model.md` section 6 (RLS pattern)
- `verdyct_spec_technique_3_integrations.md` section 6.1 (invitations) et autres tables

**Outputs attendus** :
- `supabase/migrations/0003_metier_tables.sql` : SQL complet de toutes les tables métier (parties, partie_relations, partie_contacts, bti_records, dossiers, dossier_documents, lignes_dossier, suggestions, decision_log, cbam_data, cbam_quarterly_reports, email_inbound_addresses, relances, notifications, metric_events, invitations, onboarding_funnel, stripe_webhook_events, inbound_email_log) avec enums, indexes, FK
- `supabase/migrations/0004_rls_policies.sql` :
  - Activer RLS sur toutes les tables avec organization_id
  - Pour chaque table : policies SELECT/INSERT/UPDATE pattern `organization_id = public.current_org_id()`
  - Policies nommées `<action>_same_org`
  - Cas spéciaux (organizations, organization_members, users, parties, decision_log) selon spec L2 section 6
  - `parties` reste sans RLS, `GRANT SELECT TO authenticated`
  - `decision_log` : INSERT révoqué de `authenticated`, donné à `service_role`

**Contraintes** :
- SQL EXACT de la spec
- Aucune policy `using (true)` même pour debug
- Toujours `current_org_id()`, jamais `auth.uid()` direct
- Pas de DELETE policies (soft-delete via `deleted_at`)

**Critères de succès** :
- `supabase db push` ne crash pas
- Test que je ferai : user org A ne voit pas rows org B
- INSERT user org A avec `organization_id` org B est rejeté

**À ne PAS faire** :
- Pas de modification du schéma vs spec
- Pas de policy custom non spec'ée
- Pas de modification des migrations 0001-0002
```

---

### Étape 6 — Bootstrap Next.js + auth flow magic link

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : Verdyct monorepo. Le repo, la DB Supabase (avec tenancy + RLS) sont setupés.

**Ta tâche** : bootstrapper l'app Next.js dans `apps/web/` et implémenter le flow d'authentification magic link via Supabase Auth.

**Outputs attendus** dans `apps/web/` :
- `package.json` avec name `@verdyct/web`, deps `next@15`, `react@19`, `react-dom@19`, `@supabase/supabase-js`, `@supabase/ssr`, `tailwindcss`, dep workspace `@verdyct/db`, devDeps standard Next
- Bootstrap Next.js 15 App Router avec TypeScript + Tailwind, configuré manuellement
- `lib/supabase/server.ts` : client Supabase serveur avec cookies (pattern @supabase/ssr)
- `lib/supabase/client.ts` : client Supabase navigateur
- `middleware.ts` : refresh session + redirect vers /auth/login si route protégée et pas authentifié
- `app/auth/login/page.tsx` : form magic link (email seul, bouton "Recevoir le lien")
- `app/auth/callback/route.ts` : callback magic link, échange du code, redirect vers `/`
- `app/(app)/layout.tsx` : layout protégé qui vérifie la session
- `app/(app)/page.tsx` : page d'accueil affichant `Hello {user.email}` + bouton logout

**Contraintes** :
- Next.js 15 App Router, pas Pages Router
- Server Components par défaut, "use client" uniquement pour le form de login
- Variables d'env : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Tailwind brut, pas de UI lib (shadcn etc. plus tard)
- Pas de gestion organizations encore

**Critères de succès** :
- `pnpm dev` lance Next sur localhost:3000
- localhost:3000 → redirection vers /auth/login
- Saisis email → reçois magic link → cliques → "Hello <email>"
- Logout → retour login

**À ne PAS faire** :
- Pas de page d'inscription séparée (magic link gère tout)
- Pas de design poussé (Julius polira)
- Pas d'ajout de UI libs
```

---

### Étape 7 — Worker `ingest_cn8` + setup Inngest

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : (idem). Les tables référentiels existent en DB. Inngest n'est pas encore setup.

**Ta tâche** : (1) installer et configurer Inngest dans `apps/web`, (2) implémenter le worker `ingest_cn8`.

**Spec à suivre** : `verdyct_spec_technique_1_cascade.md` sections 6.1 (CN8) et 7.1 (worker).

**Outputs attendus** :
- `apps/web/lib/inngest/client.ts` : `export const inngest = new Inngest({ id: 'verdyct' })`
- `apps/web/app/api/inngest/route.ts` : route handler standard Inngest
- `workers/ingest_cn8/` :
  - `package.json` avec name `@verdyct/worker-ingest-cn8`, deps `inngest`, `@verdyct/db`, lib parsing XML (`fast-xml-parser` ou `xml2js`)
  - `index.ts` : fonction Inngest exportée, trigger manuel + cron annuel 1er novembre
  - `parse.ts` : logique pure de parsing du XML CN
  - `parse.test.ts` : tests unitaires avec un fixture XML

**Contraintes** :
- Idempotence : UPSERT par code, pas INSERT
- `step.run('label', ...)` : 'fetch-xml', 'parse', 'upsert-batch', 'expire-removed'
- Logs JSON structurés avec correlation_id et nom du worker
- Codes absents du nouveau XML → marqués `valid_until = (start_date - 1 day)`, jamais DELETE
- URL source CN hardcodée en const (Eurostat publie l'XML annuel)
- Importer le worker dans `apps/web/app/api/inngest/route.ts`

**Critères de succès** :
- Test unitaire passe avec fixture
- Lancement local (Inngest Dev Server) → table `cn_codes` a ~9500 rows
- Re-lancement → 0 nouvelle row

**À ne PAS faire** :
- Pas de sleep/throttle (fichier petit)
- Pas de dépendance npm hors liste
```

---

### Étape 8 — Worker `ingest_taric_full`

**Modèle** : **Sonnet 4.6**.

```markdown
**Contexte projet** : (idem). `ingest_cn8` est en place. Inngest configuré.

**Ta tâche** : implémenter le worker `ingest_taric_full` (bootstrap initial des mesures TARIC).

**Spec à suivre** : `verdyct_spec_technique_1_cascade.md` sections 6.2 (TARIC) et 7.2 (worker).

**Outputs attendus** :
- `workers/ingest_taric_full/` :
  - `package.json` similaire à `ingest_cn8`
  - `index.ts` : fonction Inngest, trigger manuel uniquement
  - `parse.ts` : parsing XML par batch de 10 000 mesures
  - `parse.test.ts` : tests sur fixture
- Importer dans `apps/web/app/api/inngest/route.ts`

**Contraintes** :
- Idempotence par `source_id` (UNIQUE)
- `step.run` par batch
- Mesures absentes du dump → `valid_until` mis à jour
- Source : dump statique TARIC3, URL hardcodée en const
- Logs JSON structurés

**Critères de succès** :
- Lancement local → `taric_measures` peuplée (200k+ rows attendues)
- Re-lancement → idempotent

**À ne PAS faire** :
- Pas de delta sync (autre worker plus tard)
- Pas d'auto-cron
```

---

### Étape 9 — Squelette de la cascade engine (orchestrateur seul)

**Modèle** : **Sonnet 4.6** pour le squelette. Les vraies couches L1/L2/L3 viendront plus tard avec Opus.

```markdown
**Contexte projet** : (idem). Les workers d'ingestion sont en place.

**Ta tâche** : implémenter UNIQUEMENT l'orchestrateur de la cascade — l'enchaînement L1 → L2 → L3 avec des stubs. Pas d'implémentation des couches.

**Spec à suivre** : `verdyct_spec_technique_1_cascade.md` section 1 (architecture globale) et types des sections 2-4 (Layer1Result, Layer2Result, Layer3Result).

**Outputs attendus** :
- `packages/shared-types/package.json` (si pas créé) avec name `@verdyct/shared-types`
- `packages/shared-types/src/cascade.ts` : types `CascadeInput`, `Layer1Result`, `Layer2Result`, `Layer3Result` selon spec L1
- `packages/shared-types/src/index.ts` qui re-exporte
- `workers/cascade_process_line/` :
  - `package.json` avec deps `inngest`, `@verdyct/db`, `@verdyct/shared-types`
  - `index.ts` : fonction Inngest `cascade.process_line`, déclenchée par event `dossier.lines_extracted`
  - Logique : layer1 stub → si confidence ≥ 0.75 stop, sinon layer2 stub → si ≥ 0.80 stop, sinon layer3 stub
  - Chaque stub log "Layer X stub called" et retourne valeurs hardcodées
  - `step.run('layer-1', ...)`, etc.
- Importer dans `apps/web/app/api/inngest/route.ts`

**Contraintes** :
- C'est un squelette — pas d'implémentation réelle
- Stubs qui permettent de tester le chaînage end-to-end
- Seuils hardcodés selon spec (0.75, 0.80)
- Types respectent strictement la spec L1

**Critères de succès** :
- Trigger manuel event `dossier.lines_extracted` → 3 logs L1/L2/L3 stub apparaissent dans l'ordre
- `pnpm type-check` passe partout

**À ne PAS faire** :
- Pas d'implémentation réelle des couches
- Pas de persistance de suggestions
- Pas d'appels Mistral
```

---

### Étape 10 — Worker `ingest_ebti_full` (CRITIQUE, à finaliser avant vendredi)

**Modèle** : **Opus 4.6 obligatoire**. Worker complexe : scraping rate-limité, state save, reprise sur incident, embedding par batch.

```markdown
**Contexte projet** : (idem). Le squelette cascade est en place. C'est le PLUS IMPORTANT et le PLUS COMPLEXE des workers initiaux.

**Spec à suivre** : `verdyct_spec_technique_1_cascade.md` sections 6.3 (EBTI) et 7.4 (worker).

**Outputs attendus** :
- `supabase/migrations/0005_ebti_scraper_state.sql` : table `ebti_scraper_state` (singleton id=1) avec `last_page_processed INT`, `total_processed INT`, `started_at TIMESTAMPTZ`, `last_run_at TIMESTAMPTZ`
- Schéma Drizzle correspondant ajouté à `packages/db/src/schema/referentials.ts`
- `packages/external/mistral/` :
  - `package.json` avec dep SDK Mistral
  - `embed.ts` : helper `mistralEmbed(texts: string[]): Promise<number[][]>` qui appelle Mistral Embed (1024 dim) par batch
- `workers/ingest_ebti_full/` :
  - `package.json` avec deps `inngest`, `@verdyct/db`, `cheerio`, `undici`, workspace `@verdyct/external`
  - `index.ts` : fonction Inngest, trigger manuel uniquement
  - `scraper.ts` : logique de scraping de l'interface EBTI3 publique
  - `state.ts` : helpers `loadState()` / `saveState(page, total)`
  - `scraper.test.ts` : tests sur le parser HTML avec fixtures
- Importer dans `apps/web/app/api/inngest/route.ts`

**Contraintes** :
- Rate limit STRICT : 1 requête / 2 secondes (non négociable, sinon blocage)
- Reprise sur incident : à chaque page traitée, save dans `ebti_scraper_state`. Démarrage = `last_page_processed + 1`
- Embedding par batch de 50 cas (Mistral accepte des batch)
- Logs progressifs : log toutes les 1000 cas
- `step.run` par chunk de 100 cas (retries Inngest sans tout reperdre)
- Skip si `bti_id` existe déjà
- User-agent : `"Verdyct-Customs-Tool/1.0 (contact@verdyct.io)"`

**Critères de succès** :
- Test unitaire scraper passe sur fixtures
- Lancement local → après 30 min, ~900 cas traités sans erreur
- Si on kill le process et on relance → reprend de la bonne page

**À ne PAS faire** :
- Pas de parallélisation HTTP (rate limit oblige sériel)
- Pas de skip silencieux d'erreurs : log et continue, incrémente counter
- Pas de retry HTTP interne (Inngest gère)
- Pas d'optimisation prématurée (worker tourne 6-8 jours, c'est OK)
```

**Vendredi soir** : tu lances ce worker manuellement depuis le dashboard Inngest. Il scrape pendant tout le weekend. Lundi matin tu vérifies → ~30 000 cas traités attendus.

---

Une fois ces 10 étapes terminées, tu as les fondations posées + tous les référentiels publics ingérés (CN8 + TARIC + EBTI). Les prochaines étapes (vraies couches L1/L2/L3 de la cascade, parsers de docs, Stripe, Resend, etc.) sont des nouvelles tâches qu'on cadrera au fur et à mesure — utilise les **templates génériques de Partie B** ci-dessous comme structure et adapte selon la spec.

---

# PARTIE B — Comment parler à Claude Code

## B.0. Les 5 règles d'or

**(1) Une tâche, une PR, une review.** Jamais "implémente la livraison 2". Toujours "implémente la table `dossiers` avec ses RLS policies et un test de la policy".

**(2) Toujours référencer la section de la spec.** Le doc complet doit être en contexte de Claude Code (file ou copy-paste), et le prompt pointe la section précise.

**(3) Donner les inputs disponibles.** Quels fichiers existent déjà, quels types peut-il importer, quelles fonctions peut-il appeler. Sinon il invente.

**(4) Énoncer les contraintes négatives.** "N'invente PAS de colonne. Ne change PAS le schéma. N'ajoute PAS de dépendance sans valider avec moi."

**(5) Critère de succès vérifiable.** Comment tu vas tester que c'est bon. Le critère oblige Claude Code à produire quelque chose de testable.

---

## Comment choisir le modèle Claude Code (Opus / Sonnet / Haiku)

Claude Code te laisse choisir le modèle au moment de lancer une tâche. Tu vas en utiliser trois principalement (au prix mai 2026) :

- **Opus 4.6** — le plus puissant. Raisonnement profond, architecture complexe, prompts LLM stratégiques, debug difficile, refactoring large. Coûte le plus cher en tokens.
- **Sonnet 4.6** — l'équilibre. Code direct bien défini, scaffolding, schémas, intégrations standard, tests unitaires. Beaucoup moins cher qu'Opus, ~80% des perfs sur les tâches non-stratégiques.
- **Haiku 4.5** — le rapide. Très petits fixes, formatting, ajout de tests basiques. Évite-le pour tout ce qui touche à de la logique métier.

**Règle par défaut** : commence en Sonnet. Si Claude Code patine (boucle, propose des solutions médiocres, manque le contexte), bascule en Opus pour cette tâche-là spécifiquement.

**Ne JAMAIS utiliser Opus pour** : du scaffolding, des conversions SQL → Drizzle mécaniques, des tests basiques, des renames. C'est cher et inutile.

**TOUJOURS utiliser Opus pour** : la cascade engine (couches L1/L2/L3), les parsers LLM avec structured output, l'agent IA avec tools, tout refactor qui touche > 5 fichiers, n'importe quoi de stratégique pour le moat produit.

Chaque template ci-dessous indique en haut quel modèle utiliser par défaut.

---

## B.1. Template — Implémenter un worker d'ingestion

**Modèle Claude Code recommandé** : **Sonnet 4.6** par défaut. Bascule sur **Opus 4.6** uniquement pour les workers complexes — typiquement le scraper EBTI (state save, rate limiting subtil, reprise sur incident), parsing XML imbriqué multi-niveaux, ou logique d'idempotence non triviale.

```markdown
**Contexte projet** : Verdyct est un SaaS pour commissionnaires en douane français.
Stack : Next.js 15 + Supabase + Drizzle + Inngest + Mistral.
Monorepo Turborepo + pnpm. Tu travailles dans la branche `feat/<worker-name>`.

**Spec à suivre** : voir `verdyct_spec_technique_1_cascade.md` section 7.X
(remplace X par la section précise du worker en question).

**Ta tâche** : implémenter le worker Inngest `<nom_du_worker>`.

**Inputs disponibles** :
- Client Inngest : `apps/web/lib/inngest/client.ts` (export `inngest`)
- Client Drizzle DB : `packages/db/src/client.ts` (export `db`)
- Schema des tables cibles : `packages/db/src/schema/<fichier>.ts`
- Helper de logging : `packages/external/logger.ts` (export `createLogger`)

**Outputs attendus** :
Crée le dossier `workers/<nom_du_worker>/` avec :
- `index.ts` — la fonction Inngest exportée
- `<nom>_logic.ts` — la logique métier pure (parsing, transformations) testable indépendamment
- `<nom>_logic.test.ts` — tests unitaires sur `<nom>_logic.ts` avec au moins 3 cas

**Contraintes** :
- Idempotence obligatoire (clé d'idempotence Inngest + UPSERT en DB)
- Découpage en `step.run('label', async () => ...)`
- Logging JSON structuré avec correlation_id, organization_id (si applicable),
  et le nom du worker dans chaque log
- Pas de SQL inline : passer par les helpers de `packages/db/queries/`
  (crée-les si nécessaires)
- Pas d'invention de schéma : si une colonne manque, arrête-toi et demande
- Trigger conforme à la spec (cron / event / manuel)

**Critères de succès** :
- `pnpm type-check` passe
- `pnpm test --filter <nom>_logic` passe
- En lançant le worker localement (Inngest Dev Server), il s'exécute sans erreur
- Re-lancer le worker n'insère PAS de nouvelle row (test idempotence)

**À ne PAS faire** :
- Pas d'ajout de dépendance npm sans me demander
- Pas de modification de fichier en dehors de `workers/<nom>/` et `packages/db/queries/<nom>.ts`
- Pas de console.log, uniquement le logger structuré
```

---

## B.2. Template — Implémenter une couche de la cascade

**Modèle Claude Code recommandé** : **Opus 4.6 obligatoire**. C'est le cœur du moat produit. Raisonnement métier dense, multiples branches algorithmiques, formules de confiance, edge cases nombreux. Sonnet va te sortir du code qui semble OK mais qui rate les seuils ou les fallbacks. Pour la couche 3 (agent IA), Opus est non-négociable parce que le design des tools et de la boucle d'arrêt demande de la finesse.

```markdown
**Contexte projet** : (idem B.1)

**Spec à suivre** : `verdyct_spec_technique_1_cascade.md` section <N>
(2 pour Layer 1, 3 pour Layer 2, 4 pour Layer 3).

**Ta tâche** : implémenter la fonction `runLayer<N>(input: CascadeInput): Promise<Layer<N>Result>`
qui constitue la couche <N> de la cascade.

**Inputs disponibles** :
- Types `CascadeInput` et `Layer<N>Result` dans `packages/shared-types/src/cascade.ts`
- Client Mistral pour embeddings : `packages/ai/src/embeddings.ts` (export `mistralEmbed`)
- Client DB : `packages/db/src/client.ts`
- Helper de normalisation : `packages/customs/src/normalize.ts` (export `normalizeDescription`)

**Outputs attendus** :
Crée `packages/customs/src/cascade/layer<N>.ts` qui exporte `runLayer<N>`.
Plus un fichier de tests `packages/customs/src/cascade/layer<N>.test.ts` avec :
- Au moins 4 cas couvrant les différentes branches de l'algorithme
- Mocks de la DB et des services externes

**Contraintes** :
- Suivre EXACTEMENT les seuils de confiance de la spec (ne pas les ajuster)
- Suivre EXACTEMENT le format Layer<N>Result de la spec
- Pas de query SQL inline, passer par les helpers de `packages/db/queries/cascade.ts`
- Tous les logs incluent `ligne_id` et `dossier_id`
- Si l'input est invalide (champs manquants requis), throw VerdyctError('VALIDATION', ...)

**Critères de succès** :
- `pnpm type-check` passe
- `pnpm test layer<N>` passe avec 100% des cas
- Couvre le cas où la layer ne trouve rien (retour `{ found: false }`)

**À ne PAS faire** :
- Pas de raccourci sur les seuils (je vérifierai à la review)
- Pas d'ajout de logique non spécifiée (genre "et au cas où ajouter une vérif XYZ")
- Pas d'appel à des layers d'autres niveaux depuis cette fonction (séparation stricte)
```

---

## B.3. Template — Créer un schéma Drizzle depuis du SQL

**Modèle Claude Code recommandé** : **Sonnet 4.6**. Conversion mécanique SQL → TypeScript Drizzle, zéro raisonnement créatif. Surveille en review qu'il ne "réinterprète" pas un type (NUMERIC en number JS au lieu de string par exemple).

```markdown
**Contexte projet** : (idem)

**Spec à suivre** : `verdyct_spec_technique_2_data_model.md` section <N>.

**Ta tâche** : convertir le SQL CREATE TABLE de la section <N> en schéma Drizzle ORM
dans `packages/db/src/schema/<domaine>.ts`.

**Inputs disponibles** :
- Schémas existants dans `packages/db/src/schema/`
- Drizzle est installé en version `drizzle-orm@^0.30.0`

**Outputs attendus** :
- Un fichier `packages/db/src/schema/<domaine>.ts` qui exporte tous les schémas
  Drizzle correspondants aux tables de la section
- Les types TypeScript inférés via `$inferSelect` et `$inferInsert` pour chaque table
- Les enums Postgres convertis en `pgEnum` Drizzle
- Les relations Drizzle (`relations()`) pour les FK

**Contraintes** :
- Respecter EXACTEMENT les noms de table et de colonne du SQL
- Respecter les types (NUMERIC(14,2) → numeric avec precision/scale, TIMESTAMPTZ → timestamp avec timezone)
- Ne pas créer de migration SQL Drizzle (les migrations vivent côté Supabase)
- Le mode est `mode: 'standalone'` (pas de génération de migration auto)

**Critères de succès** :
- `pnpm type-check` passe sur ce package
- Les types `<NomTable>Select` et `<NomTable>Insert` sont exportés et corrects

**À ne PAS faire** :
- Ne pas inventer de colonne ou de relation absente du SQL
- Ne pas changer un nullable en non-nullable
- Ne pas changer un default
```

---

## B.4. Template — Implémenter une RLS policy

**Modèle Claude Code recommandé** : **Sonnet 4.6**. Pattern répétitif et très bien spécifié dans la livraison 2 section 6. Mais reviewe ULTRA rigoureusement parce qu'une RLS mal foutue = leak cross-org, et c'est ton risque le plus grave.

```markdown
**Contexte projet** : (idem)

**Spec à suivre** : `verdyct_spec_technique_2_data_model.md` section 6
(pattern RLS) + section <N> pour la table cible.

**Ta tâche** : créer une migration SQL `supabase/migrations/<NNNN>_rls_<table>.sql`
qui ajoute les RLS policies pour la table `<nom_table>`.

**Inputs disponibles** :
- Helper SQL `public.current_org_id()` déjà créé
- La table `<nom_table>` existe avec une colonne `organization_id`

**Outputs attendus** :
- Un fichier de migration SQL avec :
  - `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
  - Policy SELECT : `using (organization_id = public.current_org_id())`
  - Policy INSERT : `with check (organization_id = public.current_org_id())`
  - Policy UPDATE : `using (...) with check (...)`
  - Pas de DELETE policy (soft-delete via deleted_at)

**Contraintes** :
- Suivre exactement le pattern de la livraison 2 section 6
- Les noms de policies suivent le format `<action>_same_org`
- Pas de variations exotiques (genre policies différentes selon le rôle) sauf si la spec le demande explicitement

**Critères de succès** :
- `supabase db push` sur une branche de test ne plante pas
- Test manuel : connecté en user de l'org A, je ne vois pas les rows de l'org B
- Test manuel : connecté en user de l'org A, INSERT avec organization_id de l'org B est rejeté
```

---

## B.5. Template — Implémenter une Server Action

**Modèle Claude Code recommandé** : **Sonnet 4.6** par défaut. Bascule sur **Opus 4.6** pour les Server Actions complexes (`validateLigne` qui touche cascade + audit log + events, `generateDeclaration` qui génère du XML structuré, `acceptInvitation` qui orchestre signup + jointure + auth flow).

```markdown
**Contexte projet** : (idem)

**Spec à suivre** : `verdyct_spec_technique_2_data_model.md` section 9
(contrat des Server Actions). La signature exacte est `<signature>`.

**Ta tâche** : implémenter la Server Action `<nomAction>` dans
`apps/web/app/actions/<domaine>.ts`.

**Inputs disponibles** :
- Types métier dans `packages/shared-types/`
- Client DB authentifié dans `apps/web/lib/db.ts`
- Helper d'auth dans `apps/web/lib/auth.ts` (export `requireUser()` et `requireOrg()`)
- Helper de quotas dans `packages/billing/src/quotas.ts` si applicable
- Client Inngest pour émettre des événements

**Outputs attendus** :
- La Server Action exportée avec sa signature exacte
- La validation des inputs (zod ou similaire — utiliser ce qui est déjà installé)
- Les checks d'autorisation (auth + RLS + quotas)
- L'émission des événements Inngest si applicable
- L'enregistrement d'un metric_event si applicable

**Contraintes** :
- Toute Server Action commence par `'use server';`
- Validation explicite des inputs avant tout usage
- Erreurs typées via `VerdyctError` (codes : NOT_FOUND, FORBIDDEN, VALIDATION, CONFLICT, EXTERNAL_API_FAILED, UNKNOWN)
- Pas de SQL inline : passer par `packages/db/queries/`
- Logger l'action avec organization_id, user_id, action_name

**Critères de succès** :
- `pnpm type-check` passe
- Test manuel : appel depuis le frontend marche, RLS empêche l'accès cross-org
- Si l'action mute la DB : transactionnelle (ne laisse pas de state inconsistent)
```

---

## B.6. Template — Implémenter un parser de document

**Modèle Claude Code recommandé** : **Opus 4.6**. Le parser combine extraction structurée par LLM, validation par schéma, gestion d'edge cases (PDFs mal formés, OCR foireux, scans inclinés), et confidence scoring par champ. C'est le genre de tâche où Sonnet va sortir une version qui marche sur le happy path et qui pète à la première facture exotique.

```markdown
**Contexte projet** : (idem)

**Spec à suivre** : `verdyct_spec_technique_2_data_model.md` sections 7 et 8.2
(workers `parse_documents` et `extract_structured_data`).

**Ta tâche** : implémenter `<parser_pdf | parser_excel | extract_lignes_from_text>`.

**Inputs disponibles** :
- Lib PDF : `pdf-parse` ou `pdfplumber` via Python sidecar (à arbitrer)
- Lib Excel : `xlsx`
- Client Mistral Small : `packages/ai/src/mistral.ts` (export `mistralSmallChat`)
- Templates de prompts : `packages/ai/src/prompts/extract_dossier.ts`

**Outputs attendus** :
- Module dans `packages/customs/src/parsers/<nom>.ts`
- Fonction pure si possible, async si appel LLM
- Tests avec fixtures réels dans `packages/customs/src/parsers/__fixtures__/`
  (factures réelles anonymisées suffit, pas besoin de variété énorme)

**Contraintes** :
- Output toujours typé via une interface explicite (genre `ParsedFacture`)
- En cas d'extraction LLM : structured output JSON, validé par zod
- En cas d'échec : log structuré + throw VerdyctError, ne pas avaler silencieusement
- Confidence scoring : pour chaque champ extrait, retourner aussi un score 0-1
- Idempotence : même input → même output (températures LLM à 0)

**Critères de succès** :
- Tests passent sur les fixtures
- Le parser ne crash pas sur un PDF mal formé (renvoie une erreur typée)
- Sur facture standard (FR), tous les champs principaux extraits avec confidence > 0.8

**À ne PAS faire** :
- Pas de tentative de "deviner" les valeurs manquantes (laisser null + flag)
- Pas de logique métier dans le parser (juste extraction structurée)
```

---

## B.7. Template — Implémenter un webhook handler

**Modèle Claude Code recommandé** : **Sonnet 4.6**. Boilerplate-y mais avec sécurité critique (vérif signature, idempotence). La complexité vient de la spec, pas du code. Reviewe spécifiquement : signature vérifiée AVANT tout parsing, idempotence par event_id, retour 200 même sur event ignoré.

```markdown
**Contexte projet** : (idem)

**Spec à suivre** : `verdyct_spec_technique_3_integrations.md` section <N>.

**Ta tâche** : implémenter le webhook handler `/api/webhooks/<service>/route.ts`
qui traite les événements <service> et synchronise notre DB.

**Inputs disponibles** :
- SDK <service> : `<package_name>`
- Client DB : `packages/db/src/client.ts`
- Client Inngest pour émettre les événements internes
- Variables d'env : `<SERVICE>_WEBHOOK_SECRET` etc.

**Outputs attendus** :
- Route handler `apps/web/app/api/webhooks/<service>/route.ts`
- Vérification de signature obligatoire avant tout traitement
- Idempotence via table `<service>_webhook_events`
- Switch sur le `event.type` pour traiter chaque cas
- Tests pour au moins 3 types d'événements

**Contraintes** :
- TOUJOURS vérifier la signature en premier
- TOUJOURS logger l'event_id reçu (pour debug)
- TOUJOURS retourner 200 même si l'événement n'est pas traité (sinon le service va retry indéfiniment)
- Idempotence : si event_id déjà traité, retourner 200 immédiatement
- Pas de logique métier longue dans le handler : déléguer à un worker Inngest si > 1s de travail

**Critères de succès** :
- Test avec un payload signé valide → traité
- Test avec un payload signé invalide → rejected (401)
- Test avec un event_id déjà reçu → idempotent (200, pas de double traitement)

**À ne PAS faire** :
- Pas d'opération DB synchrone qui peut être longue (parsing, LLM, etc.) → Inngest
- Pas de réponse non-200 sauf si erreur de signature
```

---

## B.8. Template — Écrire des tests sur du code existant

**Modèle Claude Code recommandé** : **Sonnet 4.6**. Mécanique. **Haiku 4.5** acceptable pour des tests très simples (helpers utilitaires purs). Bascule sur **Opus 4.6** si tu testes du code complexe avec beaucoup de mocks subtils ou du code avec branches conditionnelles imbriquées (genre la cascade engine).

```markdown
**Contexte projet** : (idem)

**Ta tâche** : écrire des tests unitaires pour `<chemin/fichier.ts>` qui n'a pas encore
de couverture.

**Inputs disponibles** :
- Le code à tester
- Vitest est installé. Mocks via `vi.mock()`.

**Outputs attendus** :
- Un fichier `<chemin/fichier.test.ts>` avec au moins :
  - Le happy path
  - Les cas limites (input vide, input invalide, valeurs extrêmes)
  - Les cas d'erreur (exceptions levées)
  - Les branches conditionnelles principales

**Contraintes** :
- Mocker uniquement les dépendances externes (DB, API, LLM), PAS la logique métier
- Pas de test qui dépend du temps réel (utiliser `vi.useFakeTimers()`)
- Chaque test commence par "it should..." en anglais
- Si tu identifies un bug pendant que tu écris les tests, signale-le mais NE LE CORRIGE PAS

**Critères de succès** :
- `pnpm test <chemin>` passe à 100%
- Couverture > 80% sur les branches
```

---

## Checklist de review d'une PR Claude Code

Pour chaque PR, **avant de merger**, vérifie :

**Schéma & data**
- [ ] Aucune colonne ajoutée non spécifiée dans la spec
- [ ] Aucune colonne supprimée vs ce qui était attendu
- [ ] Tous les types correspondent (NUMERIC vs FLOAT, TIMESTAMPTZ vs TIMESTAMP)
- [ ] Tous les nullables sont conformes
- [ ] Les contraintes UNIQUE / FK / CHECK sont là

**RLS & sécurité**
- [ ] Toutes les tables avec `organization_id` ont RLS activé
- [ ] Pas de `bypass RLS` non justifié
- [ ] Le `service_role` n'est utilisé QUE dans les workers, jamais dans le code app
- [ ] Aucune query qui filtre uniquement sur `id` sans `organization_id` (RLS protège mais bonne ceinture-bretelle)

**Workers & idempotence**
- [ ] Idempotence : re-run sans effet de bord
- [ ] Découpage en `step.run`
- [ ] Logs structurés avec context (org_id, dossier_id, etc.)
- [ ] Retry / timeout configurés

**LLM & prompts**
- [ ] Température à 0 pour les tâches structurées (extraction, classification)
- [ ] Output validé par schéma (zod)
- [ ] Sources obligatoires capturées et stockées
- [ ] Pas de prompt pleine de fluff "tu es un assistant expert blah blah" — concis et précis

**Erreurs**
- [ ] Erreurs typées (pas de `throw "string"`)
- [ ] `VerdyctError` avec un code parmi la liste autorisée
- [ ] Pas d'erreurs avalées silencieusement (`catch (e) {}`)

**Tests**
- [ ] Au moins le happy path et 1 cas d'erreur
- [ ] Mocks limités aux dépendances externes
- [ ] Tests passent (`pnpm test`)

**Qualité générale**
- [ ] `pnpm type-check` passe
- [ ] `pnpm lint` passe
- [ ] Pas de `console.log` oubliés
- [ ] Pas de TODO non documentés
- [ ] Pas de dépendances npm ajoutées sans validation préalable

Si une seule case n'est pas cochée, tu demandes à Claude Code de corriger avant merge.

---

# PARTIE C — Pièges classiques à éviter

## C.1. Le piège du "Claude Code invente la spec"

**Symptôme** : tu ne lui donnes pas la section de spec → il l'invente. Le code est élégant mais ne correspond pas à ce qu'on a défini.

**Remède** : toujours coller la section de spec concernée dans le prompt, ou pointer vers le fichier en contexte. Et énoncer "ne dévie PAS de cette spec".

## C.2. Le piège du "schéma qui dérive"

**Symptôme** : Claude Code "améliore" le schéma en ajoutant `created_by`, `metadata`, `version` un peu partout. Au bout de 5 PRs, tes tables ressemblent à un sapin de Noël.

**Remède** : compare le SQL du schéma final au SQL de la spec, ligne par ligne. Tout ajout doit être justifié et figé dans une nouvelle version de la spec.

## C.3. Le piège du "prompt LLM enflé"

**Symptôme** : tu lui demandes d'écrire un prompt pour le worker `extract_structured_data`. Il pond 200 lignes de prompt avec 15 exemples. Coût par appel x4.

**Remède** : revoir le prompt critique et demander "réduis ce prompt à l'essentiel, vise 50 lignes max, 1 exemple suffit".

## C.4. Le piège du "RLS bypass silencieux"

**Symptôme** : un endpoint utilise le `service_role` "parce que ça marche pas avec l'anon role" → en réalité il fait un bypass RLS sans s'en rendre compte. Risque : un user voit les données d'un autre.

**Remède** : règle absolue : `service_role` n'est utilisé QUE dans `workers/`. Si tu vois `service_role` dans `apps/web/app/actions/`, c'est un bug.

## C.5. Le piège du "test qui mock tout"

**Symptôme** : tests qui mockent la DB, les helpers, les utils, et il ne reste qu'à tester... rien. Le test passe toujours mais ne vérifie rien.

**Remède** : règle : on ne mock QUE ce qui sort de l'application (DB connection, API externe, filesystem, time). Tout le reste tourne réellement. Si un test passe mais que le code en prod crash, c'est qu'il y avait trop de mocks.

## C.6. Le piège du "worker sans idempotence"

**Symptôme** : un worker marche en local. En prod, Inngest le retry une fois (failure réseau transitoire), et tu te retrouves avec 2 dossiers créés au lieu d'1.

**Remède** : tout worker qui CRÉE de la donnée doit avoir une clé d'idempotence (UPSERT, ou check d'existence en début, ou Inngest `idempotency` config). À vérifier à chaque review.

## C.7. Le piège du "j'ajoute juste une colonne"

**Symptôme** : Claude Code ajoute une colonne à une table existante via une migration "rapide". Elle n'a pas de default, est NOT NULL, et la migration plante en prod parce qu'il y a déjà 100 rows.

**Remède** : toute migration qui ajoute une colonne NOT NULL doit avoir un DEFAULT, ou être en deux étapes (ajouter nullable, backfill, passer en NOT NULL).

## C.8. Le piège des "secrets dans le code"

**Symptôme** : Claude Code hard-code une URL d'API ou une clé en valeur par défaut "pour le dev".

**Remède** : règle : aucune clé, aucun secret, aucune URL spécifique à l'environnement dans le code. Tout passe par des variables d'env. À vérifier en grep `process.env` à chaque PR.

## C.9. Le piège de "l'ajout de dépendance silencieux"

**Symptôme** : Claude Code installe une lib (`pnpm add lodash`) parce qu'il en avait besoin pour 1 fonction. Multiplie le bundle, ajoute une surface d'attaque.

**Remède** : règle : aucune nouvelle dépendance npm sans validation préalable. À vérifier dans le diff de `package.json`.

## C.10. Le piège des "logs sans contexte"

**Symptôme** : `logger.info('Processing complete')`. Tu vois ça dans 50 logs et tu ne sais pas lequel est le tien.

**Remède** : tout log doit inclure les IDs métier pertinents (organization_id, dossier_id, ligne_id, worker_name). Et JAMAIS `console.log` — toujours le logger structuré.

---

# Ordre de bataille — Ta semaine 1

Le setup Partie A se fait lundi matin, en quelques heures. Le reste de la semaine, tu pilotes Claude Code et tu reviews.

| Jour | Toi (irréductible / review / accept) | Claude Code (délégué) |
|------|---------------------------------------|------------------------|
| Lun matin | A.1 comptes + A.2 CLI auth + A.3 produits Stripe | — |
| Lun aprèm | Review PR | Bootstrap monorepo (B.1 adapté) + setup Drizzle |
| Mar | Review PRs au fil de l'eau, A.6 activer JWT hook après push migrations | Migrations Supabase 0001-0002, schémas Drizzle tenancy, Next.js + auth flow |
| Mer | Review PRs + acceptance test login (signup → magic link → page protégée) | Schémas Drizzle métier complets + RLS policies |
| Jeu | Review PR worker `ingest_cn8` + A.4 DNS Resend si records arrivés | Worker `ingest_cn8` + worker `ingest_taric_full` + squelette cascade |
| Ven matin | Review PR worker EBTI rigoureusement (rate limit, idempotence, state save) | Worker `ingest_ebti_full` finalisé |
| **Ven soir** | **A.7 trigger manuel `ingest_ebti_full`** dans Inngest dashboard | (le scraping tourne 6-8 jours en background) |

**Lundi matin de la semaine 2** : tu vérifies dans Inngest et Sentry que le scraper EBTI a traité ~30 000 cas pendant le weekend, sans erreur fatale. Tu le laisses tourner toute la semaine.

---

# Conclusion

Tu as maintenant 4 documents :

1. **verdyct_spec_technique_1_cascade.md** — la cascade et les référentiels
2. **verdyct_spec_technique_2_data_model.md** — le data model et les workers
3. **verdyct_spec_technique_3_integrations.md** — Stripe, Resend, Pappers, audit, onboarding
4. **verdyct_guide_execution_issa.md** — celui-ci, pour exécuter

Quand tu reviens sur le projet et que tu te demandes "je fais quoi maintenant", tu reviens sur ce guide. Quand tu hésites sur une décision technique, tu cherches dans la spec correspondante. Quand tu veux déléguer, tu copies un template B.X et tu l'adaptes.

Bonne route.
