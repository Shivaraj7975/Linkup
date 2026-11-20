/**
 * Schema Parity Test Suite for MELD
 *
 * Guards against drift between the three schema sources:
 *   - src/db/schema.sql        (fresh install via `npm run db:init`)
 *   - src/db/migrate_master.js (non-destructive upgrade via `npm run db:migrate`)
 *   - src/db/migrate_master.sql (standalone SQL copy of the master migration)
 *
 * Checks:
 * 1. A fresh `schema.sql` database contains every column the application code reads/writes.
 * 2. `schema.sql` can be re-applied to an existing database (re-init does not crash).
 * 3. `migrate_master.js` still succeeds on top of a fresh `schema.sql` database.
 * 4. `schema.sql`, `migrate_master.js` (on an empty DB) and `migrate_master.sql` (on an empty DB)
 *    produce the same set of tables, columns (type/length/nullability) and indexes.
 *
 * Uses throwaway databases named `<DB_NAME>_parity_*`, created and dropped on the local server.
 * Skips gracefully when PostgreSQL is not reachable (headless CI).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_DIR = path.join(__dirname, '../src/db');
const baseName = process.env.DB_NAME || 'meld_db';
const conn = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// Columns the application code depends on (services/middleware queries).
const REQUIRED_COLUMNS = {
  users: ['id', 'name', 'username', 'email', 'password_hash', 'role', 'token_version'],
  student_profiles: [
    'college_email', 'college', 'city', 'state', 'country', 'degree', 'year_of_study', 'bio',
    'availability', 'github_url', 'linkedin_url', 'instagram_url', 'youtube_url', 'website_url',
    'is_completed', 'onboarding_step',
  ],
  otp_verifications: ['email', 'otp_code', 'purpose', 'expires_at', 'attempts', 'is_verified'],
  matches: ['skill_score', 'role_fit_score', 'algorithm_version', 'match_data', 'generated_by'],
  melds: ['project_duration', 'current_status'],
  meld_messages: ['meld_id', 'sender_id', 'content'],
  notifications: ['user_id', 'type', 'title', 'message', 'link', 'is_read'],
};

let passed = 0;
let failed = 0;
const check = (cond, msg, detail) => {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}${detail ? `\n     ${detail}` : ''}`);
    failed++;
  }
};

async function withClient(database, fn) {
  const client = new Client({ ...conn, database });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const recreateDb = (name) =>
  withClient('postgres', async (c) => {
    await c.query(`DROP DATABASE IF EXISTS "${name}"`);
    await c.query(`CREATE DATABASE "${name}"`);
  });

const dropDb = (name) => withClient('postgres', (c) => c.query(`DROP DATABASE IF EXISTS "${name}"`));

const runSqlFile = (db, file) =>
  withClient(db, (c) => c.query(fs.readFileSync(path.join(DB_DIR, file), 'utf8')));

// Pull the one-line "Migration failed: ..." reason out of the child's stderr.
const migrationError = (err) => {
  const lines = (err.stderr ? err.stderr.toString() : '').split('\n');
  return lines.find((l) => l.includes('Migration failed')) || err.message;
};

const runMigrateMasterJs = (db) =>
  execFileSync(process.execPath, [path.join(DB_DIR, 'migrate_master.js')], {
    env: { ...process.env, ...envFor(db) },
    stdio: 'pipe',
  });

const envFor = (db) => ({
  DB_HOST: conn.host,
  DB_PORT: String(conn.port),
  DB_USER: conn.user,
  DB_PASSWORD: conn.password,
  DB_NAME: db,
  DB_SSL: 'false',
  NODE_ENV: 'test',
});

async function snapshot(db) {
  return withClient(db, async (c) => {
    const cols = await c.query(`
      SELECT table_name, column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns WHERE table_schema = 'public'
      ORDER BY table_name, column_name`);
    const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`);
    return {
      columns: new Set(
        cols.rows.map((r) => `${r.table_name}.${r.column_name} ${r.data_type}(${r.character_maximum_length ?? ''}) null=${r.is_nullable}`)
      ),
      columnNames: new Set(cols.rows.map((r) => `${r.table_name}.${r.column_name}`)),
      indexes: new Set(idx.rows.map((r) => r.indexname)),
    };
  });
}

// Accepted index differences: migrate_master adds `username` via ALTER (no inline UNIQUE),
// uniqueness is enforced by the stricter case-insensitive idx_users_username_lower in all sources.
const IGNORED_INDEXES = new Set(['users_username_key']);
const diff = (a, b) => [...a].filter((x) => !b.has(x) && !IGNORED_INDEXES.has(x));

// Minimal pre-v1.1 shape: matches without algorithm_version and with a restrictive generated_by CHECK.
const LEGACY_DDL = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE melds (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL, description TEXT NOT NULL, category VARCHAR(100) NOT NULL,
    max_members INT NOT NULL DEFAULT 4, commitment_level VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE matches (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), meld_id UUID NOT NULL REFERENCES melds(id),
    user_id UUID NOT NULL REFERENCES users(id), match_percentage INT NOT NULL,
    match_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by VARCHAR(50) NOT NULL DEFAULT 'AI' CHECK (generated_by IN ('AI', 'FALLBACK')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT unique_meld_user_match UNIQUE (meld_id, user_id));
`;

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MELD SCHEMA PARITY TEST SUITE');
  console.log('======================================================\n');

  try {
    await withClient('postgres', (c) => c.query('SELECT 1'));
  } catch (err) {
    console.warn(`⚠️ PostgreSQL not reachable (${err.message}). Skipping schema parity tests in headless CI.`);
    return;
  }

  const dbInit = `${baseName}_parity_init`;
  const dbJs = `${baseName}_parity_js`;
  const dbSql = `${baseName}_parity_sql`;
  const dbLegacy = `${baseName}_parity_legacy`;

  try {
    // 1. Fresh install via schema.sql (+ seed, as initDb does)
    console.log('🏗️  [1] Fresh install via schema.sql...');
    await recreateDb(dbInit);
    await runSqlFile(dbInit, 'schema.sql');
    await runSqlFile(dbInit, 'seed.sql');
    const fresh = await snapshot(dbInit);
    for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
      const missing = cols.filter((c) => !fresh.columnNames.has(`${table}.${c}`));
      check(missing.length === 0, `schema.sql provides all columns used by code in "${table}"`, missing.length ? `missing: ${missing.join(', ')}` : '');
    }

    // 2. Re-initialization must not crash
    console.log('\n🔁 [2] Re-applying schema.sql to an initialized database...');
    let reinitError = null;
    try {
      await runSqlFile(dbInit, 'schema.sql');
      await runSqlFile(dbInit, 'seed.sql');
    } catch (err) {
      reinitError = err.message;
    }
    check(reinitError === null, 'schema.sql can be re-applied (db:init is repeatable)', reinitError);

    // 3. migrate_master.js on top of fresh schema
    console.log('\n🔄 [3] migrate_master.js on top of a schema.sql database...');
    let migrateError = null;
    try {
      runMigrateMasterJs(dbInit);
    } catch (err) {
      migrateError = migrationError(err);
    }
    check(migrateError === null, 'migrate_master.js succeeds on a freshly initialized database', migrateError);
    const afterMigrate = await snapshot(dbInit);
    const addedByMigrate = diff(afterMigrate.columns, fresh.columns);
    check(addedByMigrate.length === 0, 'migrate_master.js adds nothing that schema.sql lacks', addedByMigrate.join('; '));

    // 4. Parity: migrate_master.js and migrate_master.sql on empty databases
    console.log('\n⚖️  [4] Parity between schema.sql, migrate_master.js and migrate_master.sql...');
    await recreateDb(dbJs);
    runMigrateMasterJs(dbJs);
    const viaJs = await snapshot(dbJs);

    await recreateDb(dbSql);
    await runSqlFile(dbSql, 'migrate_master.sql');
    const viaSql = await snapshot(dbSql);

    const pairs = [
      ['schema.sql', fresh, 'migrate_master.js', viaJs],
      ['schema.sql', fresh, 'migrate_master.sql', viaSql],
    ];
    for (const [na, a, nb, b] of pairs) {
      const onlyA = diff(a.columns, b.columns);
      const onlyB = diff(b.columns, a.columns);
      check(
        onlyA.length === 0 && onlyB.length === 0,
        `columns match: ${na} vs ${nb}`,
        [...onlyA.map((x) => `only in ${na}: ${x}`), ...onlyB.map((x) => `only in ${nb}: ${x}`)].join('\n     ')
      );
      const idxA = diff(a.indexes, b.indexes);
      const idxB = diff(b.indexes, a.indexes);
      check(
        idxA.length === 0 && idxB.length === 0,
        `indexes match: ${na} vs ${nb}`,
        [...idxA.map((x) => `only in ${na}: ${x}`), ...idxB.map((x) => `only in ${nb}: ${x}`)].join('\n     ')
      );
    }

    // 5. Upgrade path from a legacy database
    console.log('\n🕰️  [5] migrate_master.js on a legacy (pre-v1.1) database...');
    await recreateDb(dbLegacy);
    await withClient(dbLegacy, (c) => c.query(LEGACY_DDL));
    let legacyError = null;
    try {
      runMigrateMasterJs(dbLegacy);
    } catch (err) {
      legacyError = migrationError(err);
    }
    check(legacyError === null, 'migrate_master.js upgrades a legacy database', legacyError);
    if (legacyError === null) {
      const legacy = await snapshot(dbLegacy);
      check(legacy.columnNames.has('matches.algorithm_version'), 'legacy matches table gains algorithm_version');
      const providerInsertOk = await withClient(dbLegacy, async (c) => {
        const u = await c.query(`INSERT INTO users (name, email, password_hash) VALUES ('a', 'a@x.test', 'x') RETURNING id`);
        const m = await c.query(
          `INSERT INTO melds (creator_id, title, description, category) VALUES ($1, 't', 'd', 'c') RETURNING id`,
          [u.rows[0].id]
        );
        await c.query(`INSERT INTO matches (meld_id, user_id, match_percentage, generated_by) VALUES ($1, $2, 50, 'GROQ')`, [
          m.rows[0].id,
          u.rows[0].id,
        ]);
        return true;
      }).catch((e) => e.message);
      check(providerInsertOk === true, 'legacy matches accepts AI provider names in generated_by and melds no longer requires commitment_level', providerInsertOk);
    }
  } finally {
    await Promise.all([dropDb(dbInit), dropDb(dbJs), dropDb(dbSql), dropDb(dbLegacy)]).catch(() => {});
  }

  console.log('\n======================================================');
  console.log(failed === 0 ? `🎉 ALL ${passed} SCHEMA PARITY TESTS PASSED` : `❌ ${failed} TESTS FAILED out of ${passed + failed}`);
  console.log('======================================================\n');
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error('Fatal Schema Parity Test Error:', err);
  process.exitCode = 1;
});
