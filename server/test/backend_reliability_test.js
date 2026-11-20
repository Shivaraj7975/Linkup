/**
 * Backend API reliability & database integrity regression tests.
 *
 * Each test covers a bug that was reproduced against a live server/database:
 *  1. Pool self-deadlock: write transactions re-read through the pool while
 *     still holding their client, so > pool.max concurrent writes stalled for
 *     connectionTimeoutMillis and then failed with 500 (after committing).
 *     (meldService.createLinkup / updateLinkup, profileService.updateStudentProfile)
 *
 * Requires a reachable PostgreSQL database (see README / BRIEF). When the DB is
 * not reachable (CI without a database) the suite skips, like the other suites.
 */

const http = require('http');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'localtestsecret';

const { pool, query, testConnection } = require('../src/config/db');

let passedCount = 0;
let failedCount = 0;
const createdUserIds = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

const SUFFIX = Date.now().toString(36);

async function createUser(label) {
  const res = await query(
    `INSERT INTO users (name, username, email, password_hash)
     VALUES ($1, $2, $3, 'x') RETURNING id, email, username`,
    [`Rel ${label}`, `rel_${label}_${SUFFIX}`.slice(0, 30), `rel_${label}_${SUFFIX}@rel.test`]
  );
  const user = res.rows[0];
  createdUserIds.push(user.id);
  await query(
    `INSERT INTO student_profiles (user_id, college, degree, year_of_study)
     VALUES ($1, 'Reliability U', 'BTech', '2')`,
    [user.id]
  );
  user.token = jwt.sign(
    { id: user.id, email: user.email, username: user.username, tokenVersion: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return user;
}

const meldBody = (title = 'Reliability meld') => ({
  title,
  description: 'A meld created by the reliability test suite.',
  category: 'Web',
  projectDuration: '1 month',
  requiredSkills: ['React', 'Node.js'],
  maxMembers: 3,
});

async function testPoolDeadlock(meldService, creator) {
  console.log('\n🔌 [RELIABILITY 1] Concurrent writes do not deadlock the connection pool...');
  const poolMax = pool.options.max || 10;
  const n = poolMax + 3;
  const start = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, (_, i) => meldService.createLinkup(creator.id, meldBody(`Concurrent ${i}`)))
  );
  const elapsed = Date.now() - start;
  const failures = results.filter((r) => r.status === 'rejected');
  assert(failures.length === 0, `${n} concurrent createLinkup calls all succeed (failures: ${failures.length}${failures[0] ? `, e.g. "${failures[0].reason.message}"` : ''})`);
  assert(elapsed < 4000, `concurrent createLinkup calls finish well under the 5s pool connect timeout (took ${elapsed}ms)`);

  const created = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const meldId = created[0]?.id;
  if (meldId) {
    const updStart = Date.now();
    const upd = await Promise.allSettled(
      Array.from({ length: n }, () => meldService.updateLinkup(meldId, creator.id, { title: 'Updated title', requiredSkills: ['Go'] }))
    );
    const updFailures = upd.filter((r) => r.status === 'rejected');
    assert(updFailures.length === 0 && Date.now() - updStart < 4000, `${n} concurrent updateLinkup calls succeed without pool stall (failures: ${updFailures.length}, ${Date.now() - updStart}ms)`);
  }
}

async function testProfilePoolDeadlock(creator) {
  console.log('\n🔌 [RELIABILITY 2] Concurrent profile updates do not deadlock the connection pool...');
  const profileService = require('../src/services/profileService');
  const poolMax = pool.options.max || 10;
  const n = poolMax + 3;
  const start = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, () => profileService.updateStudentProfile(creator.id, {
      username: creator.username,
      college: 'Reliability U',
      degree: 'BTech',
      year_of_study: '2',
      skills: ['React'],
    }))
  );
  const failures = results.filter((r) => r.status === 'rejected');
  const elapsed = Date.now() - start;
  assert(failures.length === 0 && elapsed < 4000, `${n} concurrent updateStudentProfile calls succeed without pool stall (failures: ${failures.length}${failures[0] ? ` "${failures[0].reason.message}"` : ''}, ${elapsed}ms)`);
}

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING BACKEND RELIABILITY & DB INTEGRITY TESTS');
  console.log('======================================================');

  const conn = await testConnection();
  if (!conn.connected) {
    console.warn(`⚠️ PostgreSQL database is not reachable (${conn.error}). Skipping backend reliability tests.`);
    await pool.end().catch(() => {});
    process.exit(0);
  }

  const meldService = require('../src/services/meldService');

  try {
    const creator = await createUser('creator');
    await testPoolDeadlock(meldService, creator);
    await testProfilePoolDeadlock(creator);
  } catch (err) {
    failedCount++;
    console.error('  ❌ FAIL: unexpected error in reliability suite:', err);
  } finally {
    if (createdUserIds.length) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]).catch(() => {});
    }
  }

  console.log('\n======================================================');
  if (failedCount === 0) {
    console.log(`🎉 ALL ${passedCount} BACKEND RELIABILITY TESTS PASSED (0 Failures)!`);
  } else {
    console.log(`❌ ${failedCount} BACKEND RELIABILITY TEST(S) FAILED (${passedCount} passed).`);
  }
  console.log('======================================================\n');
  await pool.end().catch(() => {});
  process.exit(failedCount === 0 ? 0 : 1);
}

run();
