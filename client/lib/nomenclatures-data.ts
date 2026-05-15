export type Flag = "CBAM" | "AD_IN" | "AD_CN" | "AD_EU" | "Surv" | "BTI";

export interface TaricNode {
  code: string;
  description: string;
  flags: Flag[];
  level: "section" | "chapter" | "heading" | "subheading" | "cn8";
  children?: TaricNode[];
}

export interface CodeDetail {
  code: string;
  description: string;
  breadcrumb: string[];
  uniteStatistique: string;
  derniereMaj: string;
  mesures: Mesure[];
  alertes: string[];
  notesExtrait: string;
  flags: Flag[];
}

export interface Mesure {
  label: string;
  taux: string;
  ref?: string;
  highlight?: boolean;
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

export const TARIC_TREE: TaricNode[] = [
  {
    code: "S-VI",
    description: "Section VI — Produits des industries chimiques",
    flags: ["CBAM"],
    level: "section",
    children: [
      {
        code: "31",
        description: "Ch. 31 — Engrais",
        flags: ["CBAM"],
        level: "chapter",
        children: [
          {
            code: "31.02",
            description: "Engrais minéraux ou chimiques azotés",
            flags: ["CBAM"],
            level: "heading",
            children: [
              {
                code: "3102.10",
                description: "Urée, même en solution aqueuse",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "3102.10.10", description: "En solution aqueuse", flags: ["CBAM"], level: "cn8" },
                  { code: "3102.10.90", description: "Autres", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "3102.21",
                description: "Sulfate d'ammonium",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "3102.21.00", description: "Sulfate d'ammonium", flags: ["CBAM"], level: "cn8" },
                ],
              },
            ],
          },
          {
            code: "31.05",
            description: "Engrais minéraux ou chimiques mixtes",
            flags: ["CBAM", "Surv"],
            level: "heading",
            children: [
              {
                code: "3105.20",
                description: "Engrais minéraux contenant N, P et K",
                flags: ["CBAM", "Surv"],
                level: "subheading",
                children: [
                  { code: "3105.20.10", description: "Teneur en P₂O₅ ≤ 10%", flags: ["CBAM"], level: "cn8" },
                  { code: "3105.20.90", description: "Autres", flags: ["CBAM", "Surv"], level: "cn8" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "S-XIII",
    description: "Section XIII — Pierre, plâtre, ciment, céramique, verre",
    flags: ["CBAM"],
    level: "section",
    children: [
      {
        code: "25",
        description: "Ch. 25 — Sel, soufre, terres, pierres, plâtre, chaux, ciment",
        flags: ["CBAM"],
        level: "chapter",
        children: [
          {
            code: "25.23",
            description: "Ciments hydrauliques",
            flags: ["CBAM"],
            level: "heading",
            children: [
              {
                code: "2523.10",
                description: "Ciments non pulvérisés (clinker)",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "2523.10.00", description: "Ciments non pulvérisés (clinker)", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "2523.21",
                description: "Ciment blanc, même coloré artificiellement",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "2523.21.00", description: "Ciment blanc, même coloré artificiellement", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "2523.29",
                description: "Autres ciments Portland",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "2523.29.00", description: "Autres ciments Portland", flags: ["CBAM"], level: "cn8" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "S-XV",
    description: "Section XV — Métaux communs et ouvrages en métaux communs",
    flags: ["CBAM", "AD_CN", "AD_IN", "Surv"],
    level: "section",
    children: [
      {
        code: "72",
        description: "Ch. 72 — Fonte, fer et acier",
        flags: ["CBAM", "AD_CN", "AD_IN", "Surv"],
        level: "chapter",
        children: [
          {
            code: "72.08",
            description: "Produits laminés plats en fer ou aciers non alliés",
            flags: ["CBAM", "AD_CN", "Surv"],
            level: "heading",
            children: [
              {
                code: "7208.51",
                description: "D'une épaisseur excédant 10 mm",
                flags: ["CBAM", "AD_CN"],
                level: "subheading",
                children: [
                  { code: "7208.51.20", description: "Laminés à chaud, non revêtus, ep. > 10 mm, larg. ≥ 600 mm", flags: ["CBAM", "AD_CN"], level: "cn8" },
                  { code: "7208.51.91", description: "Autres, ep. > 10 mm", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "7208.52",
                description: "D'une épaisseur de 4,75 mm ou plus mais n'excédant pas 10 mm",
                flags: ["CBAM", "AD_CN", "Surv"],
                level: "subheading",
                children: [
                  { code: "7208.52.10", description: "Laminés à chaud, ep. 4,75-10 mm, larg. ≥ 600 mm", flags: ["CBAM", "AD_CN"], level: "cn8" },
                  { code: "7208.52.99", description: "Autres", flags: ["CBAM", "Surv"], level: "cn8" },
                ],
              },
              {
                code: "7208.53",
                description: "D'une épaisseur de 3 mm ou plus mais inférieure à 4,75 mm",
                flags: ["CBAM", "Surv"],
                level: "subheading",
                children: [
                  { code: "7208.53.10", description: "Laminés à chaud, ep. 3-4,75 mm", flags: ["CBAM"], level: "cn8" },
                  { code: "7208.53.90", description: "Autres", flags: ["CBAM", "Surv"], level: "cn8" },
                ],
              },
            ],
          },
          {
            code: "72.14",
            description: "Barres en fer ou aciers non alliés",
            flags: ["CBAM", "AD_IN"],
            level: "heading",
            children: [
              {
                code: "7214.20",
                description: "Comportant des indentations, bourrelets, etc.",
                flags: ["CBAM", "AD_IN"],
                level: "subheading",
                children: [
                  { code: "7214.20.00", description: "Barres d'armature pour béton armé", flags: ["CBAM", "AD_IN"], level: "cn8" },
                ],
              },
              {
                code: "7214.99",
                description: "Autres",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "7214.99.10", description: "Teneur en Mn ≥ 0,6%", flags: ["CBAM"], level: "cn8" },
                  { code: "7214.99.90", description: "Autres", flags: ["CBAM"], level: "cn8" },
                ],
              },
            ],
          },
          {
            code: "72.15",
            description: "Autres barres en fer ou aciers non alliés",
            flags: ["CBAM"],
            level: "heading",
            children: [
              {
                code: "7215.50",
                description: "Simplement obtenues ou parachevées à froid",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "7215.50.11", description: "Teneur en C ≥ 0,25%", flags: ["CBAM"], level: "cn8" },
                  { code: "7215.50.19", description: "Autres", flags: ["CBAM"], level: "cn8" },
                ],
              },
            ],
          },
        ],
      },
      {
        code: "73",
        description: "Ch. 73 — Ouvrages en fonte, fer ou acier",
        flags: ["AD_CN", "Surv"],
        level: "chapter",
        children: [
          {
            code: "73.04",
            description: "Tubes, tuyaux et profilés creux, sans soudure",
            flags: ["AD_CN", "Surv"],
            level: "heading",
            children: [
              {
                code: "7304.31",
                description: "En acier inoxydable, de section circulaire",
                flags: ["AD_CN", "Surv"],
                level: "subheading",
                children: [
                  { code: "7304.31.20", description: "Diamètre extérieur ≤ 168,3 mm", flags: ["AD_CN"], level: "cn8" },
                  { code: "7304.31.80", description: "Diamètre extérieur > 168,3 mm", flags: ["Surv"], level: "cn8" },
                ],
              },
            ],
          },
        ],
      },
      {
        code: "76",
        description: "Ch. 76 — Aluminium et ouvrages en aluminium",
        flags: ["CBAM", "Surv"],
        level: "chapter",
        children: [
          {
            code: "76.01",
            description: "Aluminium brut",
            flags: ["CBAM"],
            level: "heading",
            children: [
              {
                code: "7601.10",
                description: "Aluminium non allié",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "7601.10.00", description: "Aluminium non allié", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "7601.20",
                description: "Alliages d'aluminium",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "7601.20.10", description: "Alliages Al-Mg", flags: ["CBAM"], level: "cn8" },
                  { code: "7601.20.90", description: "Autres alliages", flags: ["CBAM"], level: "cn8" },
                ],
              },
            ],
          },
          {
            code: "76.04",
            description: "Barres, profilés et fils en aluminium",
            flags: ["CBAM", "Surv"],
            level: "heading",
            children: [
              {
                code: "7604.10",
                description: "En aluminium non allié",
                flags: ["CBAM"],
                level: "subheading",
                children: [
                  { code: "7604.10.10", description: "Fils", flags: ["CBAM"], level: "cn8" },
                  { code: "7604.10.90", description: "Autres", flags: ["CBAM"], level: "cn8" },
                ],
              },
              {
                code: "7604.21",
                description: "Profilés creux en alliages d'aluminium",
                flags: ["CBAM", "Surv"],
                level: "subheading",
                children: [
                  { code: "7604.21.00", description: "Profilés creux en alliages d'aluminium", flags: ["CBAM", "Surv"], level: "cn8" },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Default selected code detail ─────────────────────────────────────────────

export const DEFAULT_CODE = "7208.51.20";

export const CODE_DETAILS: Record<string, CodeDetail> = {
  "7208.51.20": {
    code: "7208.51.20",
    description: "Produits laminés plats en fer ou aciers non alliés, laminés à chaud, non plaqués, non revêtus, d'une épaisseur excédant 10 mm, d'une largeur égale ou supérieure à 600 mm",
    breadcrumb: ["Section XV", "Métaux communs", "Ch. 72", "Position 72.08", "Sous-position 7208.51", "CN8 7208.51.20"],
    uniteStatistique: "Tonne nette (TNE)",
    derniereMaj: "1 mai 2026",
    flags: ["CBAM", "AD_CN"],
    mesures: [
      { label: "Droit de douane TEC", taux: "0 %", ref: "Tarif commun, Annexe I Règl. 2658/87" },
      { label: "TVA importation FR", taux: "20 %", ref: "CGI art. 291" },
      { label: "Antidumping — Chine (RPC)", taux: "25,0 %", ref: "Règl. UE 2016/1328", highlight: true },
      { label: "Antidumping — Inde", taux: "Non applicable", ref: "—" },
      { label: "Surveillance UE", taux: "Active", ref: "Règl. UE 2023/0451", highlight: true },
      { label: "CBAM", taux: "Soumis — déclaration obligatoire", ref: "Règl. UE 2023/956", highlight: true },
    ],
    alertes: [
      "Épaisseur > 10 mm — vérifier que la marchandise n'est pas mieux classée en 7208.52 (4,75-10 mm) ou 7208.90 avant dédouanement.",
      "Origine Chine (RPC) — antidumping 25 % applicable sauf présentation d'un engagement de prix valide (liste officielle DGDDI, mise à jour mensuelle).",
      "CBAM phase transitoire : rapport trimestriel obligatoire dès 1 janvier 2026 — données d'émissions à certifier auprès de l'installation productrice.",
      "BTI référence FR-2024-0077 émise par la DGDDI pour une position similaire (épaisseur 12 mm, larg. 1200 mm) — applicable si description identique.",
      "Jurisprudence CJUE C-183/21 : le laminé à chaud recuit ne bénéficie pas de l'exonération antidumping prévue pour les produits thermiquement traités.",
    ],
    notesExtrait: "La présente sous-position comprend les produits laminés plats en fer ou en aciers non alliés, obtenus par laminage à chaud, non plaqués ni revêtus, présentés en rouleaux (bobines) ou non. L'épaisseur excédant 10 mm distingue ces produits des tôles de faible épaisseur (sous-position 7208.52 et suivantes). Sont exclus les produits simplement obtenus à froid (position 72.09) et les produits revêtus (positions 72.10 à 72.12). Pour l'application du droit antidumping, l'origine est déterminée conformément au Code des douanes de l'Union (CDU), art. 59 à 63.",
  },
  "7208.51.91": {
    code: "7208.51.91",
    description: "Produits laminés plats en fer ou aciers non alliés, d'une épaisseur excédant 10 mm, autres",
    breadcrumb: ["Section XV", "Métaux communs", "Ch. 72", "Position 72.08", "Sous-position 7208.51", "CN8 7208.51.91"],
    uniteStatistique: "Tonne nette (TNE)",
    derniereMaj: "1 mai 2026",
    flags: ["CBAM"],
    mesures: [
      { label: "Droit de douane TEC", taux: "0 %", ref: "Tarif commun, Annexe I Règl. 2658/87" },
      { label: "TVA importation FR", taux: "20 %", ref: "CGI art. 291" },
      { label: "Antidumping — Chine (RPC)", taux: "Non applicable", ref: "Hors champ du Règl. 2016/1328" },
      { label: "CBAM", taux: "Soumis — déclaration obligatoire", ref: "Règl. UE 2023/956", highlight: true },
    ],
    alertes: [
      "CBAM phase transitoire : rapport trimestriel obligatoire — données d'émissions à certifier auprès de l'installation productrice.",
      "Si l'épaisseur est à la limite (autour de 10 mm), vérifier la mesure effective et envisager 7208.52 si besoin.",
    ],
    notesExtrait: "Regroupe les produits laminés plats en fer ou aciers non alliés, épaisseur > 10 mm, non couverts par la sous-position 7208.51.20. Ces positions résiduelles («Autres») regroupent les formats non standard et les alliages limites.",
  },
};
