require('dotenv').config();
const app = require('../app.js');
const { query } = require('../config/db.js');

async function testProfileAPIs() {
  const PORT = 5007;
  const server = app.listen(PORT, async () => {
    console.log(`🧪 Profile Test Server running on port ${PORT}...`);
    try {
      // 1. Test GET /api/skills
      console.log('\n--- 1. Testing GET /api/skills ---');
      const skillsRes = await fetch(`http://localhost:${PORT}/api/skills`);
      const skillsData = await skillsRes.json();
      console.log('Skills Count:', skillsData.skills?.length);
      if (skillsRes.status !== 200 || !Array.isArray(skillsData.skills)) {
        throw new Error('GET /api/skills failed');
      }

      // 2. Test GET /api/interests
      console.log('\n--- 2. Testing GET /api/interests ---');
      const interestsRes = await fetch(`http://localhost:${PORT}/api/interests`);
      const interestsData = await interestsRes.json();
      console.log('Interests Count:', interestsData.interests?.length);
      if (interestsRes.status !== 200 || !Array.isArray(interestsData.interests)) {
        throw new Error('GET /api/interests failed');
      }

      // Register a test user to get JWT token
      const regEmail = `student_${Date.now()}@university.edu`;
      const regRes = await fetch(`http://localhost:${PORT}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Student',
          email: regEmail,
          password: 'Password123!',
        }),
      });
      const regData = await regRes.json();
      const token = regData.token;

      // 3. Test GET /api/profile (Empty/Initial)
      console.log('\n--- 3. Testing GET /api/profile (Initial) ---');
      const initProfRes = await fetch(`http://localhost:${PORT}/api/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const initProfData = await initProfRes.json();
      console.log('Initial isProfileComplete:', initProfData.isProfileComplete);

      // 4. Test PUT /api/profile (Onboarding Submission)
      console.log('\n--- 4. Testing PUT /api/profile (Complete Onboarding Data) ---');
      const updateRes = await fetch(`http://localhost:${PORT}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          college: 'Stanford University',
          degree: 'B.S. Computer Science',
          year_of_study: '3rd Year',
          college_email: 'jane@stanford.edu',
          bio: 'Passionate about building full-stack web applications and AI tools.',
          availability: 'Flexible',
          github_url: 'https://github.com/janestudent',
          linkedin_url: 'https://linkedin.com/in/janestudent',
          skills: [{ name: 'React' }, { name: 'Python' }, 'GraphQL'], // mix of existing and custom
          interests: [interestsData.interests[0].id, interestsData.interests[1].id],
        }),
      });
      const updateData = await updateRes.json();
      console.log('Update Status:', updateRes.status);
      console.log('Updated isProfileComplete:', updateData.isProfileComplete);
      console.log('Updated Skills:', updateData.skills?.map((s) => s.name));
      console.log('Updated Interests:', updateData.interests?.map((i) => i.name));

      if (updateRes.status !== 200 || !updateData.isProfileComplete) {
        throw new Error('PUT /api/profile failed or profile did not mark as complete');
      }

      console.log('\n✅ ALL PROFILE & ONBOARDING API TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
      console.error('\n❌ TEST FAILED:', err.message);
      process.exitCode = 1;
    } finally {
      server.close();
      process.exit();
    }
  });
}

testProfileAPIs();
