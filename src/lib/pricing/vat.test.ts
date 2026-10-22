import { describe, expect, it } from "vitest";
import { addVat, formatRand, vatPortion } from "./vat";

describe("VAT", () => {
  it("adds 15% and rounds to the cent", () => {
    expect(addVat(12090)).toBe(13903.5);
    expect(addVat(67.58)).toBe(77.72);
    expect(addVat(0.36)).toBe(0.41);
  });
  it("extracts the VAT portion of an inclusive price", () => {
    expect(vatPortion(115)).toBe(15);
    expect(vatPortion(13903.5)).toBe(1813.5);
    expect(vatPortion(27807)).toBe(3627);
  });
  it("formats rand the same way on server and browser", () => {
    expect(formatRand(13903.5)).toBe("R13,903.50");
    expect(formatRand(1220006.25)).toBe("R1,220,006.25");
    expect(formatRand(0.36)).toBe("R0.36");
    expect(formatRand(999.999)).toBe("R1,000.00");
    expect(formatRand(-50)).toBe("-R50.00");
  });
});
