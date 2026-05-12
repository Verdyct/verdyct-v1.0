# Verdyct — Spécification Produit

*Document de cadrage pour le développement du MVP*
*Version : Mai 2026*
*Auteurs : Issa & Julius*

---

## 1. Ce qu'on construit, en une phrase

Verdyct est le logiciel quotidien du commissionnaire en douane français. Il transforme 45 minutes de paperasse manuelle par dossier en 90 secondes de validation, en s'appuyant sur l'historique du broker, les règles douanières officielles, et l'IA quand c'est nécessaire — dans cet ordre.

---

## 2. Le bon mental model

Il faut sortir de l'idée "Verdyct = un parseur IA de PDF". C'est un piège qui mène à un produit fragile et non rentable.

Le bon modèle, c'est : **Verdyct est le système d'information métier du broker**. Une mémoire structurée de tous ses dossiers passés, branchée à un moteur de suggestion intelligent, avec l'IA en dernier recours.

L'analogie la plus juste : c'est comme un assistant qui aurait travaillé 10 ans avec le broker. Quand l'importateur Renault commande des boulons inox d'Inde, l'assistant dit : "On a déjà fait ce dossier 47 fois, voici le code à utiliser, voici le régime, je te prépare la déclaration, valide en 5 secondes." Quand un nouveau produit arrive qu'on n'a jamais vu, l'assistant fait des recherches dans la nomenclature officielle, propose 2-3 options en expliquant chacune, et demande au broker (ou à l'importateur via email automatique) les infos manquantes pour trancher.

L'IA n'est pas le héros. La mémoire métier est le héros. L'IA est l'outil de dernier recours quand la mémoire ne suffit pas.

---

## 3. Le parcours utilisateur, de bout en bout

Voici concrètement ce qui se passe quand un broker reçoit un nouveau dossier de son client :

**Étape 1 — Le dossier arrive dans Verdyct.** Trois canaux possibles. Le plus courant : l'importateur envoie un email avec PDFs (facture, packing list, BL, certificat origine). Le broker forward cet email sur son adresse Verdyct dédiée. Le dossier se crée tout seul, les PJ sont rattachées, l'expéditeur est identifié. Deuxième canal : le broker upload directement les fichiers depuis son ordinateur. Troisième canal : il tape les infos à la main (cas où il a tout au téléphone avec son client).

**Étape 2 — Verdyct identifie les parties.** Le système extrait automatiquement le SIREN/EORI de l'importateur et du fournisseur depuis les documents. Si déjà connus dans la base du broker, leur fiche complète est chargée immédiatement, avec leur historique. Si nouveaux, leurs infos sont enrichies automatiquement via les bases publiques (INSEE, Pappers, base EORI européenne).

**Étape 3 — Pour chaque ligne marchandise, Verdyct propose.** C'est le cœur du produit. Pour chaque produit du dossier, le système cherche dans cet ordre :

D'abord, **dans l'historique du broker**. "Ce produit, ce client, on l'a déjà fait." Si match, suggestion immédiate avec stats : "Code HS 7318.15.95, utilisé 47 fois pour ce client, 100% accepté en douane." Le broker valide en un clic.

Ensuite, **dans les règles officielles**. Pas de match exact mais un produit similaire ou une règle TARIC claire. Suggestion avec source citée : "Similaire au dossier #4521 + note explicative SH chapitre 73."

Enfin, **via l'agent IA**. Vraiment nouveau produit, vraiment nouveau cas. L'IA analyse les docs, consulte la nomenclature et la jurisprudence, propose 2 ou 3 codes possibles **avec son raisonnement et ses sources**. Si elle ne peut pas trancher, elle pose une question structurée au broker : "Pour choisir le bon code, j'ai besoin de savoir : la machine fonctionne par découpe laser ou par presse mécanique ?"

**Étape 4 — Quand il manque une info, Verdyct relance l'importateur.** Pas le broker qui rédige un email à la main. Verdyct génère une demande pré-remplie, professionnelle, dans le ton des emails précédents : "Bonjour, pour finaliser votre dossier #2034, j'ai besoin de la composition matière du produit X et du certificat d'origine si applicable." Le broker clique "envoyer". Quand l'importateur répond, Verdyct re-parse la réponse et complète le dossier. **C'est ici que se joue le vrai gain de temps**, pas dans le parsing.

**Étape 5 — Validation finale et génération de la déclaration.** Le broker voit le dossier complet avec, pour chaque champ, sa source visible (historique / règle / IA + humain qui a tranché). Il signe. Verdyct génère le fichier au format DELTA-G ou EDI selon ce que son bureau de douane accepte.

**Étape 6 — Tout est tracé.** Chaque décision prise sur le dossier est enregistrée : qui (broker ou IA), quand, sur quelle source. En cas de contrôle douanier 18 mois plus tard, le broker exporte ce rapport en PDF. Voilà sa défense.

---

## 4. Les écrans à développer

### Priorité 1 — MVP indispensable

**Connexion / Inscription.** Standard. Email + mot de passe. À l'inscription on demande : email pro, nom de la société, SIREN (vérification auto via Pappers), nombre d'utilisateurs prévu.

**Dashboard d'accueil.** Première vue après connexion. Trois zones : les dossiers en cours qui attendent une action du broker (info manquante, à valider, à envoyer), les alertes (deadlines qui approchent, anomalies détectées), et un bouton bien visible "Nouveau dossier". L'idée : en 5 secondes le broker sait ce qu'il doit faire aujourd'hui.

**Création de dossier.** Pas un seul gros bouton "Upload PDF". Trois entrées affichées clairement : (1) une zone drag & drop pour upload, (2) l'adresse email personnelle du broker à utiliser pour forward (`dossiers+broker123@in.verdyct.fr`) avec un bouton "copier", (3) un lien "saisir manuellement" qui ouvre un formulaire vide. L'utilisateur choisit selon le contexte.

**Détail dossier — l'écran central.** C'est l'écran sur lequel le broker va passer le plus de temps. Structure :

En haut, le bandeau d'identification : importateur (nom + lien vers sa fiche), fournisseur, référence du dossier, statut global (en cours / info manquante / validé / envoyé), date.

Au centre, la liste des lignes marchandises. **Chaque ligne est une carte autonome** qui affiche : la description du produit, le code HS proposé, l'origine, la valeur, le régime douanier. Un badge de couleur indique d'où vient la suggestion : vert si elle vient de l'historique du broker, bleu si elle vient des règles officielles, orange si elle vient de l'IA. À côté du badge, un lien "voir la source" ouvre un panneau qui détaille pourquoi cette suggestion ("47 dossiers similaires" / "note explicative SH 73.18" / "raisonnement de l'IA + sources web"). Chaque ligne a un statut : à valider, validé, info manquante.

Quand une ligne est en "info manquante", un encart apparaît : "Pour finaliser cette ligne, demander à l'importateur : composition matière exacte." Un bouton "envoyer la demande" ouvre une modal avec l'email pré-rempli. Le broker peut éditer puis envoyer.

En bas de l'écran, un bouton principal "Générer la déclaration" — actif uniquement quand toutes les lignes sont validées.

**Liste des dossiers.** Tableau classique, filtrable et triable. Colonnes : référence, importateur, fournisseur, statut, date de création, date de l'opération, valeur totale, badge "scope CBAM" si applicable. Filtres : statut, période, importateur, scope CBAM.

**Fiche importateur.** Pas un simple annuaire. La fiche affiche : les infos identité (raison sociale, SIREN, EORI, adresse, contacts), des stats utiles au broker (nombre total de dossiers, taux d'acceptation en douane, valeur totale déclarée cette année), la liste des produits récurrents avec leur code HS habituel et le nombre de fois utilisé, les éventuelles BTI déposées (un BTI est un avis officiel des douanes qui fixe un code à utiliser pour un produit donné), et l'historique des derniers dossiers cliquables. Cette fiche est ce qui rend visible le "moat" qu'on construit pour le broker.

**Paramètres.** Profil société, gestion des utilisateurs et rôles, facturation Stripe, configuration de l'adresse email de forwarding.

### Priorité 2 — Juste après le MVP

**Audit trail (par dossier).** Onglet sur chaque dossier validé qui montre la chronologie complète des décisions : "10:34 — l'IA a suggéré le code 7318.15.95 (source : nomenclature TARIC + 3 BTI). 10:35 — Issa a validé. 10:38 — déclaration générée." Bouton "exporter en PDF" pour transmission en cas de contrôle douanier. À avoir dès le MVP si possible parce que c'est un argument de vente.

**Recherche transversale.** Barre de recherche avancée pour explorer tous les dossiers passés. Cas d'usage : "tous les dossiers où j'ai utilisé le code 8456.10", "tous les dossiers refusés en 2025", "tous les dossiers de Renault sur Q1". Critique pour la défense en contrôle et pour reproduire des cas similaires.

### Priorité 3 — Phase 2

**Module CBAM.** Pas un produit séparé, intégré au flow normal. Quand le système détecte un code HS dans le scope CBAM (acier, aluminium, ciment, engrais, hydrogène), un badge "CBAM" apparaît sur le dossier. Un onglet dédié "CBAM" centralise les données d'émissions collectées par fournisseur, marque celles qui manquent, et permet de générer la déclaration trimestrielle au format du registre transitoire.

**Portail importateur.** Un espace que le broker peut donner à ses clients pour qu'ils déposent eux-mêmes leurs dossiers et suivent leur statut. Réduit encore plus le back-and-forth.

---

## 5. Le glossaire métier (pour Julius)

Quelques termes qui reviennent souvent et qu'il faut comprendre pour bien designer les écrans :

**Code HS (ou code TARIC).** Le code à 8-10 chiffres qui classe chaque marchandise. 17 000 possibilités. C'est l'élément central de toute déclaration douanière. Se tromper de code = redressement + amende.

**Régime douanier.** Le type d'opération douanière. Les principaux : 40 (mise en libre pratique = import définitif), 42 (libre pratique avec exonération TVA et livraison intra-UE), 71 (entrée en entrepôt), 4200 (cas particulier de 42).

**DELTA-G / DELTA-X.** Les portails officiels des douanes françaises où les déclarations sont soumises. C'est l'ennemi à terme de Verdyct : moche, lent, manuel.

**BTI (Renseignement Tarifaire Contraignant).** Un avis officiel des douanes qui fixe le code HS à utiliser pour un produit donné, valable 3 ans. Précieux à conserver pour défendre une classification.

**EORI.** Numéro d'identification douanier européen. L'équivalent du SIREN pour faire de l'import/export en Europe.

**EUR.1 / REX.** Certificats qui prouvent l'origine préférentielle d'un produit (ex : fabriqué au Vietnam dans le cadre de l'accord UE-Vietnam, donc droits de douane réduits).

**Bureau de douane.** Le point d'entrée géographique où la déclaration est traitée (Le Havre, Marseille, Roissy, etc.).

**CBAM.** Mécanisme d'Ajustement Carbone aux Frontières. Loi européenne en vigueur depuis janvier 2026 qui oblige les importateurs de produits carbo-intensifs (acier, alu, ciment, engrais, électricité, hydrogène) à déclarer les émissions liées et acheter des certificats. C'est notre cheval de Troie commercial.

**Commissionnaire en douane (broker).** L'utilisateur de Verdyct. Une PME (1-50 personnes en général) qui gère les déclarations douanières pour le compte des importateurs/exportateurs. Il y en a 15 000 en France.

---

## 6. Les principes UI/UX directeurs

Quelques règles qui doivent guider toutes les décisions de design :

**Toujours montrer la source.** Aucune suggestion ne doit apparaître sans indiquer d'où elle vient. Le broker engage sa responsabilité légale en signant la déclaration — il a besoin de comprendre, pas juste de cliquer.

**L'historique vient en premier, l'IA en dernier.** Visuellement, les suggestions issues de l'historique du broker doivent être les plus mises en avant (vert, en gros). L'IA est un fallback, pas une vedette.

**Optimiser pour le clic, pas pour l'écriture.** Le broker doit pouvoir traiter 90% de ses dossiers sans taper du texte, juste en validant des suggestions. Tout champ qui demande une saisie libre est un échec à corriger.

**Densité d'information assumée.** L'utilisateur n'est pas un novice. Il préfère voir 12 infos utiles d'un coup que cliquer dans 4 onglets pour les trouver. Pas de minimalisme excessif — c'est un outil de travail intensif, pas une app grand public.

**Le ton de l'interface est sobre et professionnel.** Pas de gamification, pas d'emojis, pas de "Bravo tu as validé ton dossier !". Les utilisateurs sont des pros sérieux qui veulent un outil sérieux.

---

## 7. Stack technique (pour rappel)

Frontend : Next.js 15 (App Router) + TypeScript + Tailwind. Composants UI : shadcn/ui pour aller vite. State : React Query côté client, Server Components côté serveur quand possible.

Backend : Supabase (Postgres + Auth + Storage). Workers asynchrones pour les jobs longs (parsing de gros PDFs, génération CBAM trimestrielle). Stripe pour la facturation.

Hébergement : Vercel pour le front, Supabase Cloud pour la DB.

---

## 8. Ce qu'on ne fait PAS dans le MVP

Pour ne pas se disperser, voici ce qui est explicitement hors scope du premier MVP :

Soumission directe à DELTA-G via l'API officielle (on génère un fichier, le broker l'importe lui-même dans DELTA — c'est suffisant pour valider le payment willingness). Module CBAM complet (Phase 2). Portail importateur (Phase 2). Comptes équipe avec rôles différenciés (Phase 3). Application mobile (jamais probablement). Intégrations comptables type Sage/EBP (plus tard si demandé).

---

*Pour toute question sur ce doc, ping Issa.*
