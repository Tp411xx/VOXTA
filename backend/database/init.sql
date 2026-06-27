CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'DISABLED'));

CREATE TABLE IF NOT EXISTS maps (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm > 0),
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  audio_src TEXT NOT NULL DEFAULT '/song.mp3',
  key_count INTEGER NOT NULL DEFAULT 4,
  note_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS audio_src TEXT NOT NULL DEFAULT '/song.mp3';

ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS key_count INTEGER NOT NULL DEFAULT 4;

ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS note_count INTEGER NOT NULL DEFAULT 0;

UPDATE maps
SET note_count = jsonb_array_length(notes)
WHERE note_count = 0
  AND jsonb_typeof(notes) = 'array';

ALTER TABLE maps DROP CONSTRAINT IF EXISTS maps_status_check;
ALTER TABLE maps
  ADD CONSTRAINT maps_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE maps DROP CONSTRAINT IF EXISTS maps_key_count_check;
ALTER TABLE maps
  ADD CONSTRAINT maps_key_count_check CHECK (key_count = 4);

ALTER TABLE maps DROP CONSTRAINT IF EXISTS maps_note_count_check;
ALTER TABLE maps
  ADD CONSTRAINT maps_note_count_check CHECK (note_count >= 0);

CREATE INDEX IF NOT EXISTS idx_maps_status_created_at
  ON maps(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maps_author_id
  ON maps(author_id);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  perfects INTEGER NOT NULL DEFAULT 0 CHECK (perfects >= 0),
  goods INTEGER NOT NULL DEFAULT 0 CHECK (goods >= 0),
  misses INTEGER NOT NULL DEFAULT 0 CHECK (misses >= 0),
  played_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_user_map
  ON scores(user_id, map_id);

CREATE INDEX IF NOT EXISTS idx_scores_map_score
  ON scores(map_id, score DESC);
