import { describe, it, expect } from "vitest";
import {
  buildSearchUrl,
  buildDetailUrl,
  parseSearchResultsPage,
  parseBtiDetailPage,
} from "./scraper.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SEARCH_RESULTS_HTML = `<!DOCTYPE html>
<html><body>
  <h1>EBTI Search Results</h1>
  <table class="results">
    <thead>
      <tr><th>Reference</th><th>Country</th><th>HS Code</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><a href="ebti_specimen.jsp?Lang=fr&Reference=FRBTI-2024-12345">FRBTI-2024-12345</a></td>
        <td>FR</td>
        <td>7318159500</td>
      </tr>
      <tr>
        <td><a href="/dds2/ebti/ebti_specimen.jsp?Lang=fr&Reference=DEBTI-2023-67890">DEBTI-2023-67890</a></td>
        <td>DE</td>
        <td>8504403000</td>
      </tr>
      <tr>
        <td><a href="https://ec.europa.eu/dds2/ebti/ebti_specimen.jsp?Lang=fr&Reference=BEBTI-2022-99999">BEBTI-2022-99999</a></td>
        <td>BE</td>
        <td>2402100000</td>
      </tr>
    </tbody>
  </table>
  <a href="ebti_consultation.jsp?pageIndex=2">Next page</a>
</body></html>`;

const BTI_DETAIL_HTML = `<!DOCTYPE html>
<html><body>
<table class="bti-detail">
  <tr><td>Référence</td><td>FRBTI-2024-12345</td></tr>
  <tr><td>Pays émetteur</td><td>FR</td></tr>
  <tr><td>Code de la marchandise</td><td>7318 15 95 00</td></tr>
  <tr><td>Description de la marchandise</td><td>Boulons en acier inoxydable A4, M8x20, filetage métrique</td></tr>
  <tr><td>Justification du classement</td><td>Le produit, en raison de sa composition (acier inoxydable A4) et de sa forme (boulon avec filetage), est classé sous la position 7318.</td></tr>
  <tr><td>Mots-clés</td><td>boulons, acier inox, A4, M8</td></tr>
  <tr><td>Marques commerciales</td><td>Acme; FastBolt</td></tr>
  <tr><td>Date de début de validité</td><td>2024-01-15</td></tr>
  <tr><td>Date de fin de validité</td><td>2027-01-14</td></tr>
</table>
</body></html>`;

const BTI_DETAIL_NO_END_HTML = `<!DOCTYPE html>
<html><body>
<table>
  <tr><td>Référence</td><td>DEBTI-2023-67890</td></tr>
  <tr><td>Pays émetteur</td><td>DE</td></tr>
  <tr><td>Code de la marchandise</td><td>8504403000</td></tr>
  <tr><td>Description de la marchandise</td><td>Convertisseur DC-DC pour télécommunications</td></tr>
  <tr><td>Date de début de validité</td><td>15/06/2023</td></tr>
</table>
</body></html>`;

const BTI_INCOMPLETE_HTML = `<!DOCTYPE html>
<html><body>
<table>
  <tr><td>Référence</td><td>FRBTI-2024-99999</td></tr>
  <tr><td>Pays émetteur</td><td>FR</td></tr>
  <!-- missing hsCode, description, validFrom -->
</table>
</body></html>`;

// ── URL builders ──────────────────────────────────────────────────────────────

describe("buildSearchUrl", () => {
  it("encodes pageIndex and standard params", () => {
    const url = buildSearchUrl(7);
    expect(url).toContain("ebti_consultation.jsp?");
    expect(url).toContain("pageIndex=7");
    expect(url).toContain("nbPerPage=100");
    expect(url).toContain("Lang=fr");
  });
});

describe("buildDetailUrl", () => {
  it("URL-encodes the reference", () => {
    const url = buildDetailUrl("FRBTI-2024-12345");
    expect(url).toContain("ebti_specimen.jsp?");
    expect(url).toContain("Reference=FRBTI-2024-12345");
  });
});

// ── parseSearchResultsPage ────────────────────────────────────────────────────

describe("parseSearchResultsPage", () => {
  it("extracts all BTI summaries from the results table", () => {
    const rows = parseSearchResultsPage(SEARCH_RESULTS_HTML);
    expect(rows).toHaveLength(3);
  });

  it("extracts bti_id from the Reference URL param", () => {
    const rows = parseSearchResultsPage(SEARCH_RESULTS_HTML);
    expect(rows.map((r) => r.btiId)).toEqual([
      "FRBTI-2024-12345",
      "DEBTI-2023-67890",
      "BEBTI-2022-99999",
    ]);
  });

  it("extracts issuing country from BTI id prefix", () => {
    const rows = parseSearchResultsPage(SEARCH_RESULTS_HTML);
    expect(rows.map((r) => r.issuingCountry)).toEqual(["FR", "DE", "BE"]);
  });

  it("resolves relative URLs against the EBTI base", () => {
    const rows = parseSearchResultsPage(SEARCH_RESULTS_HTML);
    rows.forEach((r) => expect(r.detailUrl).toMatch(/^https:\/\//));
    expect(rows[0]!.detailUrl).toContain("ebti_specimen.jsp");
  });

  it("deduplicates BTI ids", () => {
    const html = SEARCH_RESULTS_HTML + SEARCH_RESULTS_HTML;
    const rows = parseSearchResultsPage(html);
    expect(rows).toHaveLength(3); // not 6 — dedup by bti_id
  });

  it("returns empty array on an empty page", () => {
    expect(parseSearchResultsPage("<html><body></body></html>")).toEqual([]);
  });
});

// ── parseBtiDetailPage ────────────────────────────────────────────────────────

describe("parseBtiDetailPage", () => {
  it("extracts all required fields from a complete detail page", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_HTML);
    expect(d).not.toBeNull();
    expect(d!.btiId).toBe("FRBTI-2024-12345");
    expect(d!.issuingCountry).toBe("FR");
    expect(d!.hsCode).toBe("7318159500");
    expect(d!.productDescription).toContain("acier inoxydable");
    expect(d!.classificationReasoning).toContain("position 7318");
    expect(d!.validFrom).toBe("2024-01-15");
    expect(d!.validUntil).toBe("2027-01-14");
  });

  it("strips spaces from the HS code", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_HTML);
    expect(d!.hsCode).not.toContain(" ");
    expect(d!.hsCode.length).toBeLessThanOrEqual(10);
  });

  it("splits comma-separated keywords", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_HTML);
    expect(d!.keywords).toEqual(["boulons", "acier inox", "A4", "M8"]);
  });

  it("splits semicolon-separated trade marks", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_HTML);
    expect(d!.tradeMarks).toEqual(["Acme", "FastBolt"]);
  });

  it("handles missing validUntil and missing reasoning", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_NO_END_HTML);
    expect(d).not.toBeNull();
    expect(d!.validUntil).toBeNull();
    expect(d!.classificationReasoning).toBeNull();
  });

  it("normalizes DD/MM/YYYY date format to YYYY-MM-DD", () => {
    const d = parseBtiDetailPage(BTI_DETAIL_NO_END_HTML);
    expect(d!.validFrom).toBe("2023-06-15");
  });

  it("returns null when required fields are missing", () => {
    expect(parseBtiDetailPage(BTI_INCOMPLETE_HTML)).toBeNull();
  });

  it("falls back to BTI id prefix when country cell is missing", () => {
    const html = `<html><body><table>
      <tr><td>Référence</td><td>FRBTI-2024-12345</td></tr>
      <tr><td>Code de la marchandise</td><td>7318159500</td></tr>
      <tr><td>Description de la marchandise</td><td>X</td></tr>
      <tr><td>Date de début de validité</td><td>2024-01-15</td></tr>
    </table></body></html>`;
    const d = parseBtiDetailPage(html);
    expect(d!.issuingCountry).toBe("FR");
  });
});
