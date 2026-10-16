import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

import type { OrderPreparation, SavePreparationInput } from "../domain/preparation";

export class PreparationNotAllowedError extends Error {
  constructor() {
    super("The order cannot be prepared in its current payment state");
    this.name = "PreparationNotAllowedError";
  }
}

export class PreparationVersionConflictError extends Error {
  constructor() {
    super("The preparation was changed by another session");
    this.name = "PreparationVersionConflictError";
  }
}

export class PostgresOrderPreparationRepository {
  constructor(private readonly sql: Sql) {}

  async save(orderId: string, actorEmail: string, input: SavePreparationInput): Promise<OrderPreparation | null> {
    return this.sql.begin(async (tx) => {
      const [order] = await tx<{ status: string }[]>`
        SELECT status FROM orders WHERE id = ${orderId} FOR UPDATE
      `;
      if (!order) return null;
      if (order.status !== "paid" && order.status !== "fulfillment_pending") {
        throw new PreparationNotAllowedError();
      }
      const [shipment] = await tx`SELECT order_id FROM order_shipment WHERE order_id=${orderId}`;
      if (shipment) throw new PreparationNotAllowedError();
      const [existing] = await tx<{ version: number }[]>`
        SELECT version FROM order_preparation WHERE order_id = ${orderId}
      `;
      if ((existing?.version ?? 0) !== input.expectedVersion) {
        throw new PreparationVersionConflictError();
      }
      const version = input.expectedVersion + 1;
      const [saved] = await tx<{
        version: number;
        parcels: OrderPreparation["parcels"];
        note: string | null;
        updated_at: Date;
        updated_by: string;
      }[]>`
        INSERT INTO order_preparation (order_id, version, parcels, note, updated_by)
        VALUES (${orderId}, ${version}, ${tx.json(input.parcels)}, ${input.note}, ${actorEmail})
        ON CONFLICT (order_id) DO UPDATE SET
          version = EXCLUDED.version,
          parcels = EXCLUDED.parcels,
          note = EXCLUDED.note,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING version, parcels, note, updated_at, updated_by
      `;
      await tx`
        INSERT INTO order_preparation_event (id, order_id, version, parcels, note, actor_email)
        VALUES (${randomUUID()}, ${orderId}, ${version}, ${tx.json(input.parcels)}, ${input.note}, ${actorEmail})
      `;
      return {
        version: saved.version,
        parcels: saved.parcels,
        note: saved.note,
        updatedAt: saved.updated_at.toISOString(),
        updatedBy: saved.updated_by,
      };
    });
  }
}
