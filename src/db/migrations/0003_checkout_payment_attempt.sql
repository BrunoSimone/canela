CREATE UNIQUE INDEX payment_attempt_order_idx
  ON payment_attempt (order_id);
