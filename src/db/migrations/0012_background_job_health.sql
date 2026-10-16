CREATE TABLE background_job_health (
  name text PRIMARY KEY,
  finished_at timestamptz NOT NULL,
  processed integer NOT NULL,
  review_count integer NOT NULL,
  overdue_count integer NOT NULL
);
