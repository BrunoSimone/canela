ALTER TABLE payment_attempt
  ADD CONSTRAINT payment_attempt_provider_checkout_pair
  CHECK (
    (provider_order_id IS NULL AND checkout_url IS NULL)
    OR (provider_order_id IS NOT NULL AND checkout_url IS NOT NULL)
  );
