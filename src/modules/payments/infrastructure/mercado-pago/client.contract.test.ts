import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { CreatePaymentOrderInput } from "../../domain/payment-order";
import { MercadoPagoClient } from "./client";
import { buildMercadoPagoOrderPayload } from "./payload";

const runContract = process.env.RUN_MP_CONTRACT === "1";

if (runContract && !process.env.MP_TEST_ACCESS_TOKEN) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    throw new Error("MP_TEST_ACCESS_TOKEN is required when RUN_MP_CONTRACT=1");
  }
}

const accessToken = process.env.MP_TEST_ACCESS_TOKEN;

if (runContract && !accessToken) {
  throw new Error("MP_TEST_ACCESS_TOKEN is required when RUN_MP_CONTRACT=1");
}

const describeContract = runContract ? describe : describe.skip;
const baseUrl = "https://api.mercadopago.com";

function createInput(): CreatePaymentOrderInput {
  return {
    idempotencyKey: randomUUID(),
    externalReference: `CAN-CONTRACT-${Date.now()}-${randomUUID().slice(0, 8)}`,
    payerEmail: "buyer@testuser.com",
    currency: "ARS",
    totalCents: 3_400_000,
    items: [
      {
        externalCode: "sanity-product-id",
        title: "Cuadro Palmera",
        unitPriceCents: 3_000_000,
        quantity: 1,
      },
      {
        externalCode: "shipping-correo-argentino",
        title: "Envio Correo Argentino",
        unitPriceCents: 400_000,
        quantity: 1,
      },
    ],
    returnUrl: "https://example.com/checkout/resultado",
  };
}

function createClient(): MercadoPagoClient {
  return new MercadoPagoClient({ accessToken: accessToken! });
}

async function postRaw(
  idempotencyKey: string,
  payload: unknown,
): Promise<{ response: Response; body: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error("Mercado Pago returned a non-object response");
  }

  return { response, body: body as Record<string, unknown> };
}

function errorCodes(body: Record<string, unknown>): unknown[] {
  if (!Array.isArray(body.errors)) {
    return [];
  }
  return body.errors.map((error) =>
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : null,
  );
}

describeContract("Mercado Pago Orders API contract", () => {
  it("creates and retrieves the approved Canela order shape", async () => {
    const input = createInput();
    const client = createClient();

    const created = await client.createOrder(input);
    const fetched = await client.getOrder(created.providerOrderId);
    const response = await fetch(
      `${baseUrl}/v1/orders/${encodeURIComponent(created.providerOrderId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const providerOrder = (await response.json()) as Record<string, unknown>;
    const config = providerOrder.config as Record<string, unknown>;
    const paymentMethod = config.payment_method as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(created).toMatchObject({
      state: "created",
      externalReference: input.externalReference,
      totalCents: input.totalCents,
      currency: "ARS",
      checkoutUrl: expect.any(String),
    });
    expect(fetched.providerOrderId).toBe(created.providerOrderId);
    expect(fetched).toMatchObject({
      sellerUserId: expect.stringMatching(/^\d+$/),
      applicationId: expect.stringMatching(/^\d+$/),
    });
    expect(providerOrder).toMatchObject({
      expiration_time: "PT10M",
      capture_mode: "automatic_async",
      items: expect.arrayContaining([
        expect.objectContaining({
          external_code: "shipping-correo-argentino",
        }),
      ]),
    });
    expect(paymentMethod.not_allowed_types).toContain("ticket");
  });

  it("returns the same order for an identical idempotent retry", async () => {
    const input = createInput();
    const client = createClient();

    const first = await client.createOrder(input);
    const second = await client.createOrder(input);

    expect(second.providerOrderId).toBe(first.providerOrderId);
  });

  it("rejects reusing an idempotency key with a different payload", async () => {
    const input = createInput();
    const client = createClient();
    await client.createOrder(input);

    await expect(
      client.createOrder({
        ...input,
        totalCents: input.totalCents + 100,
        items: [
          ...input.items.slice(0, -1),
          {
            ...input.items.at(-1)!,
            unitPriceCents: input.items.at(-1)!.unitPriceCents + 100,
          },
        ],
      }),
    ).rejects.toMatchObject({
      kind: "ambiguous",
      status: 409,
      code: "idempotency_key_already_used",
    });
  });

  it("rejects a provider total that differs from the item sum", async () => {
    const input = createInput();
    const payload = {
      ...buildMercadoPagoOrderPayload(input),
      total_amount: "1.00",
    };

    const { response, body } = await postRaw(input.idempotencyKey, payload);

    expect(response.status).toBe(400);
    expect(errorCodes(body)).toContain("order_items_total_amount_mismatch");
  });

  it("cancels an unpaid order before stock can be released", async () => {
    const client = createClient();
    const created = await client.createOrder(createInput());

    const response = await fetch(
      `${baseUrl}/v1/orders/${encodeURIComponent(created.providerOrderId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Idempotency-Key": randomUUID(),
        },
      },
    );
    const fetched = await client.getOrder(created.providerOrderId);

    expect(response.status).toBe(200);
    expect(fetched.state).toBe("cancelled");
  });
});
