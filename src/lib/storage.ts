import Database, { Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { CardConfig } from "./svg-engine";
import { cardConfigSchema } from "./validation";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cards.db");
const LEGACY_JSON_PATH = path.join(DATA_DIR, "cards.json");

// Lazy-initialized database singleton — avoids SQLITE_BUSY during
// multi-worker builds where each worker would otherwise open the DB at
// module evaluation time.
let _db: DatabaseType | null = null;

function parseStoredConfig(value: string): CardConfig | null {
  try {
    const parsed = cardConfigSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getDb(): DatabaseType {
  if (_db) return _db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_PATH);

  // WAL mode for better concurrent read performance
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 10000");

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      username TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS shared_templates (
      id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shared_templates_expires_at
      ON shared_templates(expires_at)
    ;
    CREATE TABLE IF NOT EXISTS rate_limits (
      scope TEXT NOT NULL,
      subject TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (scope, subject)
    );
    CREATE TABLE IF NOT EXISTS site_metrics (
      metric_key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0 CHECK(value >= 0),
      updated_at INTEGER NOT NULL
    );
  `);

  migrateFromJson(db);

  _db = db;
  return db;
}

function migrateFromJson(db: DatabaseType): void {
  if (!fs.existsSync(LEGACY_JSON_PATH)) return;

  try {
    const raw = fs.readFileSync(LEGACY_JSON_PATH, "utf-8");
    const configs = JSON.parse(raw) as Record<string, CardConfig>;

    const insert = db.prepare(
      "INSERT OR REPLACE INTO cards (username, config, updated_at) VALUES (?, ?, datetime('now'))",
    );

    const existing = new Set(
      (
        db.prepare("SELECT username FROM cards").all() as { username: string }[]
      ).map((r) => r.username),
    );

    const toMigrate = Object.entries(configs).filter(([u]) => !existing.has(u));

    if (toMigrate.length > 0) {
      const migrateMany = db.transaction((entries: [string, CardConfig][]) => {
        for (const [username, config] of entries) {
          insert.run(username, JSON.stringify(config));
        }
      });
      migrateMany(toMigrate);
      console.log(
        `[storage] Migrated ${toMigrate.length} card(s) from cards.json to SQLite`,
      );
    }

    try {
      fs.renameSync(LEGACY_JSON_PATH, LEGACY_JSON_PATH + ".bak");
      console.log("[storage] Legacy cards.json renamed to cards.json.bak");
    } catch {
      // Another build worker may have already migrated the file.
    }
  } catch (error) {
    console.error("[storage] Migration from cards.json failed:", error);
  }
}

export async function getCardConfig(
  username: string,
): Promise<CardConfig | null> {
  const db = getDb();
  const row = db
    .prepare("SELECT config FROM cards WHERE username = ?")
    .get(username) as { config: string } | undefined;
  if (!row) return null;
  return parseStoredConfig(row.config);
}

export async function saveCardConfig(config: CardConfig): Promise<void> {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO cards (username, config, updated_at) VALUES (?, ?, datetime('now'))",
  ).run(config.username, JSON.stringify(config));
}

export async function deleteCardConfig(username: string): Promise<boolean> {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM cards WHERE username = ?")
    .run(username);
  return result.changes > 0;
}

export async function listUsernames(): Promise<string[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT username FROM cards ORDER BY updated_at DESC")
    .all() as { username: string }[];
  return rows.map((r) => r.username);
}

export async function saveSharedTemplate(
  id: string,
  config: CardConfig,
  expiresAt: number,
  maxEntries = 1000,
): Promise<void> {
  const db = getDb();
  const now = Date.now();
  const save = db.transaction(() => {
    db.prepare("DELETE FROM shared_templates WHERE expires_at <= ?").run(now);
    db.prepare(
      "INSERT INTO shared_templates (id, config, expires_at, created_at) VALUES (?, ?, ?, ?)",
    ).run(id, JSON.stringify(config), expiresAt, now);
    db.prepare(
      `
      DELETE FROM shared_templates
      WHERE id IN (
        SELECT id FROM shared_templates
        ORDER BY created_at DESC
        LIMIT -1 OFFSET ?
      )
    `,
    ).run(maxEntries);
  });
  save();
}

export async function getSharedTemplate(
  id: string,
): Promise<CardConfig | null> {
  const db = getDb();
  const now = Date.now();
  db.prepare("DELETE FROM shared_templates WHERE expires_at <= ?").run(now);
  const row = db
    .prepare(
      "SELECT config FROM shared_templates WHERE id = ? AND expires_at > ?",
    )
    .get(id, now) as { config: string } | undefined;
  if (!row) return null;
  return parseStoredConfig(row.config);
}

export async function consumeRateLimit(
  scope: string,
  subject: string,
  windowMs: number,
  maxCount: number,
): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const consume = db.transaction(() => {
    const row = db
      .prepare(
        "SELECT window_start, count FROM rate_limits WHERE scope = ? AND subject = ?",
      )
      .get(scope, subject) as
      | { window_start: number; count: number }
      | undefined;

    if (!row || now - row.window_start >= windowMs) {
      db.prepare(
        `INSERT INTO rate_limits (scope, subject, window_start, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(scope, subject)
         DO UPDATE SET window_start = excluded.window_start, count = 1`,
      ).run(scope, subject, now);
      return true;
    }
    if (row.count >= maxCount) return false;

    db.prepare(
      "UPDATE rate_limits SET count = count + 1 WHERE scope = ? AND subject = ?",
    ).run(scope, subject);
    return true;
  });

  return consume();
}

const METRIC_KEY_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;

function assertMetricKey(metricKey: string): void {
  if (!METRIC_KEY_PATTERN.test(metricKey)) {
    throw new Error(`Invalid site metric key: ${metricKey}`);
  }
}

export async function incrementSiteMetric(
  metricKey: string,
  amount = 1,
): Promise<number> {
  assertMetricKey(metricKey);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("Metric increment must be a positive safe integer");
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO site_metrics (metric_key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(metric_key)
     DO UPDATE SET value = value + excluded.value, updated_at = excluded.updated_at`,
  ).run(metricKey, amount, now);

  const row = db
    .prepare("SELECT value FROM site_metrics WHERE metric_key = ?")
    .get(metricKey) as { value: number };
  return row.value;
}

export async function getSiteMetrics(
  metricKeys: readonly string[],
): Promise<Record<string, number>> {
  const uniqueKeys = [...new Set(metricKeys)];
  uniqueKeys.forEach(assertMetricKey);
  if (uniqueKeys.length === 0) return {};

  const placeholders = uniqueKeys.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(
      `SELECT metric_key, value
       FROM site_metrics
       WHERE metric_key IN (${placeholders})`,
    )
    .all(...uniqueKeys) as Array<{ metric_key: string; value: number }>;
  const values = Object.fromEntries(uniqueKeys.map((key) => [key, 0]));
  for (const row of rows) values[row.metric_key] = row.value;
  return values;
}

process.on("exit", () => {
  if (_db) {
    try {
      _db.close();
    } catch {
      /* ignore */
    }
  }
});
