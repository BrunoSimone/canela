ALTER TABLE orders
  ADD COLUMN checkout_payload_hash char(64)
  CONSTRAINT orders_checkout_payload_hash_format
  CHECK (checkout_payload_hash IS NULL OR checkout_payload_hash ~ '^[0-9a-f]{64}$');

CREATE TABLE order_delivery (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  delivery_type varchar(8) NOT NULL DEFAULT 'home' CHECK (delivery_type = 'home'),
  buyer_name text NOT NULL CHECK (length(buyer_name) BETWEEN 2 AND 100),
  recipient_name text NOT NULL CHECK (length(recipient_name) BETWEEN 2 AND 100),
  recipient_phone text,
  street_name text NOT NULL,
  street_number text NOT NULL,
  floor text,
  apartment text,
  city text NOT NULL,
  province_code char(1) NOT NULL,
  postal_code char(4) NOT NULL CHECK (postal_code ~ '^[1-9][0-9]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
