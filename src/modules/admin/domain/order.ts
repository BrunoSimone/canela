export type OrderSort = "created_desc" | "created_asc";

export type OperationalStatus =
  | "payment_verification"
  | "prepare"
  | "ready_to_ship"
  | "label_ready"
  | "shipped"
  | "attention"
  | "cancelled";

export type AdminOrder = {
  frame?: import("../../customization/domain/frame-order").AdminFrame | null;
  environment?: "test" | "production";
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: OperationalStatus;
  statusLabel: string;
  nextAction: string;
  buyer: { name: string | null; email: string | null; phone: string | null };
  recipientName?: string | null;
  destination: { locality: string; province: string; postalCode?: string } | null;
  shippingAddress: string | null;
  deliveryMethod: string | null;
  packingPlan?: import("../../shipping/domain/parcel-plan").PlannedParcel[];
  preparation: import("./preparation").OrderPreparation | null;
  shipment?: import("../../shipping/domain/fulfillment").ShipmentSummary | null;
  shipmentEnabled?: boolean;
  dispatch?: import("../../shipping/domain/fulfillment").DispatchSummary | null;
  notifications?: import("../../notifications/domain/notification").NoticeSummary[];
  notificationsEnabled?: boolean;
  trackingNumber: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  source: "database" | "demo";
};

export type AdminOrderPage = {
  orders: AdminOrder[];
  nextCursor: string | null;
};

export type OrderQuery = {
  q: string;
  sort: OrderSort;
  cursor: string | null;
  limit: number;
};

const statusDescriptions: Record<string, Pick<AdminOrder, "status" | "statusLabel" | "nextAction">> = {
  created: { status: "payment_verification", statusLabel: "Pago en verificación", nextAction: "Esperar la confirmación del pago." },
  payment_pending: { status: "payment_verification", statusLabel: "Pago en verificación", nextAction: "Esperar la confirmación del pago." },
  paid: { status: "prepare", statusLabel: "Preparar pedido", nextAction: "Preparar las piezas y confirmar el embalaje." },
  fulfillment_pending: { status: "prepare", statusLabel: "Preparar pedido", nextAction: "Registrar los bultos reales antes de crear el envío." },
  shipped: { status: "shipped", statusLabel: "Despachado", nextAction: "Consultar el seguimiento del transporte." },
  delivered: { status: "shipped", statusLabel: "Entregado", nextAction: "No hay acciones pendientes." },
  review_required: { status: "attention", statusLabel: "Necesita revisión", nextAction: "Pedí ayuda técnica para verificar el pago y la reserva de stock antes de preparar el pedido. Compartí el ID del pedido." },
  refund_pending: { status: "attention", statusLabel: "Necesita revisión", nextAction: "Comprobá el reintegro pendiente en Mercado Pago y pedí ayuda técnica si el pedido no se actualiza." },
  rejected: { status: "cancelled", statusLabel: "Cancelado", nextAction: "No preparar este pedido." },
  expired: { status: "cancelled", statusLabel: "Vencido", nextAction: "No preparar este pedido." },
  refunded: { status: "cancelled", statusLabel: "Reembolsado", nextAction: "No preparar este pedido." },
};

export function describeOrderStatus(raw: string): Pick<AdminOrder, "status" | "statusLabel" | "nextAction"> {
  return statusDescriptions[raw] ?? {
    status: "attention",
    statusLabel: "Necesita revisión",
    nextAction: "Pedí ayuda técnica para verificar el estado del pedido antes de continuar. Compartí el ID del pedido.",
  };
}

export function parseOrderQuery(url: URL): OrderQuery {
  const q = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ");
  const sort = url.searchParams.get("sort") ?? "created_desc";
  const limitRaw = url.searchParams.get("limit") ?? "25";
  const limit = Number(limitRaw);
  const cursor = url.searchParams.get("cursor");

  if (q.length > 128 || (sort !== "created_desc" && sort !== "created_asc") ||
    !Number.isInteger(limit) || limit < 1 || limit > 50 || (cursor && cursor.length > 512)) {
    throw new Error("INVALID_ORDER_QUERY");
  }

  return { q, sort, limit, cursor };
}

export function makeOrderCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify([createdAt, id])).toString("base64url");
}

export function readOrderCursor(value: string): { createdAt: string; id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Array.isArray(parsed) || parsed.length !== 2 ||
      typeof parsed[0] !== "string" || typeof parsed[1] !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(parsed[0]) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed[1])) {
      throw new Error("invalid");
    }
    if (Number.isNaN(new Date(parsed[0]).getTime())) throw new Error("invalid");
    return { createdAt: parsed[0], id: parsed[1] };
  } catch {
    throw new Error("INVALID_ORDER_CURSOR");
  }
}
