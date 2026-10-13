-- Lagu website download counter (Cloudflare D1).
-- Apply with:
--   npx wrangler d1 execute lagu-downloads --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS downloads (
  id    INTEGER PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO downloads (id, count) VALUES (1, 0);

-- Per-installation counts.
CREATE TABLE IF NOT EXISTS file_downloads (
  file  TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

-- Per-visitor rate limiting (one counted download every 5 seconds).
CREATE TABLE IF NOT EXISTS rate (
  ip TEXT PRIMARY KEY,
  ts INTEGER NOT NULL
);
