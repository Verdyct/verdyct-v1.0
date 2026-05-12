import * as cheerio from "cheerio";
import { request } from "undici";

// ── Constants ─────────────────────────────────────────────────────────────────

export const USER_AGENT = "Verdyct-Customs-Tool/1.0 (contact@verdyct.io)";
export const RATE_LIMIT_MS = 2000;
const EBTI_BASE = "https://ec.europa.eu/taxation_customs/dds2/ebti";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BtiSummary = {
  btiId: string;
  detailUrl: string;
  issuingCountry: string;
};

export type BtiDetail = {
  btiId: string;
  issuingCountry: string;
  hsCode: string;                       // up to 10 digits, no spaces
  productDescription: string;
  classificationReasoning: string | null;
  keywords: string[];
  tradeMarks: string[];
  validFrom: string;                    // YYYY-MM-DD
  validUntil: string | null;
};

// ── URL builders ──────────────────────────────────────────────────────────────

export function buildSearchUrl(pageIndex: number): string {
  const params = new URLSearchParams({
    Lang: "fr",
    nbPerPage: "100",
    pageIndex: String(pageIndex),
    valid: "true",
  });
  return `${EBTI_BASE}/ebti_consultation.jsp?${params.toString()}`;
}

export function buildDetailUrl(btiRef: string): string {
  const params = new URLSearchParams({
    Lang: "fr",
    Expand: "true",
    Reference: btiRef,
  });
  return `${EBTI_BASE}/ebti_specimen.jsp?${params.toString()}`;
}

// ── HTTP with strict 2s rate limit ────────────────────────────────────────────
//
// Module-level state — fine because all scraper traffic is sequential by design.
// Inngest retries spin up a fresh process, which resets the timer; that's
// acceptable since EBTI accepts the very next request anyway after a fresh start.

let lastFetchTime = 0;

export async function rateLimitedFetch(url: string): Promise<string> {
  const elapsed = Date.now() - lastFetchTime;
  const wait = Math.max(0, RATE_LIMIT_MS - elapsed);
  if (wait > 0) await sleep(wait);
  lastFetchTime = Date.now();

  const { statusCode, body } = await request(url, {
    headers: { "user-agent": USER_AGENT },
    maxRedirections: 5,
  });

  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode} for ${url}`);
  }

  return body.text();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Extracts BTI summaries from an EBTI search results page.
 * Looks for any anchor pointing to ebti_specimen.jsp; resolves relative URLs
 * against the EBTI base.
 */
export function parseSearchResultsPage(html: string): BtiSummary[] {
  const $ = cheerio.load(html);
  const results: BtiSummary[] = [];
  const seen = new Set<string>();

  $('a[href*="ebti_specimen.jsp"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const refMatch = href.match(/[?&]Reference=([^&]+)/i);
    const btiId = refMatch ? decodeURIComponent(refMatch[1]!).trim() : $(el).text().trim();
    if (!btiId || seen.has(btiId)) return;
    seen.add(btiId);

    const detailUrl = absoluteUrl(href);
    const issuingCountry = extractCountryCode(btiId);

    results.push({ btiId, detailUrl, issuingCountry });
  });

  return results;
}

/**
 * Extracts the structured BTI fields from a detail page.
 * Returns null if any required field is missing.
 *
 * The real EBTI specimen page is a JSP-rendered table with French labels in one
 * cell and values in the adjacent cell. Selectors here are deliberately tolerant.
 */
export function parseBtiDetailPage(html: string): BtiDetail | null {
  const $ = cheerio.load(html);

  const fields = collectLabeledFields($);

  const btiId = pickField(fields, ["référence", "reference"]);
  if (!btiId) return null;

  const countryRaw = pickField(fields, ["pays émetteur", "issuing country", "country"]);
  const issuingCountry = (countryRaw && countryRaw.length >= 2
    ? countryRaw.slice(0, 2)
    : extractCountryCode(btiId)
  ).toUpperCase();

  const hsCodeRaw = pickField(fields, [
    "code de la marchandise",
    "code du produit",
    "hs code",
    "code taric",
    "nomenclature",
  ]);
  const hsCode = (hsCodeRaw || "").replace(/\s/g, "").slice(0, 10);

  const productDescription = pickField(fields, [
    "description de la marchandise",
    "description du produit",
    "product description",
  ]);

  const classificationReasoning =
    pickField(fields, [
      "justification du classement",
      "justification",
      "classification reasoning",
      "motivation du classement",
    ]) || null;

  const keywordsRaw = pickField(fields, ["mots-clés", "mots clés", "keywords"]);
  const tradeMarksRaw = pickField(fields, ["marques commerciales", "trade marks", "marque"]);

  const validFromRaw = pickField(fields, [
    "date de début de validité",
    "valid from",
    "début de validité",
  ]);
  const validUntilRaw = pickField(fields, [
    "date de fin de validité",
    "valid until",
    "fin de validité",
  ]);

  if (!hsCode || !productDescription || !validFromRaw) return null;

  const validFrom = normalizeDate(validFromRaw);
  const validUntil = validUntilRaw ? normalizeDate(validUntilRaw) : null;

  return {
    btiId,
    issuingCountry,
    hsCode,
    productDescription,
    classificationReasoning,
    keywords: splitList(keywordsRaw),
    tradeMarks: splitList(tradeMarksRaw),
    validFrom,
    validUntil,
  };
}

// ── Internals ─────────────────────────────────────────────────────────────────

type Field = { label: string; value: string };

/**
 * Walks every <td>, <th>, <dt>, <dd> on the page and pairs each label-like cell
 * with the text content of its next sibling. Lower-cases the label for matching.
 */
function collectLabeledFields($: cheerio.CheerioAPI): Field[] {
  const fields: Field[] = [];

  $("td, th").each((_, el) => {
    const $el = $(el);
    const label = $el.text().trim();
    if (!label) return;
    const $next = $el.next();
    if (!$next.length) return;
    const value = $next.text().trim();
    if (!value || value === label) return;
    fields.push({ label: label.toLowerCase(), value });
  });

  // Also handle <dt>/<dd> pairs
  $("dt").each((_, el) => {
    const label = $(el).text().trim();
    const value = $(el).next("dd").text().trim();
    if (label && value) fields.push({ label: label.toLowerCase(), value });
  });

  return fields;
}

function pickField(fields: Field[], needles: string[]): string {
  for (const needle of needles) {
    const n = needle.toLowerCase();
    const match = fields.find((f) => f.label.includes(n));
    if (match) return match.value;
  }
  return "";
}

function splitList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractCountryCode(btiId: string): string {
  const m = btiId.match(/^([A-Z]{2})/);
  return m ? m[1]! : "";
}

function absoluteUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/")) {
    return `https://ec.europa.eu${href}`;
  }
  return `${EBTI_BASE}/${href}`;
}

function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const dmy = s.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return s;
}
