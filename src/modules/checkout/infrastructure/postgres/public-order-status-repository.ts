import type { Sql } from "postgres";

import type {
  InternalOrderStatus,
  PublicOrderStatusRepository,
  StoredPublicOrderStatus,
} from "../../application/get-public-order-status";

type PublicOrderStatusRow = {
  status: InternalOrderStatus;
  expires_at: Date;
};

export class PostgresPublicOrderStatusRepository
  implements PublicOrderStatusRepository
{
  constructor(private readonly sql: Sql) {}

  async findByTokenHash(
    tokenHash: string,
  ): Promise<StoredPublicOrderStatus | null> {
    const [row] = await this.sql<PublicOrderStatusRow[]>`
      SELECT orders.status, min(stock_reservation.expires_at) AS expires_at
      FROM orders
      JOIN stock_reservation ON stock_reservation.order_id = orders.id
      WHERE orders.public_token_hash = ${tokenHash}
      GROUP BY orders.id
    `;

    return row ? { status: row.status, expiresAt: row.expires_at } : null;
  }
}
