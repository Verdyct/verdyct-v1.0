import { XMLParser } from "fast-xml-parser";

export type TaricRow = {
  hsCode: string;
  measureType: string;
  measureSubtype: string | null;
  originCountry: string | null;    // null = erga omnes / geographic group
  destinationCountry: string;      // always "FR" for this dataset
  valuePct: string | null;
  valueAmount: string | null;
  currency: string | null;
  description: string | null;
  legalBasis: string | null;
  validFrom: string;               // YYYY-MM-DD
  validUntil: string | null;
  sourceId: string;                // TARIC3 measure SID, always non-null
};

// TARIC3 measure type codes → [measureType, measureSubtype]
// Source: DG TAXUD TARIC3 schema documentation (measure_type_descriptions)
const MEASURE_TYPE_MAP: Record<string, readonly [string, string | null]> = {
  "103": ["duty", null],
  "105": ["duty", "reduced"],
  "106": ["duty", "end_use_relief"],
  "112": ["duty", "preferential"],
  "115": ["duty", "preferential_end_use"],
  "117": ["duty", "preferential_quota"],
  "119": ["duty", "preferential_ceiling"],
  "122": ["duty", "preferential_ceiling_2"],
  "123": ["duty", "uk_reduced"],
  "141": ["duty", "autonomous_suspension"],
  "142": ["duty", "autonomous_quota"],
  "143": ["duty", "autonomous_end_use"],
  "145": ["duty", "autonomous_quota_end_use"],
  "146": ["duty", "autonomous_ceiling"],
  "147": ["duty", "autonomous_quota_2"],
  "277": ["prohibition", null],
  "278": ["restriction", "safeguard"],
  "279": ["restriction", null],
  "305": ["anti_dumping", "provisional"],
  "551": ["anti_dumping", null],
  "552": ["anti_dumping", "definitive"],
  "695": ["quota", null],
  "696": ["quota", "suspension"],
  "705": ["vat", null],
  "724": ["restriction", "import_control"],
  "750": ["restriction", "import"],
} as const;

function getMeasureType(typeId: string): [string, string | null] {
  const entry = MEASURE_TYPE_MAP[typeId];
  if (entry) return [entry[0], entry[1]];
  return ["other", typeId]; // preserve numeric code as subtype for unknown types
}

/**
 * Parses the TARIC3 XML envelope format published by DG TAXUD.
 * Handles <oub:envelope> root with nested <app.message> → <record> → <measure>.
 * Only record.code=430 (measure records) are extracted.
 *
 * XML source: https://taxation-customs.ec.europa.eu/online-services/online-services-and-databases-customs/taric-consultation_en
 */
export function parseTaricXml(xmlText: string): TaricRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false, // preserve all values as strings; avoids numeric coercion
    trimValues: true,
  });

  const doc = parser.parse(xmlText) as Record<string, unknown>;

  // Root element may be namespace-prefixed (e.g. "oub:envelope") or plain
  const envelope = findByLocalName(doc, "envelope") ?? findByLocalName(doc, "MEASURES");
  if (!envelope) {
    throw new Error(
      `Unrecognized TARIC XML root element. Found keys: ${Object.keys(doc).join(", ")}`,
    );
  }

  const envObj = envelope as Record<string, unknown>;
  const appMessages = normalizeArray(
    envObj["app.message"] ?? envObj["message"] ?? envObj["messages"],
  );

  const rows: TaricRow[] = [];

  for (const msg of appMessages) {
    const msgObj = msg as Record<string, unknown>;
    const records = normalizeArray(msgObj["record"]);

    for (const rec of records) {
      const recObj = rec as Record<string, unknown>;
      // Only measure records (code 430); skip all other entity records
      const recordCode = getText(recObj, ["record.code", "recordCode"]);
      if (recordCode !== "430") continue;

      const measure = recObj["measure"] as Record<string, unknown> | undefined;
      if (!measure) continue;

      const row = parseMeasureRecord(measure);
      if (row) rows.push(row);
    }
  }

  return rows;
}

function parseMeasureRecord(m: Record<string, unknown>): TaricRow | null {
  const sourceId = getText(m, ["sid", "SID"]);
  const goodsCode = getText(m, ["goods.nomenclature.item.id", "hsCode", "hs_code"]);
  const typeId = getText(m, ["measure.type.id", "measure.type", "measureType"]);
  const geoAreaId = getText(m, ["geographical.area.id", "geographicalArea"]);
  const rawFrom = getText(m, ["validity.start.date", "ValidFrom", "start.date"]);
  const rawUntil = getTextOrNull(m, ["validity.end.date", "ValidUntil", "end.date"]);
  const dutyAmount = getTextOrNull(m, ["duty.amount", "duty_amount"]);
  const monetaryUnit = getTextOrNull(m, ["monetary.unit.code", "currency"]);
  const measureUnit = getTextOrNull(m, ["measure.unit.code"]);
  const regulationId = getTextOrNull(m, [
    "measure.generating.regulation.id",
    "regulation.id",
    "legalBasis",
  ]);

  if (!sourceId || !goodsCode || !typeId || !rawFrom) return null;

  const [measureType, measureSubtype] = getMeasureType(typeId);

  // Geographic area IDs that are exactly 2 uppercase letters are ISO country codes.
  // Multi-char codes (e.g. "1011" = erga omnes, "2005" = EU) → null (applies to all/group).
  const originCountry =
    geoAreaId && /^[A-Z]{2}$/.test(geoAreaId) ? geoAreaId : null;

  // Determine whether duty is a percentage or a specific monetary amount
  let valuePct: string | null = null;
  let valueAmount: string | null = null;
  let currency: string | null = null;

  if (dutyAmount) {
    if (monetaryUnit) {
      // Specific amount (e.g. anti-dumping EUR/tonne)
      valueAmount = dutyAmount;
      currency = monetaryUnit.slice(0, 3);
    } else if (!measureUnit) {
      // Ad valorem percentage
      valuePct = dutyAmount;
    }
    // If measureUnit is set (e.g. kg, 100kg), it's a specific duty — keep in valueAmount
    if (measureUnit && !monetaryUnit) {
      valueAmount = dutyAmount;
    }
  }

  return {
    hsCode: goodsCode.slice(0, 10),
    measureType,
    measureSubtype,
    originCountry,
    destinationCountry: "FR",
    valuePct,
    valueAmount,
    currency,
    description: null, // resolved from measure type descriptions separately
    legalBasis: regulationId,
    validFrom: normalizeDate(rawFrom),
    validUntil: rawUntil ? normalizeDate(rawUntil) : null,
    sourceId,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find a value in obj by local name, ignoring any XML namespace prefix. */
function findByLocalName(
  obj: Record<string, unknown>,
  localName: string,
): unknown | undefined {
  if (localName in obj) return obj[localName];
  for (const key of Object.keys(obj)) {
    const local = key.includes(":") ? key.split(":").pop()! : key;
    if (local === localName) return obj[key];
  }
  return undefined;
}

function normalizeArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function getText(h: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const val = h[key];
    if (typeof val === "string" && val.trim()) return val.trim();
    if (typeof val === "number") return String(val);
  }
  return "";
}

function getTextOrNull(h: Record<string, unknown>, keys: string[]): string | null {
  const s = getText(h, keys);
  return s || null;
}

/** Normalizes "20250101", "2025-01-01", "01/01/2025" → "YYYY-MM-DD". */
function normalizeDate(raw: string): string {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return s;
}
