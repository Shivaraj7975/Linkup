/**
 * Server lifecycle tests (spawns src/server.js as a child process).
 *
 *  1. SIGTERM triggers a graceful shutdown: process exits with code 0 after
 *     closing HTTP/Socket.IO and the pg pool (previously killed by the signal
 *     with in-flight requests and pool connections dropped).
 *  2. GET /api/health returns 503 when the database is unreachable
 *     (previously 200 "running", so health probes never took it out of rotation).
 *  3. A valid token gets 503 (not 401) when the DB is down: auth middleware
 *     answered 401 on any error, so a DB blip logged every user out.
 *
 * Does not need a database: test 2 deliberately points at a closed port, and
 * test 1 only needs the process to start.
 */

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

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

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.unref();
  srv.on('error', reject);
  srv.listen(0, '127.0.0.1', () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

async function startServer(extraEnv = {}) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(__dirname, '../src/server.js')], {
    env: {
      ...process.env,
      PORT: String(port),
      JWT_SECRET: process.env.JWT_SECRET || 'localtestsecret',
      NODE_ENV: 'test',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return { child, port, exited, getOutput: () => output };
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), ms)),
]);

async function testGracefulShutdown() {
  console.log('\n🛑 [LIFECYCLE 1] SIGTERM shuts the server down gracefully...');
  const { child, port, exited, getOutput } = await startServer();
  const res = await fetch(`http://127.0.0.1:${port}/`).catch(() => null);
  assert(res && res.status === 200, 'server started and answers requests');

  child.kill('SIGTERM');
  const result = await withTimeout(exited, 8000);
  if (result.timedOut) child.kill('SIGKILL');
  assert(!result.timedOut && result.code === 0, `process exits with code 0 after SIGTERM (got code=${result.code}, signal=${result.signal}${result.timedOut ? ', timed out' : ''})`);
  assert(/Shutdown complete/.test(getOutput()), 'shutdown drained HTTP, Socket.IO and the pg pool');
}

async function testHealthWhenDbDown() {
  console.log('\n🩺 [LIFECYCLE 2] Health check reports 503 when the database is unreachable...');
  const deadPort = await freePort();
  const { child, port, exited } = await startServer({
    DB_HOST: '127.0.0.1',
    DB_PORT: String(deadPort),
    DB_USER: 'nobody',
    DB_PASSWORD: 'nothing',
    DB_NAME: 'nothing',
    DB_SSL: 'false',
  });
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const json = await res.json().catch(() => ({}));
    assert(res.status === 503, `GET /api/health -> 503 when DB is down (got ${res.status})`);
    assert(json.database === 'disconnected' && json.success === false, 'health body reports database: disconnected, success: false');

    // A valid token must not be answered with 401 just because the DB is down
    // (the client logs users out on 401).
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: '00000000-0000-0000-0000-000000000001', tokenVersion: 1 }, process.env.JWT_SECRET || 'localtestsecret', { expiresIn: '5m' });
    const authed = await fetch(`http://127.0.0.1:${port}/api/profile`, { headers: { Authorization: `Bearer ${token}` } });
    assert(authed.status === 503, `authenticated request with valid token while DB is down -> 503, not 401 (got ${authed.status})`);
    const bad = await fetch(`http://127.0.0.1:${port}/api/profile`, { headers: { Authorization: 'Bearer not.a.jwt' } });
    assert(bad.status === 401, `invalid token still -> 401 while DB is down (got ${bad.status})`);
  } finally {
    child.kill('SIGKILL');
    await withTimeout(exited, 3000);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SERVER LIFECYCLE TESTS');
  console.log('======================================================');
  try {
    await testGracefulShutdown();
    await testHealthWhenDbDown();
  } catch (err) {
    failedCount++;
    console.error('  ❌ FAIL: unexpected error in lifecycle suite:', err);
  }
  console.log('\n======================================================');
  if (failedCount === 0) {
    console.log(`🎉 ALL ${passedCount} SERVER LIFECYCLE TESTS PASSED (0 Failures)!`);
  } else {
    console.log(`❌ ${failedCount} SERVER LIFECYCLE TEST(S) FAILED (${passedCount} passed).`);
  }
  console.log('======================================================\n');
  process.exit(failedCount === 0 ? 0 : 1);
}

run();
