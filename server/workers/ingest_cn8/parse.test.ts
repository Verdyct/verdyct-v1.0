import { describe, it, expect } from "vitest";
import { parseCnXml } from "./parse.js";

// Minimal fixture representative of the EU EXPORT format (5 codes across 4 levels)
const FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<EXPORT>
  <CN_CODE>
    <CODE>01</CODE>
    <PARENT_CODE/>
    <LEVEL>2</LEVEL>
    <DESCRIPTION_FR>Animaux vivants</DESCRIPTION_FR>
    <DESCRIPTION_EN>Live animals</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT/>
    <START_USE>2025-01-01</START_USE>
    <END_USE/>
  </CN_CODE>
  <CN_CODE>
    <CODE>0101</CODE>
    <PARENT_CODE>01</PARENT_CODE>
    <LEVEL>4</LEVEL>
    <DESCRIPTION_FR>Chevaux, anes, mulets et bardots, vivants</DESCRIPTION_FR>
    <DESCRIPTION_EN>Live horses, asses, mules and hinnies</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT/>
    <START_USE>2025-01-01</START_USE>
    <END_USE/>
  </CN_CODE>
  <CN_CODE>
    <CODE>010121</CODE>
    <PARENT_CODE>0101</PARENT_CODE>
    <LEVEL>6</LEVEL>
    <DESCRIPTION_FR>De l'espece chevaline</DESCRIPTION_FR>
    <DESCRIPTION_EN>Horses</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT>p/st</SUPPLEMENTARY_UNIT>
    <START_USE>2025-01-01</START_USE>
    <END_USE/>
  </CN_CODE>
  <CN_CODE>
    <CODE>01012100</CODE>
    <PARENT_CODE>010121</PARENT_CODE>
    <LEVEL>8</LEVEL>
    <DESCRIPTION_FR>Pur sang pour la reproduction</DESCRIPTION_FR>
    <DESCRIPTION_EN>Pure-bred for breeding</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT>p/st</SUPPLEMENTARY_UNIT>
    <START_USE>2025-01-01</START_USE>
    <END_USE/>
  </CN_CODE>
  <CN_CODE>
    <CODE>01012910</CODE>
    <PARENT_CODE>010121</PARENT_CODE>
    <LEVEL>8</LEVEL>
    <DESCRIPTION_FR>Destines a l'abattage</DESCRIPTION_FR>
    <DESCRIPTION_EN>For slaughter</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT>p/st</SUPPLEMENTARY_UNIT>
    <START_USE>2025-01-01</START_USE>
    <END_USE/>
  </CN_CODE>
</EXPORT>`;

const FIXTURE_WITH_EXPIRED = `<?xml version="1.0" encoding="UTF-8"?>
<EXPORT>
  <CN_CODE>
    <CODE>01</CODE>
    <PARENT_CODE/>
    <LEVEL>2</LEVEL>
    <DESCRIPTION_FR>Animaux vivants</DESCRIPTION_FR>
    <DESCRIPTION_EN>Live animals</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT/>
    <START_USE>2024-01-01</START_USE>
    <END_USE>2024-12-31</END_USE>
  </CN_CODE>
</EXPORT>`;

const FIXTURE_COMPACT_DATE = `<?xml version="1.0" encoding="UTF-8"?>
<EXPORT>
  <CN_CODE>
    <CODE>02</CODE>
    <PARENT_CODE/>
    <LEVEL>2</LEVEL>
    <DESCRIPTION_FR>Viandes et abats comestibles</DESCRIPTION_FR>
    <DESCRIPTION_EN>Meat and edible meat offal</DESCRIPTION_EN>
    <SUPPLEMENTARY_UNIT/>
    <START_USE>20250101</START_USE>
    <END_USE/>
  </CN_CODE>
</EXPORT>`;

describe("parseCnXml", () => {
  it("returns correct number of rows", () => {
    const rows = parseCnXml(FIXTURE_XML);
    expect(rows).toHaveLength(5);
  });

  it("parses chapter (level 2) correctly", () => {
    const rows = parseCnXml(FIXTURE_XML);
    const chapter = rows.find((r) => r.code === "01");
    expect(chapter).toBeDefined();
    expect(chapter!.level).toBe(2);
    expect(chapter!.parentCode).toBeNull();
    expect(chapter!.labelFr).toBe("Animaux vivants");
    expect(chapter!.labelEn).toBe("Live animals");
    expect(chapter!.validFrom).toBe("2025-01-01");
    expect(chapter!.validUntil).toBeNull();
    expect(chapter!.uniteSupplementaire).toBeNull();
  });

  it("parses position (level 4) with parent link", () => {
    const rows = parseCnXml(FIXTURE_XML);
    const pos = rows.find((r) => r.code === "0101");
    expect(pos).toBeDefined();
    expect(pos!.level).toBe(4);
    expect(pos!.parentCode).toBe("01");
  });

  it("parses subposition (level 6) with supplementary unit", () => {
    const rows = parseCnXml(FIXTURE_XML);
    const sub = rows.find((r) => r.code === "010121");
    expect(sub).toBeDefined();
    expect(sub!.level).toBe(6);
    expect(sub!.parentCode).toBe("0101");
    expect(sub!.uniteSupplementaire).toBe("p/st");
  });

  it("parses CN code (level 8)", () => {
    const rows = parseCnXml(FIXTURE_XML);
    const cn = rows.find((r) => r.code === "01012100");
    expect(cn).toBeDefined();
    expect(cn!.level).toBe(8);
    expect(cn!.parentCode).toBe("010121");
  });

  it("parses valid_until when set", () => {
    const rows = parseCnXml(FIXTURE_WITH_EXPIRED);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.validUntil).toBe("2024-12-31");
    expect(rows[0]!.validFrom).toBe("2024-01-01");
  });

  it("normalizes compact date format YYYYMMDD", () => {
    const rows = parseCnXml(FIXTURE_COMPACT_DATE);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.validFrom).toBe("2025-01-01");
  });

  it("is idempotent when called twice on the same input", () => {
    const first = parseCnXml(FIXTURE_XML);
    const second = parseCnXml(FIXTURE_XML);
    expect(first).toEqual(second);
  });

  it("throws on unrecognized root element", () => {
    const bad = `<?xml version="1.0"?><UNKNOWN><X/></UNKNOWN>`;
    expect(() => parseCnXml(bad)).toThrow("Unrecognized CN XML root element");
  });
});
