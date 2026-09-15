import { describe, expect, it, vi } from "vitest";
import type { CreatePaymentOrderInput } from "../../domain/payment-order";
import { MercadoPagoRequestError } from "./errors";
import { MercadoPagoClient } from "./client";

const input: CreatePaymentOrderInput = {
  idempotencyKey: "db8a237b-a877-4af5-b780-01676ea7e818",
  externalReference: "CAN-000127",
  payerEmail: "buyer@testuser.com",
  currency: "ARS",
  totalCents: 1_500_000,
  items: [
    {
      externalCode: "product-id",
      title: "Espejo Perlas",
      unitPriceCents: 1_500_000,
      quantity: 1,
    },
  ],
  returnUrl: "https://preview.canela.test/checkout/resultado",
};

function providerOrderResponse() {
  return {
    id: "ORDTST01ABC",
    status: "created",
    status_detail: "accredited",
    external_reference: "CAN-000127",
    total_amount: "15000.00",
    currency: "ARS",
    checkout_url: "https://www.mercadopago.com.ar/checkout/redirect",
  };
}

describe("MercadoPagoClient", () => {
  it("creates an order with server credentials and a stable idempotency key", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(providerOrderResponse(), { status: 201 }),
    );
    const client = new MercadoPagoClient(
      { accessToken: "secret-token", baseUrl: "https://api.test" },
      fetchMock,
    );

    const result = await client.createOrder(input);

    expect(result).toMatchObject({
      providerOrderId: "ORDTST01ABC",
      state: "created",
      totalCents: 1_500_000,
      currency: "ARS",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
          "X-Idempotency-Key": input.idempotencyKey,
        }),
      }),
    );
  });

  it("retrieves an order without exposing credentials in the result", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ ...providerOrderResponse(), status: "processed" }),
    );
    const client = new MercadoPagoClient(
      { accessToken: "secret-token", baseUrl: "https://api.test" },
      fetchMock,
    );

    const result = await client.getOrder("ORDTST01ABC");

    expect(result.state).toBe("approved");
    expect(result).not.toHaveProperty("accessToken");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.test/v1/orders/ORDTST01ABC",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer secret-token" },
      }),
    );
  });

  it.each([
    [400, "invalid_request", "definitive"],
    [409, "idempotency_key_already_used", "ambiguous"],
    [423, "resource_locked", "retryable"],
    [500, "internal_error", "ambiguous"],
  ] as const)(
    "classifies HTTP %s as %s",
    async (status, code, expectedKind) => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          { errors: [{ code, message: "provider detail" }] },
          { status },
        ),
      );
      const client = new MercadoPagoClient(
        { accessToken: "secret-token", baseUrl: "https://api.test" },
        fetchMock,
      );

      const error = await client.createOrder(input).catch((caught) => caught);

      expect(error).toBeInstanceOf(MercadoPagoRequestError);
      expect(error).toMatchObject({ kind: expectedKind, status, code });
      expect((error as Error).message).not.toContain("provider detail");
    },
  );

  it("classifies a network failure as an ambiguous outcome", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("network failure"));
    const client = new MercadoPagoClient(
      { accessToken: "secret-token", baseUrl: "https://api.test" },
      fetchMock,
    );

    await expect(client.createOrder(input)).rejects.toMatchObject({
      kind: "ambiguous",
      status: null,
      code: null,
    });
  });
});
