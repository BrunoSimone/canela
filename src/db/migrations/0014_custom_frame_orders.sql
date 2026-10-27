CREATE TABLE custom_frame_quote (
  id uuid PRIMARY KEY,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE custom_frame_order (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL UNIQUE REFERENCES custom_frame_quote(id),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  reservation_state text NOT NULL DEFAULT 'active' CHECK (reservation_state IN ('active','consumed','released','completed')),
  expires_at timestamptz NOT NULL,
  production_state text NOT NULL DEFAULT 'awaiting_payment' CHECK (production_state IN ('awaiting_payment','queued','making','ready')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  gallery_id uuid NOT NULL UNIQUE,
  gallery_draft_created boolean NOT NULL DEFAULT false
);
CREATE INDEX custom_frame_capacity_idx ON custom_frame_order(reservation_state);
CREATE TABLE custom_frame_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES custom_frame_order(order_id),
  event text NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION protect_custom_frame_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.snapshot IS DISTINCT FROM OLD.snapshot OR NEW.quote_id <> OLD.quote_id OR NEW.gallery_id <> OLD.gallery_id THEN
    RAISE EXCEPTION 'Accepted frame specification is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER custom_frame_snapshot_guard BEFORE UPDATE ON custom_frame_order
  FOR EACH ROW EXECUTE FUNCTION protect_custom_frame_snapshot();
