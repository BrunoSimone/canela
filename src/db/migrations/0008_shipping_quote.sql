ALTER TABLE orders ADD COLUMN shipping_quote_snapshot jsonb;
ALTER TABLE orders ADD CONSTRAINT shipping_quote_snapshot_shape CHECK (
  shipping_quote_snapshot IS NULL OR (
    jsonb_typeof(shipping_quote_snapshot) = 'object'
    AND shipping_quote_snapshot->>'provider' = 'zipnova'
    AND shipping_quote_snapshot->>'version' = '3'
  )
);

-- One shared budget for the Zipnova account, across server instances.
CREATE TABLE shipping_quote_rate_limit (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0)
);
