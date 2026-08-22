/**
 * test_matchingService.js
 * 
 * Unit tests for Phase 2 Deterministic AI Matching Engine using node:assert
 */

const assert = require('node:assert');
const {
  calculateSkillMatch,
  calculateInterestMatch,
  calculateAvailabilityMatch,
  calculateProfileMatch,
  calculateFinalScore,
  calculateMatch,
  parseHoursPerWeek,
} = require('./matchingService');

console.log('🧪 Starting Deterministic AI Matching Engine Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 1. Availability Parsing Edge Cases
// ---------------------------------------------------------------------------
console.log('--- 1. Availability Parsing Edge Cases ---');

test('Availability: "10 hrs/week" → 10', () => {
  assert.strictEqual(parseHoursPerWeek('10 hrs/week'), 10);
});

test('Availability: "10 hours/week" → 10', () => {
  assert.strictEqual(parseHoursPerWeek('10 hours/week'), 10);
});

test('Availability: "5 hr" → 5', () => {
  assert.strictEqual(parseHoursPerWeek('5 hr'), 5);
});

test('Availability: "10 hours" → 10', () => {
  assert.strictEqual(parseHoursPerWeek('10 hours'), 10);
});

test('Availability: "7.5 hours" → 7.5', () => {
  assert.strictEqual(parseHoursPerWeek('7.5 hours'), 7.5);
});

test('Availability: "3 months" → null (no hour context)', () => {
  assert.strictEqual(parseHoursPerWeek('3 months'), null);
});

test('Availability: "Flexible" → null (no hour context)', () => {
  assert.strictEqual(parseHoursPerWeek('Flexible'), null);
});

test('Availability: "40" arbitrary number string without hour context → null', () => {
  assert.strictEqual(parseHoursPerWeek('40'), null);
});

test('Availability: Range "10-20 hrs/week" → 15 (average)', () => {
  assert.strictEqual(parseHoursPerWeek('10-20 hrs/week'), 15);
});

test('Availability: Range "10 to 20 hours" → 15', () => {
  assert.strictEqual(parseHoursPerWeek('10 to 20 hours'), 15);
});

test('Availability: null, undefined, and empty string → null', () => {
  assert.strictEqual(parseHoursPerWeek(null), null);
  assert.strictEqual(parseHoursPerWeek(undefined), null);
  assert.strictEqual(parseHoursPerWeek(''), null);
  assert.strictEqual(parseHoursPerWeek('   '), null);
});

test('Availability: numeric input 15 → 15', () => {
  assert.strictEqual(parseHoursPerWeek(15), 15);
  assert.strictEqual(parseHoursPerWeek(-5), null);
});

// ---------------------------------------------------------------------------
// 2. Individual Component Functions
// ---------------------------------------------------------------------------
console.log('\n--- 2. Individual Component Calculation Tests ---');

test('Skill Match: Full match (100%)', () => {
  const req = ['React', 'Node.js', 'PostgreSQL'];
  const cand = ['PostgreSQL', 'React', 'Node.js', 'Python'];
  assert.strictEqual(calculateSkillMatch(req, cand), 100);
});

test('Skill Match: Partial match (50%)', () => {
  const req = ['React', 'Node.js', 'PostgreSQL', 'Docker'];
  const cand = ['React', 'Node.js'];
  assert.strictEqual(calculateSkillMatch(req, cand), 50);
});

test('Skill Match: Object input with { name } format', () => {
  const req = [{ name: 'React' }, { name: 'Node.js' }];
  const cand = [{ name: 'react' }, { name: 'typescript' }];
  assert.strictEqual(calculateSkillMatch(req, cand), 50);
});

test('Interest Match: Partial match (66.67%)', () => {
  const req = ['AI/ML', 'Web Development', 'Open Source'];
  const cand = ['AI/ML', 'Web Development', 'Blockchain'];
  const score = calculateInterestMatch(req, cand);
  assert.strictEqual(score, 66.67);
});

test('Availability Match: Candidate exceeds target (100%)', () => {
  const score = calculateAvailabilityMatch('10 hrs/week', '20 hrs/week');
  assert.strictEqual(score, 100);
});

test('Availability Match: Candidate has half required hours (50%)', () => {
  const score = calculateAvailabilityMatch('20 hours/week', '10 hrs/week');
  assert.strictEqual(score, 50);
});

test('Availability Match: Target requires no specific hours (100%)', () => {
  const score = calculateAvailabilityMatch(null, '10 hrs/week');
  assert.strictEqual(score, 100);
});

test('Profile Match: Bio relevance using keyword overlap', () => {
  const targetDesc = 'Building fullstack web applications with microservices backend and machine learning.';
  const candidateBio = 'Passionate developer building fullstack web microservices and exploring backend architecture.';
  const score = calculateProfileMatch(targetDesc, candidateBio);
  assert.ok(score > 0, 'Score should be greater than 0');
});

test('Final Score: Weights verify correctly (50% / 25% / 15% / 10%)', () => {
  // 100 on skills (50) + 100 on interest (25) + 100 on availability (15) + 100 on profile (10) = 100
  const perfect = calculateFinalScore(100, 100, 100, 100);
  assert.strictEqual(perfect, 100);

  // 100 skills only = 50
  const skillOnly = calculateFinalScore(100, 0, 0, 0);
  assert.strictEqual(skillOnly, 50);

  // 100 interest only = 25
  const interestOnly = calculateFinalScore(0, 100, 0, 0);
  assert.strictEqual(interestOnly, 25);

  // 100 availability only = 15
  const availOnly = calculateFinalScore(0, 0, 100, 0);
  assert.strictEqual(availOnly, 15);

  // 100 profile only = 10
  const profileOnly = calculateFinalScore(0, 0, 0, 100);
  assert.strictEqual(profileOnly, 10);
});

// ---------------------------------------------------------------------------
// 3. Scenario Tests (Strong, Partial, Poor, Minimal, Malformed)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Scenario & Integration Tests (calculateMatch) ---');

const projectTarget = {
  title: 'AI Study Assistant Platform',
  description: 'Building an interactive AI study platform with React frontend and FastAPI backend microservices.',
  requiredSkills: ['React', 'Python', 'FastAPI', 'PostgreSQL'],
  requiredInterests: ['Artificial Intelligence', 'Education', 'Web Development'],
  requiredAvailability: '15 hrs/week',
};

test('Scenario 1: Strong Candidate', () => {
  const strongCandidate = {
    skills: ['React', 'Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    interests: ['Artificial Intelligence', 'Education', 'Web Development'],
    availability: '20 hrs/week',
    bio: 'Fullstack developer passionate about building interactive AI platforms and study tools with React and FastAPI microservices.',
  };

  const result = calculateMatch(projectTarget, strongCandidate);
  assert.strictEqual(result.breakdown.skillMatch, 100);
  assert.strictEqual(result.breakdown.interestMatch, 100);
  assert.strictEqual(result.breakdown.availabilityMatch, 100);
  assert.ok(result.breakdown.profileMatch >= 70, `Expected high profile match, got ${result.breakdown.profileMatch}`);
  assert.ok(result.score >= 90, `Expected strong composite score >= 90, got ${result.score}`);
  assert.strictEqual(result.details.matchedSkills.length, 4);
  assert.strictEqual(result.details.missingSkills.length, 0);
});

test('Scenario 2: Partial Candidate', () => {
  const partialCandidate = {
    skills: ['React', 'Python'], // 2 of 4 skills (50%) -> 25 weighted
    interests: ['Web Development'], // 1 of 3 interests (33.33%) -> 8.33 weighted
    availability: '7.5 hours/week', // 7.5 of 15 hours (50%) -> 7.5 weighted
    bio: 'Developer building web applications with React.',
  };

  const result = calculateMatch(projectTarget, partialCandidate);
  assert.strictEqual(result.breakdown.skillMatch, 50);
  assert.strictEqual(result.breakdown.interestMatch, 33.33);
  assert.strictEqual(result.breakdown.availabilityMatch, 50);
  assert.ok(result.score > 35 && result.score < 65, `Expected score between 35 and 65, got ${result.score}`);
  assert.strictEqual(result.details.matchedSkills.length, 2);
  assert.strictEqual(result.details.missingSkills.length, 2);
});

test('Scenario 3: Poor Candidate', () => {
  const poorCandidate = {
    skills: ['C++', 'Embedded Systems', 'Rust'], // 0 of 4 (0%)
    interests: ['Robotics', 'Hardware'], // 0 of 3 (0%)
    availability: '3 hrs/week', // 3 of 15 (20%)
    bio: 'Low level firmware engineer working on robotics hardware and sensors.',
  };

  const result = calculateMatch(projectTarget, poorCandidate);
  assert.strictEqual(result.breakdown.skillMatch, 0);
  assert.strictEqual(result.breakdown.interestMatch, 0);
  assert.strictEqual(result.breakdown.availabilityMatch, 20);
  assert.ok(result.score <= 15, `Expected score <= 15, got ${result.score}`);
  assert.strictEqual(result.details.matchedSkills.length, 0);
  assert.strictEqual(result.details.missingSkills.length, 4);
});

test('Scenario 4: Minimal / Missing Profile', () => {
  const minimalCandidate = {
    skills: [],
    interests: [],
    availability: null,
    bio: null,
  };

  const result = calculateMatch(projectTarget, minimalCandidate);
  assert.strictEqual(result.breakdown.skillMatch, 0);
  assert.strictEqual(result.breakdown.interestMatch, 0);
  assert.strictEqual(result.breakdown.availabilityMatch, 0);
  assert.strictEqual(result.breakdown.profileMatch, 0);
  assert.strictEqual(result.score, 0);
});

test('Scenario 5: Null / Malformed Inputs', () => {
  const nullResult = calculateMatch(null, null);
  assert.strictEqual(typeof nullResult.score, 'number');
  assert.ok(!isNaN(nullResult.score));

  const malformedCandidate = {
    skills: 'invalid_type',
    interests: 12345,
    availability: { invalid: true },
    bio: ['invalid', 'array'],
  };

  const malformedResult = calculateMatch(projectTarget, malformedCandidate);
  assert.strictEqual(typeof malformedResult.score, 'number');
  assert.ok(!isNaN(malformedResult.score));
});

console.log(`\n========================================`);
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log(`========================================\n`);
