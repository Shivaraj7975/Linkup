/**
 * Security regression tests (audit/security).
 *
 * Runs WITHOUT a database: the `query` export of src/config/db is replaced by an
 * in-memory stub BEFORE any app module is required, so these checks are
 * deterministic in headless CI.
 *
 * Covers:
 *  R1  send-otp (PASSWORD_RESET) must not disclose the account email / existence
 *  R2  send-otp (LOGIN) must only return a masked email
 *  R3  AI matching rate limiter must cover every route alias (incl. /api/linkups/:id/matches)
 *  R4  Socket.IO handshake must reject tokens invalidated by password reset / deleted users
 *  R5  optionalAuth must ignore tokens invalidated by password reset
 *  R6  Removed / departing members must be evicted from the meld chat room
 *  R7  Password reset must disconnect live sockets of that user
 */
const assert = require('assert');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'meld-regression-test-secret';
process.env.OTP_PEPPER = process.env.OTP_PEPPER || 'meld-regression-test-pepper';
if (process.env.NODE_ENV === 'development') process.env.NODE_ENV = 'test';
const JWT_SECRET = process.env.JWT_SECRET;

// ---------------------------------------------------------------------------
// In-memory DB stub (must be installed before requiring app modules)
// ---------------------------------------------------------------------------
const CREATOR_ID = '00000000-0000-4000-8000-000000000001';
const MEMBER_ID = '00000000-0000-4000-8000-000000000002';
const MELD_ID = '00000000-0000-4000-8000-0000000000aa';

const state = {
  users: new Map(), // id -> { id, name, username, email, token_version }
  activeMembers: new Set(), // `${meldId}:${userId}`
};

const db = require('../src/config/db');
const stubQuery = async (text, params = []) => {
  const sql = String(text).replace(/\s+/g, ' ').trim();

  if (/^SELECT id\b.* FROM users WHERE id = \$1$/.test(sql)) {
    const u = state.users.get(params[0]);
    return { rows: u ? [{ ...u }] : [] };
  }
  if (/^SELECT creator_id FROM melds WHERE id = \$1$/.test(sql)) {
    return { rows: params[0] === MELD_ID ? [{ creator_id: CREATOR_ID }] : [] };
  }
  if (/^SELECT status FROM meld_members WHERE meld_id = \$1 AND user_id = \$2 AND status = 'ACTIVE'$/.test(sql)) {
    return { rows: state.activeMembers.has(`${params[0]}:${params[1]}`) ? [{ status: 'ACTIVE' }] : [] };
  }
  if (/^SELECT creator_id, current_status FROM melds WHERE id = \$1$/.test(sql)) {
    return { rows: params[0] === MELD_ID ? [{ creator_id: CREATOR_ID, current_status: 'OPEN' }] : [] };
  }
  if (/FROM melds l WHERE l\.id = \$1/.test(sql)) {
    return {
      rows: params[0] === MELD_ID
        ? [{ id: MELD_ID, creator_id: CREATOR_ID, title: 't', current_status: 'OPEN', max_members: 4 }]
        : [],
    };
  }
  if (/^SELECT \* FROM meld_members WHERE meld_id = \$1 AND user_id = \$2$/.test(sql)) {
    return { rows: state.activeMembers.has(`${params[0]}:${params[1]}`) ? [{ meld_id: params[0], user_id: params[1] }] : [] };
  }
  if (/^DELETE FROM meld_members WHERE meld_id = \$1 AND user_id = \$2/.test(sql)) {
    const key = `${params[0]}:${params[1]}`;
    const existed = state.activeMembers.delete(key);
    return { rows: existed ? [{ id: 1 }] : [] };
  }
  return { rows: [] };
};
db.query = stubQuery;

// Stub OTP persistence / delivery so auth controller tests never touch DB or SMTP
const emailService = require('../src/services/emailService');
emailService.saveOtpToDb = async () => {};
emailService.sendOtpEmail = async () => ({ success: true, mode: 'TEST' });
emailService.verifyOtpInDb = async () => true;

const authService = require('../src/services/authService');
authService.findUserByIdentifier = async (identifier) => {
  const clean = String(identifier || '').trim().replace(/^@/, '').toLowerCase();
  for (const u of state.users.values()) {
    if (u.email === clean || u.username === clean) return { ...u, password_hash: 'x' };
  }
  return null;
};
authService.updateUserPassword = async (email) => {
  for (const u of state.users.values()) {
    if (u.email === email) u.token_version += 1;
  }
  return null;
};

// Now load app modules (they capture the stubs above)
const app = require('../src/app');
const socketModule = require('../src/socket');
const { optionalAuth } = require('../src/middleware/optionalAuth');
const authController = require('../src/controllers/authController');
const meldService = require('../src/services/meldService');

const sign = (id, tokenVersion) =>
  jwt.sign({ id, email: 'x@example.com', tokenVersion }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

const mockRes = () => {
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

const runSocketAuth = (token) =>
  new Promise((resolve) => {
    const socket = { handshake: { auth: { token } } };
    socketModule.authenticateSocket(socket, (err) => resolve({ err, socket }));
  });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function loadSocketClient() {
  const candidates = [
    'socket.io-client',
    path.join(__dirname, '../../client/node_modules/socket.io-client'),
  ];
  for (const c of candidates) {
    try {
      return require(c).io;
    } catch {}
  }
  return null;
}

async function main() {
  console.log('\n======================================================');
  console.log('RUNNING MELD SECURITY REGRESSION TEST SUITE (no DB required)');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (err) {
      if (err && err.skip) {
        console.log(`  SKIP: ${name} (${err.message})`);
        skipped++;
        return;
      }
      console.error(`  FAIL: ${name}`);
      console.error(`     Error: ${err && err.message}`);
      failed++;
    }
  };

  state.users.set(CREATOR_ID, { id: CREATOR_ID, name: 'Creator', username: 'creatoruser', email: 'creator.person@example.com', token_version: 1 });
  state.users.set(MEMBER_ID, { id: MEMBER_ID, name: 'Member', username: 'victimuser', email: 'victim.secret@example.com', token_version: 2 });

  // R1 ---------------------------------------------------------------------
  await test('R1 send-otp PASSWORD_RESET by username does not disclose email or account existence', async () => {
    const resExisting = mockRes();
    await authController.sendOtp({ body: { identifier: 'victimuser', type: 'PASSWORD_RESET' } }, resExisting, (e) => { throw e; });
    const resMissing = mockRes();
    await authController.sendOtp({ body: { identifier: 'nobodyhere99', type: 'PASSWORD_RESET' } }, resMissing, (e) => { throw e; });

    const serialized = JSON.stringify(resExisting.body);
    assert.strictEqual(resExisting.statusCode, 200);
    assert.ok(!serialized.includes('victim.secret@example.com'), 'response must not contain the resolved email');
    assert.ok(!('email' in resExisting.body), 'response must not carry an email field');
    assert.strictEqual(resExisting.body.message, resMissing.body.message, 'existing vs missing account responses must match');
    assert.strictEqual(resExisting.statusCode, resMissing.statusCode);
  });

  // R2 ---------------------------------------------------------------------
  await test('R2 send-otp LOGIN by username returns only a masked email', async () => {
    const res = mockRes();
    await authController.sendOtp({ body: { identifier: 'victimuser', type: 'LOGIN' } }, res, (e) => { throw e; });
    const serialized = JSON.stringify(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(!serialized.includes('victim.secret@example.com'), 'full email leaked to anonymous caller');
    assert.strictEqual(res.body.email, emailService.maskEmail('victim.secret@example.com'));
  });

  // R3 ---------------------------------------------------------------------
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  await test('R3 AI matching limiter (30/5min) applies to every matches alias', async () => {
    const aliases = [
      `/api/melds/${MELD_ID}/matches`,
      `/melds/${MELD_ID}/matches`,
      `/api/linkups/${MELD_ID}/matches`,
      `/linkups/${MELD_ID}/matches`,
    ];
    for (const p of aliases) {
      const r = await fetch(base + p);
      assert.strictEqual(r.status, 401, `${p} should require auth`);
      assert.strictEqual(r.headers.get('ratelimit-limit'), '30', `${p} is not covered by aiMatchingLimiter (limit=${r.headers.get('ratelimit-limit')})`);
    }
  });

  // R4 ---------------------------------------------------------------------
  await test('R4a Socket handshake rejects token invalidated by password reset (stale tokenVersion)', async () => {
    const { err } = await runSocketAuth(sign(MEMBER_ID, 1)); // db token_version = 2
    assert.ok(err, 'stale token must be rejected');
  });
  await test('R4b Socket handshake rejects token of deleted user', async () => {
    const { err } = await runSocketAuth(sign('00000000-0000-4000-8000-00000000dead', 1));
    assert.ok(err, 'token for missing user must be rejected');
  });
  await test('R4c Socket handshake accepts current token and rejects alg=none / forged', async () => {
    const ok = await runSocketAuth(sign(MEMBER_ID, 2));
    assert.ok(!ok.err, 'current token must be accepted');
    assert.strictEqual(ok.socket.user.id, MEMBER_ID);
    const none = jwt.sign({ id: MEMBER_ID, tokenVersion: 2 }, null, { algorithm: 'none' });
    assert.ok((await runSocketAuth(none)).err, 'alg=none must be rejected');
    const forged = jwt.sign({ id: MEMBER_ID, tokenVersion: 2 }, 'attacker', { algorithm: 'HS256' });
    assert.ok((await runSocketAuth(forged)).err, 'forged token must be rejected');
  });

  // R5 ---------------------------------------------------------------------
  await test('R5 optionalAuth treats stale-version token as anonymous and pins HS256', async () => {
    const run = (token) => new Promise((resolve) => {
      const req = { headers: { authorization: `Bearer ${token}` } };
      optionalAuth(req, {}, () => resolve(req));
    });
    assert.strictEqual((await run(sign(MEMBER_ID, 1))).user, undefined, 'stale token must not attach user');
    const fresh = await run(sign(MEMBER_ID, 2));
    assert.ok(fresh.user && fresh.user.id === MEMBER_ID, 'current token must attach user');
    const hs512 = jwt.sign({ id: MEMBER_ID, tokenVersion: 2 }, JWT_SECRET, { algorithm: 'HS512' });
    assert.strictEqual((await run(hs512)).user, undefined, 'non-HS256 token must be ignored');
  });

  // R6 / R7 (live Socket.IO) -----------------------------------------------
  const ioClient = loadSocketClient();
  socketModule.initSocket(server);

  const connectAs = (userId, tokenVersion) => new Promise((resolve, reject) => {
    const c = ioClient(base, { auth: { token: sign(userId, tokenVersion) }, transports: ['websocket'], reconnection: false, forceNew: true });
    c.once('connect', () => resolve(c));
    c.once('connect_error', reject);
  });
  const joinMeld = (c) => new Promise((resolve) => c.emit('join_meld', MELD_ID, resolve));
  const receivesBroadcast = async (c) => {
    let got = false;
    const h = () => { got = true; };
    c.on('new_message', h);
    socketModule.getIo().to(`meld:${MELD_ID}`).emit('new_message', { content: 'secret team message' });
    await wait(150);
    c.off('new_message', h);
    return got;
  };
  const needClient = () => {
    if (!ioClient) {
      const e = new Error('socket.io-client not installed');
      e.skip = true;
      throw e;
    }
  };

  await test('R4d Live Socket.IO connection with stale (pre-reset) token is refused', async () => {
    needClient();
    let connected = false;
    try {
      const c = await connectAs(MEMBER_ID, 1); // db token_version = 2
      connected = true;
      c.close();
    } catch (err) {
      assert.ok(/Authentication error/.test(err.message), `unexpected error: ${err.message}`);
    }
    assert.strictEqual(connected, false, 'stale token was allowed to open a socket');
  });

  await test('R6a Member removed by creator stops receiving meld chat broadcasts', async () => {
    needClient();
    state.activeMembers.add(`${MELD_ID}:${MEMBER_ID}`);
    const c = await connectAs(MEMBER_ID, 2);
    try {
      const ack = await joinMeld(c);
      assert.ok(ack && ack.success, 'member should join room');
      assert.ok(await receivesBroadcast(c), 'sanity: member receives broadcasts while active');
      await meldService.removeTeamMember(MELD_ID, MEMBER_ID, CREATOR_ID);
      await wait(50);
      assert.strictEqual(await receivesBroadcast(c), false, 'removed member still receives chat messages');
      assert.strictEqual(socketModule.isUserActiveInMeldChat(MELD_ID, MEMBER_ID), false);
    } finally {
      c.close();
    }
  });

  await test('R6b Member who leaves stops receiving meld chat broadcasts', async () => {
    needClient();
    state.activeMembers.add(`${MELD_ID}:${MEMBER_ID}`);
    const c = await connectAs(MEMBER_ID, 2);
    try {
      const ack = await joinMeld(c);
      assert.ok(ack && ack.success, 'member should join room');
      await meldService.leaveLinkup(MELD_ID, MEMBER_ID);
      await wait(50);
      assert.strictEqual(await receivesBroadcast(c), false, 'departed member still receives chat messages');
    } finally {
      c.close();
    }
  });

  await test('R7 Password reset disconnects the user\'s live sockets', async () => {
    needClient();
    const c = await connectAs(CREATOR_ID, 1);
    try {
      const disconnected = new Promise((resolve) => c.once('disconnect', () => resolve(true)));
      const res = mockRes();
      await authController.resetPassword(
        { body: { identifier: 'creatoruser', otpCode: '123456', newPassword: 'newpassword123' } },
        res,
        (e) => { throw e; }
      );
      assert.strictEqual(res.statusCode, 200);
      const result = await Promise.race([disconnected, wait(1000).then(() => false)]);
      assert.strictEqual(result, true, 'socket stayed connected after password reset');
      // And the old token can no longer re-handshake
      assert.ok((await runSocketAuth(sign(CREATOR_ID, 1))).err, 'old token must be rejected after reset');
    } finally {
      c.close();
    }
  });

  socketModule.getIo().close();
  await new Promise((r) => server.close(r));

  console.log('\n======================================================');
  if (failed === 0) {
    console.log(`ALL ${passed} SECURITY REGRESSION TESTS PASSED (${skipped} skipped, 0 failures)`);
  } else {
    console.error(`${failed} FAILED, ${passed} passed, ${skipped} skipped`);
  }
  console.log('======================================================\n');
  await db.pool.end().catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in regression suite:', err);
  process.exit(1);
});
