import type { Sql } from "postgres";

import { getDatabase } from "@/db/client";

type AvailableProductRow = {
  product_id: string;
};

export class PostgresProductAvailabilityRepository {
  constructor(private readonly database: Sql = getDatabase()) {}

  async listAvailableProductIds(): Promise<Set<string>> {
    const rows = await this.database<AvailableProductRow[]>`
      SELECT product_id
      FROM inventory_item
      WHERE is_sellable = true
        AND stock_on_hand - reserved > 0
      ORDER BY product_id
    `;

    return new Set(rows.map((row) => row.product_id));
  }
}
