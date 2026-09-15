CREATE TYPE order_status AS ENUM (
  'created',
  'payment_pending',
  'paid',
  'rejected',
  'expired',
  'review_required',
  'fulfillment_pending',
  'shipped',
  'delivered',
  'refund_pending',
  'refunded'
);

CREATE TYPE reservation_status AS ENUM ('active', 'consumed', 'released');

CREATE TYPE payment_attempt_status AS ENUM (
  'preference_pending',
  'payment_pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
  'review_required'
);

CREATE TABLE inventory_item (
  product_id text PRIMARY KEY,
  stock_on_hand integer NOT NULL,
  reserved integer NOT NULL DEFAULT 0,
  is_sellable boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_stock_non_negative CHECK (stock_on_hand >= 0),
  CONSTRAINT inventory_reserved_non_negative CHECK (reserved >= 0),
  CONSTRAINT inventory_reserved_within_stock CHECK (reserved <= stock_on_hand)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  public_token_hash char(64) NOT NULL UNIQUE,
  checkout_idempotency_key varchar(128) NOT NULL UNIQUE,
  status order_status NOT NULL DEFAULT 'created',
  currency char(3) NOT NULL,
  subtotal_cents bigint NOT NULL,
  shipping_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL,
  buyer_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_currency_uppercase CHECK (currency = upper(currency)),
  CONSTRAINT orders_subtotal_non_negative CHECK (subtotal_cents >= 0),
  CONSTRAINT orders_shipping_non_negative CHECK (shipping_cents >= 0),
  CONSTRAINT orders_total_matches_parts CHECK (
    total_cents = subtotal_cents + shipping_cents
  )
);

CREATE TABLE order_item (
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id text NOT NULL,
  name_snapshot text NOT NULL,
  unit_price_cents bigint NOT NULL,
  quantity integer NOT NULL,
  PRIMARY KEY (order_id, product_id),
  CONSTRAINT order_item_price_non_negative CHECK (unit_price_cents >= 0),
  CONSTRAINT order_item_quantity_positive CHECK (quantity > 0)
);

CREATE TABLE stock_reservation (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id text NOT NULL REFERENCES inventory_item(product_id) ON DELETE RESTRICT,
  quantity integer NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id),
  CONSTRAINT reservation_quantity_positive CHECK (quantity > 0),
  CONSTRAINT reservation_terminal_timestamps CHECK (
    (status = 'active' AND released_at IS NULL AND consumed_at IS NULL)
    OR (status = 'released' AND released_at IS NOT NULL AND consumed_at IS NULL)
    OR (status = 'consumed' AND consumed_at IS NOT NULL AND released_at IS NULL)
  )
);

CREATE TABLE payment_attempt (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  status payment_attempt_status NOT NULL DEFAULT 'preference_pending',
  provider varchar(32) NOT NULL DEFAULT 'mercado_pago',
  preference_id text UNIQUE,
  payment_id text UNIQUE,
  provider_status text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_adjustment (
  id uuid PRIMARY KEY,
  product_id text NOT NULL REFERENCES inventory_item(product_id) ON DELETE RESTRICT,
  delta integer NOT NULL,
  reason text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_adjustment_delta_nonzero CHECK (delta <> 0)
);

CREATE TABLE processed_webhook (
  provider varchar(32) NOT NULL,
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX stock_reservation_active_expiry_idx
  ON stock_reservation (expires_at)
  WHERE status = 'active';

CREATE INDEX payment_attempt_pending_idx
  ON payment_attempt (updated_at)
  WHERE status IN ('preference_pending', 'payment_pending');

CREATE INDEX orders_status_updated_idx ON orders (status, updated_at);
