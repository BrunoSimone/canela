import { describe, expect, it } from "vitest";

import { InvalidPreparationError, parseSavePreparationInput } from "./preparation";

describe("parseSavePreparationInput", () => {
  it("accepts measured bultos and strips untrusted fields", () => {
    expect(parseSavePreparationInput({
      expectedVersion: 0,
      parcels: [{ weightGrams: 900, heightCm: 20, widthCm: 30, lengthCm: 40, price: 1 }],
      note: " Frágil ",
    })).toEqual({
      expectedVersion: 0,
      parcels: [{ weightGrams: 900, heightCm: 20, widthCm: 30, lengthCm: 40 }],
      note: "Frágil",
    });
  });

  it.each([0, -1, 1.5, 100_001, "900"])("rejects invalid weights %s", (weightGrams) => {
    expect(() => parseSavePreparationInput({
      expectedVersion: 0,
      parcels: [{ weightGrams, heightCm: 20, widthCm: 30, lengthCm: 40 }],
    })).toThrow(InvalidPreparationError);
  });
});
