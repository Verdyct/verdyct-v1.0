# Verdyct — Spécification Technique #1
## Cascade Engine + Référentiels + Ingestion

*Livraison 1 sur 3*
*Mai 2026 · Issa & Julius*

---

## Comment lire ce document

Chaque section suit le même format :

1. **Explication** — en langage clair, pour comprendre le quoi et le pourquoi.
2. **Spec** — la définition technique précise (schémas, types, algorithmes) que Claude Code doit suivre à la lettre.
3. **Exemple** — un cas concret quand c'est utile.

Si tu lis pour comprendre la logique, lis l'explication et survole les specs. Si tu codes (ou si Claude Code lit), focus sur les specs.

---

## 0. Contexte et principes directeurs

Verdyct n'est pas un parseur de PDF avec de l'IA bolted on. C'est le système d'information métier du commissionnaire en douane : une mémoire structurée de tous ses dossiers passés, branchée à un moteur de suggestion à 3 niveaux, avec l'IA en dernier recours.

Quand un nouveau dossier arrive, pour chaque ligne marchandise, le système doit proposer un code HS, un régime douanier, une origine, et une valeur en douane. Au lieu de demander à une IA de tout faire, on cherche d'abord dans l'historique du broker (instantané, gratuit, défendable en contrôle), puis dans les référentiels publics (EBTI, TARIC, notes explicatives), et seulement en dernier recours on lance un agent IA. Ce design est ce qui rend le produit rentable, défendable juridiquement, et difficile à copier.

Trois principes sont non-négociables et doivent être respectés dans toutes les implémentations :

**(1) Sources toujours visibles.** Aucune suggestion ne s'affiche sans indiquer d'où elle vient. Le broker engage sa responsabilité légale en signant la déclaration — il a besoin de comprendre, pas de cliquer aveuglément.

**(2) L'historique passe en premier.** Visuellement et logiquement. Les suggestions issues de l'historique du broker sont les plus mises en avant. L'IA est un fallback, pas une vedette.

**(3) Score de confiance affiché.** Chaque suggestion a un score numérique entre 0 et 1, mappé sur un badge de couleur dans l'UI (vert / bleu / orange / rouge). Le broker sait toujours à quel niveau de fiabilité il a affaire.

---

## 1. Architecture globale du moteur

### Explication

Pour chaque ligne marchandise, le moteur fait tourner les 3 couches **en séquence**, pas en parallèle. Si la couche 1 trouve un match avec assez de confiance, on s'arrête là — pas la peine de payer la couche 2 ou 3. Cette logique d'arrêt anticipé est ce qui rend la marge tenable : 70-80% des dossiers s'arrêtent en couche 1, 15% en couche 2, 5% atteignent la couche 3.

Le moteur est invoqué quand un dossier vient d'être créé (3 canaux possibles : email forwardé, upload, formulaire manuel). Le déclenchement se fait via un worker asynchrone Inngest, parce que le pipeline complet peut prendre 5 à 30 secondes selon les couches activées et qu'on ne veut pas bloquer le thread Next.js.

Pour chaque ligne, le résultat final retourné contient : la suggestion (code HS, régime, origine, valeur), le score de confiance, la source (quelle couche a tranché et avec quelles données), et les alternatives proposées. Tout est persisté dans la base et affiché côté UI.

### Spec

**Trigger** : événement `dossier.lines_extracted` émis après que le parser initial a identifié les lignes marchandises (typiquement 3-5 secondes après création).

**Worker Inngest** : `cascade.process_line`

**Inputs** :
```typescript
type CascadeInput = {
  broker_id: string;          // UUID
  dossier_id: string;         // UUID
  ligne_id: string;           // UUID, la ligne à traiter
  importateur_id: string | null;  // null si nouveau
  fournisseur_id: string | null;
  description_produit: string;
  pays_origine: string | null;    // ISO 3166-1 alpha-2
  valeur_unitaire: number | null;
  devise: string | null;          // ISO 4217
  unite_quantite: string | null;
  quantite: number | null;
}
```

**Logique** :
```
1. Lancer Layer 1 (match historique)
2. Si Layer 1 retourne confidence >= 0.75 → STOP, persister, terminer
3. Sinon lancer Layer 2 (référentiels publics)
4. Si Layer 2 retourne confidence >= 0.80 → STOP, persister, terminer
5. Sinon lancer Layer 3 (agent IA)
6. Persister résultat (succès ou besoin d'input humain)
```

**Outputs** : insertion dans la table `suggestions` (schéma définitif en livraison 2). Émission de l'événement `cascade.line_processed` qui déclenche la mise à jour du dashboard côté broker.

**Latence cible** :
- Layer 1 seul : < 200 ms
- Layer 1 + 2 : < 3 s
- Layer 1 + 2 + 3 : < 30 s (avec timeout dur à 60 s, escalade au broker si dépassé)

---

## 2. Couche 1 — Match historique

### Explication

Cette couche cherche dans l'historique du broker la réponse à une question simple : "Ce produit, on l'a déjà déclaré ?" Elle procède en 3 passes successives, de la plus restrictive à la plus large.

**Passe 1 (exact match).** On cherche un match exact sur le triplet (broker, importateur, description normalisée du produit). C'est le cas idéal : Renault commande des boulons inox d'Inde, le broker l'a déjà fait 47 fois, on récupère le code utilisé la dernière fois et on l'affiche en vert avec le taux d'acceptation ("47/47 dossiers acceptés en douane"). Le broker valide en 1 clic.

**Passe 2 (fuzzy même client).** Si pas de match exact mais un produit similaire chez le même client, on utilise une recherche vectorielle (embeddings Mistral) pour trouver les plus proches. Genre, le broker a déjà déclaré "boulons inox M8 d'Inde" et là il reçoit "boulons inox M10 d'Inde" — la similarité sémantique est forte, on propose le même code en supposant que c'est probablement la même classification, mais avec une confiance moindre.

**Passe 3 (cross-client).** Si même le client est nouveau (ou pas de match chez lui), on élargit à tout l'historique du broker. "Cet importateur n'a pas encore d'historique chez toi, mais tu as classé ce produit chez 3 autres clients avec le code 7318.15.95." Confiance plus faible parce que les pratiques peuvent légitimement varier d'un client à l'autre (selon l'usage final, la composition exacte, etc.).

Si aucune des 3 passes n'aboutit avec une confiance suffisante, on passe à la couche 2.

### Spec

**Fonction** : `runLayer1(input: CascadeInput): Promise<Layer1Result>`

**Pré-traitement de la description produit** :
```typescript
function normalizeDescription(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^\w\s]/g, ' ')                          // strip punctuation
    .replace(/\s+/g, ' ')                              // collapse whitespace
    .trim();
}
```

**Passe 1.1 — Exact match** :
```sql
SELECT
  l.hs_code, l.regime, l.origine, l.dossier_id, l.created_at,
  d.statut_douane  -- 'accepte', 'refuse', 'en_cours'
FROM lignes_dossier l
JOIN dossiers d ON d.id = l.dossier_id
WHERE l.broker_id = $broker_id
  AND l.importateur_id = $importateur_id
  AND l.description_normalisee_hash = $hash
  AND l.validated_at IS NOT NULL
  AND l.deleted_at IS NULL
ORDER BY l.created_at DESC;
```

Où `description_normalisee_hash = sha256(normalizeDescription(description_produit))`.

**Décision Passe 1.1** :
- Si `count >= 3` :
  - `most_common_code = mode(hs_code)` (code le plus fréquent dans le résultat)
  - `acceptance_rate = count(statut_douane = 'accepte') / count(statut_douane != 'en_cours')`
  - `confidence = 0.95` (cap dur)
  - Retourner immédiatement.
- Si `1 <= count < 3` :
  - `confidence = 0.80 + 0.05 * count` (0.85 à 0.90)
  - Retourner.
- Si `count = 0` : passer à 1.2.

**Passe 1.2 — Fuzzy même client** (recherche vectorielle) :

```typescript
const embedding = await mistralEmbed(description_produit);
```

```sql
SELECT
  l.hs_code, l.regime, l.origine, l.dossier_id,
  1 - (l.embedding <=> $embedding) AS similarity
FROM lignes_dossier l
WHERE l.broker_id = $broker_id
  AND l.importateur_id = $importateur_id
  AND l.validated_at IS NOT NULL
  AND l.deleted_at IS NULL
ORDER BY l.embedding <=> $embedding
LIMIT 5;
```

**Décision Passe 1.2** :
- Si top similarity > 0.85 : `confidence = 0.5 + 0.4 * similarity`
- Sinon : passer à 1.3.

**Passe 1.3 — Cross-client (même broker)** :

```sql
SELECT
  l.hs_code, l.regime, l.origine, l.dossier_id, l.importateur_id,
  1 - (l.embedding <=> $embedding) AS similarity
FROM lignes_dossier l
WHERE l.broker_id = $broker_id
  AND l.validated_at IS NOT NULL
  AND l.deleted_at IS NULL
ORDER BY l.embedding <=> $embedding
LIMIT 10;
```

**Décision Passe 1.3** :
- Grouper les résultats par `hs_code`.
- Si le code dominant représente > 60% des matches ET top similarity > 0.90 :
  - `confidence = 0.5 + 0.25 * similarity` (cap à 0.75)
  - Retourner avec mention "code utilisé pour ce produit chez X clients différents".
- Sinon : retourner `{ found: false }` → escalade Layer 2.

**Output** :
```typescript
type Layer1Result =
  | {
      found: true;
      layer: 1;
      hs_code: string;
      regime: string;
      origine: string;
      confidence: number;          // 0-1
      source: {
        type: 'exact_match' | 'fuzzy_same_client' | 'fuzzy_cross_client';
        matched_lignes_ids: string[];
        occurrences: number;
        acceptance_rate?: number;  // 0-1, only for exact_match with enough data
        most_recent_dossier_date: string;
        similarity?: number;       // for fuzzy types
        cross_client_count?: number; // for fuzzy_cross_client
      };
      alternative_codes?: Array<{ code: string; occurrences: number }>;
    }
  | { found: false; layer: 1 };
```

### Exemple concret

**Input** : Renault (importateur connu) commande "boulons inox A4 M8x20 fabriqués en Inde", valeur unitaire 0.12 EUR, 50 000 unités.

**Passe 1.1** : on hash "boulons inox a4 m8x20 fabriques en inde" → on trouve 47 lignes passées avec ce hash exact pour Renault. Code dominant : 7318.15.95 (47/47). Statut douane : 47 acceptés, 0 refusés.
- `confidence = 0.95`
- Retour : `{ found: true, hs_code: "7318.15.95", confidence: 0.95, source: { type: "exact_match", occurrences: 47, acceptance_rate: 1.0 } }`

**Affichage UI** : badge vert, "Code utilisé 47 fois pour Renault, 100% acceptés en douane. Dernier dossier : il y a 12 jours." Bouton "Valider en 1 clic".

---

## 3. Couche 2 — Référentiels publics + RAG

### Explication

Si l'historique du broker n'a pas tranché, on cherche dans deux référentiels publics : la base EBTI (les Renseignements Tarifaires Contraignants émis par les douanes européennes — 80 000+ cas où une administration douanière a déjà tranché un classement, avec son raisonnement) et TARIC (les mesures applicables sur chaque code : droits, TVA, restrictions, anti-dumping…).

Le mécanisme : on prend la description du produit, on cherche les BTI les plus similaires sémantiquement (top 5), on regarde le code qu'ils utilisent et le raisonnement, puis on valide avec TARIC que ce code est cohérent avec le reste du dossier (origine, régime). Si tout est cohérent et que la similarité est forte, on propose ce code avec une confiance entre 0.70 et 0.85.

C'est ici qu'on capitalise vraiment sur les données publiques. Un BTI est une décision officielle de classement par une administration douanière — c'est ce qui se rapproche le plus d'une "vérité" en matière de classification. Faire du RAG là-dessus, c'est demander à 80 000 douaniers européens "vous avez déjà vu un produit comme ça ?".

### Spec

**Fonction** : `runLayer2(input: CascadeInput, layer1: Layer1Result): Promise<Layer2Result>`

**Étape 2.1 — Recherche EBTI** :

```typescript
const embedding = layer1.embedding ?? await mistralEmbed(input.description_produit);
```

```sql
SELECT
  bti_id, hs_code, product_description, classification_reasoning,
  issuing_country, valid_from, valid_until,
  1 - (embedding <=> $embedding) AS similarity
FROM ebti_cases
WHERE valid_until IS NULL OR valid_until > CURRENT_DATE
ORDER BY embedding <=> $embedding
LIMIT 5;
```

**Étape 2.2 — Validation TARIC** :

Pour le code du top 1 EBTI, récupérer les mesures applicables :

```sql
SELECT measure_type, value_pct, value_amount, currency, description, origin_country, valid_from, valid_until
FROM taric_measures
WHERE hs_code = $top_ebti_hs_code
  AND (origin_country IS NULL OR origin_country = $input_pays_origine)
  AND (valid_until IS NULL OR valid_until > CURRENT_DATE);
```

Vérifier la cohérence et flagger les éventuelles alertes :
- `anti_dumping` : si une mesure anti-dumping s'applique pour ce code et ce pays d'origine.
- `quota` : si un contingent existe.
- `prohibition` : si l'import est interdit ou restreint.
- `origin_specific` : si les droits varient selon l'origine.

**Étape 2.3 — Calcul de confiance** :

```typescript
function computeLayer2Confidence(topSimilarity: number, taricCoherent: boolean): number {
  if (!taricCoherent) return 0; // forcer escalade Layer 3
  if (topSimilarity >= 0.92) return Math.min(0.85, 0.7 + 0.15 * topSimilarity);
  if (topSimilarity >= 0.85) return 0.6 + 0.2 * (topSimilarity - 0.85) / 0.07;
  return 0; // confiance trop faible, escalade Layer 3
}
```

**Output** :
```typescript
type Layer2Result =
  | {
      found: true;
      layer: 2;
      hs_code: string;
      regime: string;       // déduit du contexte (régime habituel de l'importateur, ou défaut '40')
      origine: string;
      confidence: number;
      source: {
        type: 'ebti_match';
        primary_bti: {
          id: string;
          description: string;
          reasoning: string;
          similarity: number;
          issuing_country: string;
        };
        alternatives: Array<{
          bti_id: string;
          hs_code: string;
          similarity: number;
        }>;
        taric_measures: Array<{
          measure_type: string;
          description: string;
          value: string;
        }>;
        flags: Array<'anti_dumping' | 'quota' | 'prohibition' | 'origin_specific'>;
      };
    }
  | { found: false; layer: 2 };
```

### Exemple concret

**Input** : "Mécanisme de fermeture magnétique pour sac en cuir, 50 mm x 30 mm" — produit jamais vu chez ce broker.

**Étape 2.1** : recherche vectorielle dans EBTI → top 1 est `FRBTI-2023-08234` ("Fermoir magnétique en métal pour articles de maroquinerie, dimensions 45-55 mm"), similarité 0.93, code retenu 8308.90.00, raisonnement : "ne constitue pas un article de quincaillerie au sens du chapitre 73 mais une garniture pour articles de maroquinerie au sens de la position 8308."

**Étape 2.2** : TARIC pour 8308.90.00, origine Chine → droit 2.7%, pas d'anti-dumping, pas de quota. Cohérent.

**Étape 2.3** : `confidence = 0.7 + 0.15 * 0.93 = 0.84`

**Affichage UI** : badge bleu, "Code suggéré : 8308.90.00. Source : BTI FRBTI-2023-08234 émis par les douanes françaises (similarité 93%). Raisonnement : [extrait]. Mesures TARIC applicables : droit 2.7%."

---

## 4. Couche 3 — Agent IA

### Explication

C'est le dernier recours. Quand l'historique broker n'a rien et que les référentiels publics n'ont pas tranché avec assez de confiance, on lance un agent — un LLM avec accès à des outils — pour qu'il fasse le travail d'investigation qu'un broker humain ferait.

L'agent dispose d'outils pour chercher dans EBTI/TARIC, lire les notes explicatives, faire de la recherche web (limitée à des sources autorisées comme legifrance.gouv.fr et douane.gouv.fr), interroger l'historique du broker avec des critères structurés, et — c'est important — **demander des précisions** soit au broker soit à l'importateur si l'info manque dans le dossier.

L'agent ne doit jamais inventer. S'il ne peut pas trancher, il rend la main avec un résumé de ce qu'il a trouvé et 2-3 options possibles, en posant explicitement la question qui manque pour décider. Le broker tranche alors humainement.

Sa confiance est plafonnée à 0.85 même quand il est très sûr — parce qu'aucun raisonnement IA n'est aussi défendable qu'un historique broker concret avec des dossiers acceptés en douane.

### Spec

**Modèle** : Mistral Large 2 en production, Claude Sonnet 4.6 en dev/debug.

**Fonction** : `runLayer3(input: CascadeInput, layer1: Layer1Result, layer2: Layer2Result): Promise<Layer3Result>`

**System prompt (squelette, à finaliser en livraison 2)** :
```
Tu es un assistant expert en classification douanière européenne. Ta mission :
proposer un code HS (10 chiffres TARIC), un régime douanier, et une origine pour
une ligne marchandise dans un dossier d'import en France.

Contraintes absolues :
1. Tu ne dois jamais inventer un code. Toute proposition doit citer une source
   (BTI, note explicative SH, mesure TARIC, jurisprudence DGDDI).
2. Si tu manques d'information pour trancher entre 2 codes possibles, tu ne
   choisis PAS au hasard : tu retournes une demande de clarification structurée
   au broker ou à l'importateur.
3. Tu as 8 itérations max. Au-delà, tu rends la main avec ce que tu as trouvé.
```

**Tools disponibles** :

```typescript
type AgentTools = {
  search_ebti: (args: { query: string; max_results?: number }) =>
    Promise<Array<{ bti_id: string; hs_code: string; description: string; reasoning: string; similarity: number }>>;

  search_taric: (args: { hs_code_prefix: string; origin_country?: string }) =>
    Promise<Array<{ measure_type: string; description: string; value: string }>>;

  get_explanatory_notes: (args: { chapter: string; position?: string }) =>
    Promise<{ text: string; source_url: string }>;

  web_search: (args: { query: string; sites?: string[] }) =>  // sites whitelistés
    Promise<Array<{ title: string; snippet: string; url: string }>>;

  get_historical_pattern: (args: { broker_id: string; criteria: { hs_code_prefix?: string; pays_origine?: string; product_keywords?: string[] } }) =>
    Promise<Array<{ ligne_id: string; hs_code: string; description: string; created_at: string; statut_douane: string }>>;

  request_clarification_from_broker: (args: { question: string; options: string[]; context: string }) =>
    Promise<{ pending_id: string }>;  // suspend l'agent, attend réponse via UI

  draft_email_to_importer: (args: { question: string; urgency: 'low' | 'normal' | 'high'; missing_info: string[] }) =>
    Promise<{ draft_id: string; email_body: string; subject: string }>;

  submit_classification: (args: {
    hs_code: string;
    regime: string;
    origine: string;
    confidence: number;  // 0-1, sera capé à 0.85
    reasoning: string;
    sources: Array<{ type: 'bti' | 'taric' | 'note_explicative' | 'web'; reference: string; description: string }>;
  }) => Promise<{ accepted: boolean }>;
};
```

**Boucle agent** :
```
Pour i de 1 à 8 :
  1. Appeler le LLM avec le contexte courant + historique des tool calls
  2. Le LLM produit soit un tool_call, soit submit_classification, soit termine
  3. Si tool_call : exécuter, ajouter le résultat au contexte, continue
  4. Si submit_classification : valider le format, persister, terminer
  5. Si request_clarification_from_broker : suspendre l'agent (state save), notifier le broker, terminer pour cette session
Si i atteint 8 sans submit ni clarification :
  - Forcer terminate
  - Retourner status='needs_human_input' avec les meilleures options trouvées
```

**Output** :
```typescript
type Layer3Result =
  | {
      status: 'submitted';
      layer: 3;
      hs_code: string;
      regime: string;
      origine: string;
      confidence: number;  // capped at 0.85
      source: {
        type: 'ai_agent';
        iterations: number;
        reasoning: string;
        tools_used: Array<{ tool: string; args: object; result_summary: string }>;
        sources_cited: Array<{ type: string; reference: string; description: string }>;
      };
    }
  | {
      status: 'needs_clarification';
      layer: 3;
      target: 'broker' | 'importer';
      question: string;
      options?: string[];
      pending_email_draft_id?: string;
      iterations: number;
      best_candidates: Array<{ hs_code: string; confidence_if_chosen: number; condition: string }>;
    }
  | {
      status: 'needs_human_input';
      layer: 3;
      iterations: number;
      summary_of_findings: string;
      best_candidates: Array<{ hs_code: string; pros: string; cons: string }>;
    };
```

### Exemple concret

**Input** : "Module électronique de gestion BMS lithium-fer-phosphate 48V 100A pour stockage stationnaire", origine Chine, valeur unitaire 187 EUR.

**Itération 1** : agent lance `search_ebti({ query: "module BMS gestion batterie lithium" })` → top match similarity 0.71, pas assez fort.

**Itération 2** : agent lance `get_explanatory_notes({ chapter: "85", position: "8504" })` → lit les notes sur convertisseurs.

**Itération 3** : agent lance `search_taric({ hs_code_prefix: "8504.40" })` → trouve 8504.40.30 "Convertisseurs statiques pour télécommunications".

**Itération 4** : agent lance `web_search({ query: "BMS lithium classification douanière", sites: ["legifrance.gouv.fr", "douane.gouv.fr"] })` → trouve un avis DGDDI 2024 distinguant BMS standalone (8537.10) de BMS intégrés (selon produit).

**Itération 5** : agent identifie l'ambiguïté entre 8537.10 (tableau de commande) et 8504.40 (convertisseur) selon que le module fait du conversion DC-DC ou seulement du contrôle. Le dossier ne le précise pas.

**Itération 6** : agent appelle `request_clarification_from_broker({ question: "Le module BMS fait-il de la conversion DC-DC en plus du monitoring/protection, ou seulement du contrôle/monitoring ?", options: ["Conversion DC-DC + contrôle (8504.40)", "Contrôle/monitoring seul (8537.10)"], context: "..." })`.

**Sortie** : `{ status: 'needs_clarification', target: 'broker', question: "...", options: [...], best_candidates: [{ hs_code: "8504.40.30", confidence_if_chosen: 0.78, condition: "si conversion DC-DC" }, { hs_code: "8537.10.91", confidence_if_chosen: 0.78, condition: "si contrôle seul" }] }`.

**UI** : panneau orange sur la ligne, "L'IA a identifié 2 codes possibles selon une caractéristique non précisée dans les documents. Cliquer pour répondre : [bouton]".

---

## 5. Cohérence transversale (post-cascade)

### Explication

Une fois que toutes les lignes du dossier ont tourné dans la cascade individuellement, on fait deux passes de cohérence. La première est purement basée sur des règles (rapide, gratuit). La seconde est l'idée de Julius : un LLM léger qui compare les documents bruts entre eux pour détecter les incohérences (la facture dit 500 kg, le BL dit 480 kg — c'est le genre d'erreur que les douanes flaggent en contrôle, et qu'on doit catcher avant).

### Spec

**Cohérence inter-lignes (rule-based)** :

```typescript
function checkIntraDossierCoherence(lignes: Ligne[]): CoherenceFlag[] {
  const flags: CoherenceFlag[] = [];

  // Origine uniforme
  const origines = lignes.map(l => l.suggestion.origine);
  const uniqueOrigins = [...new Set(origines)];
  if (uniqueOrigins.length === 1 && origines.length > 1) {
    flags.push({ type: 'origin_uniform', recommendation: 'check_preferential_origin' });
  }

  // CBAM scope
  const cbamLines = lignes.filter(l => isCbamScope(l.suggestion.hs_code));
  if (cbamLines.length > 0) {
    flags.push({ type: 'cbam_in_scope', affected_lignes: cbamLines.map(l => l.id) });
  }

  // Incoterms (à pré-remplir au niveau dossier, pas par ligne — flag si différent)
  // ...

  return flags;
}
```

`isCbamScope(hs_code)` : table de correspondance avec les codes en scope CBAM (acier 7203-7229, aluminium 7601-7616, ciment 2523, engrais 2808/2814/3102/3105, hydrogène 2804.10, électricité 2716).

**Cohérence inter-documents (LLM léger)** :

Modèle : Mistral Small 3.

Fonction : `runDocCoherenceCheck(documents: ParsedDocument[]): Promise<DocCoherenceResult>`

Le LLM reçoit les extractions structurées de chaque document du dossier (facture, BL, packing list, CO/EUR.1, etc.) et cherche des incohérences sur :
- Quantités (poids, nombre d'unités, volume)
- Valeur totale (facture vs BL)
- Origine déclarée (CO vs facture vs BL)
- Numéros de référence (commande, BL, facture)
- Parties (importateur, fournisseur — variations orthographiques)

Output :
```typescript
type DocCoherenceResult = {
  is_coherent: boolean;
  inconsistencies: Array<{
    severity: 'low' | 'medium' | 'high';
    type: 'quantity_mismatch' | 'value_mismatch' | 'origin_mismatch' | 'party_mismatch' | 'reference_mismatch';
    description: string;
    documents_involved: Array<{ doc_id: string; doc_type: string; field_value: string }>;
    suggested_action: string;
  }>;
};
```

Les incohérences `medium` et `high` bloquent la génération de la déclaration tant qu'elles ne sont pas résolues (manuellement ou via relance importateur).

---

## 6. Référentiels de données

### Explication

Le moteur de cascade s'appuie sur 4 référentiels externes qu'il faut ingérer, normaliser, et tenir à jour. Chacun a sa source officielle, son format, et sa fréquence de mise à jour. Cette section spécifie pour chaque référentiel : où le récupérer, comment le stocker, comment le mettre à jour.

Tous ces référentiels sont **partagés entre tous les brokers** (pas de RLS dessus) — c'est de la donnée publique. Ils vivent dans des tables sans `organization_id`.

### Spec

#### 6.1 — CN8 (Nomenclature Combinée 8 chiffres)

**Quoi** : la classification européenne à 8 chiffres, ~9 500 codes, ancêtre de TARIC. Base de toute classification douanière.

**Source** :
- Permalink Eurostat : https://taxation-customs.ec.europa.eu/customs-4/calculation-customs-duties/customs-tariff/combined-nomenclature_en
- Format : XML structuré + Excel (téléchargeable directement)
- Identifiant légal : Annexe I du Règlement (CEE) n° 2658/87, modifié annuellement.

**Mise à jour** : annuelle, fin octobre, pour application au 1er janvier suivant.

**Schéma** :
```sql
CREATE TABLE cn_codes (
  code VARCHAR(8) PRIMARY KEY,
  parent_code VARCHAR(8) REFERENCES cn_codes(code),
  level SMALLINT NOT NULL CHECK (level IN (2, 4, 6, 8)),
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  unite_supplementaire VARCHAR(16),  -- 'kg', 'p/st', 'l', etc.
  valid_from DATE NOT NULL,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX cn_codes_parent ON cn_codes(parent_code);
CREATE INDEX cn_codes_label_fr_trgm ON cn_codes USING gin (label_fr gin_trgm_ops);
CREATE INDEX cn_codes_active ON cn_codes(code) WHERE valid_until IS NULL;
```

L'extension `pg_trgm` doit être activée (recherche par similarité textuelle).

#### 6.2 — TARIC measures

**Quoi** : toutes les mesures applicables sur chaque code (droits, TVA import, restrictions, anti-dumping, contingents, etc.). 200 000+ mesures actives.

**Source** :
- Export statique en open data : https://ec.europa.eu/taxation_customs/dds2/taric/measures.jsp (page de consultation)
- Flux XML quotidien : système TARIC3, accès gratuit après enregistrement (DG TAXUD)
- Format XML : schéma TARIC3 documenté.

**Mise à jour** : quotidienne via le flux. En MVP : weekly suffit.

**Schéma** :
```sql
CREATE TABLE taric_measures (
  id BIGSERIAL PRIMARY KEY,
  hs_code VARCHAR(10) NOT NULL,
  measure_type VARCHAR(64) NOT NULL,  -- 'duty', 'vat', 'anti_dumping', 'quota', 'prohibition', 'restriction'
  measure_subtype VARCHAR(64),
  origin_country CHAR(2),             -- ISO 3166-1, NULL = erga omnes
  destination_country CHAR(2) DEFAULT 'FR',
  value_pct NUMERIC(8, 4),
  value_amount NUMERIC(14, 4),
  currency CHAR(3),
  description TEXT,
  legal_basis TEXT,
  valid_from DATE NOT NULL,
  valid_until DATE,
  source_id VARCHAR(64),              -- ID natif TARIC3 pour idempotence
  ingested_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (source_id)
);

CREATE INDEX taric_hs_origin ON taric_measures (hs_code, origin_country);
CREATE INDEX taric_active ON taric_measures (hs_code) WHERE valid_until IS NULL OR valid_until > CURRENT_DATE;
```

#### 6.3 — EBTI cases (le référentiel le plus stratégique)

**Quoi** : la base européenne des Renseignements Tarifaires Contraignants. ~80 000 - 100 000 cas, chaque cas étant une décision officielle de classement douanier émise par une administration européenne, avec son raisonnement.

**Source** :
- Interface publique : https://ec.europa.eu/taxation_customs/dds2/ebti/ebti_consultation.jsp
- Pas d'API publique. Scraping structuré nécessaire.
- Chaque cas a : `bti_id` (format pays-année-numéro), code HS retenu, description du produit, raisonnement de classement, pays émetteur, dates de validité.

**Mise à jour** : initial dump complet (1 semaine de scraping rate-limited), puis delta mensuel pour les nouveaux cas.

**Considérations légales** : les BTI sont publics par construction (transparence administrative européenne). Le scraping respectueux (rate limit, user-agent identifié) est conforme.

**Schéma** :
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ebti_cases (
  bti_id VARCHAR(32) PRIMARY KEY,
  issuing_country CHAR(2) NOT NULL,
  hs_code VARCHAR(10) NOT NULL,
  product_description TEXT NOT NULL,
  classification_reasoning TEXT,
  keywords TEXT[],
  trade_marks TEXT[],
  valid_from DATE NOT NULL,
  valid_until DATE,
  embedding VECTOR(1024),             -- Mistral Embed
  scraped_at TIMESTAMPTZ NOT NULL,
  source_url TEXT,
  raw_html TEXT                        -- pour re-parsing si besoin
);

CREATE INDEX ebti_embedding_hnsw ON ebti_cases USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ebti_hs_code ON ebti_cases (hs_code);
CREATE INDEX ebti_active ON ebti_cases (bti_id) WHERE valid_until IS NULL OR valid_until > CURRENT_DATE;
CREATE INDEX ebti_country ON ebti_cases (issuing_country);
```

#### 6.4 — Notes explicatives SH (système harmonisé)

**Quoi** : les notes officielles qui expliquent comment classer chaque chapitre/section/position. Référence absolue en cas de litige de classement.

**Source** :
- WCO publie les notes explicatives officielles (payant pour la version intégrale).
- L'UE publie ses propres notes explicatives complémentaires : https://eur-lex.europa.eu/ (recherche "notes explicatives nomenclature combinée").
- Format : PDF. Parsing nécessaire.

**Mise à jour** : annuelle (suit le cycle CN).

**Schéma** :
```sql
CREATE TABLE explanatory_notes (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(32) NOT NULL,         -- 'section', 'chapter', 'position', 'subposition'
  scope_value VARCHAR(8) NOT NULL,    -- e.g. 'XV' for section, '73' for chapter, '7318' for position
  source VARCHAR(16) NOT NULL,        -- 'WCO', 'EU', 'FR'
  language CHAR(2) NOT NULL DEFAULT 'fr',
  text TEXT NOT NULL,
  embedding VECTOR(1024),
  source_url TEXT,
  valid_from DATE,
  valid_until DATE
);

CREATE INDEX expnotes_scope ON explanatory_notes (scope, scope_value);
CREATE INDEX expnotes_embedding_hnsw ON explanatory_notes USING hnsw (embedding vector_cosine_ops);
```

#### 6.5 — RITA (référentiel français)

**Quoi** : surcouche française à TARIC, gérée par la DGDDI. Inclut les spécificités nationales (mesures France, taux de TVA selon régime, etc.).

**Source** : portail Pro.douane (https://pro.douane.gouv.fr). Accès libre, format de consultation web.

**MVP** : non prioritaire. À ajouter en Phase 2 si on identifie des cas où RITA donne une info que TARIC n'a pas.

---

## 7. Pipeline d'ingestion

### Explication

Tous ces référentiels doivent être ingérés une première fois (bootstrap) puis maintenus à jour. On utilise des workers Inngest pour ça : un worker par référentiel, déclenché sur cron pour les mises à jour, ou manuellement pour le bootstrap.

Le bootstrap initial complet prend environ 1 semaine de runtime (principalement à cause de l'EBTI scraping rate-limited à 1 requête / 2 secondes pour ne pas se faire bloquer). On peut paralléliser CN8/TARIC/notes explicatives qui sont rapides.

### Spec

#### 7.1 — Worker `ingest_cn8`

**Trigger** : manuel (bootstrap) + cron annuel (1er novembre, pour récupérer le CN de l'année suivante dès qu'il est publié).

**Logique** :
```
1. Télécharger le fichier XML CN courant depuis Eurostat
2. Parser le XML, normaliser
3. UPSERT dans cn_codes par code (idempotent)
4. Marquer comme valid_until = (start_date - 1 day) les codes qui n'apparaissent plus
5. Émettre événement cn8.updated avec count des nouveaux/modifiés/expirés
```

**Idempotence** : oui, basée sur le code primary key.

#### 7.2 — Worker `ingest_taric_full` (bootstrap)

**Trigger** : manuel.

**Logique** :
```
1. Télécharger le dump XML statique TARIC3 le plus récent
2. Parser par batch de 10 000 mesures
3. UPSERT par source_id
4. Marquer valid_until pour les mesures non présentes dans le dump (mais valides dans la DB)
```

**Durée typique** : 30-60 min pour le dump complet.

#### 7.3 — Worker `ingest_taric_delta`

**Trigger** : cron quotidien (3h du matin UTC).

**Logique** :
```
1. Récupérer le delta XML TARIC3 depuis last_run_timestamp
2. UPSERT par source_id
3. Mettre à jour last_run_timestamp
```

#### 7.4 — Worker `ingest_ebti_full` (bootstrap)

**Trigger** : manuel.

**Logique** :
```
1. Itérer sur toutes les pages de résultats de l'interface EBTI3
   (filtrage : France + Allemagne + Belgique + Pays-Bas en priorité, puis autres EU)
2. Pour chaque page :
   - Rate limit : 1 requête / 2 secondes
   - Pour chaque BTI listé :
     - Fetch la page détail
     - Parser : bti_id, hs_code, description, reasoning, dates, country
     - Calculer embedding via Mistral Embed sur (description + reasoning)
     - INSERT dans ebti_cases (skip si bti_id existe déjà)
3. Logger progression toutes les 1000 cas
```

**Durée typique** : 6-8 jours pour ~80 000 cas. **À lancer une seule fois.**

**Robustesse** : reprise sur incident via state save (dernière page traitée stockée dans une table d'état).

#### 7.5 — Worker `ingest_ebti_delta`

**Trigger** : cron mensuel (1er du mois, 4h UTC).

**Logique** :
```
1. Lister les BTI émis depuis last_run (filtre date côté EBTI3)
2. Fetch chaque nouveau, parser, embed, INSERT
3. Mettre à jour last_run
```

**Durée typique** : 30-60 min.

#### 7.6 — Worker `ingest_explanatory_notes`

**Trigger** : manuel + cron annuel.

**Logique** :
```
1. Télécharger les PDF des notes explicatives EU + WCO depuis EUR-Lex
2. Parser par section/chapitre/position via découpage structurel du PDF
3. Calculer embedding sur chaque note
4. UPSERT dans explanatory_notes
```

#### 7.7 — Health checks

Un dashboard interne (page admin Verdyct) doit afficher pour chaque référentiel :
- Date de dernière mise à jour
- Nombre d'entrées actives
- Statut du dernier run (success / failure / running)
- Bouton "trigger manual update"

---

## 8. Stack & décisions techniques (figées)

### Spec

**Runtime** :
- Next.js 15 (App Router)
- Node 22 LTS
- TypeScript strict

**Database** :
- Supabase (Postgres 15+)
- Extensions activées : `vector` (pgvector), `pg_trgm`, `unaccent`, `uuid-ossp`
- ORM : Drizzle ORM
- Migrations : drizzle-kit, fichiers SQL versionnés dans `packages/db/migrations`

**Authentification & multi-tenancy** :
- Supabase Auth (magic link + email/password)
- Multi-tenant via `organization_id` sur toutes les tables métier
- RLS Postgres sur chaque table avec policy : `organization_id = (auth.jwt() ->> 'organization_id')::uuid`

**Workers asynchrones** :
- Inngest (cloud)
- Tous les jobs longs, crons, et workflows async passent par Inngest
- Pas d'utilisation directe de `setTimeout`, `Vercel cron`, ou `Supabase Edge Functions` pour ces cas

**Modèles IA en production** :
- LLM lourd (Couche 3 agent) : Mistral Large 2 via API Mistral
- LLM léger (cohérence docs, drafting emails) : Mistral Small 3
- Embeddings : Mistral Embed (1024 dim)
- Fallback : GPT-5 via OpenAI API (route alternative en cas d'incident Mistral)

**Modèles IA en dev** :
- Claude Sonnet 4.6 via API Anthropic pour itération rapide sur les prompts
- Pas d'usage en production pour des raisons de coût

**Email** :
- Sortant : Resend (transactionnel + templates)
- Entrant (forwarding) : Resend Inbound ou Postmark Inbound (à arbitrer en livraison 2)

**Paiement** :
- Stripe
- Plans : `starter` (149€/mo), `pro` (249€/mo), `team` (499€/mo)
- Webhook handler dans `app/api/webhooks/stripe`

**Hébergement** :
- Frontend : Vercel
- DB : Supabase Cloud (région EU-West, Frankfurt ou Paris)
- Workers : Inngest Cloud
- Tous les data flows restent dans l'UE pour la conformité RGPD/positioning

**Observabilité** :
- Logs : Vercel + Supabase + Inngest natif
- Erreurs : Sentry (côté front + côté worker)
- Métriques métier : table `metrics_events` interne, dashboard admin

---

## 9. Notes pour Claude Code

Cette section est le brief explicite quand Claude Code prend le relais sur l'implémentation.

**Ce qui est figé (ne pas dévier)** :
- Le stack listé en section 8.
- Les schémas SQL des sections 6 et 6.x.
- La logique de la cascade (sections 1-4) y compris les seuils de confiance.
- Les noms de tables et de colonnes utilisés ici.

**Ce qui est laissé à ton jugement** :
- L'organisation interne du code (helpers, utilities, abstractions).
- Le style de l'API publique (Server Actions vs route handlers, à choisir selon le cas).
- Les patterns d'erreur (mais utiliser des erreurs typées, pas de `throw "string"`).
- Le format des logs (mais inclure `dossier_id` et `ligne_id` dans tous les logs cascade pour le debugging).

**Conventions à respecter** :
- Tous les types TypeScript exportés depuis `packages/shared-types`.
- Tous les schémas Drizzle dans `packages/db/schema`, un fichier par domaine.
- Pas de query SQL inline dans les composants. Toujours via des fonctions d'accès dans `packages/db/queries`.
- Les workers Inngest dans `workers/`, un dossier par worker, avec un `index.ts` qui exporte la fonction.
- Les prompts LLM dans `packages/ai/prompts/`, fichiers `.ts` qui exportent une fonction `getPrompt(...)` pour pouvoir injecter des variables proprement.
- Les outils agent dans `packages/ai/tools/`, un fichier par outil, signature stable.

**Ce qui n'est PAS dans cette livraison (ne pas implémenter encore)** :
- Le data model complet des dossiers, lignes, parties, etc. → livraison 2.
- Les RLS policies détaillées → livraison 2.
- L'intégration Stripe, Resend, Pappers, INSEE → livraison 3.
- L'audit trail → livraison 3.

Si Claude Code rencontre une décision qui n'est pas couverte ici et qui n'est pas listée comme "à ton jugement", il doit s'arrêter et poser la question, pas inventer.

---

*Fin de la livraison 1. La livraison 2 (data model métier + RLS + workers) suit.*
