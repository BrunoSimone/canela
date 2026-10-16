import type { Sql, TransactionSql } from "postgres";
import { parseDeliverySnapshot } from "../../checkout/domain/delivery";
import { FulfillmentError, validateShipmentOrder, validatePreparedQuote, type FulfillmentContext, type RemoteShipment, type ShipmentOrder, type ShipmentRecord, type ShipmentRepository, type ShipmentRequest } from "../domain/fulfillment";

type Row = { order_id:string; external_id:string; state:ShipmentRecord["state"]; request_snapshot:ShipmentRequest; remote_summary:RemoteShipment|null; last_error:string|null; created_at:Date };
function map(row: Row): ShipmentRecord { return { orderId:row.order_id, externalId:row.external_id, state:row.state, request:row.request_snapshot, remote:row.remote_summary, lastError:row.last_error, createdAt:row.created_at.toISOString() }; }
type Query = Sql | TransactionSql;

async function loadOrder(sql: Query, id: string): Promise<ShipmentOrder | null> {
  const [row] = await sql`
    SELECT o.id,o.environment,o.status,o.currency,o.buyer_email,o.subtotal_cents,o.shipping_cents,o.shipping_quote_snapshot,
      row_to_json(d) AS delivery, row_to_json(p) AS preparation
    FROM orders o LEFT JOIN order_delivery d ON d.order_id=o.id
    LEFT JOIN order_preparation p ON p.order_id=o.id WHERE o.id=${id}
  `;
  if (!row) return null;
  const d=row.delivery, p=row.preparation;
  return { environment:row.environment, id:row.id,status:row.status,currency:row.currency,buyerEmail:row.buyer_email,
    subtotalCents:Number(row.subtotal_cents),shippingCents:Number(row.shipping_cents),quote:row.shipping_quote_snapshot,
    delivery:d ? parseDeliverySnapshot({type:"home",buyerName:d.buyer_name,recipientName:d.recipient_name,
      phone:d.recipient_phone,recipientDocument:d.recipient_document,streetName:d.street_name,streetNumber:d.street_number,
      floor:d.floor,apartment:d.apartment,city:d.city,provinceCode:d.province_code,postalCode:d.postal_code}) : null,
    preparation:p ? {version:p.version,parcels:p.parcels,note:p.note,updatedAt:p.updated_at,updatedBy:p.updated_by} : null };
}

export class PostgresShipmentRepository implements ShipmentRepository {
  constructor(private readonly sql: Sql) {}
  loadOrder(id:string) { return loadOrder(this.sql,id); }
  async get(id:string) { const [row]=await this.sql<Row[]>`SELECT * FROM order_shipment WHERE order_id=${id}`; return row ? map(row) : null; }
  async claim(request:ShipmentRequest,actor:string,context:FulfillmentContext) {
    return this.sql.begin(async tx => {
      await tx`SELECT id FROM orders WHERE id=${request.orderId} FOR UPDATE`;
      const [existing]=await tx<Row[]>`SELECT * FROM order_shipment WHERE order_id=${request.orderId}`;
      if (existing) return {record:map(existing),acquired:false};
      const order=await loadOrder(tx,request.orderId);
      if (!order) throw new FulfillmentError("ORDER_NOT_FOUND",404);
      validateShipmentOrder(order,request.preparationVersion,context,!!request.originalQuote);
      if(request.originalQuote) validatePreparedQuote(order,request.quote);
      if (JSON.stringify(order.quote)!==JSON.stringify(request.originalQuote??request.quote) || JSON.stringify(order.delivery)!==JSON.stringify(request.delivery) || order.buyerEmail!==request.buyerEmail) {
        throw new FulfillmentError("SHIPMENT_ORDER_MISMATCH");
      }
      const [row]=await tx<Row[]>`
        INSERT INTO order_shipment(order_id,external_id,preparation_version,request_snapshot,state,actor_email)
        VALUES (${request.orderId},${request.externalId},${request.preparationVersion},${tx.json(JSON.parse(JSON.stringify(request)))},'creating',${actor}) RETURNING *
      `;
      await tx`UPDATE orders SET status='fulfillment_pending',updated_at=now() WHERE id=${request.orderId}`;
      return {record:map(row),acquired:true};
    });
  }
  async saveRemote(id:string,remote:RemoteShipment) {
    const [row]=await this.sql<Row[]>`
      UPDATE order_shipment s SET provider_id=${remote.id},remote_summary=${this.sql.json(remote)},
        state=CASE WHEN (SELECT status FROM orders WHERE id=s.order_id) NOT IN ('paid','fulfillment_pending')
          OR (request_snapshot->'quote'->>'amountCents')::bigint <> ${remote.amountCents} THEN 'review'
          WHEN state='label_ready' THEN 'label_ready' ELSE 'created' END,
        last_error=NULL,updated_at=now()
      WHERE order_id=${id} AND (provider_id IS NULL OR provider_id=${remote.id}) RETURNING *
    `;
    if (!row) throw new FulfillmentError("SHIPMENT_REMOTE_CONFLICT");
    return map(row);
  }
  async mark(id:string,state:"uncertain"|"review",code:string) {
    await this.sql`UPDATE order_shipment SET state=${state},last_error=${code},updated_at=now()
      WHERE order_id=${id} AND provider_id IS NULL AND state IN ('creating','uncertain')`;
    return (await this.get(id))!;
  }
  async saveLabel(id:string,bytes:Uint8Array) {
    await this.sql`UPDATE order_shipment SET state='label_ready',label_pdf=${Buffer.from(bytes)},last_error=NULL,updated_at=now()
      WHERE order_id=${id} AND state IN ('created','label_ready')`;
    return (await this.get(id))!;
  }
  async readLabel(id:string) {
    const [row]=await this.sql<{label_pdf:Uint8Array|null}[]>`SELECT label_pdf FROM order_shipment WHERE order_id=${id} AND state='label_ready'`;
    return row?.label_pdf ?? null;
  }
}
