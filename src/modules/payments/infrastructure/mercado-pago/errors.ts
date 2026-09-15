export type MercadoPagoFailureKind =
  | "definitive"
  | "retryable"
  | "ambiguous";

export type MercadoPagoOperation = "create" | "get";

type MercadoPagoRequestErrorOptions = {
  operation: MercadoPagoOperation;
  kind: MercadoPagoFailureKind;
  status: number | null;
  code: string | null;
  cause?: unknown;
};

export class MercadoPagoRequestError extends Error {
  readonly operation: MercadoPagoOperation;
  readonly kind: MercadoPagoFailureKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor(options: MercadoPagoRequestErrorOptions) {
    super(`Mercado Pago ${options.operation} request failed`, {
      cause: options.cause,
    });
    this.name = "MercadoPagoRequestError";
    this.operation = options.operation;
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
  }
}
