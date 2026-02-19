CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  finished_time INTEGER NOT NULL CHECK (finished_time >= 0),
  rank INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
