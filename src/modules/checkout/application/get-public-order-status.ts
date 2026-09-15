export type InternalOrderStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "rejected"
  | "expired"
  | "review_required"
  | "fulfillment_pending"
  | "shipped"
  | "delivered"
  | "refund_pending"
  | "refunded";

export type PublicOrderStatus =
  | "verifying"
  | "paid"
  | "not_completed"
  | "review_required";

export type StoredPublicOrderStatus = {
  status: InternalOrderStatus;
  expiresAt: Date;
};

export interface PublicOrderStatusRepository {
  findByTokenHash(tokenHash: string): Promise<StoredPublicOrderStatus | null>;
}

export async function getPublicOrderStatus(
  repository: PublicOrderStatusRepository,
  tokenHash: string,
): Promise<{
  status: PublicOrderStatus;
  canRetry: boolean;
  expiresAt: Date;
} | null> {
  const stored = await repository.findByTokenHash(tokenHash);
  if (!stored) {
    return null;
  }

  return { ...presentOrderStatus(stored.status), expiresAt: stored.expiresAt };
}

export function presentOrderStatus(status: InternalOrderStatus): {
  status: PublicOrderStatus;
  canRetry: boolean;
} {
  switch (status) {
    case "created":
    case "payment_pending":
      return { status: "verifying", canRetry: false };
    case "paid":
    case "fulfillment_pending":
    case "shipped":
    case "delivered":
      return { status: "paid", canRetry: false };
    case "rejected":
    case "expired":
      return { status: "not_completed", canRetry: true };
    case "review_required":
    case "refund_pending":
    case "refunded":
      return { status: "review_required", canRetry: false };
  }
}
