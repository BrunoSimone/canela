-- Existing PER-146 frame quotes could only be sandbox quotes.
ALTER TABLE custom_frame_quote ADD COLUMN environment text NOT NULL DEFAULT 'test'
  CHECK (environment IN ('test','production'));
UPDATE custom_frame_quote SET payload=jsonb_set(payload,'{environment}','"test"'::jsonb);
ALTER TABLE custom_frame_quote ALTER COLUMN environment DROP DEFAULT;
ALTER TABLE custom_frame_quote ADD CONSTRAINT frame_quote_environment_matches CHECK (
  payload->>'environment' IS NOT NULL AND payload->>'environment'=environment AND
  payload#>>'{shipping,accountMode}' IS NOT NULL AND
  payload#>>'{shipping,accountMode}'=CASE environment WHEN 'test' THEN 'sandbox' ELSE 'operational' END
);
CREATE FUNCTION check_frame_order_environment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM orders o JOIN custom_frame_quote q ON q.id=NEW.quote_id
    WHERE o.id=NEW.order_id AND o.environment=q.environment) THEN
    RAISE EXCEPTION 'FRAME_ENVIRONMENT';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER frame_order_environment BEFORE INSERT ON custom_frame_order
  FOR EACH ROW EXECUTE FUNCTION check_frame_order_environment();
