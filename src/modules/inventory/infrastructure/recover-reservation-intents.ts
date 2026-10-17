import type { Sql } from "postgres";
import type { InventoryStore } from "../domain/inventory-store";

/** Only pre-payment intents are eligible. Ready/uncertain MP attempts never expire here. */
export async function recoverReservationIntents(sql: Sql, inventory: InventoryStore, limit = 3) {
  let recovered = 0;
  for (let i = 0; i < limit; i++) {
    const done = await sql.begin(async tx => {
      const [order] = await tx`SELECT orders.id FROM orders
        JOIN payment_attempt p ON p.order_id=orders.id
        WHERE inventory_state='pending' AND inventory_expires_at < now()
          AND p.provider_order_id IS NULL AND p.status IN ('preference_pending','payment_pending')
        ORDER BY orders.created_at LIMIT 1 FOR UPDATE OF orders, p SKIP LOCKED`;
      if (!order) return false;
      if (!await inventory.settle(order.id, "released")) throw Error("INVENTORY_RECOVERY_CONFLICT");
      await tx`UPDATE stock_reservation SET status='released',released_at=now() WHERE order_id=${order.id} AND status='active'`;
      await tx`UPDATE orders SET inventory_state='cancelled',status='expired',updated_at=now() WHERE id=${order.id}`;
      await tx`UPDATE payment_attempt SET status='expired',updated_at=now() WHERE order_id=${order.id}`;
      return true;
    });
    if (!done) break;
    recovered++;
  }
  return recovered;
}
