CREATE TABLE frame_workshop (
  environment text PRIMARY KEY CHECK(environment IN ('test','production')),
  draft jsonb NOT NULL CHECK(jsonb_typeof(draft)='object'),
  published jsonb CHECK(published IS NULL OR jsonb_typeof(published)='object'),
  version integer NOT NULL DEFAULT 1 CHECK(version>0),
  published_version integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  published_at timestamptz
);
CREATE TABLE frame_workshop_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  environment text NOT NULL REFERENCES frame_workshop(environment),
  version integer NOT NULL,
  action text NOT NULL CHECK(action IN ('save','publish','pause')),
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
