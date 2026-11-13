-- Accepted snapshots stay immutable; only a bounded fabrication matrix can change.
ALTER TABLE custom_frame_order ADD COLUMN production_cells jsonb
  CHECK(production_cells IS NULL OR (jsonb_typeof(production_cells)='array' AND jsonb_array_length(production_cells) BETWEEN 4 AND 10000));
