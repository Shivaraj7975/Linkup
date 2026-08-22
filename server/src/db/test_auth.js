require('dotenv').config();
const app = require('../app.js');
const { query } = require('../config/db.js');

async function runTests() {
  const PORT = 5006;
  const server = app.listen(PORT, async () => {
    console.log(`🧪 Test Server running on port ${PORT}...`);
    try {
      const testEmail = `testuser_${Date.now()}@example.com`;
      const testPassword = 'Password123!';

      // Test 1: Register
      console.log('\n--- 1. Testing POST /api/auth/register ---');
      const regRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alex Johnson',
          email: testEmail,
          password: testPassword,
        }),
      });

      const regData = await regRes.json();
      console.log('Register Status:', regRes.status);
      console.log('Register Response:', JSON.stringify(regData, null, 2));

      if (regRes.status !== 201 || !regData.token || regData.user.password_hash) {
        throw new Error('Register failed or exposed password_hash');
      }

      // Verify student_verifications record in DB
      const verRes = await query(
        'SELECT * FROM student_verifications WHERE user_id = $1',
        [regData.user.id]
      );
      console.log('Verification DB Record status:', verRes.rows[0]?.status);
      if (verRes.rows[0]?.status !== 'UNVERIFIED') {
        throw new Error('Verification record status is not UNVERIFIED');
      }

      // Test 2: Register duplicate email
      console.log('\n--- 2. Testing POST /api/auth/register (Duplicate Email) ---');
      const dupRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alex Johnson',
          email: testEmail,
          password: testPassword,
        }),
      });
      const dupData = await dupRes.json();
      console.log('Duplicate Email Status:', dupRes.status);
      console.log('Duplicate Email Response:', JSON.stringify(dupData, null, 2));
      if (dupRes.status !== 400) {
        throw new Error('Duplicate email test failed');
      }

      // Test 3: Login valid credentials
      console.log('\n--- 3. Testing POST /api/auth/login ---');
      const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      const loginData = await loginRes.json();
      console.log('Login Status:', loginRes.status);
      console.log('Login Response:', JSON.stringify(loginData, null, 2));
      if (loginRes.status !== 200 || !loginData.token) {
        throw new Error('Login test failed');
      }

      // Test 4: Login invalid password
      console.log('\n--- 4. Testing POST /api/auth/login (Invalid Password) ---');
      const badLoginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      });
      const badLoginData = await badLoginRes.json();
      console.log('Bad Login Status:', badLoginRes.status);
      console.log('Bad Login Response:', JSON.stringify(badLoginData, null, 2));
      if (badLoginRes.status !== 401) {
        throw new Error('Invalid password check failed');
      }

      // Test 5: GET /api/auth/me (Authenticated)
      console.log('\n--- 5. Testing GET /api/auth/me (Valid Token) ---');
      const meRes = await fetch(`http://localhost:${PORT}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
        },
      });
      const meData = await meRes.json();
      console.log('GET /me Status:', meRes.status);
      console.log('GET /me Response:', JSON.stringify(meData, null, 2));
      if (meRes.status !== 200 || meData.user.isProfileComplete !== false) {
        throw new Error('GET /api/auth/me failed or isProfileComplete is wrong');
      }

      // Test 6: GET /api/auth/me (Missing Token)
      console.log('\n--- 6. Testing GET /api/auth/me (No Token) ---');
      const noTokenRes = await fetch(`http://localhost:${PORT}/api/auth/me`, {
        method: 'GET',
      });
      const noTokenData = await noTokenRes.json();
      console.log('No Token Status:', noTokenRes.status);
      console.log('No Token Response:', JSON.stringify(noTokenData, null, 2));
      if (noTokenRes.status !== 401) {
        throw new Error('Unauthorized check failed');
      }

      console.log('\n✅ ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
      console.error('\n❌ TEST FAILED:', err.message);
      process.exitCode = 1;
    } finally {
      server.close();
      process.exit();
    }
  });
}

runTests();
