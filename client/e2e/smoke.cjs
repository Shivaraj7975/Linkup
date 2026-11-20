/**
 * Minimal browser smoke test for the MELD client (not wired into CI).
 *
 *   npm run test:e2e           # builds, serves with `vite preview`, runs Chromium
 *   E2E_SKIP_BUILD=1 npm run test:e2e   # reuse an existing dist/
 *
 * Checks that the landing page (/) and login page (/login) render their main
 * heading and produce no console errors or uncaught page errors. No backend is
 * required: these public pages must not depend on the API to render.
 *
 * Uses Playwright (require('playwright')) which must be resolvable, e.g. via a
 * global install / NODE_PATH. It is deliberately not a package dependency.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.E2E_PORT || 4317);
const baseUrl = `http://127.0.0.1:${port}`;

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('playwright is not installed/resolvable; install it or set NODE_PATH.');
  process.exit(2);
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`vite preview did not come up on ${url}`);
}

const pages = [
  { path: '/', name: 'Landing', selector: 'h1.hero-title' },
  { path: '/login', name: 'Login', selector: 'h1.auth-title', text: 'Welcome back' },
  { path: '/register', name: 'Register', selector: 'h1' },
];

async function main() {
  if (!process.env.E2E_SKIP_BUILD) {
    console.log('Building client...');
    execSync('npx vite build', { cwd: root, stdio: 'inherit' });
  }

  const preview = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  let failures = 0;
  let browser;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    for (const p of pages) {
      const page = await browser.newPage();
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('requestfailed', (req) => errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`));

      await page.goto(`${baseUrl}${p.path}`, { waitUntil: 'networkidle' });
      let ok = true;
      try {
        await page.waitForSelector(p.selector, { timeout: 5000 });
        if (p.text) {
          const t = await page.textContent(p.selector);
          if (!t || !t.includes(p.text)) throw new Error(`heading text was "${t}"`);
        }
      } catch (e) {
        ok = false;
        errors.unshift(`render: ${p.selector} not found (${e.message.split('\n')[0]})`);
      }
      if (errors.length) ok = false;
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${p.name} page (${p.path}) renders without console errors`);
      errors.forEach((e) => console.log(`    ${e}`));
      if (!ok) failures++;
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    try {
      process.kill(-preview.pid, 'SIGTERM');
    } catch {
      /* already exited */
    }
  }

  console.log(`\nE2E smoke: ${pages.length - failures} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
