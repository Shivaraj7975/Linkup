/**
 * Backend API reliability & database integrity regression tests.
 *
 * Each test covers a bug that was reproduced against a live server/database:
 *  1. Pool self-deadlock: write transactions re-read through the pool while
 *     still holding their client, so > pool.max concurrent writes stalled for
 *     connectionTimeoutMillis and then failed with 500 (after committing).
 *     (meldService.createLinkup / updateLinkup, profileService.updateStudentProfile)
 *  2. Client errors surfaced as 500s with raw DB messages / stack traces:
 *     malformed UUIDs, invitation respond errors, invalid maxMembers/status,
 *     non-string fields, duplicate join-request race (unique violation),
 *     invalid chat "before" cursor. Partial PUT wiped requiredSkills.
 *  3. GET /health alias only answered at /health/health.
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

async function startApp() {
  const app = require('../src/app');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

async function api(base, method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function testHttpErrorContracts(base, creator, member, outsider) {
  console.log('\n🚦 [RELIABILITY 3] Client errors return 4xx (not 500) without leaking DB internals...');

  let r = await api(base, 'GET', '/api/melds/not-a-uuid');
  assert(r.status === 400, `GET /api/melds/not-a-uuid -> 400 (got ${r.status})`);
  assert(!r.json?.stack && !/uuid/i.test(r.json?.message || ''), 'malformed UUID response hides stack trace and raw pg message');

  r = await api(base, 'POST', '/api/join-requests/not-a-uuid/accept', { token: creator.token });
  assert(r.status === 400, `POST /api/join-requests/not-a-uuid/accept -> 400 (got ${r.status})`);

  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody(), maxMembers: 1 } });
  assert(r.status === 400, `POST /api/melds maxMembers=1 -> 400 (got ${r.status})`);
  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody(), maxMembers: 100000 } });
  assert(r.status === 400, `POST /api/melds maxMembers=100000 -> 400 (got ${r.status})`);
  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody(), title: 12345 } });
  assert(r.status === 400, `POST /api/melds title=<number> -> 400 (got ${r.status})`);
  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody(), title: 'x'.repeat(300) } });
  assert(r.status === 400, `POST /api/melds title=300 chars -> 400 (got ${r.status})`);
  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody(), requiredSkills: [null, 'React'] } });
  assert(r.status === 201, `POST /api/melds requiredSkills=[null,'React'] ignores junk entry -> 201 (got ${r.status})`);

  r = await api(base, 'POST', '/api/melds', { token: creator.token, body: { ...meldBody('HTTP meld'), maxMembers: 3 } });
  const meldId = r.json?.meld?.id;
  assert(r.status === 201 && meldId, 'created meld for HTTP contract tests');

  r = await api(base, 'PUT', `/api/melds/${meldId}`, { token: creator.token, body: { currentStatus: 'IN_PROGRESS' } });
  assert(r.status === 400, `PUT currentStatus=IN_PROGRESS (violates DB CHECK) -> 400 (got ${r.status})`);
  r = await api(base, 'PUT', `/api/melds/${meldId}`, { token: creator.token, body: { title: 'x' } });
  assert(r.status === 400, `PUT title too short -> 400 (got ${r.status})`);
  r = await api(base, 'PUT', `/api/melds/${meldId}`, { token: creator.token, body: { currentStatus: 'CLOSED' } });
  const skillsAfter = (r.json?.meld?.requiredSkills || []).map((s) => s.name);
  assert(r.status === 200 && skillsAfter.length === 2, `partial PUT {currentStatus} keeps requiredSkills (got ${r.status}, skills=${JSON.stringify(skillsAfter)})`);
  await api(base, 'PUT', `/api/melds/${meldId}`, { token: creator.token, body: { currentStatus: 'OPEN' } });

  // Duplicate join-request race: unique (meld_id, user_id) violation used to be a 500.
  const joins = await Promise.all(Array.from({ length: 6 }, () =>
    api(base, 'POST', `/api/melds/${meldId}/join`, { token: member.token, body: { message: 'hi' } })
  ));
  const statuses = joins.map((j) => j.status);
  assert(statuses.filter((s) => s === 201).length === 1 && !statuses.some((s) => s >= 500), `6 concurrent duplicate join requests -> exactly one 201, no 5xx (got ${statuses.join(',')})`);

  // Invitation respond errors
  const { inviteUserToLinkup } = require('../src/services/invitationService');
  const inv = await inviteUserToLinkup(meldId, creator.id, outsider.id);
  r = await api(base, 'POST', `/api/invitations/${inv.invitationId}/respond`, { token: outsider.token, body: { action: 'MAYBE' } });
  assert(r.status === 400, `respond with invalid action -> 400 (got ${r.status})`);
  r = await api(base, 'POST', `/api/invitations/${inv.invitationId}/respond`, { token: member.token, body: { action: 'ACCEPTED' } });
  assert(r.status === 404, `respond to someone else's invitation -> 404 (got ${r.status})`);
  r = await api(base, 'POST', '/api/invitations/00000000-0000-0000-0000-000000000000/respond', { token: outsider.token, body: { action: 'ACCEPTED' } });
  assert(r.status === 404, `respond to nonexistent invitation -> 404 (got ${r.status})`);
  r = await api(base, 'POST', '/api/invitations/not-a-uuid/respond', { token: outsider.token, body: { action: 'ACCEPTED' } });
  assert(r.status === 400, `respond with malformed invitation id -> 400 (got ${r.status})`);
  r = await api(base, 'POST', `/api/invitations/${inv.invitationId}/respond`, { token: outsider.token, body: { action: 'REJECTED' } });
  assert(r.status === 200, `respond REJECTED to own invitation -> 200 (got ${r.status})`);
  r = await api(base, 'POST', `/api/invitations/${inv.invitationId}/respond`, { token: outsider.token, body: { action: 'ACCEPTED' } });
  assert(r.status === 404, `respond to already-processed invitation -> 404 (got ${r.status})`);

  r = await api(base, 'GET', `/api/melds/${meldId}/messages?before=garbage`, { token: creator.token });
  assert(r.status === 400, `chat history with invalid before cursor -> 400 (got ${r.status})`);

  // Admin endpoints: not-found / invalid input were 500s.
  await query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [creator.id]);
  r = await api(base, 'DELETE', '/api/admin/melds/00000000-0000-0000-0000-000000000000', { token: creator.token });
  assert(r.status === 404, `admin delete nonexistent meld -> 404 (got ${r.status})`);
  r = await api(base, 'PATCH', `/api/admin/users/${member.id}/role`, { token: creator.token, body: { role: 'GOD' } });
  assert(r.status === 400, `admin set invalid role -> 400 (got ${r.status})`);
  r = await api(base, 'PATCH', '/api/admin/melds/00000000-0000-0000-0000-000000000000/status', { token: creator.token, body: { status: 'OPEN' } });
  assert(r.status === 404, `admin update status of nonexistent meld -> 404 (got ${r.status})`);
  await query(`UPDATE users SET role = 'USER' WHERE id = $1`, [creator.id]);

  r = await api(base, 'GET', '/health');
  assert(r.status === 200 && r.json?.database === 'connected', `GET /health alias responds (got ${r.status})`);

  return meldId;
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

    const member = await createUser('member');
    const outsider = await createUser('outsider');
    const { server, base } = await startApp();
    try {
      await testHttpErrorContracts(base, creator, member, outsider);
    } finally {
      server.close();
    }
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
