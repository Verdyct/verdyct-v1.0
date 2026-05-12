import { Inngest } from "inngest";
import { db, ebtiCases } from "@verdyct/db";
import { mistralEmbed } from "@verdyct/external";
import { inArray } from "drizzle-orm";
import {
  buildSearchUrl,
  parseSearchResultsPage,
  parseBtiDetailPage,
  rateLimitedFetch,
  type BtiDetail,
  type BtiSummary,
} from "./scraper.js";
import { loadState, markStarted, saveProgress } from "./state.js";

// Safety cap: if EBTI ever returns >5000 pages, something has gone wrong.
// Real catalogue size is ~80–100k cases → ~800–1000 pages at 100/page.
const MAX_PAGES = 5_000;

const inngest = new Inngest({ id: "verdyct" });

export const ingestEbtiFull = inngest.createFunction(
  {
    id: "ingest-ebti-full",
    name: "Ingest EBTI cases (full bootstrap)",
    retries: 1, // Inngest will retry the whole function once on failure
  },
  // Manual trigger only — full bootstrap is a one-time operation
  [{ event: "ingest/ebti_full.requested" }],
  async ({ step, runId }) => {
    function log(
      level: "info" | "warn" | "error",
      msg: string,
      extra?: Record<string, unknown>,
    ) {
      console.log(
        JSON.stringify({
          level,
          msg,
          worker: "ingest_ebti_full",
          correlation_id: runId,
          ...extra,
        }),
      );
    }

    // ── Load resume state ────────────────────────────────────────────────────
    const state = await step.run("load-state", async () => {
      log("info", "Loading EBTI scraper state");
      const s = await loadState();
      log("info", "Resuming", {
        lastPageProcessed: s.lastPageProcessed,
        totalProcessed: s.totalProcessed,
        startedAt: s.startedAt?.toISOString() ?? null,
      });
      return s;
    });

    if (!state.startedAt) {
      await step.run("mark-started", async () => {
        await markStarted();
        log("info", "First run — started_at stamped");
      });
    }

    let currentPage = state.lastPageProcessed + 1;
    let totalProcessed = state.totalProcessed;
    let lastMilestone = Math.floor(totalProcessed / 1000);

    // ── Page loop ────────────────────────────────────────────────────────────
    //
    // Each iteration is a single step.run that fetches one search page (up to
    // 100 BTIs), fetches their details rate-limited, embeds them, and inserts.
    // On step failure, Inngest retries the whole step from scratch — but
    // INSERTs are protected by onConflictDoNothing, so re-processing is safe.
    while (currentPage <= MAX_PAGES) {
      const result = await step.run(
        `process-page-${currentPage}`,
        async () => processPage(currentPage, log),
      );

      if (result.done) {
        log("info", "Empty page — EBTI scraping complete", {
          totalProcessed,
          lastPage: currentPage - 1,
        });
        break;
      }

      // Save state after each page so a crash resumes correctly
      await step.run(`save-state-${currentPage}`, async () => {
        await saveProgress(currentPage, result.inserted);
      });

      totalProcessed += result.inserted;

      // Log every 1000 cases (spec)
      const milestone = Math.floor(totalProcessed / 1000);
      if (milestone > lastMilestone) {
        log("info", "1000-case milestone", { totalProcessed, currentPage });
        lastMilestone = milestone;
      }

      currentPage++;
    }

    log("info", "ingest_ebti_full run finished", {
      totalProcessed,
      lastPageProcessed: currentPage - 1,
      hitMaxPages: currentPage > MAX_PAGES,
    });

    return {
      totalProcessed,
      lastPageProcessed: currentPage - 1,
    };
  },
);

// ── Per-page worker (called inside step.run, NOT exported) ────────────────────

type PageResult = {
  done: boolean;
  inserted: number;
  skipped: number;
  failed: number;
};

type Logger = (
  level: "info" | "warn" | "error",
  msg: string,
  extra?: Record<string, unknown>,
) => void;

async function processPage(page: number, log: Logger): Promise<PageResult> {
  // 1. Fetch the search results page (rate-limited)
  const searchUrl = buildSearchUrl(page);
  log("info", "Fetching search page", { page });
  const searchHtml = await rateLimitedFetch(searchUrl);

  const summaries = parseSearchResultsPage(searchHtml);
  log("info", "Search page parsed", { page, btiCount: summaries.length });

  if (summaries.length === 0) {
    return { done: true, inserted: 0, skipped: 0, failed: 0 };
  }

  // 2. Skip BTIs already in the DB (idempotent re-runs)
  const ids = summaries.map((s) => s.btiId);
  const existing = await db
    .select({ btiId: ebtiCases.btiId })
    .from(ebtiCases)
    .where(inArray(ebtiCases.btiId, ids));
  const existingSet = new Set(existing.map((r) => r.btiId));
  const fresh = summaries.filter((s) => !existingSet.has(s.btiId));
  const skipped = summaries.length - fresh.length;

  if (fresh.length === 0) {
    log("info", "All BTIs on this page already exist — skipping", { page, skipped });
    return { done: false, inserted: 0, skipped, failed: 0 };
  }

  // 3. Fetch each detail page (rate-limited, sequential).
  //    Individual failures are logged and skipped — Inngest handles function-level retries.
  const details: BtiDetail[] = [];
  const summariesForDetails: BtiSummary[] = [];
  const rawHtmls: string[] = [];
  let failed = 0;

  for (const summary of fresh) {
    try {
      const detailHtml = await rateLimitedFetch(summary.detailUrl);
      const detail = parseBtiDetailPage(detailHtml);
      if (!detail) {
        log("warn", "BTI detail parse returned null", { btiId: summary.btiId });
        failed++;
        continue;
      }
      details.push(detail);
      summariesForDetails.push(summary);
      rawHtmls.push(detailHtml);
    } catch (err) {
      log("error", "BTI detail fetch failed", {
        btiId: summary.btiId,
        error: String(err),
      });
      failed++;
    }
  }

  if (details.length === 0) {
    return { done: false, inserted: 0, skipped, failed };
  }

  // 4. Compute embeddings (batched internally by mistralEmbed).
  //    On failure, fall back to inserting without embeddings — a backfill job
  //    can compute them later. Don't fail the whole page.
  let embeddings: number[][] = [];
  try {
    const texts = details.map((d) =>
      `${d.productDescription}\n\n${d.classificationReasoning ?? ""}`.trim(),
    );
    embeddings = await mistralEmbed(texts);
  } catch (err) {
    log("error", "Mistral embed failed — inserting without embeddings", {
      error: String(err),
    });
  }

  // 5. Bulk INSERT, skip on conflict (idempotent)
  const rows = details.map((d, i) => ({
    btiId: d.btiId,
    issuingCountry: d.issuingCountry,
    hsCode: d.hsCode,
    productDescription: d.productDescription,
    classificationReasoning: d.classificationReasoning,
    keywords: d.keywords,
    tradeMarks: d.tradeMarks,
    validFrom: d.validFrom,
    validUntil: d.validUntil,
    embedding: embeddings[i] ?? null,
    scrapedAt: new Date(),
    sourceUrl: summariesForDetails[i]!.detailUrl,
    rawHtml: rawHtmls[i] ?? null,
  }));

  await db.insert(ebtiCases).values(rows).onConflictDoNothing();

  return { done: false, inserted: details.length, skipped, failed };
}
