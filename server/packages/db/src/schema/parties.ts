import {
  boolean,
  char,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./tenancy.js";

export const partieRelationTypeEnum = pgEnum("partie_relation_type", [
  "importateur",
  "fournisseur",
  "transporteur",
  "expediteur",
  "autre",
]);

export const parties = pgTable(
  "parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siren: varchar("siren", { length: 9 }),
    eori: varchar("eori", { length: 17 }),
    raisonSociale: text("raison_sociale").notNull(),
    formeJuridique: varchar("forme_juridique", { length: 64 }),
    pays: char("pays", { length: 2 }).notNull(),
    adresse: text("adresse"),
    codePostal: varchar("code_postal", { length: 16 }),
    ville: text("ville"),
    codeNaf: varchar("code_naf", { length: 8 }),
    enrichedVia: text("enriched_via"),
    enrichedAt: timestamp("enriched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sirenIdx: index("parties_siren")
      .on(t.siren)
      .where(sql`${t.siren} IS NOT NULL`),
    eoriIdx: index("parties_eori")
      .on(t.eori)
      .where(sql`${t.eori} IS NOT NULL`),
    raisonSocialeTrgmIdx: index("parties_raison_sociale_trgm").on(t.raisonSociale),
    // UNIQUE NULLS NOT DISTINCT (siren, pays) — enforced in SQL migration
    // UNIQUE NULLS NOT DISTINCT (eori) — enforced in SQL migration
  }),
);

export const partieRelations = pgTable(
  "partie_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    partieId: uuid("partie_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    type: partieRelationTypeEnum("type").notNull(),
    alias: text("alias"),
    regimeDouanierHabituel: varchar("regime_douanier_habituel", { length: 4 }),
    originePreferentielleAttendue: char("origine_preferentielle_attendue", {
      length: 2,
    }),
    notes: text("notes"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    dossierCount: integer("dossier_count").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index("partie_rel_org")
      .on(t.organizationId)
      .where(sql`${t.archivedAt} IS NULL`),
    partieIdx: index("partie_rel_partie").on(t.partieId),
    uniqueOrgPartieType: uniqueIndex("partie_rel_org_partie_type_unique").on(
      t.organizationId,
      t.partieId,
      t.type,
    ),
  }),
);

export const partieContacts = pgTable(
  "partie_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    partieRelationId: uuid("partie_relation_id")
      .notNull()
      .references(() => partieRelations.id, { onDelete: "cascade" }),
    fullName: text("full_name"),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    isDefaultForRelances: boolean("is_default_for_relances")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    relationIdx: index("partie_contacts_relation").on(t.partieRelationId),
    defaultIdx: index("partie_contacts_default")
      .on(t.partieRelationId)
      .where(sql`${t.isDefaultForRelances} = true`),
  }),
);

export const btiRecords = pgTable(
  "bti_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    partieRelationId: uuid("partie_relation_id").references(
      () => partieRelations.id,
    ),
    btiReference: text("bti_reference").notNull(),
    hsCode: varchar("hs_code", { length: 10 }).notNull(),
    productDescription: text("product_description").notNull(),
    emittedByCountry: char("emitted_by_country", { length: 2 }).notNull(),
    emittedAt: date("emitted_at").notNull(),
    validUntil: date("valid_until").notNull(),
    pdfStoragePath: text("pdf_storage_path"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgIdx: index("bti_records_org").on(t.organizationId),
    hsIdx: index("bti_records_hs").on(t.organizationId, t.hsCode),
  }),
);

export type PartySelect = typeof parties.$inferSelect;
export type PartyInsert = typeof parties.$inferInsert;
export type PartieRelationSelect = typeof partieRelations.$inferSelect;
export type PartieRelationInsert = typeof partieRelations.$inferInsert;
export type PartieContactSelect = typeof partieContacts.$inferSelect;
export type PartieContactInsert = typeof partieContacts.$inferInsert;
export type BtiRecordSelect = typeof btiRecords.$inferSelect;
export type BtiRecordInsert = typeof btiRecords.$inferInsert;
