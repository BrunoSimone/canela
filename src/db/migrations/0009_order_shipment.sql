ALTER TABLE order_delivery ADD COLUMN recipient_document varchar(20);

CREATE TABLE order_shipment (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  external_id varchar(30) NOT NULL UNIQUE,
  preparation_version integer NOT NULL CHECK (preparation_version > 0),
  request_snapshot jsonb NOT NULL CHECK (jsonb_typeof(request_snapshot) = 'object'),
  state varchar(16) NOT NULL CHECK (state IN ('creating', 'uncertain', 'created', 'label_ready', 'review')),
  provider_id bigint UNIQUE,
  remote_summary jsonb,
  label_pdf bytea CHECK (label_pdf IS NULL OR octet_length(label_pdf) BETWEEN 5 AND 5242880),
  last_error varchar(80),
  actor_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Preparation must remain the one explicitly confirmed for the external request.
CREATE FUNCTION prevent_shipped_preparation_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM order_shipment WHERE order_id = NEW.order_id) THEN
    RAISE EXCEPTION 'Preparation already confirmed for shipment' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preparation_shipment_guard BEFORE INSERT OR UPDATE ON order_preparation
  FOR EACH ROW EXECUTE FUNCTION prevent_shipped_preparation_change();
