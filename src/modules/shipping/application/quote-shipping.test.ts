import { describe, expect, it, vi } from "vitest";

import {
  InsufficientCourierRateValidityError,
  InvalidCourierQuoteInputError,
  InvalidCourierRateError,
  UnavailableCourierRateError,
  type ParcelRate,
} from "../domain/courier-quote";
import { MissingShippingProfileError } from "../domain/parcel-plan";
import { SignedCourierQuoteService } from "../infrastructure/signed-courier-quote";
import { quoteShipping } from "./quote-shipping";

const now = new Date("2026-09-27T12:00:00.000Z");
const profile = {
  productId: "plate",
  version: 1,
  weightGrams: 900,
  heightCm: 12,
  widthCm: 24,
  lengthCm: 24,
  shipSeparately: false,
};

function homeRate(amountCents: number, overrides: Partial<ParcelRate> = {}): ParcelRate {
  return {
    deliveryType: "home",
    serviceCode: "approved-home",
    serviceName: "Domicilio",
    amountCents,
    ...overrides,
  };
}

function dependencies() {
  const catalog = { findByIds: vi.fn().mockResolvedValue([{
    id: "plate", sellable: true, profile,
  }]) };
  const rates = { quoteParcel: vi.fn().mockResolvedValue({
    validTo: new Date("2026-09-27T12:30:00.000Z"),
    rates: [homeRate(125_50)],
  }) };
  const issuer = new SignedCourierQuoteService("s".repeat(64));
  return {
    catalog,
    rates,
    issuer,
    environment: "qa" as const,
    groupingRules: [],
    constraints: {
      maxWeightGrams: 25_000,
      maxHeightCm: 150,
      maxWidthCm: 150,
      maxLengthCm: 150,
      maxUnits: 10,
    },
    originPostalCode: "7600",
    serviceCode: "approved-home",
    now: () => now,
  };
}

const input = {
  destinationPostalCode: "1000",
  items: [{ productId: "plate", quantity: 2 }],
};

describe("quoteShipping", () => {
  it("quotes every parcel and signs the exact sum and earliest expiry", async () => {
    const deps = dependencies();
    deps.rates.quoteParcel
      .mockResolvedValueOnce({
        validTo: new Date("2026-09-27T12:30:00.000Z"),
        rates: [homeRate(125_50)],
      })
      .mockResolvedValueOnce({
        validTo: new Date("2026-09-27T12:20:00.000Z"),
        rates: [homeRate(310_25)],
      });

    const issued = await quoteShipping(deps, input);

    expect(deps.catalog.findByIds).toHaveBeenCalledWith(["plate"]);
    expect(deps.rates.quoteParcel).toHaveBeenCalledTimes(2);
    expect(deps.rates.quoteParcel).toHaveBeenNthCalledWith(1, {
      deliveryType: "home",
      originPostalCode: "7600",
      destinationPostalCode: "1000",
      parcel: expect.objectContaining({ weightGrams: 900 }),
    });
    expect(issued).toMatchObject({
      provider: "correo_argentino",
      environment: "qa",
      deliveryType: "home",
      amountCents: 435_75,
      parcelCount: 2,
      serviceCode: "approved-home",
      expiresAt: new Date("2026-09-27T12:20:00.000Z"),
    });
    expect(deps.issuer.verify(issued.token, {
      environment: "qa",
      deliveryType: "home",
      originPostalCode: "7600",
      destinationPostalCode: "1000",
      items: input.items,
      planFingerprint: issued.planFingerprint,
      serviceCode: "approved-home",
    }, now).amountCents).toBe(435_75);
  });

  it("rejects an invalid destination or missing profile before calling the gateway", async () => {
    const deps = dependencies();
    await expect(quoteShipping(deps, { ...input, destinationPostalCode: " " }))
      .rejects.toBeInstanceOf(InvalidCourierQuoteInputError);
    expect(deps.catalog.findByIds).not.toHaveBeenCalled();

    deps.catalog.findByIds.mockResolvedValue([{ id: "plate", sellable: true, profile: null }]);
    await expect(quoteShipping(deps, input))
      .rejects.toBeInstanceOf(MissingShippingProfileError);
    expect(deps.rates.quoteParcel).not.toHaveBeenCalled();
  });

  it("rejects a branch-only rate for any parcel without issuing a partial quote", async () => {
    const deps = dependencies();
    deps.rates.quoteParcel.mockResolvedValueOnce({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [homeRate(100)],
    }).mockResolvedValueOnce({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [homeRate(200, { deliveryType: "branch" })],
    });
    const issue = vi.spyOn(deps.issuer, "issue");

    await expect(quoteShipping(deps, input))
      .rejects.toBeInstanceOf(UnavailableCourierRateError);
    expect(issue).not.toHaveBeenCalled();
  });

  it("rejects malformed, ambiguous and overflowing prices", async () => {
    const deps = dependencies();
    deps.rates.quoteParcel.mockResolvedValue({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [homeRate(12.5)],
    });
    await expect(quoteShipping(deps, input)).rejects.toBeInstanceOf(InvalidCourierRateError);

    deps.rates.quoteParcel.mockResolvedValue({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [
        homeRate(100),
        homeRate(200),
      ],
    });
    await expect(quoteShipping(deps, input)).rejects.toBeInstanceOf(InvalidCourierRateError);

    deps.rates.quoteParcel.mockResolvedValue({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [homeRate(Number.MAX_SAFE_INTEGER)],
    });
    await expect(quoteShipping(deps, input)).rejects.toBeInstanceOf(InvalidCourierRateError);
  });

  it("requires the rate to cover the full checkout window", async () => {
    const deps = dependencies();
    deps.rates.quoteParcel.mockResolvedValue({
      validTo: new Date("2026-09-27T12:09:59.000Z"),
      rates: [homeRate(0)],
    });
    await expect(quoteShipping(deps, input))
      .rejects.toBeInstanceOf(InsufficientCourierRateValidityError);
  });

  it("checks the checkout window after the last provider response", async () => {
    const deps = dependencies();
    let currentTime = now;
    deps.now = () => currentTime;
    deps.rates.quoteParcel.mockImplementation(async () => {
      currentTime = new Date("2026-09-27T12:22:00.000Z");
      return {
        validTo: new Date("2026-09-27T12:30:00.000Z"),
        rates: [homeRate(0)],
      };
    });

    await expect(quoteShipping(deps, input))
      .rejects.toBeInstanceOf(InsufficientCourierRateValidityError);
  });

  it("accepts a zero tariff only when returned for the configured service", async () => {
    const deps = dependencies();
    deps.rates.quoteParcel.mockResolvedValue({
      validTo: new Date("2026-09-27T12:30:00.000Z"),
      rates: [homeRate(0)],
    });

    const quote = await quoteShipping(deps, input);
    expect(quote.amountCents).toBe(0);
  });
});
