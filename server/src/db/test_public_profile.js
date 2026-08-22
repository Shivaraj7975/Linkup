require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const http = require('http');
const app = require('../app');

const PORT = 5008;

const runTest = async () => {
  const server = app.listen(PORT, async () => {
    console.log(`🧪 Public Profile Test Server running on port ${PORT}...\n`);

    try {
      // Helper HTTP request
      const makeRequest = (path, method = 'GET', body = null, token = null) => {
        return new Promise((resolve, reject) => {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const req = http.request(
            { hostname: '127.0.0.1', port: PORT, path, method, headers },
            (res) => {
              let responseBody = '';
              res.on('data', (chunk) => (responseBody += chunk));
              res.on('end', () => {
                try {
                  const json = JSON.parse(responseBody);
                  resolve({ status: res.statusCode, data: json });
                } catch {
                  resolve({ status: res.statusCode, raw: responseBody });
                }
              });
            }
          );
          req.on('error', reject);
          if (body) req.write(JSON.stringify(body));
          req.end();
        });
      };

      // 1. Register test student
      const testEmail = `student_public_${Date.now()}@example.com`;
      const regRes = await makeRequest('/api/auth/register', 'POST', {
        name: 'Alex Johnson',
        email: testEmail,
        password: 'password123',
      });

      console.log('--- 1. Testing Registration ---');
      console.log('Registration Status:', regRes.status);
      console.log('Registered User ID:', regRes.data.user.id);

      const userId = regRes.data.user.id;
      const token = regRes.data.token;

      // 2. Complete Profile
      await makeRequest('/api/profile', 'PUT', {
        college: 'Stanford University',
        city: 'Stanford',
        state: 'California',
        country: 'United States',
        degree: 'B.S. Computer Science',
        year_of_study: '3rd Year',
        bio: 'Passionate full-stack developer interested in AI teammate matching & hackathons.',
        availability: 'Flexible',
        github_url: 'https://github.com/alexjohnson',
        linkedin_url: 'https://linkedin.com/in/alexjohnson',
        skills: ['React.js', 'Python', 'Node.js', 'Data Structures & Algorithms (DSA)'],
        interests: ['Web Development', 'Artificial Intelligence (AI)', 'Startups & Venture Capital'],
      }, token);

      // 3. Query Public Profile GET /api/users/:userId
      console.log('\n--- 2. Testing GET /api/users/:userId (Public Profile) ---');
      const publicRes = await makeRequest(`/api/users/${userId}`);

      console.log('GET /api/users/:userId Status:', publicRes.status);
      console.log('Response Payload:', JSON.stringify(publicRes.data, null, 2));

      // Assertions
      const d = publicRes.data;
      if (
        d.id === userId &&
        d.name === 'Alex Johnson' &&
        d.college === 'Stanford University' &&
        d.degree === 'B.S. Computer Science' &&
        d.yearOfStudy === '3rd Year' &&
        d.verificationStatus === 'UNVERIFIED' &&
        Array.isArray(d.skills) &&
        d.skills.includes('React.js') &&
        Array.isArray(d.interests) &&
        d.interests.includes('Web Development')
      ) {
        console.log('\n✅ Public profile fields match exact requested specification!');
      } else {
        throw new Error('Public profile response fields do not match expected schema!');
      }

      // Security Audit Assertion (Ensure email, password, hash, JWT, etc. are NOT present)
      console.log('\n--- 3. Security Audit & Privacy Enforcement Check ---');
      const forbiddenKeys = ['email', 'college_email', 'collegeEmail', 'password', 'password_hash', 'token', 'jwt'];
      const leakedKeys = forbiddenKeys.filter((key) => key in d);

      if (leakedKeys.length === 0) {
        console.log('🔒 Security Audit Passed: Zero private user details (email, password, tokens) exposed!');
      } else {
        throw new Error(`SECURITY VULNERABILITY DETECTED: Leaked sensitive keys: ${leakedKeys.join(', ')}`);
      }

      // 4. Non-existent User Test
      console.log('\n--- 4. Non-Existent User Test ---');
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const fakeRes = await makeRequest(`/api/users/${fakeId}`);
      console.log('Non-Existent User Status:', fakeRes.status);
      if (fakeRes.status === 404) {
        console.log('✅ Non-existent user returned 404 Not Found as expected.');
      } else {
        throw new Error('Non-existent user test failed!');
      }

      console.log('\n🎉 ALL PUBLIC STUDENT PROFILE MODULE TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
      console.error('❌ Public profile test error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
};

runTest();
