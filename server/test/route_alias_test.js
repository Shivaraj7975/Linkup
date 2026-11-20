/**
 * Route Alias Test Suite for MELD
 *
 * app.js mounts every router under both /api and the root, and meldRoutes exposes each
 * Meld endpoint as /melds/... and legacy /linkups/.... Endpoint-specific protections
 * (rate limiters) must apply to every alias, otherwise the alias becomes a bypass.
 *
 * Boots the Express app on an ephemeral port. No DB needed: requests are unauthenticated
 * and the limiter runs before auth.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'route-alias-test-secret';

const app = require('../src/app');

let passed = 0;
let failed = 0;
const check = (cond, msg, detail) => {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
};

// [aliases, expected RateLimit-Policy header]
const PROTECTED = [
  [['/api/melds/x/matches', '/melds/x/matches', '/api/linkups/x/matches', '/linkups/x/matches'], '30;w=300'],
  [['/api/users/search', '/users/search'], '60;w=60'],
];

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MELD ROUTE ALIAS TEST SUITE');
  console.log('======================================================\n');

  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const [aliases, policy] of PROTECTED) {
      for (const p of aliases) {
        const res = await fetch(base + p);
        const got = res.headers.get('ratelimit-policy');
        check(got === policy, `${p} is covered by its endpoint limiter (${policy})`, `got ${got}`);
      }
    }
  } finally {
    server.close();
  }

  console.log('\n======================================================');
  console.log(failed === 0 ? `🎉 ALL ${passed} ROUTE ALIAS TESTS PASSED` : `❌ ${failed} TESTS FAILED out of ${passed + failed}`);
  console.log('======================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal Route Alias Test Error:', err);
  process.exit(1);
});
