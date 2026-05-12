import { db, ebtiScraperState } from "@verdyct/db";
import { eq, sql } from "drizzle-orm";

export type EbtiScraperState = {
  lastPageProcessed: number;
  totalProcessed: number;
  startedAt: Date | null;
};

/**
 * Returns the singleton state row. Idempotent — creates the row if missing
 * (defends against a manual DELETE).
 */
export async function loadState(): Promise<EbtiScraperState> {
  await db
    .insert(ebtiScraperState)
    .values({ id: 1 })
    .onConflictDoNothing();

  const rows = await db
    .select()
    .from(ebtiScraperState)
    .where(eq(ebtiScraperState.id, 1))
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error("ebti_scraper_state singleton not found and could not be created");

  return {
    lastPageProcessed: row.lastPageProcessed,
    totalProcessed: row.totalProcessed,
    startedAt: row.startedAt,
  };
}

/** Stamps started_at on the very first run; no-op afterwards. */
export async function markStarted(): Promise<void> {
  await db
    .update(ebtiScraperState)
    .set({ startedAt: new Date(), lastRunAt: new Date() })
    .where(eq(ebtiScraperState.id, 1));
}

/**
 * Advances the page cursor and increments total_processed by `inserted`.
 * Called once per page so a crash never loses more than one page of progress.
 */
export async function saveProgress(
  lastPageProcessed: number,
  inserted: number,
): Promise<void> {
  await db
    .update(ebtiScraperState)
    .set({
      lastPageProcessed,
      totalProcessed: sql`${ebtiScraperState.totalProcessed} + ${inserted}`,
      lastRunAt: new Date(),
    })
    .where(eq(ebtiScraperState.id, 1));
}
