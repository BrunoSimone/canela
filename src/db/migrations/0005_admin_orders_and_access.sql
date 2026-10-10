CREATE INDEX orders_created_id_idx ON orders (created_at DESC, id DESC);

CREATE TABLE admin_login_rate_limit (
  email_hash char(64) PRIMARY KEY,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL
);

CREATE TABLE admin_login_link (
  token_hash char(64) PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_login_link_expiry_idx ON admin_login_link (expires_at);

CREATE TABLE admin_session (
  token_hash char(64) PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_session_expiry_idx ON admin_session (expires_at);

CREATE TABLE admin_auth_event (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
