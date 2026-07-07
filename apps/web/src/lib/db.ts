import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let db: Database.Database | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  jobTitle TEXT NOT NULL,
  location TEXT,
  sourceUrl TEXT,
  salaryRange TEXT,
  jobType TEXT,
  experience TEXT,
  skills TEXT,
  emailDomain TEXT,
  description TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Applied',
  dateAdded TEXT NOT NULL,
  dateApplied TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  fromStatus TEXT,
  toStatus TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmailId TEXT NOT NULL UNIQUE,
  threadId TEXT,
  jobId INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  fromAddress TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  snippet TEXT NOT NULL DEFAULT '',
  receivedAt TEXT NOT NULL,
  category TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  suggestedStatus TEXT,
  statusApplied INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_emails_job ON emails(jobId);
CREATE INDEX IF NOT EXISTS idx_history_job ON status_history(jobId);
`;

export function getDb(): Database.Database {
  if (db) return db;
  const file =
    process.env.DATABASE_PATH ??
    path.join(process.cwd(), "data", "jobtracker.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

// ---------------------------------------------------------------------------
// Settings (simple JSON key/value store)
// ---------------------------------------------------------------------------

export function getSetting<T>(key: string): T | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function setSetting(key: string, value: unknown): void {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, JSON.stringify(value));
}

export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
