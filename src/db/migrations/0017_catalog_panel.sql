CREATE TABLE catalog_entry (
 id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 128),
 kind text NOT NULL CHECK (kind IN ('product','slide','box','frame')),
 draft jsonb NOT NULL,
 published jsonb,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 archived boolean NOT NULL DEFAULT false,
 sort_key text NOT NULL DEFAULT '',
 source_revision text,
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (octet_length(draft::text) <= 250000),
 CHECK (published IS NULL OR octet_length(published::text) <= 250000)
);
CREATE INDEX catalog_public_order ON catalog_entry(kind,sort_key,id) WHERE published IS NOT NULL AND NOT archived;
CREATE INDEX catalog_admin_order ON catalog_entry(kind,updated_at DESC,id);
CREATE TABLE catalog_event (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 entry_id text NOT NULL REFERENCES catalog_entry(id),
 version integer NOT NULL,
 action text NOT NULL,
 actor text NOT NULL,
 at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_event_entry ON catalog_event(entry_id,id DESC);
CREATE TABLE media_asset (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 manifest jsonb NOT NULL,
 created_by text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog_asset_reference (
 entry_id text NOT NULL REFERENCES catalog_entry(id),
 asset_id text NOT NULL REFERENCES media_asset(id),
 PRIMARY KEY(entry_id,asset_id)
);
CREATE TABLE catalog_stock (
 product_id text PRIMARY KEY REFERENCES catalog_entry(id),
 stock_on_hand integer NOT NULL DEFAULT 0 CHECK (stock_on_hand BETWEEN 0 AND 1000000),
 reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= stock_on_hand),
 enabled boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 0 CHECK (version >= 0)
);
CREATE TABLE catalog_reservation (
 order_id uuid PRIMARY KEY REFERENCES orders(id),
 fingerprint text NOT NULL,
 items jsonb NOT NULL,
 state text NOT NULL CHECK (state IN ('active','consumed','released')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalog_stock_change (
 id uuid PRIMARY KEY,
 product_id text NOT NULL REFERENCES catalog_stock(product_id),
 fingerprint text NOT NULL,
 before_stock jsonb NOT NULL,
 after_stock jsonb NOT NULL,
 reason text NOT NULL,
 actor text NOT NULL,
 at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_stock_history ON catalog_stock_change(product_id,at DESC);
CREATE TABLE catalog_import (
 digest text PRIMARY KEY,
 report jsonb NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE catalog_stock IS 'Authoritative only after CAT-154 verified cutover; never seeded from retired inventory_item.';
