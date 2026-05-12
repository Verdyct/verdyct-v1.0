import { Inngest } from "inngest";
import { db, taricMeasures } from "@verdyct/db";
import { sql, isNull, isNotNull, and, lt } from "drizzle-orm";
import { parseTaricXml, type TaricRow } from "./parse.js";

// TARIC3 measures full-dump from DG TAXUD.
// Obtain the latest file from the TARIC download service (free registration required):
// https://taxation-customs.ec.europa.eu/online-services/online-services-and-databases-customs/taric-consultation_en
// Override at runtime via env var TARIC_XML_URL.
const TARIC_XML_URL =
  process.env["TARIC_XML_URL"] ??
  "https://ec.europa.eu/taxation_customs/dds2/taric/taric_data.xml";

// Number of rows per Postgres INSERT statement.
// 10 000 keeps each statement under parameter limits while minimising round-trips.
const BATCH_SIZE = 10_000;

const inngest = new Inngest({ id: "verdyct" });

export const ingestTaricFull = inngest.createFunction(
  {
    id: "ingest-taric-full",
    name: "Ingest TARIC measures (full bootstrap)",
    retries: 2,
  },
  // Manual trigger only — no cron; delta sync is a separate worker (ingest_taric_delta)
  [{ event: "ingest/taric_full.requested" }],
  async ({ step, runId }) => {
    // Captured before any step so that the expire step can identify rows
    // NOT touched by this run (ingestedAt < runStart → absent from new dump).
    const runStart = new Date();
    const startDate = runStart.toISOString().split("T")[0]!;

    function log(
      level: "info" | "warn" | "error",
      msg: string,
      extra?: Record<string, unknown>,
    ) {
      console.log(
        JSON.stringify({ level, msg, worker: "ingest_taric_full", correlation_id: runId, ...extra }),
      );
    }

    // ── Step 1: verify the XML URL is reachable ──────────────────────────────
    await step.run("fetch-xml", async () => {
      log("info", "Checking TARIC XML URL", { url: TARIC_XML_URL });
      const res = await fetch(TARIC_XML_URL, { method: "HEAD" });
      if (!res.ok) {
        throw new Error(
          `TARIC XML not reachable: HTTP ${res.status} ${res.statusText}. ` +
            `Set TARIC_XML_URL env var to the correct download URL.`,
        );
      }
      const contentLength = res.headers.get("content-length");
      log("info", "TARIC XML reachable", {
        contentLength: contentLength ? parseInt(contentLength) : "unknown",
      });
      return { url: TARIC_XML_URL, ok: true };
    });

    // ── Step 2: fetch + parse + upsert in batches of 10 000 ─────────────────
    //
    // Design note: The full TARIC3 dump can be several hundred MB.
    // Passing the raw XML or all parsed rows through Inngest step state would
    // exceed payload limits on most plans. Instead, this step combines the
    // fetch, parse, and upsert into a single resumable unit. Internal batching
    // (every BATCH_SIZE rows) provides progress logging and keeps each INSERT
    // below Postgres parameter limits.
    //
    // The onConflictDoUpdate explicitly sets ingestedAt = now() so the
    // expire-removed step can identify which rows were NOT present in this dump.
    const upsertStats = await step.run("parse-and-upsert", async () => {
      log("info", "Fetching TARIC XML");
      const res = await fetch(TARIC_XML_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} while fetching TARIC XML`);
      }
      const xmlText = await res.text();
      log("info", "TARIC XML fetched", { bytes: xmlText.length });

      log("info", "Parsing TARIC XML");
      const rows = parseTaricXml(xmlText);
      log("info", "TARIC XML parsed", { count: rows.length });

      if (rows.length === 0) {
        throw new Error("Parser returned 0 rows — verify TARIC_XML_URL and XML format");
      }

      let upserted = 0;
      const batchCount = Math.ceil(rows.length / BATCH_SIZE);

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        await db
          .insert(taricMeasures)
          .values(
            batch.map((r: TaricRow) => ({
              hsCode: r.hsCode,
              measureType: r.measureType,
              measureSubtype: r.measureSubtype,
              originCountry: r.originCountry,
              destinationCountry: r.destinationCountry,
              valuePct: r.valuePct,
              valueAmount: r.valueAmount,
              currency: r.currency,
              description: r.description,
              legalBasis: r.legalBasis,
              validFrom: r.validFrom,
              validUntil: r.validUntil,
              sourceId: r.sourceId,
            })),
          )
          .onConflictDoUpdate({
            target: taricMeasures.sourceId,
            set: {
              hsCode: sql`excluded.hs_code`,
              measureType: sql`excluded.measure_type`,
              measureSubtype: sql`excluded.measure_subtype`,
              originCountry: sql`excluded.origin_country`,
              destinationCountry: sql`excluded.destination_country`,
              valuePct: sql`excluded.value_pct`,
              valueAmount: sql`excluded.value_amount`,
              currency: sql`excluded.currency`,
              description: sql`excluded.description`,
              legalBasis: sql`excluded.legal_basis`,
              validFrom: sql`excluded.valid_from`,
              validUntil: sql`excluded.valid_until`,
              // Bump ingestedAt so expire-removed can detect rows absent from this dump
              ingestedAt: sql`now()`,
            },
          });

        upserted += batch.length;
        log("info", "Batch upserted", {
          batch: `${batchNum}/${batchCount}`,
          upserted,
          total: rows.length,
        });
      }

      log("info", "Upsert complete", { upserted, total: rows.length });
      return { upserted, total: rows.length };
    });

    // ── Step 3: expire measures absent from this dump ────────────────────────
    //
    // Any row with ingestedAt < runStart was NOT touched by parse-and-upsert,
    // meaning it's absent from the new dump. Mark valid_until = startDate - 1 day.
    // Rows without a sourceId are skipped (they can't be reliably deduped).
    const expireStats = await step.run("expire-removed", async () => {
      const expireDate = new Date(startDate);
      expireDate.setDate(expireDate.getDate() - 1);
      const expireDateStr = expireDate.toISOString().split("T")[0]!;

      const updated = await db
        .update(taricMeasures)
        .set({ validUntil: expireDateStr })
        .where(
          and(
            isNull(taricMeasures.validUntil),
            isNotNull(taricMeasures.sourceId),
            lt(taricMeasures.ingestedAt, runStart),
          ),
        )
        .returning({ sourceId: taricMeasures.sourceId });

      const expired = updated.length;
      log("info", "Expired removed measures", { expired, expireDate: expireDateStr });
      return { expired };
    });

    // ── Emit completion event ────────────────────────────────────────────────
    await inngest.send({
      name: "taric_full/updated",
      data: {
        start_date: startDate,
        upserted: upsertStats.upserted,
        total: upsertStats.total,
        expired: expireStats.expired,
      },
    });

    log("info", "ingest_taric_full complete", {
      upserted: upsertStats.upserted,
      expired: expireStats.expired,
    });

    return {
      start_date: startDate,
      ...upsertStats,
      ...expireStats,
    };
  },
);
