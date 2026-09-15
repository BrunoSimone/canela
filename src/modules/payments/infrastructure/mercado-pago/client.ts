import type {
  CreatePaymentOrderInput,
  PaymentOrder,
  PaymentOrderGateway,
} from "../../domain/payment-order";
import {
  MercadoPagoRequestError,
  type MercadoPagoFailureKind,
  type MercadoPagoOperation,
} from "./errors";
import { parseArsAmount } from "./money";
import { buildMercadoPagoOrderPayload } from "./payload";
import { mapMercadoPagoOrderState } from "./status";

type MercadoPagoClientConfig = {
  accessToken: string;
  baseUrl?: string;
};

type MercadoPagoOrderResponse = {
  id: string;
  status: string;
  status_detail?: string | null;
  external_reference: string;
  total_amount: string;
  currency: string;
  checkout_url?: string | null;
};

const DEFAULT_BASE_URL = "https://api.mercadopago.com";

export class MercadoPagoClient implements PaymentOrderGateway {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetch: typeof fetch;

  constructor(
    config: MercadoPagoClientConfig,
    fetchImplementation: typeof fetch = globalThis.fetch,
  ) {
    if (!config.accessToken) {
      throw new Error("Mercado Pago access token is required");
    }

    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetch = fetchImplementation;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder> {
    return this.request("create", `${this.baseUrl}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify(buildMercadoPagoOrderPayload(input)),
    });
  }

  async getOrder(providerOrderId: string): Promise<PaymentOrder> {
    if (!providerOrderId) {
      throw new Error("Mercado Pago order id is required");
    }

    return this.request(
      "get",
      `${this.baseUrl}/v1/orders/${encodeURIComponent(providerOrderId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.accessToken}` },
      },
    );
  }

  private async request(
    operation: MercadoPagoOperation,
    url: string,
    init: RequestInit,
  ): Promise<PaymentOrder> {
    let response: Response;
    try {
      response = await this.fetch(url, init);
    } catch (cause) {
      throw new MercadoPagoRequestError({
        operation,
        kind: "ambiguous",
        status: null,
        code: null,
        cause,
      });
    }

    if (!response.ok) {
      const code = await readProviderErrorCode(response);
      throw new MercadoPagoRequestError({
        operation,
        kind: classifyHttpFailure(response.status),
        status: response.status,
        code,
      });
    }

    try {
      return mapProviderOrder(await response.json());
    } catch (cause) {
      throw new MercadoPagoRequestError({
        operation,
        kind: "ambiguous",
        status: response.status,
        code: null,
        cause,
      });
    }
  }
}

function classifyHttpFailure(status: number): MercadoPagoFailureKind {
  if (status === 423 || status === 429) {
    return "retryable";
  }
  if (status >= 500 || status === 408 || status === 409) {
    return "ambiguous";
  }
  return "definitive";
}

async function readProviderErrorCode(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (!isRecord(body)) {
      return null;
    }
    if (typeof body.code === "string") {
      return body.code;
    }
    if (Array.isArray(body.errors)) {
      const firstError = body.errors.find(
        (error): error is Record<string, unknown> => isRecord(error),
      );
      if (firstError && typeof firstError.code === "string") {
        return firstError.code;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapProviderOrder(value: unknown): PaymentOrder {
  if (!isProviderOrder(value) || value.currency !== "ARS") {
    throw new Error("Mercado Pago returned an invalid order");
  }

  const statusDetail = value.status_detail ?? null;
  return {
    providerOrderId: value.id,
    externalReference: value.external_reference,
    state: mapMercadoPagoOrderState(value.status, statusDetail),
    providerStatus: value.status,
    providerStatusDetail: statusDetail,
    totalCents: parseArsAmount(value.total_amount),
    currency: "ARS",
    checkoutUrl: value.checkout_url ?? null,
  };
}

function isProviderOrder(value: unknown): value is MercadoPagoOrderResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "status" in value &&
    typeof value.status === "string" &&
    "external_reference" in value &&
    typeof value.external_reference === "string" &&
    "total_amount" in value &&
    typeof value.total_amount === "string" &&
    "currency" in value &&
    typeof value.currency === "string" &&
    (!("status_detail" in value) ||
      value.status_detail === null ||
      typeof value.status_detail === "string") &&
    (!("checkout_url" in value) ||
      value.checkout_url === null ||
      typeof value.checkout_url === "string")
  );
}
