/**
 * AI Provider Timeout Test Suite for MELD
 *
 * Every provider in the AI matching waterfall must give up after AI_PROVIDER_TIMEOUT_MS,
 * otherwise one stalled upstream (no response, no error) blocks the HTTP request forever
 * and the deterministic fallback is never reached.
 *
 * Uses a stubbed global fetch that never resolves unless its AbortSignal fires. No network, no DB.
 */

process.env.NVIDIA_API_KEY = 'test-dummy-nvidia-key';
process.env.AI_PROVIDER_ORDER = 'nvidia_nemotron';
process.env.AI_PROVIDER_TIMEOUT_MS = '200';

const { analyzeMatchesWithNvidia } = require('../src/services/ai/nvidiaService');
const { matchCandidates } = require('../src/services/ai/aiMatchingService');

const GUARD_MS = 3000;
let passed = 0;
let failed = 0;

// fetch stub: hangs until aborted, like an upstream that accepted the connection and went silent.
global.fetch = (url, opts = {}) =>
  new Promise((resolve, reject) => {
    const { signal } = opts;
    if (!signal) return; // never settles
    const onAbort = () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = signal.reason && signal.reason.name ? signal.reason.name : 'AbortError';
      reject(err);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });

const withGuard = (promise) =>
  Promise.race([
    promise.then(
      () => ({ outcome: 'resolved' }),
      (err) => ({ outcome: 'rejected', message: err.message })
    ),
    new Promise((resolve) => setTimeout(() => resolve({ outcome: 'hung' }), GUARD_MS)),
  ]);

const check = (cond, msg, detail) => {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
};

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MELD AI PROVIDER TIMEOUT TEST SUITE');
  console.log('======================================================\n');

  const payload = { project: { title: 't' }, candidates: [] };

  let start = Date.now();
  const direct = await withGuard(analyzeMatchesWithNvidia(payload, { timeoutMs: 200 }));
  check(
    direct.outcome === 'rejected' && /Timeout/i.test(direct.message),
    `NVIDIA Nemotron provider aborts a stalled request (took ${Date.now() - start}ms)`,
    JSON.stringify(direct)
  );

  start = Date.now();
  const waterfall = await withGuard(matchCandidates(payload, new Set(), new Map(), {}));
  check(
    waterfall.outcome === 'rejected' && /All AI providers failed/.test(waterfall.message),
    `Waterfall with a stalled provider fails fast so the deterministic fallback can run (took ${Date.now() - start}ms)`,
    JSON.stringify(waterfall)
  );

  console.log('\n======================================================');
  console.log(failed === 0 ? `🎉 ALL ${passed} AI PROVIDER TIMEOUT TESTS PASSED` : `❌ ${failed} TESTS FAILED out of ${passed + failed}`);
  console.log('======================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal AI Provider Timeout Test Error:', err);
  process.exit(1);
});
