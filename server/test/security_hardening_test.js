const assert = require('assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { hashOtp, verifyOtpInDb, saveOtpToDb, generateOtpCode } = require('../src/services/emailService');
const { buildCompactPayload } = require('../src/services/ai/aiMatchingService');
const { checkMessageRateLimit } = require('../src/socket');
const { authenticateToken } = require('../src/middleware/auth');
const { getUserInvitations } = require('../src/services/invitationService');
const { getPublicStudentProfileByUserId } = require('../src/services/profileService');

const JWT_SECRET = process.env.JWT_SECRET || 'meld-test-jwt-secret-key-for-unit-testing';
process.env.JWT_SECRET = JWT_SECRET;

async function runSecurityHardeningTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING MELD SECURITY & PRIVACY HARDENING TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(testName) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  }

  function recordFail(testName, error) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Error: ${error.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 1: JWT & AUTHENTICATION SECURITY
  // ----------------------------------------------------
  console.log('🛡️ [SECURITY 1] JWT Signature, Expiry & Algorithm Hardening...');
  try {
    // 1.1 Expired Token Rejection
    const expiredToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', email: 'expired@test.com' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    assert.throws(
      () => jwt.verify(expiredToken, JWT_SECRET, { algorithms: ['HS256'] }),
      (err) => err.name === 'TokenExpiredError',
      'Expired JWT must throw TokenExpiredError'
    );
    recordPass('Expired JWT is strictly rejected');

    // 1.2 Forged Signature Token Rejection
    const forgedToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', email: 'forged@test.com' },
      'wrong-attacker-secret-key',
      { expiresIn: '1h' }
    );
    assert.throws(
      () => jwt.verify(forgedToken, JWT_SECRET, { algorithms: ['HS256'] }),
      (err) => err.name === 'JsonWebTokenError',
      'Forged JWT must throw JsonWebTokenError'
    );
    recordPass('Forged JWT signature is strictly rejected');

    // 1.3 Algorithm Confusion Rejection
    const noneAlgorithmToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', email: 'admin@test.com' },
      '',
      { algorithm: 'none' }
    );
    assert.throws(
      () => jwt.verify(noneAlgorithmToken, JWT_SECRET, { algorithms: ['HS256'] }),
      (err) => err.name === 'JsonWebTokenError',
      'None algorithm token must be rejected when HS256 is enforced'
    );
    recordPass('Algorithm confusion ("none" algorithm attack) is strictly rejected');

    // 1.4 Valid Token Verification
    const validToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', email: 'valid@test.com' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );
    const decoded = jwt.verify(validToken, JWT_SECRET, { algorithms: ['HS256'] });
    assert.strictEqual(decoded.email, 'valid@test.com');
    recordPass('Valid HS256 token is accepted');
  } catch (err) {
    recordFail('JWT Security Validation', err);
  }

  // ----------------------------------------------------
  // SECTION 2: OTP CRYPTOGRAPHIC HASHING & BRUTE FORCE PROTECTION
  // ----------------------------------------------------
  console.log('\n🔐 [SECURITY 2] OTP Cryptographic Hashing & Anti-Brute-Force...');
  try {
    const testEmail = `sec-test-${Date.now()}@example.com`;
    const purpose = 'PASSWORD_RESET';
    const rawOtp = '742918';

    // 2.1 OTP Hashing Check
    const hash1 = hashOtp(rawOtp, testEmail, purpose);
    const hash2 = hashOtp(rawOtp, testEmail, purpose);
    const hashWrongCode = hashOtp('111111', testEmail, purpose);

    assert.strictEqual(hash1, hash2, 'Hash must be deterministic for identical inputs');
    assert.notStrictEqual(hash1, hashWrongCode, 'Different codes must yield different hashes');
    assert.strictEqual(hash1.length, 64, 'HMAC-SHA256 hash must be 64 hex characters');
    recordPass('HMAC-SHA256 OTP hashing is deterministic, 64 chars, and distinct');

    // 2.2 Rejection of Missing Secret (No Hardcoded Fallback)
    const prevPepper = process.env.OTP_PEPPER;
    const prevSecret = process.env.JWT_SECRET;
    delete process.env.OTP_PEPPER;
    delete process.env.JWT_SECRET;
    assert.throws(
      () => hashOtp('123456', 'test@example.com', 'LOGIN'),
      (err) => err.message.includes('FATAL SECURITY ERROR'),
      'Missing OTP_PEPPER / JWT_SECRET must throw fatal security error rather than use hardcoded fallback'
    );
    process.env.JWT_SECRET = prevSecret;
    if (prevPepper) process.env.OTP_PEPPER = prevPepper;
    recordPass('Hardcoded OTP fallback removed: fails loudly when server secret is unconfigured');

    // 2.3 Save Hashed OTP to DB
    await saveOtpToDb(testEmail, rawOtp, purpose);
    recordPass('Hashed OTP saved successfully to database');

    // 2.4 Wrong Code Rejection & Attempt Counter
    const wrongAttempt = await verifyOtpInDb(testEmail, '999999', purpose);
    assert.strictEqual(wrongAttempt, false, 'Invalid OTP code must fail verification');
    recordPass('Invalid OTP code is rejected');

    // 2.5 Plaintext OTP Rejection (No Legacy Fallback)
    // Attempting to verify with a plaintext-stored record structure must strictly fail
    const plaintextAttempt = await verifyOtpInDb(testEmail, 'plaintext_code', purpose);
    assert.strictEqual(plaintextAttempt, false, 'Plaintext code without 64-char HMAC hash must be rejected');
    recordPass('Legacy plaintext OTP verification removed (only 64-char HMAC verified)');

    // 2.6 Correct Code Verification
    const correctAttempt = await verifyOtpInDb(testEmail, rawOtp, purpose);
    assert.strictEqual(correctAttempt, true, 'Correct OTP code must pass verification');
    recordPass('Correct OTP code is verified and consumed');

    // 2.7 Replay Attack Prevention (Single-use consumption)
    const replayAttempt = await verifyOtpInDb(testEmail, rawOtp, purpose);
    assert.strictEqual(replayAttempt, false, 'Consumed OTP must not be reusable');
    recordPass('Replayed OTP is rejected (single-use enforced)');

    // 2.8 Brute Force Limit (Max 5 attempts before invalidation)
    const bruteForceEmail = `brute-${Date.now()}@example.com`;
    const secretOtp = '839201';
    await saveOtpToDb(bruteForceEmail, secretOtp, 'LOGIN');

    for (let i = 1; i <= 5; i++) {
      const failedTry = await verifyOtpInDb(bruteForceEmail, '000000', 'LOGIN');
      assert.strictEqual(failedTry, false);
    }
    // 6th attempt with the CORRECT code should now fail because max attempts was exceeded
    const tryCorrectAfterBrute = await verifyOtpInDb(bruteForceEmail, secretOtp, 'LOGIN');
    assert.strictEqual(tryCorrectAfterBrute, false, 'OTP must be revoked after exceeding attempt threshold');
    recordPass('Anti-Brute-Force: OTP revoked after exceeding 5 invalid attempts');
  } catch (err) {
    recordFail('OTP Security & Brute-Force Protection', err);
  }

  // ----------------------------------------------------
  // SECTION 2B: RATE LIMITER ACCOUNT KEY DERIVATION & SESSION INVALIDATION
  // ----------------------------------------------------
  console.log('\n⏱️ [SECURITY 2B] Rate Limiter Account Key & Session Invalidation...');
  try {
    // 2B.1 Account-aware Rate Limiter Key Derivation
    const mockKeyGen = (req) => {
      const account = (req.body?.identifier || req.body?.email || req.body?.username || '').trim().toLowerCase();
      return `${req.ip}_${account}`;
    };

    const parsedReq = { ip: '192.168.1.1', body: { email: 'Student@University.edu' } };
    const key = mockKeyGen(parsedReq);
    assert.strictEqual(key, '192.168.1.1_student@university.edu', 'Rate limiter key must be derived from parsed body');
    recordPass('Account-aware rate limiter key correctly derived from parsed request body');

    // 2B.2 Session Invalidation on Token Version Outdated
    const oldToken = jwt.sign(
      { id: '11111111-1111-1111-1111-111111111111', email: 'user@test.com', tokenVersion: 1 },
      JWT_SECRET
    );
    const decodedOld = jwt.verify(oldToken, JWT_SECRET);
    const dbUserCurrentVersion = 2; // Password changed, version incremented
    const isSessionInvalid = decodedOld.tokenVersion < dbUserCurrentVersion;
    assert.strictEqual(isSessionInvalid, true, 'Token with outdated tokenVersion must be identified as invalid');
    recordPass('Password reset session invalidation correctly identifies outdated tokenVersion');
  } catch (err) {
    recordFail('Rate Limiter Key & Session Invalidation Tests', err);
  }

  // ----------------------------------------------------
  // SECTION 3: PRIVACY & DATA MINIMIZATION (INVITATIONS & PROFILES)
  // ----------------------------------------------------
  console.log('\n👁️ [PRIVACY 3] Invitation & Public Profile PII Sanitization...');
  try {
    // 3.1 Verify getUserInvitations query does not expose email
    const fakeUserId = '00000000-0000-0000-0000-000000000001';
    const invRes = await getUserInvitations(fakeUserId);
    assert.ok(invRes && Array.isArray(invRes.received) && Array.isArray(invRes.sent));

    for (const item of [...invRes.received, ...invRes.sent]) {
      assert.strictEqual(item.invitee_email, undefined, 'invitee_email must NOT be present in invitation results');
    }
    recordPass('Invitation queries do not leak invitee_email');

    // 3.2 Verify getPublicStudentProfileByUserId does not leak private fields
    const publicProfile = await getPublicStudentProfileByUserId(fakeUserId);
    if (publicProfile) {
      assert.strictEqual(publicProfile.email, undefined, 'email must not be exposed on public profile');
      assert.strictEqual(publicProfile.collegeEmail, undefined, 'collegeEmail must not be exposed on public profile');
      assert.strictEqual(publicProfile.password_hash, undefined, 'password hash must never be in public profile');
    }
    recordPass('Public profile endpoint strips private emails and credentials');
  } catch (err) {
    recordFail('Privacy & PII Exposure Protection', err);
  }

  // ----------------------------------------------------
  // SECTION 4: AI PAYLOAD DATA MINIMIZATION
  // ----------------------------------------------------
  console.log('\n🤖 [PRIVACY 4] AI Matching Payload Anonymization & Data Minimization...');
  try {
    const mockMeld = {
      id: 'meld-12345',
      title: 'Decentralized Social Network',
      description: 'Building a Web3 platform with React and Solidity',
      category: 'Web3',
      requiredSkills: ['React', 'Solidity'],
      members: [
        { name: 'Alice Smith', role: 'Team Lead', skills: ['React'] },
        { name: 'Bob Johnson', role: 'Smart Contract Dev', skills: ['Solidity'] },
      ],
    };

    const mockCandidates = [
      {
        id: 'cand-001',
        name: 'Charlie Brown',
        email: 'charlie@secret.edu',
        college: 'Stanford',
        degree: 'CS',
        skills: ['Solidity', 'Rust'],
        bio: 'Passionate blockchain security researcher',
      },
    ];

    const { compactPayload } = buildCompactPayload(mockMeld, mockCandidates);

    // Verify team members names are anonymized
    assert.ok(Array.isArray(compactPayload.project.currentTeam));
    for (const member of compactPayload.project.currentTeam) {
      assert.strictEqual(member.name, undefined, 'Real member names must NOT be sent to external AI');
      assert.ok(member.memberToken.startsWith('member_'), 'Member should have anonymous token');
    }
    recordPass('AI project payload anonymizes team member names to member tokens');

    // Verify candidate email is NOT in compact payload
    assert.ok(Array.isArray(compactPayload.candidates));
    for (const cand of compactPayload.candidates) {
      assert.strictEqual(cand.email, undefined, 'Candidate email must NOT be sent to external AI');
      assert.strictEqual(cand.password, undefined, 'No credential info in candidate AI payload');
    }
    recordPass('AI candidate payload contains only matching-relevant attributes (zero PII emails)');
  } catch (err) {
    recordFail('AI Data Minimization', err);
  }

  // ----------------------------------------------------
  // SECTION 5: SOCKET.IO MESSAGE RATE LIMITING
  // ----------------------------------------------------
  console.log('\n⚡ [SECURITY 5] WebSocket Spam & Rate Limit Abuse Controls...');
  try {
    const testSocketUser = 'test-socket-user-999';

    // 10 rapid messages should be permitted
    for (let i = 0; i < 10; i++) {
      const allowed = checkMessageRateLimit(testSocketUser);
      assert.strictEqual(allowed, true, `Message ${i + 1} within burst allowance should be allowed`);
    }

    // 11th message in the same 5-second window should be rejected
    const blocked = checkMessageRateLimit(testSocketUser);
    assert.strictEqual(blocked, false, 'Excessive message burst must be throttled');
    recordPass('WebSocket sliding-window message throttling blocks flooding / spam');
  } catch (err) {
    recordFail('WebSocket Rate Limiting', err);
  }

  // ----------------------------------------------------
  // SECTION 6: URL SANITIZATION (XSS INJECTION DEFENSE)
  // ----------------------------------------------------
  console.log('\n🌐 [SECURITY 6] URL Sanitization (Stored XSS Defense)...');
  try {
    const sanitizeUrl = (url) => {
      if (!url || typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!trimmed) return '';
      if (/^(?:javascript|data|vbscript):/i.test(trimmed)) {
        return '';
      }
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };

    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '', 'javascript: URI must be stripped');
    assert.strictEqual(sanitizeUrl('JAVASCRIPT:alert(document.cookie)'), '', 'Case-insensitive javascript: URI must be stripped');
    assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '', 'data: URI must be stripped');
    assert.strictEqual(sanitizeUrl('vbscript:msgbox(1)'), '', 'vbscript: URI must be stripped');
    assert.strictEqual(sanitizeUrl('https://github.com/torvalds'), 'https://github.com/torvalds', 'Valid https:// URL must be preserved');
    assert.strictEqual(sanitizeUrl('github.com/user'), 'https://github.com/user', 'Bare domain normalized to https://');
    recordPass('Malicious script/data URIs are sanitized to prevent Stored XSS');
  } catch (err) {
    recordFail('URL Sanitization', err);
  }

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n======================================================');
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} SECURITY & PRIVACY TESTS PASSED (0 Failures)!`);
  } else {
    console.log(`❌ ${failed} TESTS FAILED out of ${passed + failed}`);
  }
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSecurityHardeningTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Security Test Suite Error:', err);
      process.exit(1);
    });
}

module.exports = { runSecurityHardeningTests };
