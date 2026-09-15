import { describe, expect, it } from "vitest";
import { formatArsCents, parseArsAmount } from "./money";

describe("Mercado Pago money conversion", () => {
  it("formats integer cents without floating point arithmetic", () => {
    expect(formatArsCents(0)).toBe("0.00");
    expect(formatArsCents(1)).toBe("0.01");
    expect(formatArsCents(1_500_000)).toBe("15000.00");
  });

  it("parses provider decimal amounts into integer cents", () => {
    expect(parseArsAmount("0.01")).toBe(1);
    expect(parseArsAmount("15000.00")).toBe(1_500_000);
  });

  it("rejects unsafe or fractional monetary values", () => {
    expect(() => formatArsCents(-1)).toThrow();
    expect(() => formatArsCents(1.5)).toThrow();
    expect(() => parseArsAmount("15.999")).toThrow();
  });
});
