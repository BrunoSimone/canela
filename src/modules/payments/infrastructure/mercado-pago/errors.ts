import {
  PaymentOrderGatewayError,
  type PaymentOrderFailureKind,
} from "../../domain/payment-order";

export type MercadoPagoFailureKind = PaymentOrderFailureKind;

export type MercadoPagoOperation = "create" | "get";

type MercadoPagoRequestErrorOptions = {
  operation: MercadoPagoOperation;
  kind: MercadoPagoFailureKind;
  status: number | null;
  code: string | null;
  cause?: unknown;
};

export class MercadoPagoRequestError extends PaymentOrderGatewayError {
  readonly operation: MercadoPagoOperation;
  readonly kind: MercadoPagoFailureKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor(options: MercadoPagoRequestErrorOptions) {
    super(options.kind, {
      cause: options.cause,
    });
    this.name = "MercadoPagoRequestError";
    this.operation = options.operation;
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
  }
}
