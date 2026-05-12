import { describe, it, expect } from "vitest";
import { parseTaricXml } from "./parse.js";

// Minimal TARIC3 envelope fixture — representative of DG TAXUD export format
const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<oub:envelope xmlns:oub="urn:publicid:-:DGTAXUD:TARIC:MESSAGE:1.0" id="20250101">
  <app.message id="1">
    <transmission>
      <from>DG TAXUD</from>
      <sequence.number>1</sequence.number>
    </transmission>

    <!-- Third-country duty — erga omnes (geo group code, not ISO) -->
    <record>
      <transaction.id>1</transaction.id>
      <record.code>430</record.code>
      <subrecord.code>00</subrecord.code>
      <record.sequence.number>1</record.sequence.number>
      <update.type>3</update.type>
      <measure>
        <sid>12345678</sid>
        <measure.type.id>103</measure.type.id>
        <goods.nomenclature.item.id>0101210000</goods.nomenclature.item.id>
        <geographical.area.id>1011</geographical.area.id>
        <validity.start.date>20250101</validity.start.date>
        <validity.end.date/>
        <measure.generating.regulation.id>R202500001</measure.generating.regulation.id>
        <duty.amount>5.2</duty.amount>
      </measure>
    </record>

    <!-- Anti-dumping duty — specific country, specific EUR amount, with valid_until -->
    <record>
      <transaction.id>2</transaction.id>
      <record.code>430</record.code>
      <subrecord.code>00</subrecord.code>
      <record.sequence.number>2</record.sequence.number>
      <update.type>3</update.type>
      <measure>
        <sid>12345679</sid>
        <measure.type.id>551</measure.type.id>
        <goods.nomenclature.item.id>0101210000</goods.nomenclature.item.id>
        <geographical.area.id>CN</geographical.area.id>
        <validity.start.date>20230101</validity.start.date>
        <validity.end.date>20231231</validity.end.date>
        <measure.generating.regulation.id>R202300001</measure.generating.regulation.id>
        <duty.amount>28.5</duty.amount>
        <monetary.unit.code>EUR</monetary.unit.code>
      </measure>
    </record>

    <!-- Preferential duty — another ISO country -->
    <record>
      <transaction.id>3</transaction.id>
      <record.code>430</record.code>
      <subrecord.code>00</subrecord.code>
      <record.sequence.number>3</record.sequence.number>
      <update.type>3</update.type>
      <measure>
        <sid>12345680</sid>
        <measure.type.id>112</measure.type.id>
        <goods.nomenclature.item.id>0101290000</goods.nomenclature.item.id>
        <geographical.area.id>CH</geographical.area.id>
        <validity.start.date>20240101</validity.start.date>
        <validity.end.date/>
        <measure.generating.regulation.id>R202400001</measure.generating.regulation.id>
        <duty.amount>0.0</duty.amount>
      </measure>
    </record>

    <!-- Non-measure record (code 100) — must be skipped entirely -->
    <record>
      <transaction.id>4</transaction.id>
      <record.code>100</record.code>
      <subrecord.code>00</subrecord.code>
      <record.sequence.number>4</record.sequence.number>
      <update.type>3</update.type>
    </record>

    <!-- Measure with missing sid — must be filtered out -->
    <record>
      <transaction.id>5</transaction.id>
      <record.code>430</record.code>
      <subrecord.code>00</subrecord.code>
      <record.sequence.number>5</record.sequence.number>
      <update.type>3</update.type>
      <measure>
        <sid/>
        <measure.type.id>103</measure.type.id>
        <goods.nomenclature.item.id>0102000000</goods.nomenclature.item.id>
        <geographical.area.id>1011</geographical.area.id>
        <validity.start.date>20250101</validity.start.date>
        <validity.end.date/>
      </measure>
    </record>
  </app.message>
</oub:envelope>`;

describe("parseTaricXml", () => {
  it("returns only valid measure records — skips non-430 and incomplete", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    expect(rows).toHaveLength(3);
  });

  it("maps measure type 103 → duty", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345678");
    expect(row).toBeDefined();
    expect(row!.measureType).toBe("duty");
    expect(row!.measureSubtype).toBeNull();
  });

  it("maps measure type 551 → anti_dumping", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345679");
    expect(row!.measureType).toBe("anti_dumping");
  });

  it("maps measure type 112 → duty/preferential", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345680");
    expect(row!.measureType).toBe("duty");
    expect(row!.measureSubtype).toBe("preferential");
  });

  it("maps erga omnes geo group code → originCountry null", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345678");
    expect(row!.originCountry).toBeNull();
  });

  it("maps 2-char ISO country code → originCountry", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const cn = rows.find((r) => r.sourceId === "12345679");
    expect(cn!.originCountry).toBe("CN");
    const ch = rows.find((r) => r.sourceId === "12345680");
    expect(ch!.originCountry).toBe("CH");
  });

  it("normalizes compact date YYYYMMDD → YYYY-MM-DD", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345678");
    expect(row!.validFrom).toBe("2025-01-01");
  });

  it("sets validUntil when present, null when absent", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const withEnd = rows.find((r) => r.sourceId === "12345679");
    expect(withEnd!.validUntil).toBe("2023-12-31");
    const noEnd = rows.find((r) => r.sourceId === "12345678");
    expect(noEnd!.validUntil).toBeNull();
  });

  it("sets valuePct for ad valorem duties (no monetary unit)", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345678");
    expect(row!.valuePct).toBe("5.2");
    expect(row!.valueAmount).toBeNull();
    expect(row!.currency).toBeNull();
  });

  it("sets valueAmount+currency for specific amount duties", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345679");
    expect(row!.valueAmount).toBe("28.5");
    expect(row!.currency).toBe("EUR");
    expect(row!.valuePct).toBeNull();
  });

  it("sets legalBasis from regulation id", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    const row = rows.find((r) => r.sourceId === "12345678");
    expect(row!.legalBasis).toBe("R202500001");
  });

  it("truncates hsCode to 10 chars", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    rows.forEach((r) => expect(r.hsCode.length).toBeLessThanOrEqual(10));
  });

  it("always sets destinationCountry to FR", () => {
    const rows = parseTaricXml(FIXTURE_XML);
    rows.forEach((r) => expect(r.destinationCountry).toBe("FR"));
  });

  it("is idempotent on repeated calls", () => {
    expect(parseTaricXml(FIXTURE_XML)).toEqual(parseTaricXml(FIXTURE_XML));
  });

  it("throws on unrecognized root element", () => {
    expect(() => parseTaricXml(`<?xml version="1.0"?><UNKNOWN/>`)).toThrow(
      "Unrecognized TARIC XML root element",
    );
  });
});
