/**
 * External call timeout tests (no database or network needed: global.fetch is stubbed).
 *
 *  1. NVIDIA Nemotron provider had no timeout: a hung endpoint stalled the AI
 *     provider waterfall and the user's /matches request indefinitely.
 *  2. OpenAI-compatible providers (Groq, NVIDIA Llama, VoidAI) cleared their
 *     timeout once headers arrived, so a body that never finished hung forever.
 *  3. Brevo REST email fetch had no timeout: OTP requests hung on a stalled provider.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'localtestsecret';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

const realFetch = global.fetch;

// Never settles on its own; rejects only when the caller's AbortSignal fires.
const abortableNever = (signal) => new Promise((_, reject) => {
  if (!signal) return;
  if (signal.aborted) return reject(signal.reason || Object.assign(new Error('aborted'), { name: 'AbortError' }));
  signal.addEventListener('abort', () => reject(signal.reason || Object.assign(new Error('aborted'), { name: 'AbortError' })));
});

const hangingFetch = (url, opts = {}) => abortableNever(opts.signal);

const stalledBodyFetch = async (url, opts = {}) => ({
  ok: true,
  status: 200,
  json: () => abortableNever(opts.signal),
  text: () => abortableNever(opts.signal),
});

// Cap each case so a missing timeout fails the test instead of hanging the suite.
// (The cap timer is ref'd on purpose: AbortSignal.timeout() timers are unref'd,
// so without it Node would exit early instead of letting the abort fire.)
const settleWithin = (promise, ms) => {
  let timer;
  return Promise.race([
    promise.then((value) => ({ value }), (error) => ({ error })),
    new Promise((resolve) => { timer = setTimeout(() => resolve({ hung: true }), ms); }),
  ]).finally(() => clearTimeout(timer));
};

const payload = { project: { title: 'x' }, candidates: [] };

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING EXTERNAL CALL TIMEOUT TESTS');
  console.log('======================================================');

  try {
    console.log('\n⏱️  [TIMEOUT 1] NVIDIA Nemotron request is bounded...');
    process.env.NVIDIA_API_KEY = 'test-nvidia-key';
    global.fetch = hangingFetch;
    const { analyzeMatchesWithNvidia } = require('../src/services/ai/nvidiaService');
    let start = Date.now();
    let r = await settleWithin(analyzeMatchesWithNvidia(payload, { timeoutMs: 200 }), 3000);
    assert(!r.hung && r.error && /Timeout/.test(r.error.message), `hung NVIDIA endpoint rejects with a timeout (${r.hung ? 'hung' : r.error?.message}, ${Date.now() - start}ms)`);

    console.log('\n⏱️  [TIMEOUT 2] OpenAI-compatible provider timeout covers the response body...');
    global.fetch = stalledBodyFetch;
    const { analyzeMatchesWithOpenAICompatible } = require('../src/services/ai/openAiCompatibleService');
    start = Date.now();
    r = await settleWithin(analyzeMatchesWithOpenAICompatible(payload, {
      endpoint: 'https://example.invalid/v1/chat/completions',
      apiKey: 'test-key',
      modelName: 'm',
      providerName: 'TEST',
      timeoutMs: 200,
    }), 3000);
    assert(!r.hung && r.error && /Timeout/.test(r.error.message), `stalled response body rejects with a timeout (${r.hung ? 'hung' : r.error?.message}, ${Date.now() - start}ms)`);

    console.log('\n⏱️  [TIMEOUT 3] Brevo REST email send is bounded...');
    process.env.BREVO_API_KEY = 'xkeysib-test';
    process.env.EMAIL_TIMEOUT_MS = '200';
    global.fetch = hangingFetch;
    const { sendOtpEmail } = require('../src/services/emailService');
    start = Date.now();
    r = await settleWithin(sendOtpEmail({ toEmail: 'someone@example.com', otpCode: '123456' }), 3000);
    assert(!r.hung, `stalled Brevo API does not hang the OTP send (${r.hung ? 'hung' : 'settled'} after ${Date.now() - start}ms)`);
  } catch (err) {
    failedCount++;
    console.error('  ❌ FAIL: unexpected error in timeout suite:', err);
  } finally {
    global.fetch = realFetch;
  }

  console.log('\n======================================================');
  if (failedCount === 0) {
    console.log(`🎉 ALL ${passedCount} EXTERNAL CALL TIMEOUT TESTS PASSED (0 Failures)!`);
  } else {
    console.log(`❌ ${failedCount} EXTERNAL CALL TIMEOUT TEST(S) FAILED (${passedCount} passed).`);
  }
  console.log('======================================================\n');
  process.exit(failedCount === 0 ? 0 : 1);
}

run();
