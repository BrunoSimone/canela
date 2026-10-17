-- Orders keep workflow snapshots; balances are authoritative only in Sanity.
ALTER TABLE stock_reservation DROP CONSTRAINT stock_reservation_product_id_fkey;
ALTER TABLE orders ADD COLUMN inventory_state text NOT NULL DEFAULT 'legacy'
  CHECK (inventory_state IN ('legacy','pending','ready','cancelled'));
ALTER TABLE orders ADD COLUMN inventory_expires_at timestamptz;
CREATE INDEX orders_inventory_pending ON orders(created_at) WHERE inventory_state='pending';
COMMENT ON TABLE inventory_item IS 'Retired stock snapshot before spec 100; no runtime reads/writes. Retained for migration audit/rollback.';
COMMENT ON TABLE inventory_change IS 'Historical manual adjustments before stock moved to Sanity.';
COMMENT ON TABLE inventory_adjustment IS 'Historical inventory movements before stock moved to Sanity.';
