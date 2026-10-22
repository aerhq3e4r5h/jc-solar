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
  it("formats rand", () => {
    expect(formatRand(13903.5).replace(/\s/g, " ")).toMatch(/R\s?13[ ,]903[.,]50/);
  });
});
