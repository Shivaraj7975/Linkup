// Run: node test/safeHref.test.mjs   (no test framework needed)
import assert from 'node:assert';
import { safeHref } from '../src/utils/safeHref.js';

const cases = [
  ['https://github.com/user', 'https://github.com/user'],
  ['http://example.com', 'http://example.com'],
  ['  https://linkedin.com/in/x  ', 'https://linkedin.com/in/x'],
  ['javascript:alert(document.domain)', undefined],
  [' JaVaScRiPt:alert(1)', undefined],
  ['data:text/html,<script>alert(1)</script>', undefined],
  ['//evil.example', undefined],
  [null, undefined],
  [undefined, undefined],
];
for (const [input, expected] of cases) assert.strictEqual(safeHref(input), expected, String(input));
console.log(`safeHref: ${cases.length}/${cases.length} passed`);
