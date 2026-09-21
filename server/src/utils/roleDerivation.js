/**
 * roleDerivation.js
 * 
 * Derives meaningful project roles from required skills, category, and project description.
 * Evaluates existing team members' skills to determine filled roles and remaining team gaps.
 */

const { normalizeSkillArray, getCanonicalSkillKey } = require('./skillNormalizer');

// Standard role definitions and their typical skill associations
const ROLE_DEFINITIONS = [
  {
    name: 'Frontend Developer',
    keywords: ['frontend', 'front-end', 'ui', 'client', 'web interface'],
    skills: ['React', 'Vue.js', 'Angular', 'Next.js', 'HTML5', 'CSS3', 'Tailwind CSS', 'JavaScript', 'TypeScript', 'Svelte', 'Bootstrap'],
  },
  {
    name: 'Backend Developer',
    keywords: ['backend', 'back-end', 'server', 'api', 'database', 'microservice'],
    skills: ['Node.js', 'Express.js', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Ruby on Rails', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST APIs', 'Go', 'Rust', 'Java', 'PHP', 'ASP.NET Core'],
  },
  {
    name: 'Fullstack Developer',
    keywords: ['fullstack', 'full-stack', 'end-to-end', 'web application'],
    skills: ['React', 'Node.js', 'Next.js', 'TypeScript', 'PostgreSQL', 'MongoDB', 'Express.js'],
  },
  {
    name: 'AI/ML Engineer',
    keywords: ['ai', 'ml', 'machine learning', 'artificial intelligence', 'deep learning', 'nlp', 'computer vision', 'rag', 'llm', 'genai'],
    skills: ['Python', 'Machine Learning', 'Artificial Intelligence', 'Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Large Language Models', 'Retrieval-Augmented Generation', 'Generative AI', 'PyTorch', 'TensorFlow', 'scikit-learn', 'LangChain', 'LlamaIndex', 'Hugging Face', 'Pandas', 'NumPy', 'OpenCV'],
  },
  {
    name: 'Mobile Developer',
    keywords: ['mobile', 'app', 'ios', 'android', 'flutter', 'react native'],
    skills: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'iOS Development', 'Android Development', 'Dart'],
  },
  {
    name: 'UI/UX Designer',
    keywords: ['designer', 'design', 'ui/ux', 'prototype', 'wireframe', 'figma', 'user experience'],
    skills: ['UI/UX Design', 'UI Design', 'UX Design', 'Figma', 'Adobe XD', 'Wireframing', 'Prototyping'],
  },
  {
    name: 'Cloud & DevOps Engineer',
    keywords: ['devops', 'cloud', 'infrastructure', 'deployment', 'ci/cd', 'docker', 'kubernetes'],
    skills: ['Docker', 'Kubernetes', 'AWS', 'Google Cloud Platform', 'Microsoft Azure', 'CI/CD', 'Terraform', 'Linux', 'Git', 'GitHub Actions'],
  },
  {
    name: 'Data Engineer / Analyst',
    keywords: ['data', 'analytics', 'pipeline', 'etl', 'sql', 'big data'],
    skills: ['Python', 'SQL', 'PostgreSQL', 'MongoDB', 'Pandas', 'NumPy', 'Cassandra', 'Data Analysis'],
  },
];

/**
 * Derives project roles from required skills, category, and project description.
 * 
 * @param {Object} project { requiredSkills, category, description, title }
 * @returns {Array<{ name: string, skills: string[], matchedSkills: string[] }>}
 */
function deriveProjectRoles(project = {}) {
  const reqSkills = normalizeSkillArray(project.requiredSkills || project.skills || []);
  const reqSkillSet = new Set(reqSkills.map(s => getCanonicalSkillKey(s)));

  const textContext = `${project.title || ''} ${project.category || ''} ${project.description || ''}`.toLowerCase();

  const derivedRoles = [];

  for (const roleDef of ROLE_DEFINITIONS) {
    const matchedSkills = [];
    for (const s of roleDef.skills) {
      if (reqSkillSet.has(getCanonicalSkillKey(s))) {
        matchedSkills.push(s);
      }
    }

    const keywordMatch = roleDef.keywords.some(kw => textContext.includes(kw));

    if (matchedSkills.length > 0 || (keywordMatch && derivedRoles.length < 3)) {
      derivedRoles.push({
        name: roleDef.name,
        skills: matchedSkills.length > 0 ? matchedSkills : roleDef.skills.slice(0, 3),
        matchedRequiredSkills: matchedSkills,
        relevanceScore: matchedSkills.length * 2 + (keywordMatch ? 1 : 0),
      });
    }
  }

  // Sort by relevance score
  derivedRoles.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // If no roles matched, assign general fallback based on category
  if (derivedRoles.length === 0) {
    derivedRoles.push({
      name: project.category ? `${project.category} Contributor` : 'Software Contributor',
      skills: reqSkills.slice(0, 4),
      matchedRequiredSkills: reqSkills.slice(0, 4),
      relevanceScore: 1,
    });
  }

  return derivedRoles.slice(0, 4);
}

/**
 * Analyzes current team members vs project requirements to identify filled roles and unmet team gaps.
 * 
 * @param {Object} project { requiredSkills, category, description, title }
 * @param {Array<Object>} members Array of active team members with their skills [{ id, name, skills }]
 * @returns {Object} { derivedRoles, filledRoles, unmetNeeds, memberCoverage }
 */
function analyzeTeamComplement(project, members = []) {
  const derivedRoles = deriveProjectRoles(project);
  const reqSkills = normalizeSkillArray(project.requiredSkills || project.skills || []);

  const teamSkillSet = new Set();
  const memberCoverage = [];

  for (const m of members) {
    const memberSkills = normalizeSkillArray(m.skills || []);
    memberSkills.forEach(s => teamSkillSet.add(getCanonicalSkillKey(s)));

    // Find best matching role for this member
    let bestRole = 'Member';
    let highestMatch = 0;
    for (const role of derivedRoles) {
      const matchCount = role.skills.filter(s => memberSkills.some(ms => getCanonicalSkillKey(ms) === getCanonicalSkillKey(s))).length;
      if (matchCount > highestMatch) {
        highestMatch = matchCount;
        bestRole = role.name;
      }
    }

    memberCoverage.push({
      userId: m.userId || m.id,
      name: m.name || 'Team Member',
      role: m.role || bestRole,
      skills: memberSkills,
    });
  }

  const filledRoles = [];
  const unmetNeeds = [];

  for (const role of derivedRoles) {
    const coveredSkills = role.skills.filter(s => teamSkillSet.has(getCanonicalSkillKey(s)));
    const isCovered = coveredSkills.length >= Math.ceil(role.skills.length * 0.6) || 
                      memberCoverage.some(m => m.role === role.name);

    if (isCovered) {
      filledRoles.push({
        roleName: role.name,
        coveredBySkills: coveredSkills,
      });
    } else {
      unmetNeeds.push({
        roleName: role.name,
        missingSkills: role.skills.filter(s => !teamSkillSet.has(getCanonicalSkillKey(s))),
        importance: 'HIGH',
      });
    }
  }

  // Unmet skills overall
  const missingProjectSkills = reqSkills.filter(s => !teamSkillSet.has(getCanonicalSkillKey(s)));

  return {
    derivedRoles,
    filledRoles,
    unmetNeeds,
    missingProjectSkills,
    currentTeamMembers: memberCoverage,
  };
}

module.exports = {
  ROLE_DEFINITIONS,
  deriveProjectRoles,
  analyzeTeamComplement,
};
