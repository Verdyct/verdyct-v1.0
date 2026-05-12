import {
  bigint,
  boolean,
  char,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./tenancy.js";
import { partieRelations } from "./parties.js";

export const dossierSourceEnum = pgEnum("dossier_source", [
  "email_forward",
  "upload",
  "manual",
  "api",
]);

export const dossierStatusEnum = pgEnum("dossier_status", [
  "brouillon",
  "en_attente_info",
  "pret_a_valider",
  "valide",
  "envoye",
  "accepte",
  "refuse",
  "archive",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "facture",
  "bl",
  "cmr",
  "packing_list",
  "eur1",
  "rex",
  "co_origine_non_pref",
  "lcv",
  "awb",
  "connaissement",
  "email_body",
  "email_attachment_other",
  "declaration_xml",
  "autre",
]);

export const ligneStatusEnum = pgEnum("ligne_status", [
  "extracted",
  "cascade_running",
  "suggestion_ready",
  "awaiting_clarification",
  "awaiting_importer",
  "validated",
  "flagged",
]);

export const suggestionLayerEnum = pgEnum("suggestion_layer", ["1", "2", "3"]);

export const decisionActorEnum = pgEnum("decision_actor", [
  "user",
  "system",
  "agent_ia",
  "cascade_l1",
  "cascade_l2",
]);

export const dossiers = pgTable(
  "dossiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    referenceInterne: varchar("reference_interne", { length: 64 }).notNull(),
    source: dossierSourceEnum("source").notNull(),
    sourceMetadata: jsonb("source_metadata"),
    status: dossierStatusEnum("status").notNull().default("brouillon"),

    importateurRelationId: uuid("importateur_relation_id").references(
      () => partieRelations.id,
    ),
    fournisseurRelationId: uuid("fournisseur_relation_id").references(
      () => partieRelations.id,
    ),
    expediteurRelationId: uuid("expediteur_relation_id").references(
      () => partieRelations.id,
    ),

    dateOperation: date("date_operation"),
    bureauDouaneCode: varchar("bureau_douane_code", { length: 8 }),
    incoterm: varchar("incoterm", { length: 3 }),
    lieuIncoterm: text("lieu_incoterm"),
    devise: char("devise", { length: 3 }),
    valeurTotaleFact: numeric("valeur_totale_facturee", {
      precision: 14,
      scale: 2,
    }),
    valeurTotaleEnDouane: numeric("valeur_totale_en_douane", {
      precision: 14,
      scale: 2,
    }),

    declarationXmlStoragePath: text("declaration_xml_storage_path"),
    declarationXmlFormat: varchar("declaration_xml_format", { length: 16 }),
    declarationGeneratedAt: timestamp("declaration_generated_at", {
      withTimezone: true,
    }),
    deltaReference: text("delta_reference"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => ({
    orgStatusIdx: index("dossiers_org_status")
      .on(t.organizationId, t.status)
      .where(sql`${t.archivedAt} IS NULL`),
    importateurIdx: index("dossiers_importateur").on(t.importateurRelationId),
    createdIdx: index("dossiers_created").on(t.organizationId, t.createdAt),
    uniqueOrgRef: uniqueIndex("dossiers_org_ref_unique").on(
      t.organizationId,
      t.referenceInterne,
    ),
  }),
);

export const dossierDocuments = pgTable(
  "dossier_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dossierId: uuid("dossier_id")
      .notNull()
      .references(() => dossiers.id, { onDelete: "cascade" }),
    documentType: documentTypeEnum("document_type").notNull().default("autre"),
    filename: text("filename").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    parsedAt: timestamp("parsed_at", { withTimezone: true }),
    parsedText: text("parsed_text"),
    parsedStructured: jsonb("parsed_structured"),
    parseError: text("parse_error"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
  },
  (t) => ({
    dossierIdx: index("dossier_docs_dossier").on(t.dossierId),
  }),
);

export const lignesDossier = pgTable(
  "lignes_dossier",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dossierId: uuid("dossier_id")
      .notNull()
      .references(() => dossiers.id, { onDelete: "cascade" }),
    numeroLigne: smallint("numero_ligne").notNull(),
    status: ligneStatusEnum("status").notNull().default("extracted"),

    descriptionProduit: text("description_produit").notNull(),
    descriptionNormalisee: text("description_normalisee"),
    descriptionNormaliseeHash: char("description_normalisee_hash", {
      length: 64,
    }),
    marque: text("marque"),
    referenceFabricant: text("reference_fabricant"),
    embedding: vector("embedding", { dimensions: 1024 }),

    quantite: numeric("quantite", { precision: 14, scale: 4 }),
    uniteQuantite: varchar("unite_quantite", { length: 16 }),
    poidsBrutKg: numeric("poids_brut_kg", { precision: 14, scale: 4 }),
    poidsNetKg: numeric("poids_net_kg", { precision: 14, scale: 4 }),
    valeurUnitaire: numeric("valeur_unitaire", { precision: 14, scale: 4 }),
    devise: char("devise", { length: 3 }),
    valeurTotale: numeric("valeur_totale", { precision: 14, scale: 2 }),

    hsCode: varchar("hs_code", { length: 10 }),
    regime: varchar("regime", { length: 4 }),
    paysOrigine: char("pays_origine", { length: 2 }),
    paysOrigineNonPreferentielle: char("pays_origine_non_preferentielle", {
      length: 2,
    }),
    originePreferentielleRevendiquee: boolean(
      "origine_preferentielle_revendiquee",
    ),
    preuveOrigineType: varchar("preuve_origine_type", { length: 16 }),

    flags: jsonb("flags").default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    lignesDossierIdx: index("lignes_dossier_idx").on(t.dossierId, t.numeroLigne),
    statusIdx: index("lignes_status")
      .on(t.organizationId, t.status)
      .where(sql`${t.deletedAt} IS NULL`),
    hashIdx: index("lignes_hash")
      .on(t.organizationId, t.descriptionNormaliseeHash)
      .where(
        sql`${t.validatedAt} IS NOT NULL AND ${t.deletedAt} IS NULL`,
      ),
    embeddingHnswIdx: index("lignes_embedding_hnsw").on(t.embedding),
    hsCodeIdx: index("lignes_hs_code")
      .on(t.organizationId, t.hsCode)
      .where(sql`${t.validatedAt} IS NOT NULL`),
  }),
);

export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ligneId: uuid("ligne_id")
      .notNull()
      .references(() => lignesDossier.id, { onDelete: "cascade" }),
    layer: suggestionLayerEnum("layer").notNull(),
    rank: smallint("rank").notNull().default(1),

    hsCode: varchar("hs_code", { length: 10 }),
    regime: varchar("regime", { length: 4 }),
    paysOrigine: char("pays_origine", { length: 2 }),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    source: jsonb("source").notNull(),

    presentedAt: timestamp("presented_at", { withTimezone: true }),
    wasAccepted: boolean("was_accepted"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    editedBeforeAccept: jsonb("edited_before_accept"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ligneIdx: index("suggestions_ligne").on(t.ligneId),
  }),
);

export const decisionLog = pgTable(
  "decision_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dossierId: uuid("dossier_id")
      .notNull()
      .references(() => dossiers.id, { onDelete: "cascade" }),
    ligneId: uuid("ligne_id").references(() => lignesDossier.id, {
      onDelete: "cascade",
    }),

    actor: decisionActorEnum("actor").notNull(),
    userId: uuid("user_id").references(() => users.id),
    fieldName: text("field_name").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    source: jsonb("source"),
    reasoning: text("reasoning"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dossierIdx: index("decision_log_dossier").on(t.dossierId, t.occurredAt),
    ligneIdx: index("decision_log_ligne").on(t.ligneId, t.occurredAt),
  }),
);

export type DossierSelect = typeof dossiers.$inferSelect;
export type DossierInsert = typeof dossiers.$inferInsert;
export type DossierDocumentSelect = typeof dossierDocuments.$inferSelect;
export type DossierDocumentInsert = typeof dossierDocuments.$inferInsert;
export type LigneDossierSelect = typeof lignesDossier.$inferSelect;
export type LigneDossierInsert = typeof lignesDossier.$inferInsert;
export type SuggestionSelect = typeof suggestions.$inferSelect;
export type SuggestionInsert = typeof suggestions.$inferInsert;
export type DecisionLogSelect = typeof decisionLog.$inferSelect;
export type DecisionLogInsert = typeof decisionLog.$inferInsert;
