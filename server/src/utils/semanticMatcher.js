/**
 * semanticMatcher.js
 * 
 * Lightweight semantic matching utility for project descriptions, candidate bios,
 * and skill/interest context using TF-IDF token cosine similarity and n-gram overlap.
 * Provides practical semantic relevance scores without requiring heavy external dependencies.
 */

// Domain stop words to filter noise
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t',
  'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is',
  'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
  'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they',
  'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'project', 'looking', 'build', 'want', 'need', 'team', 'member', 'student', 'experience'
]);

/**
 * Tokenizes text into meaningful term frequency vectors.
 * 
 * @param {string} text 
 * @returns {Map<string, number>} Term frequencies
 */
function getTermFrequencies(text) {
  const tf = new Map();
  if (!text || typeof text !== 'string') return tf;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1);
  }

  // Also extract bigrams for phrases like "machine learning", "web development"
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    tf.set(bigram, (tf.get(bigram) || 0) + 1.5);
  }

  return tf;
}

/**
 * Computes cosine similarity between two term frequency vectors (0 to 1).
 * 
 * @param {Map<string, number>} vecA 
 * @param {Map<string, number>} vecB 
 * @returns {number}
 */
function computeCosineSimilarity(vecA, vecB) {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, freqA] of vecA) {
    normA += freqA * freqA;
    if (vecB.has(term)) {
      dotProduct += freqA * vecB.get(term);
    }
  }

  for (const freqB of vecB.values()) {
    normB += freqB * freqB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculates semantic project relevance score between a project context and candidate profile (0 - 100).
 * 
 * @param {Object} project { title, description, category, requiredSkills }
 * @param {Object} candidate { bio, skills, interests, degree, college }
 * @returns {number} Score from 0 to 100
 */
function calculateSemanticRelevance(project = {}, candidate = {}) {
  const projectText = [
    project.title || '',
    project.category || '',
    project.description || '',
    Array.isArray(project.requiredSkills) ? project.requiredSkills.map(s => (typeof s === 'object' ? s.name : s)).join(' ') : '',
  ].join(' ');

  const candidateText = [
    candidate.bio || '',
    Array.isArray(candidate.skills) ? candidate.skills.map(s => (typeof s === 'object' ? s.name : s)).join(' ') : '',
    Array.isArray(candidate.interests) ? candidate.interests.map(i => (typeof i === 'object' ? i.name : i)).join(' ') : '',
    candidate.degree || '',
  ].join(' ');

  const projTf = getTermFrequencies(projectText);
  const candTf = getTermFrequencies(candidateText);

  const similarity = computeCosineSimilarity(projTf, candTf);

  // Scale smoothly into 0 - 100 range with square-root boost for cosine text similarity
  const scaledScore = Math.min(Math.round(Math.pow(similarity, 0.5) * 100), 100);
  return Math.max(scaledScore, 0);
}

module.exports = {
  getTermFrequencies,
  computeCosineSimilarity,
  calculateSemanticRelevance,
};
