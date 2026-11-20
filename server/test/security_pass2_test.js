/**
 * Security hardening pass 2 regression tests (audit/security-hardening).
 *
 * Unit sections run without a database; the HTTP sections need the local test DB
 * and are skipped (not failed) when it is unreachable.
 *
 *  P1  Strict email validation blocks "me@gmail.com,iit.ac.in" college bypass
 *  P2  Destructive DB scripts refuse production / remote targets
 *  P3  Error handler hides internals unless NODE_ENV is development/test
 *  P4  Rate-limit keys: IPv6 subnet bucketing, handler-consistent account field, '@' strip
 *  P5  Oversized skills / interests / requiredSkills lists are rejected
 *  P6  AI payload bounds each candidate's skills / interests
 *  P7  Unknown OTP types rejected; verify-otp limited to pre-registration purposes
 *  P8  SMTP transport requires STARTTLS
 *  H1  (DB) send-otp / link-college-email reject the comma-separated college address
 *  H2  (DB) PUT /profile with a new college email drops VERIFIED status; same email keeps it
 *  H3  (DB) Oversized lists return 400 over HTTP; normal profile update still works
 *  H4  (DB) send-otp rejects unknown type; verify-otp rejects LOGIN type
 */
const assert = require('assert');
const crypto = require('crypto');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'meld-pass2-test-secret';
process.env.OTP_PEPPER = process.env.OTP_PEPPER || 'meld-pass2-test-pepper';
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') process.env.NODE_ENV = 'test';

let passed = 0;
let failed = 0;
let skipped = 0;
const pass = (name) => { passed++; console.log(`  ✅ PASS: ${name}`); };
const fail = (name, err) => { failed++; console.error(`  ❌ FAIL: ${name}\n     ${err && err.message ? err.message : err}`); };
const skip = (name, why) => { skipped++; console.log(`  ⚠️ SKIP: ${name} (${why})`); };
const check = (name, fn) => {
  try { fn(); pass(name); } catch (e) { fail(name, e); }
};

async function unitTests() {
  console.log('\n🔐 [P1] Strict email validation');
  const { isCollegeEmail, isValidEmailAddress, isKnownPurpose } = require('../src/services/emailService');
  check('comma-separated address is not a college email', () => {
    assert.strictEqual(isCollegeEmail('attacker@gmail.com,iit.ac.in'), false);
    assert.strictEqual(isCollegeEmail('attacker@gmail.com;iit.ac.in'), false);
    assert.strictEqual(isCollegeEmail('a@gmail.com iit.ac.in'), false);
  });
  check('real college addresses still accepted', () => {
    for (const e of ['student@iit.ac.in', 'first.last@cs.stanford.edu', 'x+tag@kletech.ac.in', 'STU@UNI.EDU']) {
      assert.strictEqual(isCollegeEmail(e), true, e);
    }
  });
  check('isValidEmailAddress accepts normal personal emails and rejects separators', () => {
    for (const e of ['john.doe@gmail.com', 'o\'neil@outlook.com', 'a_b-c@sub.example.co.uk']) assert.ok(isValidEmailAddress(e), e);
    for (const e of ['a@b', 'a@gmail.com,b@x.com', 'a@@b.com', 'a b@c.com', '', null, 42, `${'a'.repeat(250)}@x.com`]) assert.ok(!isValidEmailAddress(e), String(e));
  });

  console.log('\n🧨 [P2] Destructive DB script guard');
  const { getDestructiveRunBlockReason } = require('../src/db/destructiveGuard');
  check('blocks NODE_ENV=production', () => assert.ok(getDestructiveRunBlockReason({ NODE_ENV: 'production', DB_HOST: '127.0.0.1' })));
  check('blocks DATABASE_URL and non-local DB_HOST', () => {
    assert.ok(getDestructiveRunBlockReason({ DATABASE_URL: 'postgres://redacted' }));
    assert.ok(getDestructiveRunBlockReason({ DB_HOST: 'meld-db.postgres.database.azure.com' }));
  });
  check('allows local dev/test and explicit override', () => {
    assert.strictEqual(getDestructiveRunBlockReason({ NODE_ENV: 'test', DB_HOST: '127.0.0.1' }), null);
    assert.strictEqual(getDestructiveRunBlockReason({ DB_HOST: 'localhost' }), null);
    assert.strictEqual(getDestructiveRunBlockReason({}), null);
    assert.strictEqual(getDestructiveRunBlockReason({ NODE_ENV: 'production', ALLOW_DESTRUCTIVE_DB_SCRIPTS: 'true' }), null);
  });

  console.log('\n🧯 [P3] Error handler fails closed');
  const { errorHandler } = require('../src/middleware/errorHandler');
  const runHandler = (nodeEnv) => {
    const prev = process.env.NODE_ENV;
    if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv;
    const origErr = console.error; console.error = () => {};
    let out;
    const res = { status(c) { out = { code: c }; return this; }, json(b) { out.body = b; return this; } };
    try { errorHandler(new Error('relation "users" internal detail'), { originalUrl: '/x', method: 'GET' }, res, () => {}); }
    finally { console.error = origErr; process.env.NODE_ENV = prev; }
    return out;
  };
  check('unset NODE_ENV: no stack, generic 500 message', () => {
    const r = runHandler(undefined);
    assert.strictEqual(r.code, 500);
    assert.strictEqual(r.body.stack, undefined);
    assert.ok(!r.body.message.includes('relation'));
  });
  check('production: no stack', () => assert.strictEqual(runHandler('production').body.stack, undefined));
  check('test/development: stack still available for debugging', () => assert.ok(runHandler('test').body.stack));

  console.log('\n⏱️ [P4] Rate-limit keys');
  const { ipAccountKey } = require('../src/middleware/rateLimitKeys');
  check('IPv6 addresses in the same /56 share a bucket', () => {
    const a = ipAccountKey({ ip: '2001:db8:abcd:1200::1', originalUrl: '/api/auth/login', body: { identifier: 'bob' } });
    const b = ipAccountKey({ ip: '2001:db8:abcd:12ff:ffff::9', originalUrl: '/api/auth/login', body: { identifier: 'bob' } });
    assert.strictEqual(a, b);
  });
  check('IPv4 keys unchanged in shape', () => {
    assert.strictEqual(ipAccountKey({ ip: '192.168.1.1', originalUrl: '/api/auth/login', body: { email: 'Student@University.edu' } }), '192.168.1.1_student@university.edu');
  });
  check('register / verify-otp keyed on email, ignoring a junk identifier', () => {
    for (const p of ['/api/auth/register', '/auth/verify-otp', '/api/auth/verify-otp']) {
      const k1 = ipAccountKey({ ip: '10.0.0.1', originalUrl: p, body: { email: 'v@x.com', identifier: 'junk1' } });
      const k2 = ipAccountKey({ ip: '10.0.0.1', originalUrl: p, body: { email: 'v@x.com', identifier: 'junk2' } });
      assert.strictEqual(k1, k2, p);
    }
  });
  check('leading @ stripped so "@bob" and "bob" share a bucket; non-string bodies do not throw', () => {
    const k1 = ipAccountKey({ ip: '10.0.0.1', originalUrl: '/api/auth/login', body: { identifier: '@Bob' } });
    const k2 = ipAccountKey({ ip: '10.0.0.1', originalUrl: '/api/auth/login', body: { identifier: 'bob' } });
    assert.strictEqual(k1, k2);
    ipAccountKey({ ip: '10.0.0.1', originalUrl: '/api/auth/login', body: { identifier: { $ne: 1 } } });
  });

  console.log('\n📏 [P5] List size limits');
  const { findListLimitViolation } = require('../src/utils/requestLimits');
  check('normal lists pass', () => {
    assert.strictEqual(findListLimitViolation({ skills: ['React', { name: 'Node.js' }], interests: [1, 2, 3] }, ['skills', 'interests']), null);
    assert.strictEqual(findListLimitViolation({}, ['skills']), null);
  });
  check('oversized lists and long names rejected', () => {
    assert.ok(findListLimitViolation({ skills: Array.from({ length: 101 }, (_, i) => `s${i}`) }, ['skills']));
    assert.ok(findListLimitViolation({ requiredSkills: Array.from({ length: 51 }, (_, i) => `s${i}`) }, ['requiredSkills']));
    assert.ok(findListLimitViolation({ skills: ['x'.repeat(101)] }, ['skills']));
  });

  console.log('\n🤖 [P6] AI payload bounds');
  const { buildCompactPayload } = require('../src/services/ai/aiMatchingService');
  check('candidate skills/interests capped at 50 items of <=100 chars', () => {
    const many = Array.from({ length: 500 }, (_, i) => `Skill${i}${'z'.repeat(150)}`);
    const out = buildCompactPayload(
      { id: 'm1', title: 'T', description: 'D', requiredSkills: [] },
      [{ id: 'u1', skills: many, interests: many, bio: 'b' }],
      { derivedRoles: [], filledRoles: [], currentTeamMembers: [], unmetNeeds: [] },
      {}
    );
    const payload = out.compactPayload || out;
    const cand = payload.candidates[0];
    assert.ok(cand.skills.length <= 50 && cand.interests.length <= 50, `${cand.skills.length}/${cand.interests.length}`);
    assert.ok(cand.skills.every((s) => s.length <= 100));
  });

  console.log('\n🔢 [P7] OTP purpose whitelist');
  check('known client types accepted, unknown rejected', () => {
    for (const t of [undefined, 'PRIMARY', 'COLLEGE', 'LOGIN', 'PASSWORD_RESET', 'registration']) assert.ok(isKnownPurpose(t), String(t));
    for (const t of ['ANYTHING_GOES', 'ADMIN', '__proto__', 'constructor']) assert.ok(!isKnownPurpose(t), t);
  });

  console.log('\n✉️ [P8] SMTP STARTTLS required');
  check('nodemailer transport is created with requireTLS', () => {
    const src = require('fs').readFileSync(require.resolve('../src/services/emailService'), 'utf8');
    const block = src.slice(src.indexOf('nodemailer.createTransport('), src.indexOf('nodemailer.createTransport(') + 400);
    assert.ok(/requireTLS:\s*true/.test(block));
  });
}

async function httpTests() {
  const { testConnection, query, pool } = require('../src/config/db');
  const conn = await testConnection().catch(() => ({ success: false }));
  if (!conn || conn.success === false) {
    skip('H1-H4 HTTP sections', 'Live DB not connected');
    return;
  }
  const { saveOtpToDb } = require('../src/services/emailService');
  const app = require('../src/app');
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const api = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, body: json };
  };
  const tag = crypto.randomBytes(4).toString('hex');
  const userEmail = `pass2-${tag}@gmail.com`;
  const createdIds = [];
  try {
    // Register a user via the real flow with a seeded OTP (no email is sent)
    await saveOtpToDb(userEmail, '123456', 'REGISTRATION');
    const reg = await api('POST', '/auth/register', { name: 'Pass Two', email: userEmail, password: 'Str0ngPassword9', primaryOtp: '123456' });
    assert.ok([200, 201].includes(reg.status), `register status ${reg.status} ${JSON.stringify(reg.body)}`);
    const token = reg.body.token || reg.body.data?.token;
    const userId = reg.body.user?.id || reg.body.data?.user?.id;
    createdIds.push(userId);

    console.log('\n🎓 [H1] College email bypass');
    {
      const evil = 'attacker@gmail.com,iit.ac.in';
      const r1 = await api('POST', '/auth/send-otp', { email: evil, type: 'COLLEGE' });
      r1.status === 400 ? pass('send-otp COLLEGE rejects comma-separated address (400)') : fail('send-otp COLLEGE comma address', `status=${r1.status}`);
      await saveOtpToDb(evil, '654321', 'COLLEGE_VERIFICATION').catch(() => {});
      const r2 = await api('POST', '/profile/link-college-email', { collegeEmail: evil, collegeOtp: '654321' }, token);
      r2.status === 400 ? pass('link-college-email rejects comma-separated address (400)') : fail('link-college-email comma address', `status=${r2.status}`);
      const ok = await api('POST', '/auth/send-otp', { email: `real-${tag}@iit.ac.in`, type: 'COLLEGE' });
      ok.status === 200 ? pass('send-otp COLLEGE still accepts a real college address') : fail('send-otp real college', `status=${ok.status}`);
    }

    console.log('\n🎓 [H2] College email change drops verification');
    {
      const college = `stu-${tag}@kletech.ac.in`;
      await saveOtpToDb(college, '111222', 'COLLEGE_VERIFICATION');
      const link = await api('POST', '/profile/link-college-email', { collegeEmail: college, collegeOtp: '111222' }, token);
      assert.strictEqual(link.status, 200, `link status ${link.status} ${JSON.stringify(link.body)}`);
      const statusOf = async () => (await query('SELECT status FROM student_verifications WHERE user_id = $1', [userId])).rows[0]?.status;
      assert.strictEqual(await statusOf(), 'VERIFIED');
      const same = await api('PUT', '/profile', { college_email: college.toUpperCase(), college: 'KLE Tech', degree: 'BE' }, token);
      (same.status === 200 && (await statusOf()) === 'VERIFIED')
        ? pass('saving the same (verified) college email keeps VERIFIED')
        : fail('same college email keeps VERIFIED', `status=${same.status} ver=${await statusOf()}`);
      const changed = await api('PUT', '/profile', { college_email: `president-${tag}@harvard.edu`, college: 'Harvard', degree: 'BE' }, token);
      (changed.status === 200 && (await statusOf()) === 'UNVERIFIED')
        ? pass('changing the college email via PUT /profile drops VERIFIED')
        : fail('changed college email drops VERIFIED', `status=${changed.status} ver=${await statusOf()}`);
    }

    console.log('\n📏 [H3] List limits over HTTP');
    {
      const big = await api('PUT', '/profile', { skills: Array.from({ length: 1000 }, (_, i) => `pass2-${tag}-${i}`) }, token);
      big.status === 400 ? pass('PUT /profile with 1000 skills returns 400') : fail('PUT /profile 1000 skills', `status=${big.status}`);
      const leaked = await query('SELECT COUNT(*)::int AS c FROM skills WHERE name LIKE $1', [`pass2-${tag}-%`]);
      leaked.rows[0].c === 0 ? pass('rejected request wrote no skills') : fail('no skills written', `count=${leaked.rows[0].c}`);
      const normal = await api('PUT', '/profile', { skills: ['React', 'Node.js'], college: 'KLE Tech', degree: 'BE' }, token);
      normal.status === 200 ? pass('normal profile update still succeeds') : fail('normal profile update', `status=${normal.status}`);
      const meld = await api('POST', '/melds', { title: 'Pass2 meld', description: 'A description long enough.', category: 'Web', projectDuration: '1 month', requiredSkills: Array.from({ length: 60 }, (_, i) => `r${i}`) }, token);
      meld.status === 400 ? pass('POST /melds with 60 requiredSkills returns 400') : fail('POST /melds 60 skills', `status=${meld.status}`);
    }

    console.log('\n🔢 [H4] OTP type whitelist over HTTP');
    {
      const bad = await api('POST', '/auth/send-otp', { email: `x-${tag}@gmail.com`, type: 'ANYTHING_GOES' });
      bad.status === 400 ? pass('send-otp unknown type returns 400') : fail('send-otp unknown type', `status=${bad.status}`);
      const stored = await query("SELECT COUNT(*)::int AS c FROM otp_verifications WHERE purpose = 'ANYTHING_GOES'");
      stored.rows[0].c === 0 ? pass('no OTP stored for unknown type') : fail('no OTP stored', `count=${stored.rows[0].c}`);
      await saveOtpToDb(userEmail, '999888', 'LOGIN');
      const v = await api('POST', '/auth/verify-otp', { email: userEmail, otpCode: '999888', type: 'LOGIN' });
      v.status === 400 ? pass('verify-otp refuses LOGIN codes') : fail('verify-otp LOGIN', `status=${v.status}`);
      const otpLogin = await api('POST', '/auth/login-otp', { identifier: userEmail, otpCode: '999888' });
      otpLogin.status === 200 ? pass('LOGIN code still usable by login-otp afterwards') : fail('login-otp after refused verify', `status=${otpLogin.status}`);
    }
  } catch (e) {
    fail('HTTP sections crashed', e);
  } finally {
    for (const id of createdIds.filter(Boolean)) await query('DELETE FROM users WHERE id = $1', [id]).catch(() => {});
    await query("DELETE FROM skills WHERE name LIKE 'pass2-%'").catch(() => {});
    server.close();
    await pool.end().catch(() => {});
  }
}

(async () => {
  console.log('\n======================================================');
  console.log('🛡️  RUNNING MELD SECURITY HARDENING PASS 2 TESTS');
  console.log('======================================================');
  await unitTests();
  await httpTests();
  console.log('\n======================================================');
  console.log(`SECURITY PASS 2: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('======================================================\n');
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
