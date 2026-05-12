import { Inngest } from "inngest";
import { db, cnCodes } from "@verdyct/db";
import { sql, isNull, and, notInArray } from "drizzle-orm";
import { parseCnXml, type CnRow } from "./parse.js";

// Annual CN XML from EU Commission (DG TAXUD).
// Verify and update each October when the new nomenclature is published:
// https://taxation-customs.ec.europa.eu/customs-4/calculation-customs-duties/customs-tariff/combined-nomenclature_en
const CN_XML_URL =
  "https://taxation-customs.ec.europa.eu/system/files/2024-10/cn2025.xml";

const BATCH_SIZE = 500;

const inngest = new Inngest({ id: "verdyct" });

export const ingestCn8 = inngest.createFunction(
  {
    id: "ingest-cn8",
    name: "Ingest CN8 Combined Nomenclature",
    retries: 3,
  },
  [
    { event: "ingest/cn8.requested" },
    { cron: "0 8 1 11 *" }, // 1 November 08:00 UTC — CN published late October
  ],
  async ({ step, runId }) => {
    const startDate = new Date().toISOString().split("T")[0]!;

    function log(
      level: "info" | "warn" | "error",
      msg: string,
      extra?: Record<string, unknown>,
    ) {
      console.log(
        JSON.stringify({ level, msg, worker: "ingest_cn8", correlation_id: runId, ...extra }),
      );
    }

    // ── Step 1: fetch XML ────────────────────────────────────────────────────
    const xmlText = await step.run("fetch-xml", async () => {
      log("info", "Fetching CN XML", { url: CN_XML_URL });
      const res = await fetch(CN_XML_URL);
      if (!res.ok) {
        throw new Error(`Failed to fetch CN XML: HTTP ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      log("info", "CN XML fetched", { bytes: text.length });
      return text;
    });

    // ── Step 2: parse ────────────────────────────────────────────────────────
    const rows = await step.run("parse", async () => {
      log("info", "Parsing CN XML");
      const parsed = parseCnXml(xmlText);
      log("info", "CN XML parsed", { count: parsed.length });
      if (parsed.length === 0) throw new Error("Parser returned 0 rows — check XML format");
      return parsed;
    });

    // ── Step 3: upsert in batches ────────────────────────────────────────────
    const { upserted } = await step.run("upsert-batch", async () => {
      const typedRows = rows as CnRow[];
      let upserted = 0;

      for (let i = 0; i < typedRows.length; i += BATCH_SIZE) {
        const batch = typedRows.slice(i, i + BATCH_SIZE);
        await db
          .insert(cnCodes)
          .values(
            batch.map((r) => ({
              code: r.code,
              parentCode: r.parentCode,
              level: r.level,
              labelFr: r.labelFr,
              labelEn: r.labelEn,
              uniteSupplementaire: r.uniteSupplementaire,
              validFrom: r.validFrom,
              validUntil: r.validUntil,
            })),
          )
          .onConflictDoUpdate({
            target: cnCodes.code,
            set: {
              parentCode: sql`excluded.parent_code`,
              level: sql`excluded.level`,
              labelFr: sql`excluded.label_fr`,
              labelEn: sql`excluded.label_en`,
              uniteSupplementaire: sql`excluded.unite_supplementaire`,
              validFrom: sql`excluded.valid_from`,
              validUntil: sql`excluded.valid_until`,
            },
          });
        upserted += batch.length;
      }

      log("info", "Upsert complete", { upserted });
      return { upserted };
    });

    // ── Step 4: expire codes absent from new XML ─────────────────────────────
    const { expired } = await step.run("expire-removed", async () => {
      const newCodes = (rows as CnRow[]).map((r) => r.code);

      if (newCodes.length === 0) {
        log("warn", "Empty code set — skipping expire step");
        return { expired: 0 };
      }

      // valid_until = start_date - 1 day  (never DELETE)
      const expireDate = new Date(startDate);
      expireDate.setDate(expireDate.getDate() - 1);
      const expireDateStr = expireDate.toISOString().split("T")[0]!;

      const updated = await db
        .update(cnCodes)
        .set({ validUntil: expireDateStr })
        .where(and(isNull(cnCodes.validUntil), notInArray(cnCodes.code, newCodes)))
        .returning({ code: cnCodes.code });

      const expired = updated.length;
      log("info", "Expired removed codes", { expired, expireDate: expireDateStr });
      return { expired };
    });

    // ── Emit completion event ────────────────────────────────────────────────
    await inngest.send({
      name: "cn8/updated",
      data: { start_date: startDate, upserted, expired },
    });

    log("info", "ingest_cn8 complete", { upserted, expired });
    return { start_date: startDate, upserted, expired };
  },
);
