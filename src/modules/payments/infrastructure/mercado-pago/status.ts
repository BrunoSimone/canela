import type { PaymentOrderState } from "../../domain/payment-order";

export function mapMercadoPagoOrderState(
  status: string,
  statusDetail: string | null,
): PaymentOrderState {
  switch (status) {
    case "created":
      return "created";
    case "action_required":
      return statusDetail === "waiting_retry"
        ? "action_required"
        : "review_required";
    case "processing":
      return "processing";
    case "processed":
      return statusDetail === "accredited" ? "approved" : "review_required";
    case "failed":
      return "rejected";
    case "canceled":
      return "cancelled";
    case "expired":
      return "expired";
    default:
      return "review_required";
  }
}
