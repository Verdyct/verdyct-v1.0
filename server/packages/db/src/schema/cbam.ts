import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./tenancy.js";
import { partieRelations } from "./parties.js";
import { lignesDossier } from "./dossiers.js";

export const cbamEmissionsSourceEnum = pgEnum("cbam_emissions_source", [
  "declared_by_supplier",
  "calculated",
  "default_values",
]);

export const cbamReportStatusEnum = pgEnum("cbam_report_status", [
  "draft",
  "finalized",
  "submitted",
  "amended",
]);

export const cbamData = pgTable(
  "cbam_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ligneId: uuid("ligne_id")
      .notNull()
      .references(() => lignesDossier.id, { onDelete: "cascade" }),

    emissionsDirectesKgCo2PerT: numeric("emissions_directes_kg_co2_per_t", {
      precision: 14,
      scale: 4,
    }),
    emissionsIndirectesKgCo2PerT: numeric(
      "emissions_indirectes_kg_co2_per_t",
      { precision: 14, scale: 4 },
    ),
    emissionsTotalKgCo2: numeric("emissions_total_kg_co2", {
      precision: 14,
      scale: 2,
    }),
    emissionsSource: cbamEmissionsSourceEnum("emissions_source")
      .notNull()
      .default("default_values"),
    emissionsMethodology: text("emissions_methodology"),

    installationName: text("installation_name"),
    installationCountry: varchar("installation_country", { length: 2 }),
    installationAddress: text("installation_address"),

    collectedAt: timestamp("collected_at", { withTimezone: true }),
    collectedVia: varchar("collected_via", { length: 32 }),
    dataStatus: varchar("data_status", { length: 32 }).default("missing"),
    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    ligneIdx: index("cbam_data_ligne").on(t.ligneId),
    statusIdx: index("cbam_data_status").on(t.organizationId, t.dataStatus),
  }),
);

export const cbamQuarterlyReports = pgTable(
  "cbam_quarterly_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    importateurRelationId: uuid("importateur_relation_id")
      .notNull()
      .references(() => partieRelations.id),
    year: smallint("year").notNull(),
    quarter: smallint("quarter").notNull(),

    status: cbamReportStatusEnum("status").notNull().default("draft"),
    totalEmissionsKgCo2: numeric("total_emissions_kg_co2", {
      precision: 14,
      scale: 2,
    }),
    lignesCount: integer("lignes_count"),
    missingDataCount: integer("missing_data_count"),

    xmlStoragePath: text("xml_storage_path"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submissionReference: text("submission_reference"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    orgIdx: index("cbam_reports_org").on(
      t.organizationId,
      t.year,
      t.quarter,
    ),
    uniqueOrgImportYearQ: uniqueIndex(
      "cbam_reports_org_import_year_q_unique",
    ).on(t.organizationId, t.importateurRelationId, t.year, t.quarter),
    quarterCheck: check(
      "quarter_between_1_4",
      sql`${t.quarter} BETWEEN 1 AND 4`,
    ),
  }),
);

export type CbamDataSelect = typeof cbamData.$inferSelect;
export type CbamDataInsert = typeof cbamData.$inferInsert;
export type CbamQuarterlyReportSelect =
  typeof cbamQuarterlyReports.$inferSelect;
export type CbamQuarterlyReportInsert =
  typeof cbamQuarterlyReports.$inferInsert;
