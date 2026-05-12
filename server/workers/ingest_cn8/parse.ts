import { XMLParser } from "fast-xml-parser";

export type CnRow = {
  code: string;
  parentCode: string | null;
  level: 2 | 4 | 6 | 8;
  labelFr: string;
  labelEn: string;
  uniteSupplementaire: string | null;
  validFrom: string;   // YYYY-MM-DD
  validUntil: string | null;
};

const VALID_LEVELS = new Set<number>([2, 4, 6, 8]);

/**
 * Parses the EU Combined Nomenclature XML export.
 * Handles the <EXPORT><CN_CODE>...</CN_CODE></EXPORT> format published by
 * DG TAXUD at https://taxation-customs.ec.europa.eu/customs-4/calculation-customs-duties/customs-tariff/combined-nomenclature_en
 */
export function parseCnXml(xmlText: string): CnRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false, // keep all values as strings to preserve leading zeros in CN codes
    trimValues: true,
  });

  const doc = parser.parse(xmlText) as Record<string, unknown>;

  // Support multiple root element names used by different EC export versions
  const root = (
    doc["EXPORT"] ??
    doc["CombinedNomenclature"] ??
    doc["CN"]
  ) as Record<string, unknown> | undefined;

  if (!root) {
    throw new Error(
      `Unrecognized CN XML root element. Found keys: ${Object.keys(doc).join(", ")}`,
    );
  }

  const raw = root["CN_CODE"] ?? root["Heading"] ?? root["heading"];
  if (!raw) {
    throw new Error("No CN_CODE elements found in XML");
  }

  const items: unknown[] = Array.isArray(raw) ? raw : [raw];

  return items
    .map((item) => parseItem(item as Record<string, unknown>))
    .filter((r): r is CnRow => r !== null);
}

function parseItem(h: Record<string, unknown>): CnRow | null {
  const code = getText(h, ["CODE", "code", "Code", "NumCode"]);
  const levelRaw = getNumber(h, ["LEVEL", "level", "Level"]);
  const labelFr = getText(h, ["DESCRIPTION_FR", "DescriptionFR", "labelFr", "LabelFR"]);
  const labelEn = getText(h, ["DESCRIPTION_EN", "DescriptionEN", "labelEn", "LabelEN"]);
  const parentCode = getText(h, ["PARENT_CODE", "parent_code", "ParentCode", "parentCode"]) || null;
  const unit = getText(h, ["SUPPLEMENTARY_UNIT", "supplementary_unit", "Unit"]) || null;
  const rawFrom = getText(h, ["START_USE", "start_use", "ValidFrom", "BeginDate"]);
  const rawUntil = getText(h, ["END_USE", "end_use", "ValidUntil", "EndDate"]) || null;

  if (!code || !labelFr || !labelEn || !rawFrom) return null;
  if (!VALID_LEVELS.has(levelRaw ?? 0)) return null;
  if (!/^\d+$/.test(code)) return null; // skip section headers with Roman numerals

  return {
    code,
    parentCode: parentCode || null,
    level: levelRaw as 2 | 4 | 6 | 8,
    labelFr,
    labelEn,
    uniteSupplementaire: unit,
    validFrom: normalizeDate(rawFrom),
    validUntil: rawUntil ? normalizeDate(rawUntil) : null,
  };
}

function getText(h: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = h[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number") return String(val);
  }
  return "";
}

function getNumber(h: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = h[key];
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const n = parseInt(val, 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

// Normalizes dates from "2025-01-01", "20250101", or "01/01/2025" → "YYYY-MM-DD"
function normalizeDate(raw: string): string {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return s;
}
