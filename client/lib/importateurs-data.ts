export type CbamType = "acier" | "alu" | "ciment" | "engrais";

export interface Contact {
  nom: string;
  email: string;
  telephone: string;
  role: string;
  derniereRelance?: string;
  statut?: "repondu" | "en_attente";
}

export interface ProduitRecurrent {
  description: string;
  codeHS: string;
  utilisations: number;
  derniereUtilisation: string;
  tauxAcceptance: number;
  btiRef?: string;
}

export interface BTI {
  reference: string;
  description: string;
  codeHS: string;
  source: string;
  validiteFin: string;
}

export interface DossierResume {
  ref: string;
  date: string;
  statut: "Validé" | "En attente" | "CBAM" | "Conflit";
  valeur: number;
  origine: string;
  flags: string[];
}

export interface AuditEntry {
  date: string;
  type: "email" | "document" | "conflit" | "code" | "relance";
  description: string;
}

export interface Importateur {
  id: string;
  nom: string;
  ville: string;
  siren: string;
  eori: string;
  cbamTypes: CbamType[];
  conflitsOuverts: number;
  slaMoyen: number;
  dossiers30j: number;
  valeur30j: number;
  valeurAnnee: number;
  dossiersTotal: number;
  tauxAcceptance: number;
  origines: string[];
  volumeMensuel: number[];
  contacts: Contact[];
  produitsRecurrents: ProduitRecurrent[];
  btis: BTI[];
  dossiersHistorique: DossierResume[];
  auditTrail: AuditEntry[];
  derniereActivite: string;
}

export const IMPORTATEURS: Importateur[] = [
  {
    id: "dupont-metaux",
    nom: "Dupont Métaux SARL",
    ville: "Rouen",
    siren: "423 891 012",
    eori: "FR42389101200027",
    cbamTypes: ["acier", "alu"],
    conflitsOuverts: 0,
    slaMoyen: 2.1,
    dossiers30j: 8,
    valeur30j: 1240000,
    valeurAnnee: 8400000,
    dossiersTotal: 847,
    tauxAcceptance: 97,
    origines: ["IN", "KR"],
    volumeMensuel: [6, 8, 7, 9, 8, 11, 9, 12, 10, 11, 9, 8],
    contacts: [
      { nom: "Jean Dupont", email: "j.dupont@dupont-metaux.fr", telephone: "+33 2 35 64 12 89", role: "Directeur logistique" },
      { nom: "Marie Lecomte", email: "m.lecomte@dupont-metaux.fr", telephone: "+33 2 35 64 12 90", role: "Responsable douane", derniereRelance: "2026-05-10", statut: "repondu" },
    ],
    produitsRecurrents: [
      { description: "Toles laminées a froid", codeHS: "7208.37", utilisations: 48, derniereUtilisation: "2026-05-08", tauxAcceptance: 99, btiRef: "FR-BTI-2024-0012" },
      { description: "Barres d'acier inoxydable", codeHS: "7214.20", utilisations: 32, derniereUtilisation: "2026-04-22", tauxAcceptance: 96 },
      { description: "Profiles en L acier", codeHS: "7216.31", utilisations: 18, derniereUtilisation: "2026-03-15", tauxAcceptance: 94 },
      { description: "Aluminium brut allie", codeHS: "7601.10", utilisations: 12, derniereUtilisation: "2026-02-28", tauxAcceptance: 98, btiRef: "FR-BTI-2023-0047" },
      { description: "Fils en acier", codeHS: "7217.10", utilisations: 9, derniereUtilisation: "2026-01-10", tauxAcceptance: 91 },
    ],
    btis: [
      { reference: "FR-BTI-2024-0012", description: "Toles laminées a froid", codeHS: "7208.37", source: "Direction Generale des Douanes", validiteFin: "2027-03-01" },
      { reference: "FR-BTI-2023-0047", description: "Aluminium brut allie 6061", codeHS: "7601.10", source: "Direction Generale des Douanes", validiteFin: "2026-11-30" },
    ],
    dossiersHistorique: [
      { ref: "#2026-0184", date: "2026-05-08", statut: "Validé", valeur: 148000, origine: "IN", flags: ["BTI"] },
      { ref: "#2026-0157", date: "2026-04-22", statut: "Validé", valeur: 203000, origine: "KR", flags: [] },
      { ref: "#2026-0131", date: "2026-04-01", statut: "CBAM", valeur: 312000, origine: "IN", flags: ["CBAM"] },
      { ref: "#2026-0108", date: "2026-03-15", statut: "Validé", valeur: 95000, origine: "KR", flags: ["BTI"] },
      { ref: "#2026-0089", date: "2026-03-02", statut: "En attente", valeur: 178000, origine: "IN", flags: [] },
      { ref: "#2026-0071", date: "2026-02-18", statut: "Validé", valeur: 224000, origine: "KR", flags: ["BTI", "EUR.1"] },
    ],
    auditTrail: [
      { date: "2026-05-08", type: "document", description: "Certificat EUR.1 reçu pour #2026-0184" },
      { date: "2026-05-06", type: "code", description: "Code 7208.37 validé pour #2026-0184" },
      { date: "2026-04-22", type: "document", description: "Liasse documentaire complete reçue pour #2026-0157" },
      { date: "2026-04-03", type: "email", description: "Relance automatique envoyée a m.lecomte@dupont-metaux.fr" },
      { date: "2026-04-04", type: "relance", description: "Réponse reçue de m.lecomte@dupont-metaux.fr avec certificat CBAM" },
      { date: "2026-04-01", type: "conflit", description: "Code HS divergent détecté sur #2026-0131 (7208.37 vs 7208.39)" },
    ],
    derniereActivite: "Il y a 2h",
  },
  {
    id: "acier-normandie",
    nom: "Acier Normandie SAS",
    ville: "Le Havre",
    siren: "381 204 567",
    eori: "FR38120456700014",
    cbamTypes: ["acier"],
    conflitsOuverts: 1,
    slaMoyen: 4.2,
    dossiers30j: 5,
    valeur30j: 680000,
    valeurAnnee: 4100000,
    dossiersTotal: 412,
    tauxAcceptance: 92,
    origines: ["CN", "TR"],
    volumeMensuel: [3, 4, 5, 3, 6, 4, 7, 5, 4, 6, 5, 4],
    contacts: [
      { nom: "Pierre Garnier", email: "p.garnier@acier-normandie.fr", telephone: "+33 2 35 22 44 10", role: "Responsable achat" },
    ],
    produitsRecurrents: [
      { description: "Coils acier lamine a chaud", codeHS: "7208.25", utilisations: 28, derniereUtilisation: "2026-05-05", tauxAcceptance: 88 },
      { description: "Poutrelles HEB", codeHS: "7216.33", utilisations: 14, derniereUtilisation: "2026-04-12", tauxAcceptance: 95 },
      { description: "Toles fortes", codeHS: "7208.51", utilisations: 11, derniereUtilisation: "2026-03-20", tauxAcceptance: 90 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0183", date: "2026-05-05", statut: "Conflit", valeur: 132000, origine: "CN", flags: [] },
      { ref: "#2026-0159", date: "2026-04-20", statut: "En attente", valeur: 188000, origine: "TR", flags: ["CBAM"] },
      { ref: "#2026-0140", date: "2026-04-05", statut: "Validé", valeur: 97000, origine: "CN", flags: [] },
      { ref: "#2026-0118", date: "2026-03-18", statut: "Validé", valeur: 143000, origine: "TR", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-05", type: "conflit", description: "Conflit de code détecté sur #2026-0183 (régime 40 vs 42)" },
      { date: "2026-05-06", type: "email", description: "Relance envoyée a p.garnier@acier-normandie.fr" },
      { date: "2026-04-20", type: "document", description: "Documents partiels reçus pour #2026-0159" },
    ],
    derniereActivite: "Hier",
  },
  {
    id: "import-express-lyon",
    nom: "Import Express Lyon",
    ville: "Lyon",
    siren: "512 874 390",
    eori: "FR51287439000031",
    cbamTypes: ["alu"],
    conflitsOuverts: 0,
    slaMoyen: 1.8,
    dossiers30j: 11,
    valeur30j: 1820000,
    valeurAnnee: 11200000,
    dossiersTotal: 1203,
    tauxAcceptance: 98,
    origines: ["DE", "IN", "KR"],
    volumeMensuel: [10, 9, 11, 8, 12, 10, 9, 11, 12, 10, 11, 9],
    contacts: [
      { nom: "Sophie Renard", email: "s.renard@importexpress-lyon.fr", telephone: "+33 4 78 62 30 14", role: "Directrice operations" },
      { nom: "Luc Fontaine", email: "l.fontaine@importexpress-lyon.fr", telephone: "+33 4 78 62 30 15", role: "Responsable douane" },
    ],
    produitsRecurrents: [
      { description: "Lingots aluminium", codeHS: "7601.10", utilisations: 62, derniereUtilisation: "2026-05-09", tauxAcceptance: 99, btiRef: "FR-BTI-2025-0004" },
      { description: "Alliages alu en barres", codeHS: "7604.10", utilisations: 44, derniereUtilisation: "2026-05-02", tauxAcceptance: 97 },
      { description: "Toles aluminium", codeHS: "7606.11", utilisations: 29, derniereUtilisation: "2026-04-18", tauxAcceptance: 98 },
      { description: "Fils aluminium", codeHS: "7605.11", utilisations: 18, derniereUtilisation: "2026-03-30", tauxAcceptance: 95 },
    ],
    btis: [
      { reference: "FR-BTI-2025-0004", description: "Lingots aluminium non allie", codeHS: "7601.10", source: "Direction Generale des Douanes", validiteFin: "2028-01-15" },
    ],
    dossiersHistorique: [
      { ref: "#2026-0182", date: "2026-05-09", statut: "CBAM", valeur: 267000, origine: "IN", flags: ["CBAM", "EUR.1"] },
      { ref: "#2026-0165", date: "2026-04-28", statut: "Validé", valeur: 312000, origine: "DE", flags: ["BTI"] },
      { ref: "#2026-0148", date: "2026-04-14", statut: "Validé", valeur: 198000, origine: "KR", flags: [] },
      { ref: "#2026-0129", date: "2026-03-28", statut: "Validé", valeur: 445000, origine: "DE", flags: ["BTI"] },
      { ref: "#2026-0110", date: "2026-03-10", statut: "En attente", valeur: 187000, origine: "IN", flags: ["CBAM"] },
    ],
    auditTrail: [
      { date: "2026-05-09", type: "document", description: "Liasse CBAM complete reçue pour #2026-0182" },
      { date: "2026-05-08", type: "code", description: "Code 7601.10 validé avec BTI FR-BTI-2025-0004" },
      { date: "2026-04-28", type: "document", description: "EUR.1 validé pour #2026-0165" },
      { date: "2026-04-14", type: "code", description: "Code 7604.10 confirmé sur #2026-0148" },
    ],
    derniereActivite: "Il y a 1h",
  },
  {
    id: "plastiques-reunis",
    nom: "Plastiques Réunis SARL",
    ville: "Bordeaux",
    siren: "278 456 901",
    eori: "FR27845690100009",
    cbamTypes: [],
    conflitsOuverts: 2,
    slaMoyen: 6.8,
    dossiers30j: 3,
    valeur30j: 210000,
    valeurAnnee: 980000,
    dossiersTotal: 189,
    tauxAcceptance: 84,
    origines: ["CN", "VN"],
    volumeMensuel: [2, 3, 2, 4, 3, 2, 3, 2, 1, 3, 2, 2],
    contacts: [
      { nom: "Isabelle Morin", email: "i.morin@plastiques-reunis.fr", telephone: "+33 5 56 43 21 08", role: "Gerante", derniereRelance: "2026-05-07", statut: "en_attente" },
    ],
    produitsRecurrents: [
      { description: "Granules PET vierge", codeHS: "3907.61", utilisations: 22, derniereUtilisation: "2026-04-30", tauxAcceptance: 80 },
      { description: "Polypropylene en granules", codeHS: "3902.10", utilisations: 15, derniereUtilisation: "2026-03-22", tauxAcceptance: 87 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0181", date: "2026-05-01", statut: "Conflit", valeur: 48000, origine: "CN", flags: [] },
      { ref: "#2026-0163", date: "2026-04-18", statut: "Conflit", valeur: 72000, origine: "VN", flags: [] },
      { ref: "#2026-0144", date: "2026-04-02", statut: "Validé", valeur: 55000, origine: "CN", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-07", type: "email", description: "Relance envoyée a i.morin@plastiques-reunis.fr (sans reponse)" },
      { date: "2026-05-01", type: "conflit", description: "Conflit code NC sur #2026-0181 (3907.61 contesté)" },
      { date: "2026-04-18", type: "conflit", description: "Conflit déclaration valeur sur #2026-0163" },
    ],
    derniereActivite: "Il y a 3j",
  },
  {
    id: "metal-service-rhone",
    nom: "Métal Service Rhone",
    ville: "Marseille",
    siren: "445 712 889",
    eori: "FR44571288900022",
    cbamTypes: ["acier"],
    conflitsOuverts: 0,
    slaMoyen: 2.4,
    dossiers30j: 6,
    valeur30j: 890000,
    valeurAnnee: 5600000,
    dossiersTotal: 634,
    tauxAcceptance: 95,
    origines: ["TR", "UA"],
    volumeMensuel: [5, 6, 4, 5, 7, 6, 5, 8, 6, 7, 5, 6],
    contacts: [
      { nom: "Antoine Brun", email: "a.brun@metal-service-rhone.fr", telephone: "+33 4 91 55 32 17", role: "Directeur achats" },
    ],
    produitsRecurrents: [
      { description: "Ronds a béton crantés", codeHS: "7214.20", utilisations: 38, derniereUtilisation: "2026-05-07", tauxAcceptance: 96, btiRef: "FR-BTI-2024-0031" },
      { description: "Tubes acier carrés", codeHS: "7306.61", utilisations: 24, derniereUtilisation: "2026-04-25", tauxAcceptance: 94 },
      { description: "Feuillards laminés", codeHS: "7211.19", utilisations: 16, derniereUtilisation: "2026-03-28", tauxAcceptance: 97 },
    ],
    btis: [
      { reference: "FR-BTI-2024-0031", description: "Ronds a béton crantés", codeHS: "7214.20", source: "Direction Generale des Douanes", validiteFin: "2027-06-15" },
    ],
    dossiersHistorique: [
      { ref: "#2026-0180", date: "2026-05-07", statut: "Validé", valeur: 215000, origine: "TR", flags: ["BTI"] },
      { ref: "#2026-0162", date: "2026-04-24", statut: "CBAM", valeur: 287000, origine: "UA", flags: ["CBAM"] },
      { ref: "#2026-0143", date: "2026-04-08", statut: "Validé", valeur: 178000, origine: "TR", flags: [] },
      { ref: "#2026-0119", date: "2026-03-20", statut: "Validé", valeur: 143000, origine: "TR", flags: ["BTI"] },
    ],
    auditTrail: [
      { date: "2026-05-07", type: "document", description: "Certificat CBAM et EUR.1 reçus pour #2026-0180" },
      { date: "2026-04-24", type: "code", description: "Code 7214.20 validé avec BTI FR-BTI-2024-0031" },
    ],
    derniereActivite: "Il y a 6h",
  },
  {
    id: "fonderie-nord",
    nom: "Fonderie du Nord SAS",
    ville: "Lille",
    siren: "367 189 045",
    eori: "FR36718904500018",
    cbamTypes: ["acier", "ciment"],
    conflitsOuverts: 1,
    slaMoyen: 3.5,
    dossiers30j: 4,
    valeur30j: 520000,
    valeurAnnee: 3200000,
    dossiersTotal: 298,
    tauxAcceptance: 91,
    origines: ["PL", "DE", "IN"],
    volumeMensuel: [4, 5, 6, 4, 5, 7, 6, 5, 4, 6, 5, 4],
    contacts: [
      { nom: "Marc Delacroix", email: "m.delacroix@fonderie-nord.fr", telephone: "+33 3 20 41 28 90", role: "Responsable import" },
    ],
    produitsRecurrents: [
      { description: "Fontes en gueuses", codeHS: "7201.10", utilisations: 19, derniereUtilisation: "2026-05-02", tauxAcceptance: 88 },
      { description: "Ciment Portland", codeHS: "2523.29", utilisations: 14, derniereUtilisation: "2026-04-15", tauxAcceptance: 94 },
      { description: "Ferraille d'acier", codeHS: "7204.10", utilisations: 11, derniereUtilisation: "2026-03-25", tauxAcceptance: 91 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0179", date: "2026-05-02", statut: "En attente", valeur: 98000, origine: "PL", flags: ["CBAM"] },
      { ref: "#2026-0160", date: "2026-04-18", statut: "Conflit", valeur: 167000, origine: "IN", flags: ["CBAM"] },
      { ref: "#2026-0138", date: "2026-03-30", statut: "Validé", valeur: 112000, origine: "DE", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-03", type: "email", description: "Relance envoyée a m.delacroix@fonderie-nord.fr" },
      { date: "2026-04-18", type: "conflit", description: "Conflit déclaration CBAM sur #2026-0160 (tonnes CO2 manquantes)" },
    ],
    derniereActivite: "Il y a 2j",
  },
  {
    id: "chimie-provence",
    nom: "Chimie Provence SARL",
    ville: "Aix-en-Provence",
    siren: "589 341 228",
    eori: "FR58934122800033",
    cbamTypes: ["engrais"],
    conflitsOuverts: 0,
    slaMoyen: 2.8,
    dossiers30j: 2,
    valeur30j: 345000,
    valeurAnnee: 2100000,
    dossiersTotal: 187,
    tauxAcceptance: 96,
    origines: ["MA", "RU"],
    volumeMensuel: [2, 1, 3, 2, 2, 3, 1, 2, 3, 2, 2, 1],
    contacts: [
      { nom: "Nathalie Aubert", email: "n.aubert@chimie-provence.fr", telephone: "+33 4 42 88 12 45", role: "Directrice" },
    ],
    produitsRecurrents: [
      { description: "Ammoniac anhydre", codeHS: "2814.10", utilisations: 24, derniereUtilisation: "2026-04-28", tauxAcceptance: 97 },
      { description: "Urée en granules", codeHS: "3102.10", utilisations: 18, derniereUtilisation: "2026-03-14", tauxAcceptance: 95 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0175", date: "2026-04-28", statut: "En attente", valeur: 198000, origine: "MA", flags: ["CBAM"] },
      { ref: "#2026-0152", date: "2026-03-30", statut: "Validé", valeur: 147000, origine: "RU", flags: [] },
    ],
    auditTrail: [
      { date: "2026-04-28", type: "document", description: "Certificat CBAM engrais soumis pour #2026-0175" },
      { date: "2026-03-30", type: "code", description: "Code 3102.10 confirmé pour #2026-0152" },
    ],
    derniereActivite: "Il y a 4j",
  },
  {
    id: "bureau-import",
    nom: "Bureau Import SARL",
    ville: "Paris",
    siren: "491 823 667",
    eori: "FR49182366700041",
    cbamTypes: [],
    conflitsOuverts: 0,
    slaMoyen: 1.9,
    dossiers30j: 2,
    valeur30j: 87000,
    valeurAnnee: 520000,
    dossiersTotal: 143,
    tauxAcceptance: 99,
    origines: ["JP", "US"],
    volumeMensuel: [1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2],
    contacts: [
      { nom: "Celine Rousseau", email: "c.rousseau@bureau-import.fr", telephone: "+33 1 43 22 88 00", role: "Gerante" },
    ],
    produitsRecurrents: [
      { description: "Composants electroniques CMS", codeHS: "8542.31", utilisations: 31, derniereUtilisation: "2026-05-03", tauxAcceptance: 99 },
      { description: "Instruments de précision", codeHS: "9031.80", utilisations: 12, derniereUtilisation: "2026-03-07", tauxAcceptance: 100 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0174", date: "2026-05-03", statut: "Validé", valeur: 44000, origine: "JP", flags: [] },
      { ref: "#2026-0153", date: "2026-03-20", statut: "Validé", valeur: 43000, origine: "US", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-03", type: "document", description: "Liasse complete reçue pour #2026-0174" },
    ],
    derniereActivite: "Il y a 5j",
  },
  {
    id: "groupe-ferraille-ouest",
    nom: "Groupe Ferraille Ouest",
    ville: "Nantes",
    siren: "334 578 112",
    eori: "FR33457811200015",
    cbamTypes: ["acier"],
    conflitsOuverts: 1,
    slaMoyen: 5.1,
    dossiers30j: 7,
    valeur30j: 1050000,
    valeurAnnee: 6800000,
    dossiersTotal: 721,
    tauxAcceptance: 89,
    origines: ["TR", "IN", "PK"],
    volumeMensuel: [7, 8, 6, 9, 7, 10, 8, 9, 7, 8, 6, 7],
    contacts: [
      { nom: "Bernard Guerin", email: "b.guerin@gfo.fr", telephone: "+33 2 40 88 12 34", role: "Directeur general" },
      { nom: "Helene Petit", email: "h.petit@gfo.fr", telephone: "+33 2 40 88 12 35", role: "Responsable logistique", derniereRelance: "2026-05-04", statut: "en_attente" },
    ],
    produitsRecurrents: [
      { description: "Ferraille acier triée", codeHS: "7204.49", utilisations: 54, derniereUtilisation: "2026-05-06", tauxAcceptance: 85 },
      { description: "Acier inoxydable ferraille", codeHS: "7204.21", utilisations: 32, derniereUtilisation: "2026-04-20", tauxAcceptance: 91 },
      { description: "Déchets et débris d'acier", codeHS: "7204.50", utilisations: 21, derniereUtilisation: "2026-03-12", tauxAcceptance: 88 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0178", date: "2026-05-06", statut: "Conflit", valeur: 89000, origine: "TR", flags: [] },
      { ref: "#2026-0161", date: "2026-04-22", statut: "CBAM", valeur: 234000, origine: "IN", flags: ["CBAM"] },
      { ref: "#2026-0142", date: "2026-04-06", statut: "Validé", valeur: 178000, origine: "PK", flags: [] },
      { ref: "#2026-0123", date: "2026-03-20", statut: "Validé", valeur: 198000, origine: "TR", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-06", type: "conflit", description: "Conflit code sur #2026-0178 (7204.49 contesté par douane)" },
      { date: "2026-05-04", type: "email", description: "Relance envoyée a h.petit@gfo.fr (sans reponse)" },
      { date: "2026-04-22", type: "document", description: "Déclaration CBAM acier soumise pour #2026-0161" },
    ],
    derniereActivite: "Il y a 1j",
  },
  {
    id: "textile-horizon",
    nom: "Textile Horizon SAS",
    ville: "Toulouse",
    siren: "608 923 415",
    eori: "FR60892341500028",
    cbamTypes: [],
    conflitsOuverts: 0,
    slaMoyen: 2.2,
    dossiers30j: 3,
    valeur30j: 182000,
    valeurAnnee: 1100000,
    dossiersTotal: 224,
    tauxAcceptance: 97,
    origines: ["BD", "VN", "IN"],
    volumeMensuel: [3, 4, 3, 5, 4, 3, 4, 5, 4, 3, 4, 3],
    contacts: [
      { nom: "Fabrice Leclerc", email: "f.leclerc@textile-horizon.fr", telephone: "+33 5 61 22 45 67", role: "Responsable sourcing" },
    ],
    produitsRecurrents: [
      { description: "Tissus en coton écru", codeHS: "5208.11", utilisations: 27, derniereUtilisation: "2026-05-04", tauxAcceptance: 98 },
      { description: "Fils polyester texturés", codeHS: "5402.33", utilisations: 19, derniereUtilisation: "2026-04-10", tauxAcceptance: 96 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0176", date: "2026-05-04", statut: "Validé", valeur: 67000, origine: "BD", flags: [] },
      { ref: "#2026-0155", date: "2026-04-15", statut: "Validé", valeur: 58000, origine: "VN", flags: [] },
      { ref: "#2026-0134", date: "2026-03-28", statut: "En attente", valeur: 57000, origine: "IN", flags: [] },
    ],
    auditTrail: [
      { date: "2026-05-04", type: "document", description: "Liasse complete reçue pour #2026-0176" },
      { date: "2026-04-15", type: "code", description: "Code 5208.11 confirmé pour #2026-0155" },
    ],
    derniereActivite: "Il y a 4j",
  },
  {
    id: "agro-import-sud",
    nom: "Agro-Import Sud SARL",
    ville: "Montpellier",
    siren: "456 781 223",
    eori: "FR45678122300019",
    cbamTypes: ["engrais"],
    conflitsOuverts: 0,
    slaMoyen: 3.1,
    dossiers30j: 2,
    valeur30j: 290000,
    valeurAnnee: 1750000,
    dossiersTotal: 156,
    tauxAcceptance: 94,
    origines: ["TN", "EG"],
    volumeMensuel: [2, 2, 3, 2, 3, 2, 4, 3, 2, 3, 3, 2],
    contacts: [
      { nom: "Thierry Maurin", email: "t.maurin@agro-import-sud.fr", telephone: "+33 4 67 58 33 12", role: "Gerant" },
    ],
    produitsRecurrents: [
      { description: "Nitrate d'ammonium 34N", codeHS: "3102.30", utilisations: 20, derniereUtilisation: "2026-04-25", tauxAcceptance: 93 },
      { description: "Phosphate diammonique", codeHS: "3105.30", utilisations: 14, derniereUtilisation: "2026-03-18", tauxAcceptance: 95 },
    ],
    btis: [],
    dossiersHistorique: [
      { ref: "#2026-0173", date: "2026-04-25", statut: "En attente", valeur: 148000, origine: "TN", flags: ["CBAM"] },
      { ref: "#2026-0150", date: "2026-03-30", statut: "Validé", valeur: 142000, origine: "EG", flags: [] },
    ],
    auditTrail: [
      { date: "2026-04-25", type: "document", description: "Certificat CBAM engrais soumis pour #2026-0173" },
    ],
    derniereActivite: "Il y a 6j",
  },
  {
    id: "composants-meca-paris",
    nom: "Composants Méca Paris SAS",
    ville: "Paris",
    siren: "712 456 889",
    eori: "FR71245688900044",
    cbamTypes: ["alu"],
    conflitsOuverts: 0,
    slaMoyen: 2.0,
    dossiers30j: 5,
    valeur30j: 710000,
    valeurAnnee: 4300000,
    dossiersTotal: 489,
    tauxAcceptance: 96,
    origines: ["DE", "JP"],
    volumeMensuel: [5, 4, 6, 5, 6, 7, 5, 6, 7, 5, 6, 5],
    contacts: [
      { nom: "Olivier Chevalier", email: "o.chevalier@cmp-sas.fr", telephone: "+33 1 44 32 11 28", role: "Directeur technique" },
    ],
    produitsRecurrents: [
      { description: "Pieces mécaniques aluminium usinées", codeHS: "7616.99", utilisations: 34, derniereUtilisation: "2026-05-06", tauxAcceptance: 97, btiRef: "FR-BTI-2024-0089" },
      { description: "Ébauches pour pieces d'horlogerie", codeHS: "9114.90", utilisations: 22, derniereUtilisation: "2026-04-12", tauxAcceptance: 95 },
      { description: "Profiles aluminium anodisés", codeHS: "7604.29", utilisations: 18, derniereUtilisation: "2026-03-22", tauxAcceptance: 98 },
    ],
    btis: [
      { reference: "FR-BTI-2024-0089", description: "Pieces mécaniques usinées aluminium", codeHS: "7616.99", source: "Direction Generale des Douanes", validiteFin: "2027-09-30" },
    ],
    dossiersHistorique: [
      { ref: "#2026-0177", date: "2026-05-06", statut: "Validé", valeur: 187000, origine: "DE", flags: ["BTI"] },
      { ref: "#2026-0158", date: "2026-04-21", statut: "CBAM", valeur: 203000, origine: "JP", flags: ["CBAM"] },
      { ref: "#2026-0137", date: "2026-04-04", statut: "Validé", valeur: 145000, origine: "DE", flags: [] },
      { ref: "#2026-0116", date: "2026-03-18", statut: "Validé", valeur: 175000, origine: "DE", flags: ["BTI"] },
    ],
    auditTrail: [
      { date: "2026-05-06", type: "document", description: "BTI FR-BTI-2024-0089 utilisé pour #2026-0177" },
      { date: "2026-04-21", type: "document", description: "Déclaration CBAM alu soumise pour #2026-0158" },
      { date: "2026-04-04", type: "code", description: "Code 7616.99 validé pour #2026-0137" },
    ],
    derniereActivite: "Il y a 2j",
  },
];
