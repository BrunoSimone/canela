ALTER TABLE inventory_item ADD COLUMN version integer NOT NULL DEFAULT 0;
CREATE TABLE inventory_change (
  id uuid PRIMARY KEY,
  product_id text NOT NULL REFERENCES inventory_item(product_id),
  actor_email text NOT NULL,
  reason text NOT NULL,
  request_snapshot jsonb NOT NULL,
  before_snapshot jsonb NOT NULL,
  after_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_change_product_time ON inventory_change(product_id, created_at DESC);
