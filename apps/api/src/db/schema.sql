-- Cloudflare Colombia Live Board - D1 Schema

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Anónimo',
  votes INTEGER DEFAULT 0,
  is_answered INTEGER DEFAULT 0,
  image_key TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS votes (
  question_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  PRIMARY KEY (question_id, voter_id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_room ON questions(room_id);
CREATE INDEX IF NOT EXISTS idx_questions_votes ON questions(room_id, votes DESC);
