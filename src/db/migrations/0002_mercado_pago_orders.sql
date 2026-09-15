ALTER TABLE payment_attempt
  ADD COLUMN provider_idempotency_key varchar(128),
  ADD COLUMN provider_order_id text,
  ADD COLUMN checkout_url text,
  ADD COLUMN provider_status_detail text;

UPDATE payment_attempt
SET status = 'payment_pending'
WHERE status = 'preference_pending'
  AND preference_id IS NULL;

ALTER TABLE payment_attempt
  ALTER COLUMN status SET DEFAULT 'payment_pending',
  ADD CONSTRAINT payment_attempt_idempotency_key_not_empty
    CHECK (
      provider_idempotency_key IS NULL
      OR length(provider_idempotency_key) > 0
    ),
  ADD CONSTRAINT payment_attempt_provider_order_id_not_empty
    CHECK (
      provider_order_id IS NULL
      OR length(provider_order_id) > 0
    );

CREATE UNIQUE INDEX payment_attempt_provider_idempotency_idx
  ON payment_attempt (provider, provider_idempotency_key)
  WHERE provider_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX payment_attempt_provider_order_idx
  ON payment_attempt (provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;
