import { createHash, createHmac } from "node:crypto";

export function createOrderToken(
  secret: string,
  idempotencyKey: string,
): string {
  if (secret.length < 32) {
    throw new Error("Order token secret must contain at least 32 characters");
  }
  if (!idempotencyKey) {
    throw new Error("Checkout idempotency key is required");
  }

  return createHmac("sha256", secret)
    .update(`canela-order-token:${idempotencyKey}`)
    .digest("base64url");
}

export function hashOrderToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
