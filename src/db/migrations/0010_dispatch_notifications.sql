ALTER TABLE orders ADD COLUMN environment varchar(10) NOT NULL DEFAULT 'test'
  CHECK (environment IN ('test','production'));

CREATE TABLE order_dispatch (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE RESTRICT,
  provider_id bigint NOT NULL,
  tracking_url text NOT NULL,
  tracking_number text,
  actor_email text NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_notification (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  kind varchar(24) NOT NULL CHECK (kind IN ('owner_paid','buyer_shipped')),
  environment varchar(10) NOT NULL CHECK (environment IN ('test','production')),
  state varchar(12) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','review')),
  payload jsonb,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
  first_attempt_at timestamptz,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_id text,
  last_error varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id,kind)
);
CREATE INDEX order_notification_pending ON order_notification(environment,available_at,created_at)
  WHERE state IN ('pending','sending');
