import type { CourierQuoteSnapshot } from "../../shipping/domain/courier-quote";
import type { Sql } from "postgres";

import type { AdminOrder, AdminOrderPage, OrderQuery } from "../domain/order";
import { describeOrderStatus, makeOrderCursor, readOrderCursor } from "../domain/order";
import { provinceName } from "../../checkout/domain/delivery";

type OrderRow = {
  frame: AdminOrder["frame"];
  environment: "test" | "production";
  id: string;
  status: string;
  currency: string;
  subtotal_cents: string;
  shipping_cents: string;
  shipping_quote_snapshot: CourierQuoteSnapshot | null;
  total_cents: string;
  buyer_email: string | null;
  buyer_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  street_name: string | null;
  street_number: string | null;
  floor: string | null;
  apartment: string | null;
  city: string | null;
  province_code: string | null;
  postal_code: string | null;
  preparation_version: number | null;
  preparation_parcels: unknown;
  preparation_note: string | null;
  preparation_updated_at: Date | null;
  preparation_updated_by: string | null;
  shipment: NonNullable<AdminOrder["shipment"]> | null;
  created_at: Date;
  cursor_created_at: string;
  updated_at: Date;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPriceCents: string;
  }>;
};

export class PostgresAdminOrderReader {
  constructor(private readonly sql: Sql) {}

  async list(query: OrderQuery): Promise<AdminOrderPage> {
    const cursor = query.cursor ? readOrderCursor(query.cursor) : null;
    const search = query.q.toLowerCase();
    const escaped = search.replace(/[\\%_]/g, "\\$&");
    const searchCondition = !search
      ? this.sql`TRUE`
      : search.length < 2
        ? this.sql`o.id::text ILIKE ${`${escaped}%`} ESCAPE '\\'`
        : this.sql`(
          o.id::text ILIKE ${`${escaped}%`} ESCAPE '\\'
          OR o.buyer_email ILIKE ${`%${escaped}%`} ESCAPE '\\'
          OR d.buyer_name ILIKE ${`%${escaped}%`} ESCAPE '\\'
          OR d.recipient_name ILIKE ${`%${escaped}%`} ESCAPE '\\'
          OR s.remote_summary->>'trackingNumber' ILIKE ${`%${escaped}%`} ESCAPE '\\'
          OR EXISTS (
            SELECT 1 FROM order_item oi_search
            WHERE oi_search.order_id = o.id
              AND oi_search.name_snapshot ILIKE ${`%${escaped}%`} ESCAPE '\\'
          )
        )`;
    const cursorCondition = !cursor
      ? this.sql`TRUE`
      : query.sort === "created_desc"
        ? this.sql`(o.created_at, o.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
        : this.sql`(o.created_at, o.id) > (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`;
    const ordering = query.sort === "created_desc"
      ? this.sql`o.created_at DESC, o.id DESC`
      : this.sql`o.created_at ASC, o.id ASC`;

    const rows = await this.sql<OrderRow[]>`
      SELECT
        CASE WHEN f.order_id IS NULL THEN NULL ELSE json_build_object('state',f.production_state,'version',f.version,'productionDays',f.snapshot->'productionDays','galleryConsent',f.snapshot->'acceptance'->'gallery','galleryDraftCreated',f.gallery_draft_created) END AS frame,
        o.id, o.environment, o.status, o.currency, o.subtotal_cents, o.shipping_cents, o.shipping_quote_snapshot,
        o.total_cents, o.buyer_email, o.created_at, o.updated_at,
        d.buyer_name, d.recipient_name, d.recipient_phone, d.street_name,
        d.street_number, d.floor, d.apartment, d.city, d.province_code, d.postal_code,
        p.version AS preparation_version, p.parcels AS preparation_parcels,
        p.note AS preparation_note, p.updated_at AS preparation_updated_at,
        p.updated_by AS preparation_updated_by,
        CASE WHEN s.order_id IS NULL THEN NULL ELSE json_build_object(
          'state',s.state,'lastError',s.last_error,'remoteId',s.provider_id,
          'trackingNumber',s.remote_summary->>'trackingNumber','trackingUrl',s.remote_summary->>'trackingUrl',
          'sandbox',s.request_snapshot->'quote'->>'accountMode'='sandbox') END AS shipment,
        to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at,
        COALESCE((
          SELECT json_agg(json_build_object(
            'productId', oi.product_id,
            'name', oi.name_snapshot,
            'quantity', oi.quantity,
            'unitPriceCents', oi.unit_price_cents::text
          ) ORDER BY oi.name_snapshot)
          FROM order_item oi WHERE oi.order_id = o.id
        ), '[]'::json) AS items
      FROM orders o
      LEFT JOIN order_delivery d ON d.order_id = o.id
      LEFT JOIN order_preparation p ON p.order_id = o.id
      LEFT JOIN order_shipment s ON s.order_id = o.id
      LEFT JOIN custom_frame_order f ON f.order_id = o.id
      WHERE ${searchCondition} AND ${cursorCondition}
      ORDER BY ${ordering}
      LIMIT ${query.limit + 1}
    `;

    const page = rows.slice(0, query.limit);
    return {
      orders: page.map(mapOrder),
      nextCursor: rows.length > query.limit && page.length
        ? makeOrderCursor(page[page.length - 1].cursor_created_at, page[page.length - 1].id)
        : null,
    };
  }

  async get(id: string): Promise<AdminOrder | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const [row] = await this.sql<OrderRow[]>`
      SELECT
        CASE WHEN f.order_id IS NULL THEN NULL ELSE json_build_object('state',f.production_state,'version',f.version,'design',f.snapshot->'design','productionDays',f.snapshot->'productionDays','galleryConsent',f.snapshot->'acceptance'->'gallery','galleryDraftCreated',f.gallery_draft_created) END AS frame,
        o.id, o.environment, o.status, o.currency, o.subtotal_cents, o.shipping_cents, o.shipping_quote_snapshot,
        o.total_cents, o.buyer_email, o.created_at, o.updated_at,
        d.buyer_name, d.recipient_name, d.recipient_phone, d.street_name,
        d.street_number, d.floor, d.apartment, d.city, d.province_code, d.postal_code,
        p.version AS preparation_version, p.parcels AS preparation_parcels,
        p.note AS preparation_note, p.updated_at AS preparation_updated_at,
        p.updated_by AS preparation_updated_by,
        CASE WHEN s.order_id IS NULL THEN NULL ELSE json_build_object(
          'state',s.state,'lastError',s.last_error,'remoteId',s.provider_id,
          'trackingNumber',s.remote_summary->>'trackingNumber','trackingUrl',s.remote_summary->>'trackingUrl',
          'sandbox',s.request_snapshot->'quote'->>'accountMode'='sandbox') END AS shipment,
        to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_created_at,
        COALESCE((
          SELECT json_agg(json_build_object(
            'productId', oi.product_id,
            'name', oi.name_snapshot,
            'quantity', oi.quantity,
            'unitPriceCents', oi.unit_price_cents::text
          ) ORDER BY oi.name_snapshot)
          FROM order_item oi WHERE oi.order_id = o.id
        ), '[]'::json) AS items
      FROM orders o
      LEFT JOIN order_delivery d ON d.order_id = o.id
      LEFT JOIN order_preparation p ON p.order_id = o.id
      LEFT JOIN order_shipment s ON s.order_id = o.id
      LEFT JOIN custom_frame_order f ON f.order_id = o.id
      WHERE o.id = ${id}
    `;
    return row ? mapOrder(row) : null;
  }
}

function safeCents(value: string): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("INVALID_ORDER_AMOUNT");
  return amount;
}

function mapOrder(row: OrderRow): AdminOrder {
  const address = row.street_name && row.street_number
    ? [
      `${row.street_name} ${row.street_number}`,
      row.floor ? `piso ${row.floor}` : null,
      row.apartment ? `depto. ${row.apartment}` : null,
    ].filter(Boolean).join(", ")
    : null;
  return {
    id: row.id,
    frame: row.frame,
    environment: row.environment,
    reference: `ID ${row.id.slice(0, 8).toUpperCase()}`,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    ...(row.preparation_version !== null && (row.status === "paid" || row.status === "fulfillment_pending")
      ? { status: "ready_to_ship" as const, statusLabel: "Listo para crear envío", nextAction: "Confirmar el embalaje para generar la etiqueta." }
      : describeOrderStatus(row.status)),
    ...(["paid","fulfillment_pending"].includes(row.status) && row.shipment
      ? row.shipment.state === "label_ready"
        ? {status:"label_ready" as const,statusLabel:"Rótulo listo",nextAction:"Descargar la etiqueta. El paquete todavía no fue despachado."}
        : ["review","uncertain"].includes(row.shipment.state)
          ? {status:"attention" as const,statusLabel:"Necesita revisión",nextAction:row.shipment.state === "review"
            ? "Pedí ayuda técnica para comprobar el envío en Zipnova antes de continuar. Compartí el ID del pedido; no generes otro envío."
            : "Usá «Consultar envío y etiqueta» para comprobar si Zipnova recibió el envío. La consulta no crea otro envío."}
          : {status:"ready_to_ship" as const,statusLabel:"Etiqueta en preparación",nextAction:"Consultar la etiqueta sin crear otro envío."}
      : {}),
    ...(row.status === "paid" && row.frame && row.frame.state !== "ready" ? {status:"prepare" as const,statusLabel:row.frame.state === "making" ? "En fabricación" : "Cuadro por fabricar",nextAction:row.frame.state === "making" ? "Terminá el cuadro antes de confirmar el embalaje." : "Abrí la guía del diseño comprado e iniciá la fabricación."} : {}),
    ...(row.frame?.state==='awaiting_payment' && ['created','payment_pending'].includes(row.status) && Date.now()-row.created_at.getTime()>3_600_000 ? {status:'attention' as const,statusLabel:'Necesita revisión',nextAction:'El pago sigue pendiente hace más de una hora. Consultalo en Mercado Pago antes de liberar el cupo o fabricar.'} : {}),
    ...(row.frame && row.status==='review_required' ? {nextAction:'Consultá el pago en Mercado Pago y revisá el cupo del taller antes de fabricar. No repitas el cobro.'} : {}),
    buyer: { name: row.buyer_name, email: row.buyer_email, phone: row.recipient_phone },
    recipientName: row.recipient_name,
    destination: row.city && row.province_code
      ? { locality: row.city, province: provinceName(row.province_code) ?? row.province_code, postalCode: row.postal_code ?? undefined }
      : null,
    shippingAddress: address,
    packingPlan: row.shipping_quote_snapshot?.parcels,
    deliveryMethod: row.shipping_quote_snapshot
      ? `${row.shipping_quote_snapshot.carrierName} · ${row.shipping_quote_snapshot.serviceName} · ${row.shipping_quote_snapshot.parcels.length} ${row.shipping_quote_snapshot.parcels.length === 1 ? "bulto" : "bultos"}`
      : row.buyer_name ? "A domicilio" : null,
    preparation: row.preparation_version !== null && row.preparation_updated_at && row.preparation_updated_by
      ? {
        version: row.preparation_version,
        parcels: row.preparation_parcels as NonNullable<AdminOrder["preparation"]>["parcels"],
        note: row.preparation_note,
        updatedAt: row.preparation_updated_at.toISOString(),
        updatedBy: row.preparation_updated_by,
      }
      : null,
    shipment: row.shipment,
    trackingNumber: row.shipment?.trackingNumber ?? null,
    currency: row.currency,
    subtotalCents: safeCents(row.subtotal_cents),
    shippingCents: safeCents(row.shipping_cents),
    totalCents: safeCents(row.total_cents),
    items: row.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: safeCents(item.unitPriceCents),
    })),
    source: "database",
  };
}
