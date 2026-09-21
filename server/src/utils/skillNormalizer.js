/**
 * skillNormalizer.js
 * 
 * Canonical Skill Normalization & Alias Resolution Engine for MELD.
 * Resolves variations, synonyms, and abbreviations to consistent canonical representations
 * without destructive modification to existing database records.
 */

// Canonical alias dictionary (lowercase trimmed keys -> standardized canonical string)
const CANONICAL_SKILL_MAP = {
  // Web Frontend
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'react js': 'React',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'angular.js': 'Angular',
  'angularjs': 'Angular',
  'next': 'Next.js',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'nuxt': 'Nuxt.js',
  'nuxt.js': 'Nuxt.js',
  'svelte': 'Svelte',
  'sveltekit': 'SvelteKit',
  'html': 'HTML5',
  'html5': 'HTML5',
  'css': 'CSS3',
  'css3': 'CSS3',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'scss': 'Sass',

  // Programming Languages
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'python': 'Python',
  'python3': 'Python',
  'python 3': 'Python',
  'py': 'Python',
  'java': 'Java',
  'core java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'c plus plus': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  'c sharp': 'C#',
  'go': 'Go',
  'golang': 'Go',
  'rust': 'Rust',
  'rustlang': 'Rust',
  'ruby': 'Ruby',
  'php': 'PHP',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'dart': 'Dart',

  // Backend Frameworks & Runtimes
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'nest': 'NestJS',
  'nest.js': 'NestJS',
  'nestjs': 'NestJS',
  'django': 'Django',
  'django rest': 'Django REST Framework',
  'drf': 'Django REST Framework',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'fast api': 'FastAPI',
  'spring': 'Spring Boot',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',
  'rails': 'Ruby on Rails',
  'ruby on rails': 'Ruby on Rails',
  'laravel': 'Laravel',
  'asp.net': 'ASP.NET Core',
  'dotnet': '.NET',
  '.net': '.NET',

  // Databases & Caching
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'pgsql': 'PostgreSQL',
  'mysql': 'MySQL',
  'sqlite': 'SQLite',
  'sqlite3': 'SQLite',
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  'redis': 'Redis',
  'cassandra': 'Cassandra',
  'neo4j': 'Neo4j',
  'dynamodb': 'DynamoDB',
  'firebase': 'Firebase',
  'supabase': 'Supabase',
  'prisma': 'Prisma ORM',

  // AI / ML / Data
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'machinelearning': 'Machine Learning',
  'ai': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'deep learning': 'Deep Learning',
  'dl': 'Deep Learning',
  'nlp': 'Natural Language Processing',
  'natural language processing': 'Natural Language Processing',
  'cv': 'Computer Vision',
  'computer vision': 'Computer Vision',
  'llm': 'Large Language Models',
  'llms': 'Large Language Models',
  'large language models': 'Large Language Models',
  'rag': 'Retrieval-Augmented Generation',
  'retrieval augmented generation': 'Retrieval-Augmented Generation',
  'genai': 'Generative AI',
  'generative ai': 'Generative AI',
  'tensorflow': 'TensorFlow',
  'tf': 'TensorFlow',
  'pytorch': 'PyTorch',
  'torch': 'PyTorch',
  'scikit-learn': 'scikit-learn',
  'sklearn': 'scikit-learn',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'opencv': 'OpenCV',
  'keras': 'Keras',
  'huggingface': 'Hugging Face',
  'langchain': 'LangChain',
  'llamaindex': 'LlamaIndex',

  // Mobile
  'react native': 'React Native',
  'reactnative': 'React Native',
  'flutter': 'Flutter',
  'ios': 'iOS Development',
  'ios development': 'iOS Development',
  'android': 'Android Development',
  'android development': 'Android Development',

  // Cloud & DevOps
  'docker': 'Docker',
  'k8s': 'Kubernetes',
  'kubernetes': 'Kubernetes',
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'Google Cloud Platform',
  'google cloud': 'Google Cloud Platform',
  'google cloud platform': 'Google Cloud Platform',
  'azure': 'Microsoft Azure',
  'microsoft azure': 'Microsoft Azure',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',
  'terraform': 'Terraform',
  'git': 'Git',
  'github actions': 'GitHub Actions',
  'linux': 'Linux',

  // UI/UX & Design
  'ui/ux': 'UI/UX Design',
  'ui/ux design': 'UI/UX Design',
  'ui ux': 'UI/UX Design',
  'ux/ui': 'UI/UX Design',
  'ui design': 'UI Design',
  'ux design': 'UX Design',
  'figma': 'Figma',
  'adobe xd': 'Adobe XD',
  'wireframing': 'Wireframing',
  'prototyping': 'Prototyping',

  // API & Architecture
  'rest': 'REST APIs',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  'restful': 'REST APIs',
  'graphql': 'GraphQL',
  'graph ql': 'GraphQL',
  'grpc': 'gRPC',
  'websockets': 'WebSockets',
  'websocket': 'WebSockets',
  'microservices': 'Microservices',
};

/**
 * Normalizes a single skill string into its canonical name.
 * 
 * @param {string|Object} raw 
 * @returns {string}
 */
function normalizeSkill(raw) {
  if (!raw) return '';
  const skillStr = typeof raw === 'string' ? raw : (raw.name || raw.title || '');
  const trimmed = skillStr.trim();
  if (!trimmed) return '';

  const lookupKey = trimmed.toLowerCase();
  if (CANONICAL_SKILL_MAP[lookupKey]) {
    return CANONICAL_SKILL_MAP[lookupKey];
  }

  // Common suffix / prefix sanitization (e.g. "React.js developer" -> "React")
  const strippedKey = lookupKey
    .replace(/\.js$/i, '')
    .replace(/js$/i, '')
    .trim();

  if (CANONICAL_SKILL_MAP[strippedKey]) {
    return CANONICAL_SKILL_MAP[strippedKey];
  }

  // Title-case fallback
  return trimmed.split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Converts any skill input (string, comma-separated string, array of strings, or array of objects)
 * into a deduplicated array of canonical skill names.
 * 
 * @param {Array|string|null|undefined} input 
 * @returns {string[]}
 */
function normalizeSkillArray(input) {
  if (!input) return [];
  let rawList = [];

  if (Array.isArray(input)) {
    rawList = input.map(item => (typeof item === 'string' ? item : item?.name || ''));
  } else if (typeof input === 'string') {
    rawList = input.split(/[,;\n]+/);
  }

  const normalizedSet = new Set();
  const result = [];

  for (const item of rawList) {
    const canonical = normalizeSkill(item);
    if (canonical && !normalizedSet.has(canonical.toLowerCase())) {
      normalizedSet.add(canonical.toLowerCase());
      result.push(canonical);
    }
  }

  return result;
}

/**
 * Returns a clean lowercase canonical key for exact set matching.
 * 
 * @param {string|Object} raw 
 * @returns {string}
 */
function getCanonicalSkillKey(raw) {
  return normalizeSkill(raw).toLowerCase();
}

module.exports = {
  CANONICAL_SKILL_MAP,
  normalizeSkill,
  normalizeSkillArray,
  getCanonicalSkillKey,
};
