import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

export const CHECKOUT_LOCK_MINUTES = 10;

export type AuthoritativeOrderItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type CreateReservedOrderInput = {
  orderId: string;
  publicTokenHash: string;
  idempotencyKey: string;
  currency: "ARS";
  shippingCents: number;
  buyerEmail?: string;
  items: AuthoritativeOrderItem[];
  now?: Date;
};

export type ReservedOrder = {
  orderId: string;
  expiresAt: Date;
  reused: boolean;
};

export class InvalidOrderInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderInputError";
  }
}

export class InventoryUnavailableError extends Error {
  constructor(readonly productIds: string[]) {
    super(`Inventory unavailable for: ${productIds.join(", ")}`);
    this.name = "InventoryUnavailableError";
  }
}

export class ClosedCheckoutAttemptError extends Error {
  constructor() {
    super("Checkout attempt is no longer active");
    this.name = "ClosedCheckoutAttemptError";
  }
}

type ValidatedOrder = {
  subtotalCents: number;
  totalCents: number;
  expiresAt: Date;
  sortedItems: AuthoritativeOrderItem[];
};

export function validateReservedOrderInput(
  input: CreateReservedOrderInput,
): ValidatedOrder {
  if (!input.items.length) {
    throw new InvalidOrderInputError("An order needs at least one item");
  }

  if (!/^[a-f0-9]{64}$/i.test(input.publicTokenHash)) {
    throw new InvalidOrderInputError("publicTokenHash must be a SHA-256 hex hash");
  }

  if (
    !input.idempotencyKey.length ||
    input.idempotencyKey.length > 128
  ) {
    throw new InvalidOrderInputError(
      "idempotencyKey must contain between 1 and 128 characters",
    );
  }

  if (
    !Number.isSafeInteger(input.shippingCents) ||
    input.shippingCents < 0
  ) {
    throw new InvalidOrderInputError(
      "shippingCents must be a non-negative safe integer",
    );
  }

  const seenProductIds = new Set<string>();
  let subtotalCents = 0;

  for (const item of input.items) {
    if (!item.productId.trim() || !item.name.trim()) {
      throw new InvalidOrderInputError("Product id and name are required");
    }
    if (seenProductIds.has(item.productId)) {
      throw new InvalidOrderInputError(
        `Duplicate product ${item.productId} must be aggregated by the caller`,
      );
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new InvalidOrderInputError("Item quantity must be a positive integer");
    }
    if (
      !Number.isSafeInteger(item.unitPriceCents) ||
      item.unitPriceCents < 0
    ) {
      throw new InvalidOrderInputError(
        "Item price must be a non-negative safe integer",
      );
    }

    seenProductIds.add(item.productId);
    subtotalCents += item.unitPriceCents * item.quantity;
  }

  if (!Number.isSafeInteger(subtotalCents)) {
    throw new InvalidOrderInputError("Order subtotal exceeds safe integer range");
  }

  const totalCents = subtotalCents + input.shippingCents;
  if (!Number.isSafeInteger(totalCents)) {
    throw new InvalidOrderInputError("Order total exceeds safe integer range");
  }

  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + CHECKOUT_LOCK_MINUTES * 60 * 1000,
  );

  return {
    subtotalCents,
    totalCents,
    expiresAt,
    sortedItems: [...input.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    ),
  };
}

export async function createReservedOrder(
  sql: Sql,
  input: CreateReservedOrderInput,
): Promise<ReservedOrder> {
  const validated = validateReservedOrderInput(input);

  return sql.begin(async (transaction) => {
    // Serializes retries of the same browser attempt without blocking other carts.
    await transaction`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))
    `;

    const [existing] = await transaction<{
      id: string;
      expires_at: Date;
      reservations_are_active: boolean;
    }[]>`
      SELECT
        orders.id,
        min(stock_reservation.expires_at) AS expires_at,
        bool_and(stock_reservation.status = 'active') AS reservations_are_active
      FROM orders
      JOIN stock_reservation ON stock_reservation.order_id = orders.id
      WHERE orders.checkout_idempotency_key = ${input.idempotencyKey}
      GROUP BY orders.id
    `;

    if (existing) {
      if (!existing.reservations_are_active) {
        throw new ClosedCheckoutAttemptError();
      }
      return {
        orderId: existing.id,
        expiresAt: existing.expires_at,
        reused: true,
      };
    }

    const productIds = validated.sortedItems.map((item) => item.productId);
    const inventoryRows = await transaction<{
      product_id: string;
      stock_on_hand: number;
      reserved: number;
      is_sellable: boolean;
    }[]>`
      SELECT product_id, stock_on_hand, reserved, is_sellable
      FROM inventory_item
      WHERE product_id IN ${transaction(productIds)}
      ORDER BY product_id
      FOR UPDATE
    `;

    const inventoryByProduct = new Map(
      inventoryRows.map((row) => [row.product_id, row]),
    );
    const unavailableProductIds = validated.sortedItems
      .filter((item) => {
        const inventory = inventoryByProduct.get(item.productId);
        return (
          !inventory ||
          !inventory.is_sellable ||
          inventory.stock_on_hand - inventory.reserved < item.quantity
        );
      })
      .map((item) => item.productId);

    if (unavailableProductIds.length) {
      throw new InventoryUnavailableError(unavailableProductIds);
    }

    await transaction`
      INSERT INTO orders (
        id,
        public_token_hash,
        checkout_idempotency_key,
        currency,
        subtotal_cents,
        shipping_cents,
        total_cents,
        buyer_email
      ) VALUES (
        ${input.orderId},
        ${input.publicTokenHash.toLowerCase()},
        ${input.idempotencyKey},
        ${input.currency},
        ${validated.subtotalCents},
        ${input.shippingCents},
        ${validated.totalCents},
        ${input.buyerEmail ?? null}
      )
    `;

    await transaction`
      INSERT INTO payment_attempt (
        id,
        order_id,
        provider_idempotency_key
      ) VALUES (
        ${randomUUID()},
        ${input.orderId},
        ${input.idempotencyKey}
      )
    `;

    await transaction`
      INSERT INTO order_item ${transaction(
        validated.sortedItems.map((item) => ({
          order_id: input.orderId,
          product_id: item.productId,
          name_snapshot: item.name,
          unit_price_cents: item.unitPriceCents,
          quantity: item.quantity,
        })),
      )}
    `;

    for (const item of validated.sortedItems) {
      await transaction`
        UPDATE inventory_item
        SET reserved = reserved + ${item.quantity}, updated_at = now()
        WHERE product_id = ${item.productId}
      `;

      await transaction`
        INSERT INTO stock_reservation (
          id,
          order_id,
          product_id,
          quantity,
          expires_at
        ) VALUES (
          ${randomUUID()},
          ${input.orderId},
          ${item.productId},
          ${item.quantity},
          ${validated.expiresAt}
        )
      `;
    }

    return {
      orderId: input.orderId,
      expiresAt: validated.expiresAt,
      reused: false,
    };
  });
}
