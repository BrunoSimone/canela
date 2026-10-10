CREATE TABLE order_preparation (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  parcels jsonb NOT NULL CHECK (jsonb_typeof(parcels) = 'array'),
  note text,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_preparation_event (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  parcels jsonb NOT NULL,
  note text,
  actor_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, version)
);

CREATE INDEX order_preparation_event_order_idx
  ON order_preparation_event (order_id, created_at DESC);
