import type { CourierQuoteSnapshot } from "../modules/shipping/domain/courier-quote";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import type { InventoryStore } from "@/modules/inventory/domain/inventory-store";
import { InventoryShortage, ReservationClosed } from "@/modules/inventory/domain/inventory-store";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";

import { checkoutExpiresAt } from "../modules/checkout/domain/checkout-expiration";
import { InvalidDeliveryError, parseDeliverySnapshot, type DeliverySnapshot } from "../modules/checkout/domain/delivery";

export type AuthoritativeOrderItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type CreateReservedOrderInput = {
  environment?: "test" | "production";
  orderId: string;
  publicTokenHash: string;
  idempotencyKey: string;
  currency: "ARS";
  shippingCents: number;
  shippingSnapshot?: CourierQuoteSnapshot;
  buyerEmail: string;
  delivery: DeliverySnapshot;
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

export class ChangedCheckoutAttemptError extends Error {
  constructor() {
    super("The same checkout key was reused with different order details");
    this.name = "ChangedCheckoutAttemptError";
  }
}

type ValidatedOrder = {
  subtotalCents: number;
  totalCents: number;
  expiresAt: Date;
  sortedItems: AuthoritativeOrderItem[];
  delivery: DeliverySnapshot;
  payloadHash: string;
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
  const expiresAt = checkoutExpiresAt(now);
  let delivery: DeliverySnapshot;
  try {
    delivery = parseDeliverySnapshot(input.delivery);
  } catch (error) {
    if (error instanceof InvalidDeliveryError) {
      throw new InvalidOrderInputError("Delivery details are invalid");
    }
    throw error;
  }
  if (!input.buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.buyerEmail)) {
    throw new InvalidOrderInputError("Buyer email is invalid");
  }
  const sortedItems = [...input.items].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({
      buyerEmail: input.buyerEmail,
      delivery,
      currency: input.currency,
      shippingCents: input.shippingCents,
      items: sortedItems,
      ...(input.environment === "production" ? { environment: input.environment } : {}),
      ...(input.shippingSnapshot ? { shippingSnapshot: input.shippingSnapshot } : {}),
    }))
    .digest("hex");

  return {
    subtotalCents,
    totalCents,
    expiresAt,
    sortedItems,
    delivery,
    payloadHash,
  };
}

export async function createReservedOrder(
  sql: Sql,
  input: CreateReservedOrderInput,
  inventory: InventoryStore = inventoryStore(),
): Promise<ReservedOrder> {
  const validated = validateReservedOrderInput(input);

  const staged = await sql.begin(async (transaction) => {
    // Serializes retries of the same browser attempt without blocking other carts.
    await transaction`
      SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))
    `;

    const [existing] = await transaction<{
      id: string;
      expires_at: Date;
      reservations_are_active: boolean;
      checkout_payload_hash: string | null;
    }[]>`
      SELECT
        orders.id,
        orders.checkout_payload_hash,
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
      if (existing.checkout_payload_hash !== validated.payloadHash) {
        throw new ChangedCheckoutAttemptError();
      }
      return {
        orderId: existing.id,
        expiresAt: existing.expires_at,
        reused: true,
      };
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
        buyer_email,
        checkout_payload_hash,
        shipping_quote_snapshot,
        environment, inventory_state, inventory_expires_at
      ) VALUES (
        ${input.orderId},
        ${input.publicTokenHash.toLowerCase()},
        ${input.idempotencyKey},
        ${input.currency},
        ${validated.subtotalCents},
        ${input.shippingCents},
        ${validated.totalCents},
        ${input.buyerEmail},
        ${validated.payloadHash},
        ${input.shippingSnapshot ? transaction.json(JSON.parse(JSON.stringify(input.shippingSnapshot))) : null},
        ${input.environment ?? "test"}, 'pending', ${validated.expiresAt}
      )
    `;

    await transaction`
      INSERT INTO order_delivery (
        order_id, delivery_type, buyer_name, recipient_name, recipient_phone,
        street_name, street_number, floor, apartment, city, province_code, postal_code, recipient_document
      ) VALUES (
        ${input.orderId}, ${validated.delivery.type}, ${validated.delivery.buyerName},
        ${validated.delivery.recipientName}, ${validated.delivery.phone},
        ${validated.delivery.streetName}, ${validated.delivery.streetNumber},
        ${validated.delivery.floor}, ${validated.delivery.apartment},
        ${validated.delivery.city}, ${validated.delivery.provinceCode},
        ${validated.delivery.postalCode}, ${validated.delivery.recipientDocument ?? null}
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
  // The durable intent survives remote timeouts and SQL rollback after reservation.
  try {
    await sql.begin(async tx => {
      const [order] = await tx`SELECT inventory_state FROM orders WHERE id=${staged.orderId} FOR UPDATE`;
      if (order.inventory_state === "ready") return;
      if (order.inventory_state !== "pending") throw new ClosedCheckoutAttemptError();
      if (staged.expiresAt.getTime() <= Date.now()) throw new ClosedCheckoutAttemptError();
      await inventory.reserve(staged.orderId, validated.payloadHash, validated.sortedItems);
      await tx`UPDATE orders SET inventory_state='ready', updated_at=now() WHERE id=${staged.orderId}`;
    });
  } catch (error) {
    if (error instanceof InventoryShortage) throw new InventoryUnavailableError(error.productIds);
    if (error instanceof ReservationClosed) throw new ClosedCheckoutAttemptError();
    throw error;
  }
  return staged;
}
