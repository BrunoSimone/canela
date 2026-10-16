import type { Sql } from "postgres";
import { ShippingRateLimitedError, type ShipmentRateGateway } from "../../domain/courier-quote";

export async function consumeShippingQuoteBudget(sql: Sql): Promise<void> {
  const [row] = await sql<{ request_count: number }[]>`
    INSERT INTO shipping_quote_rate_limit (bucket, window_start, request_count)
    VALUES ('zipnova', date_trunc('minute', now()), 1)
    ON CONFLICT (bucket) DO UPDATE SET
      window_start = date_trunc('minute', now()),
      request_count = CASE WHEN shipping_quote_rate_limit.window_start < date_trunc('minute', now())
        THEN 1 ELSE shipping_quote_rate_limit.request_count + 1 END
    RETURNING request_count
  `;
  if (!row || row.request_count > 60) throw new ShippingRateLimitedError();
}
export function withQuoteBudget(gateway: ShipmentRateGateway, consume: () => Promise<void>): ShipmentRateGateway {
  return { async quoteShipment(input) { await consume(); return gateway.quoteShipment(input); } };
}
