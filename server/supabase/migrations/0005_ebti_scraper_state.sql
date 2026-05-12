-- =============================================================================
-- 0005 — EBTI scraper state (singleton)
-- Used by workers/ingest_ebti_full and ingest_ebti_delta to resume on incident.
-- Internal admin table — service_role only, no RLS policies → authenticated blocked.
-- =============================================================================

CREATE TABLE ebti_scraper_state (
  id INT PRIMARY KEY CHECK (id = 1),
  last_page_processed INT NOT NULL DEFAULT 0,
  total_processed INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ
);

-- Insert singleton row so workers can UPDATE without checking existence
INSERT INTO ebti_scraper_state (id) VALUES (1);

-- RLS enabled with no policies → no access for authenticated; only service_role
ALTER TABLE ebti_scraper_state ENABLE ROW LEVEL SECURITY;
