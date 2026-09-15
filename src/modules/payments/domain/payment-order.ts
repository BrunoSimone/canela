export type PaymentOrderState =
  | "created"
  | "action_required"
  | "processing"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "review_required";

export type PaymentOrderItem = {
  externalCode: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
};

export type CreatePaymentOrderInput = {
  idempotencyKey: string;
  externalReference: string;
  payerEmail: string;
  currency: "ARS";
  totalCents: number;
  items: PaymentOrderItem[];
  returnUrl: string;
};

export type PaymentOrder = {
  providerOrderId: string;
  externalReference: string;
  state: PaymentOrderState;
  providerStatus: string;
  providerStatusDetail: string | null;
  totalCents: number;
  currency: "ARS";
  checkoutUrl: string | null;
};

export interface PaymentOrderGateway {
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder>;
  getOrder(providerOrderId: string): Promise<PaymentOrder>;
}
