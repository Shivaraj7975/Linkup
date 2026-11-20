/**
 * HTTP-level API integration tests for MELD.
 *
 * Boots the real Express `app` (src/app.js) on an ephemeral port and drives it
 * with Node's built-in fetch. No extra dependencies (no supertest).
 *
 * Sections that need no database (404 handler, 401 on protected routes,
 * invalid/forged tokens, root + health routes) always run, including in CI.
 * Sections that need PostgreSQL are skipped when the DB is unreachable,
 * matching the convention of the other suites in this folder.
 *
 * Behaviour that is known to be wrong is recorded via `knownBug()` instead of
 * failing the suite; each one is listed in the audit report as a finding.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'meld-test-jwt-secret-key-for-unit-testing';
process.env.OTP_PEPPER = process.env.OTP_PEPPER || 'meld-test-otp-pepper';

const app = require('../src/app');
const { pool, query, testConnection } = require('../src/config/db');
const { saveOtpToDb } = require('../src/services/emailService');

let passed = 0;
let failed = 0;
let skipped = 0;
const knownBugs = [];

function check(condition, name, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

function skip(name, reason) {
  console.log(`  ⚠️ SKIP: ${name} (${reason})`);
  skipped++;
}

/**
 * Records a known defect without failing the suite. When `stillBroken` turns
 * false (the bug was fixed) it counts as a normal pass so the test can be
 * promoted to a hard assertion.
 */
function knownBug(stillBroken, name, detail) {
  if (stillBroken) {
    console.warn(`  🐞 KNOWN BUG: ${name}${detail ? ` -> ${detail}` : ''}`);
    knownBugs.push(name);
  } else {
    console.log(`  ✅ PASS (known bug now fixed): ${name}`);
    passed++;
  }
}

let baseUrl;

async function api(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json, headers: res.headers };
}

async function runNoDbSection() {
  console.log('🌐 [HTTP 1] Routing, 404 handler & public endpoints (no DB required)...');

  const root = await api('GET', '/');
  check(root.status === 200 && root.body?.status === 'online', 'GET / returns API banner');
  check(!root.headers.get('x-powered-by'), 'x-powered-by header is disabled');

  const health = await api('GET', '/api/health');
  check(health.status === 200 && health.body?.success === true, 'GET /api/health returns 200');

  const nf = await api('GET', '/api/definitely-not-a-route');
  check(nf.status === 404 && nf.body?.success === false, 'Unknown route returns JSON 404 via notFoundHandler', `status=${nf.status}`);
  check(typeof nf.body?.message === 'string' && nf.body.message.includes('/api/definitely-not-a-route'), '404 body names the requested route');

  const badJson = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"identifier":',
  });
  check(badJson.status === 400, 'Malformed JSON body returns 400 (not 500)', `status=${badJson.status}`);

  console.log('\n🔐 [HTTP 2] Auth required on protected routes (no DB required)...');
  const protectedRoutes = [
    ['GET', '/api/auth/me'],
    ['GET', '/api/profile'],
    ['PUT', '/api/profile'],
    ['GET', '/api/users/search?q=a'],
    ['POST', '/api/melds'],
    ['PUT', '/api/melds/00000000-0000-0000-0000-000000000000'],
    ['DELETE', '/api/melds/00000000-0000-0000-0000-000000000000'],
    ['POST', '/api/melds/00000000-0000-0000-0000-000000000000/join'],
    ['GET', '/api/melds/00000000-0000-0000-0000-000000000000/requests'],
    ['GET', '/api/melds/00000000-0000-0000-0000-000000000000/matches'],
    ['POST', '/api/melds/00000000-0000-0000-0000-000000000000/invite'],
    ['GET', '/api/melds/00000000-0000-0000-0000-000000000000/messages'],
    ['GET', '/api/invitations'],
    ['POST', '/api/invitations/00000000-0000-0000-0000-000000000000/respond'],
    ['GET', '/api/notifications'],
    ['PUT', '/api/notifications/read-all'],
    ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/users'],
    ['GET', '/api/my-join-requests'],
  ];
  const unprotected = [];
  for (const [method, path] of protectedRoutes) {
    const r = await api(method, path, method === 'GET' || method === 'DELETE' ? {} : { body: {} });
    if (r.status !== 401) unprotected.push(`${method} ${path} -> ${r.status}`);
  }
  check(unprotected.length === 0, `All ${protectedRoutes.length} protected routes return 401 without a token`, unprotected.join('; '));

  const forged = jwt.sign({ id: crypto.randomUUID(), email: 'x@y.z' }, 'attacker-secret', { expiresIn: '1h' });
  const r1 = await api('GET', '/api/auth/me', { token: forged });
  check(r1.status === 401, 'Forged-signature token is rejected with 401 on /api/auth/me');

  const expired = jwt.sign({ id: crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn: '-10s' });
  const r2 = await api('GET', '/api/auth/me', { token: expired });
  check(r2.status === 401 && /expired/i.test(r2.body?.message || ''), 'Expired token is rejected with 401 and an expiry message');

  const r3 = await api('GET', '/api/auth/me', { headers: { Authorization: 'Basic abc' } });
  check(r3.status === 401, 'Non-Bearer Authorization scheme is rejected with 401');

  const r4 = await api('POST', '/api/auth/login', { body: {} });
  check(r4.status === 400, 'POST /api/auth/login with empty body returns 400');

  const r5 = await api('POST', '/api/auth/register', { body: { name: 'A', email: 'bad', password: 'x' } });
  check(r5.status === 400, 'POST /api/auth/register with invalid input returns 400');
}

async function registerUser(tag) {
  const email = `http_${tag}_${RUN_ID}@gmail.com`;
  const otp = '123456';
  await saveOtpToDb(email, otp, 'REGISTRATION');
  const res = await api('POST', '/api/auth/register', {
    body: { name: `HTTP ${tag}`, email, password: 'Password123', primaryOtp: otp },
  });
  return { email, password: 'Password123', res };
}

const RUN_ID = crypto.randomBytes(4).toString('hex');

async function runDbSection() {
  console.log('\n👤 [HTTP 3] Register / Login / Me...');

  // Registration without a valid OTP must fail
  const noOtp = await api('POST', '/api/auth/register', {
    body: { name: 'No Otp', email: `http_nootp_${RUN_ID}@gmail.com`, password: 'Password123', primaryOtp: '000000' },
  });
  check(noOtp.status === 400, 'Register with wrong primary OTP returns 400');

  const alice = await registerUser('alice');
  check(alice.res.status === 201 && typeof alice.res.body?.token === 'string', 'Register with valid OTP returns 201 + token', `status=${alice.res.status} ${JSON.stringify(alice.res.body)}`);
  check(alice.res.body?.user && !('password_hash' in alice.res.body.user), 'Register response does not expose password_hash');

  // OTP is single-use: re-registering same email with same OTP fails
  const dup = await api('POST', '/api/auth/register', {
    body: { name: 'Dup', email: alice.email, password: 'Password123', primaryOtp: '123456' },
  });
  check(dup.status === 400, 'Re-register reusing consumed OTP / existing email returns 400');

  const bob = await registerUser('bob');
  const carol = await registerUser('carol');
  check(bob.res.status === 201 && carol.res.status === 201, 'Second and third users register');

  const loginBad = await api('POST', '/api/auth/login', { body: { identifier: alice.email, password: 'WrongPass999' } });
  check(loginBad.status === 401, 'Login with wrong password returns 401');

  const loginUnknown = await api('POST', '/api/auth/login', { body: { identifier: `nobody_${RUN_ID}@gmail.com`, password: 'Password123' } });
  check(loginUnknown.status === 401 && loginUnknown.body?.message === loginBad.body?.message, 'Login with unknown user returns same 401 message (no user enumeration)');

  const login = await api('POST', '/api/auth/login', { body: { identifier: alice.email.toUpperCase(), password: alice.password } });
  check(login.status === 200 && typeof login.body?.token === 'string', 'Login with correct credentials (case-insensitive email) returns 200 + token', `status=${login.status}`);
  const aliceToken = login.body?.token;
  const bobToken = bob.res.body?.token;
  const carolToken = carol.res.body?.token;

  const me = await api('GET', '/api/auth/me', { token: aliceToken });
  check(me.status === 200 && me.body?.user?.email === alice.email, 'GET /api/auth/me returns the logged-in user');
  check(me.body?.user?.isProfileComplete === false, 'New user isProfileComplete=false');

  const ghost = jwt.sign({ id: crypto.randomUUID(), email: 'ghost@gmail.com', tokenVersion: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const ghostMe = await api('GET', '/api/auth/me', { token: ghost });
  check(ghostMe.status === 401, 'Validly signed token for non-existent user returns 401');

  console.log('\n📁 [HTTP 4] MELD create / read / update / delete authorization...');

  const missing = await api('POST', '/api/melds', { token: aliceToken, body: { title: 'x' } });
  check(missing.status === 400, 'Create MELD with missing fields returns 400');

  const tooSmall = await api('POST', '/api/melds', {
    token: aliceToken,
    body: { title: 'Tiny', description: 'd', category: 'Web Development', projectDuration: '1 Month', maxMembers: 1 },
  });
  knownBug(tooSmall.status === 500, 'Create MELD with maxMembers=1 should be 400 but returns 500 (service validation error falls through to errorHandler)', `status=${tooSmall.status}`);

  const created = await api('POST', '/api/melds', {
    token: aliceToken,
    body: {
      title: `HTTP Test MELD ${RUN_ID}`,
      description: 'Integration test project',
      category: 'Web Development',
      projectDuration: '1 Month',
      maxMembers: 3,
      requiredSkills: ['React', 'Node.js'],
    },
  });
  check(created.status === 201 && created.body?.meld?.id, 'Create MELD returns 201 with id', `status=${created.status} ${JSON.stringify(created.body)?.slice(0, 200)}`);
  const meldId = created.body?.meld?.id;

  const anonRead = await api('GET', `/api/melds/${meldId}`);
  check(anonRead.status === 200 && anonRead.body?.meld?.id === meldId, 'Anonymous GET /api/melds/:id returns 200 (public read)');
  const anonJson = JSON.stringify(anonRead.body || {});
  check(!anonJson.includes(alice.email) && !anonJson.includes('password_hash'), 'Public MELD detail does not leak creator email or password hash');

  const creatorRead = await api('GET', `/api/melds/${meldId}`, { token: aliceToken });
  check(creatorRead.body?.meld?.isCreator === true, 'Creator read reports isCreator=true');

  const otherRead = await api('GET', `/api/melds/${meldId}`, { token: bobToken });
  check(otherRead.status === 200 && otherRead.body?.meld?.isCreator === false, 'Non-creator read reports isCreator=false');

  const list = await api('GET', '/api/melds');
  check(list.status === 200 && Array.isArray(list.body?.melds), 'GET /api/melds returns a list');

  const nf = await api('GET', '/api/melds/00000000-0000-0000-0000-000000000000');
  check(nf.status === 404, 'GET non-existent MELD returns 404');

  const badId = await api('GET', '/api/melds/not-a-uuid');
  knownBug(badId.status === 500, 'GET /api/melds/not-a-uuid should be 400/404 but returns 500 (Postgres 22P02 not mapped)', `status=${badId.status}`);
  knownBug(badId.status === 500 && Boolean(badId.body?.stack), 'Non-production errorHandler returns stack traces in 500 responses (NODE_ENV!=production)');

  const bobUpdate = await api('PUT', `/api/melds/${meldId}`, { token: bobToken, body: { title: 'Hijacked' } });
  check(bobUpdate.status === 403, 'Non-creator PUT /api/melds/:id returns 403', `status=${bobUpdate.status}`);

  const bobDelete = await api('DELETE', `/api/melds/${meldId}`, { token: bobToken });
  check(bobDelete.status === 403, 'Non-creator DELETE /api/melds/:id returns 403', `status=${bobDelete.status}`);

  const bobRequests = await api('GET', `/api/melds/${meldId}/requests`, { token: bobToken });
  check(bobRequests.status === 403, 'Non-creator GET /api/melds/:id/requests returns 403', `status=${bobRequests.status}`);

  const bobChat = await api('GET', `/api/melds/${meldId}/messages`, { token: bobToken });
  check(bobChat.status === 403, 'Non-member GET /api/melds/:id/messages returns 403');

  const aliceChat = await api('GET', `/api/melds/${meldId}/messages`, { token: aliceToken });
  check(aliceChat.status === 200 && Array.isArray(aliceChat.body?.messages), 'Creator GET /api/melds/:id/messages returns 200');

  const aliceUpdate = await api('PUT', `/api/melds/${meldId}`, { token: aliceToken, body: { title: `Renamed ${RUN_ID}` } });
  check(aliceUpdate.status === 200, 'Creator PUT /api/melds/:id returns 200', `status=${aliceUpdate.status} ${JSON.stringify(aliceUpdate.body)?.slice(0, 200)}`);

  const stillThere = await api('GET', `/api/melds/${meldId}`);
  check(stillThere.body?.meld?.title === `Renamed ${RUN_ID}`, 'Non-creator update/delete attempts had no effect; creator rename persisted');

  console.log('\n✉️ [HTTP 5] Invitation send / accept / reject...');

  const bobId = bob.res.body?.user?.id;
  const carolId = carol.res.body?.user?.id;

  const bobInvites = await api('POST', `/api/melds/${meldId}/invite`, { token: bobToken, body: { inviteeId: carolId } });
  check(bobInvites.status === 400 || bobInvites.status === 403, 'Non-creator cannot invite to a MELD', `status=${bobInvites.status}`);

  const invite = await api('POST', `/api/melds/${meldId}/invite`, { token: aliceToken, body: { inviteeId: bobId } });
  check(invite.status === 200 && invite.body?.invitationId, 'Creator invites Bob (200 + invitationId)', `status=${invite.status} ${JSON.stringify(invite.body)}`);
  const invitationId = invite.body?.invitationId;

  const inviteCarol = await api('POST', `/api/melds/${meldId}/invite`, { token: aliceToken, body: { inviteeId: carolId } });
  check(inviteCarol.status === 200, 'Creator invites Carol');
  const carolInvitationId = inviteCarol.body?.invitationId;

  const bobList = await api('GET', '/api/invitations', { token: bobToken });
  const received = bobList.body?.invitations?.received || [];
  check(bobList.status === 200 && received.some((i) => i.invitation_id === invitationId), 'Bob sees the invitation in GET /api/invitations');
  check(!JSON.stringify(bobList.body).includes(alice.email), 'Invitation listing does not leak inviter email');

  const carolSteals = await api('POST', `/api/invitations/${invitationId}/respond`, { token: carolToken, body: { action: 'ACCEPTED' } });
  check(carolSteals.status !== 200, 'Another user cannot accept Bob\'s invitation', `status=${carolSteals.status}`);
  knownBug(carolSteals.status === 500, 'Responding to someone else\'s / unknown invitation returns 500 instead of 404', `status=${carolSteals.status}`);

  const badAction = await api('POST', `/api/invitations/${invitationId}/respond`, { token: bobToken, body: { action: 'MAYBE' } });
  check(badAction.status !== 200, 'Invalid invitation action is rejected');
  knownBug(badAction.status === 500, 'Invalid invitation action returns 500 instead of 400', `status=${badAction.status}`);

  const accept = await api('POST', `/api/invitations/${invitationId}/respond`, { token: bobToken, body: { action: 'ACCEPTED' } });
  check(accept.status === 200 && accept.body?.success === true, 'Bob accepts invitation (200)', `status=${accept.status} ${JSON.stringify(accept.body)}`);

  const afterAccept = await api('GET', `/api/melds/${meldId}`, { token: bobToken });
  check(afterAccept.body?.meld?.isMember === true, 'Bob is now a member of the MELD');
  const members = afterAccept.body?.meld?.members || [];
  check(members.some((m) => m.userId === bobId && m.status === 'ACTIVE'), 'Members list includes Bob as ACTIVE');

  const bobChatNow = await api('GET', `/api/melds/${meldId}/messages`, { token: bobToken });
  check(bobChatNow.status === 200, 'New member can now read chat history');

  const replay = await api('POST', `/api/invitations/${invitationId}/respond`, { token: bobToken, body: { action: 'ACCEPTED' } });
  check(replay.status !== 200, 'Accepting an already-processed invitation is rejected');

  const reject = await api('POST', `/api/invitations/${carolInvitationId}/respond`, { token: carolToken, body: { action: 'REJECTED' } });
  check(reject.status === 200, 'Carol rejects her invitation (200)');
  const afterReject = await api('GET', `/api/melds/${meldId}`, { token: carolToken });
  check(afterReject.body?.meld?.isMember === false, 'Carol is not a member after rejecting');

  console.log('\n🗑️ [HTTP 6] Creator delete...');
  const aliceDelete = await api('DELETE', `/api/melds/${meldId}`, { token: aliceToken });
  check(aliceDelete.status === 200, 'Creator DELETE /api/melds/:id returns 200');
  const gone = await api('GET', `/api/melds/${meldId}`);
  check(gone.status === 404, 'Deleted MELD returns 404');
}

async function cleanup() {
  try {
    await query(`DELETE FROM users WHERE email LIKE $1`, [`http\\_%\\_${RUN_ID}@gmail.com`]);
    await query(`DELETE FROM otp_verifications WHERE email LIKE $1`, [`http\\_%\\_${RUN_ID}@gmail.com`]).catch(() => {});
  } catch (e) {
    console.warn(`⚠️ Cleanup warning: ${e.message}`);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('🌍 RUNNING MELD HTTP API INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Silence expected server-side error logging (errorHandler) to keep output readable
  const origError = console.error;
  const serverErrors = [];
  console.error = (...args) => {
    if (typeof args[0] === 'string' && (args[0].startsWith('Unhandled Server Error') || args[0].startsWith('Auth middleware error') || args[0].startsWith('Error fetching chat'))) {
      serverErrors.push(args);
      return;
    }
    origError(...args);
  };

  let crashed = null;
  try {
    await runNoDbSection();

    const conn = await testConnection();
    if (!conn.connected) {
      console.warn(`\n⚠️ PostgreSQL not reachable (${conn.error}); skipping DB-backed HTTP sections.`);
      skip('HTTP 3-6: register/login/me, MELD authz, invitations', 'Live DB not connected');
    } else {
      try {
        await runDbSection();
      } finally {
        await cleanup();
      }
    }
  } catch (e) {
    crashed = e;
  } finally {
    console.error = origError;
    await new Promise((r) => server.close(r));
    await pool.end().catch(() => {});
  }

  if (crashed) {
    console.error(`\n💥 Suite crashed: ${crashed.stack || crashed.message}`);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`HTTP API: ${passed} passed, ${failed} failed, ${skipped} skipped, ${knownBugs.length} known bugs recorded`);
  if (knownBugs.length) knownBugs.forEach((b) => console.log(`  🐞 ${b}`));
  console.log('======================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

main();
