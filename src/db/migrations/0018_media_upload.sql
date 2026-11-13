CREATE TABLE media_render (
 asset_id text NOT NULL REFERENCES media_asset(id),
 crop_hash text NOT NULL,
 manifest jsonb NOT NULL,
 PRIMARY KEY(asset_id,crop_hash)
);
CREATE TABLE media_upload (
 id uuid PRIMARY KEY,
 actor text NOT NULL,
 expected_hash text NOT NULL CHECK (expected_hash ~ '^[a-f0-9]{64}$'),
 expected_bytes integer NOT NULL CHECK(expected_bytes BETWEEN 1 AND 33554432),
 content_type text NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 asset_id text REFERENCES media_asset(id),
 cleaned_at timestamptz
);
CREATE INDEX media_upload_actor ON media_upload(actor,created_at DESC);
CREATE INDEX media_upload_cleanup ON media_upload(expires_at) WHERE cleaned_at IS NULL;
