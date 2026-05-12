import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigserial,
  char,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const cnCodes = pgTable(
  "cn_codes",
  {
    code: varchar("code", { length: 8 }).primaryKey(),
    parentCode: varchar("parent_code", { length: 8 }).references(
      (): AnyPgColumn => cnCodes.code,
    ),
    level: smallint("level").notNull(),
    labelFr: text("label_fr").notNull(),
    labelEn: text("label_en").notNull(),
    uniteSupplementaire: varchar("unite_supplementaire", { length: 16 }),
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    parentIdx: index("cn_codes_parent").on(t.parentCode),
    labelFrTrgmIdx: index("cn_codes_label_fr_trgm").on(t.labelFr),
    activeIdx: index("cn_codes_active")
      .on(t.code)
      .where(sql`${t.validUntil} IS NULL`),
  }),
);

export const taricMeasures = pgTable(
  "taric_measures",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    hsCode: varchar("hs_code", { length: 10 }).notNull(),
    measureType: varchar("measure_type", { length: 64 }).notNull(),
    measureSubtype: varchar("measure_subtype", { length: 64 }),
    originCountry: char("origin_country", { length: 2 }),
    destinationCountry: char("destination_country", { length: 2 }).default(
      "FR",
    ),
    valuePct: numeric("value_pct", { precision: 8, scale: 4 }),
    valueAmount: numeric("value_amount", { precision: 14, scale: 4 }),
    currency: char("currency", { length: 3 }),
    description: text("description"),
    legalBasis: text("legal_basis"),
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until"),
    sourceId: varchar("source_id", { length: 64 }).unique(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    hsOriginIdx: index("taric_hs_origin").on(t.hsCode, t.originCountry),
    activeIdx: index("taric_active")
      .on(t.hsCode)
      .where(
        sql`${t.validUntil} IS NULL OR ${t.validUntil} > CURRENT_DATE`,
      ),
  }),
);

export const ebtiCases = pgTable(
  "ebti_cases",
  {
    btiId: varchar("bti_id", { length: 32 }).primaryKey(),
    issuingCountry: char("issuing_country", { length: 2 }).notNull(),
    hsCode: varchar("hs_code", { length: 10 }).notNull(),
    productDescription: text("product_description").notNull(),
    classificationReasoning: text("classification_reasoning"),
    keywords: text("keywords").array(),
    tradeMarks: text("trade_marks").array(),
    validFrom: date("valid_from").notNull(),
    validUntil: date("valid_until"),
    embedding: vector("embedding", { dimensions: 1024 }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull(),
    sourceUrl: text("source_url"),
    rawHtml: text("raw_html"),
  },
  (t) => ({
    embeddingHnswIdx: index("ebti_embedding_hnsw").on(t.embedding),
    hsCodeIdx: index("ebti_hs_code").on(t.hsCode),
    activeIdx: index("ebti_active")
      .on(t.btiId)
      .where(
        sql`${t.validUntil} IS NULL OR ${t.validUntil} > CURRENT_DATE`,
      ),
    countryIdx: index("ebti_country").on(t.issuingCountry),
  }),
);

export const explanatoryNotes = pgTable(
  "explanatory_notes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    scope: varchar("scope", { length: 32 }).notNull(),
    scopeValue: varchar("scope_value", { length: 8 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    language: char("language", { length: 2 }).notNull().default("fr"),
    text: text("text").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    sourceUrl: text("source_url"),
    validFrom: date("valid_from"),
    validUntil: date("valid_until"),
  },
  (t) => ({
    scopeIdx: index("expnotes_scope").on(t.scope, t.scopeValue),
    embeddingHnswIdx: index("expnotes_embedding_hnsw").on(t.embedding),
  }),
);

export const ebtiScraperState = pgTable("ebti_scraper_state", {
  id: integer("id").primaryKey(),
  lastPageProcessed: integer("last_page_processed").notNull().default(0),
  totalProcessed: integer("total_processed").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
});

export type CnCodeSelect = typeof cnCodes.$inferSelect;
export type CnCodeInsert = typeof cnCodes.$inferInsert;
export type TaricMeasureSelect = typeof taricMeasures.$inferSelect;
export type TaricMeasureInsert = typeof taricMeasures.$inferInsert;
export type EbtiCaseSelect = typeof ebtiCases.$inferSelect;
export type EbtiCaseInsert = typeof ebtiCases.$inferInsert;
export type ExplanatoryNoteSelect = typeof explanatoryNotes.$inferSelect;
export type ExplanatoryNoteInsert = typeof explanatoryNotes.$inferInsert;
export type EbtiScraperStateSelect = typeof ebtiScraperState.$inferSelect;
export type EbtiScraperStateInsert = typeof ebtiScraperState.$inferInsert;
