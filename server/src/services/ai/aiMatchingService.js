const { analyzeMatchesWithGemini } = require('./geminiService');
const { analyzeMatchesWithNvidia } = require('./nvidiaService');
const { analyzeMatchesWithOpenAICompatible } = require('./openAiCompatibleService');
const { normalizeSkillArray } = require('../../utils/skillNormalizer');
const { analyzeTeamComplement } = require('../../utils/roleDerivation');
const { calculateFinalBackendScore, calculateMatch, generateMatchReasons } = require('../matchingService');

const providerCooldowns = new Map();
const MATCHING_ALGORITHM_VERSION = '2';

/**
 * AI Provider Abstraction Service for Linkup / MELD Teammate Matching
 * 
 * Flow:
 * 1. Build comprehensive semantic project & candidate payloads (including project description, roles, team gaps).
 * 2. Send single batch request to AI providers.
 * 3. Validate 6 component scores from AI (0-100).
 * 4. Backend computes final compatibility percentage.
 * 5. Handle missing candidates with fallback scoring (never fabricate 0%).
 * 6. Sort results consistently by final match percentage.
 */

const matchCandidates = async (compactPayload, candidateIdsSet, candidateLookupMap, projectObj = {}) => {
  const totalStartTime = Date.now();

  // 1. Send Single AI Call via Provider Waterfall
  const aiStartTime = Date.now();
  let aiRawResult = null;
  let providerUsed = '';

  const orderStr = process.env.AI_PROVIDER_ORDER || 'groq,nvidia_llama,voidai,nvidia_nemotron,gemini';
  const order = orderStr.split(',').map((s) => s.trim().toLowerCase());
  const timeoutMs = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS, 10) || 7000;
  const cooldownMs = parseInt(process.env.AI_PROVIDER_COOLDOWN_MS, 10) || 60000;

  const providers = {
    groq: {
      name: 'GROQ',
      fn: () => analyzeMatchesWithOpenAICompatible(compactPayload, {
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        modelName: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        providerName: 'GROQ',
        timeoutMs
      })
    },
    nvidia_llama: {
      name: 'NVIDIA_LLAMA',
      fn: () => analyzeMatchesWithOpenAICompatible(compactPayload, {
        endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
        apiKey: process.env.NVIDIA_LLAMA_API_KEY,
        modelName: process.env.NVIDIA_LLAMA_MODEL || 'meta/llama-3.1-8b-instruct',
        providerName: 'NVIDIA_LLAMA',
        timeoutMs
      })
    },
    voidai: {
      name: 'VOIDAI',
      fn: () => analyzeMatchesWithOpenAICompatible(compactPayload, {
        endpoint: 'https://api.voidai.app/v1/chat/completions',
        apiKey: process.env.VOIDAI_API_KEY,
        modelName: process.env.VOIDAI_MODEL || 'gpt-4o-mini',
        providerName: 'VOIDAI',
        timeoutMs
      })
    },
    nvidia_nemotron: {
      name: 'NVIDIA_NEMOTRON',
      fn: () => analyzeMatchesWithNvidia(compactPayload, { timeoutMs })
    },
    gemini: {
      name: 'GEMINI',
      fn: () => analyzeMatchesWithGemini(compactPayload)
    }
  };

  for (const providerKey of order) {
    const provider = providers[providerKey];
    if (!provider) continue;

    const cooldownUntil = providerCooldowns.get(provider.name) || 0;
    if (Date.now() < cooldownUntil) {
      console.log(`[AI MATCH] ${provider.name} skipped (cooldown active for ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s)`);
      continue;
    }

    try {
      console.log(`[AI MATCH] Trying ${provider.name}...`);
      const providerStartTime = Date.now();
      aiRawResult = await provider.fn();
      providerUsed = provider.name;
      console.log(`[AI MATCH] ${provider.name} success: ${Date.now() - providerStartTime}ms`);
      break;
    } catch (err) {
      console.warn(`⚠️ ${provider.name} request failed: ${err.message}`);
      if (err.isRateLimited || err.message.includes('429')) {
        providerCooldowns.set(provider.name, Date.now() + cooldownMs);
      }
      continue;
    }
  }

  if (!aiRawResult) {
    console.error(`❌ All AI providers failed. Falling back to emergency deterministic matcher.`);
    throw new Error('All AI providers failed.');
  }

  const aiDuration = Date.now() - aiStartTime;
  console.log(`[AI MATCH] Total AI waterfall duration: ${aiDuration}ms`);

  // 2. Validate JSON & Candidate User IDs
  const validateStartTime = Date.now();
  if (!aiRawResult || !Array.isArray(aiRawResult.matches)) {
    throw new Error('AI returned an invalid response structure without a matches array.');
  }

  const validatedMatches = [];
  const processedUserIds = new Set();
  const teamContext = analyzeTeamComplement(projectObj, projectObj.members || []);

  for (const match of aiRawResult.matches) {
    const userIdStr = String(match.userId);

    // Skip if userId is invalid, not in candidate list, or duplicate
    if (!userIdStr || !candidateIdsSet.has(userIdStr) || processedUserIds.has(userIdStr)) {
      continue;
    }

    processedUserIds.add(userIdStr);
    const originalCand = candidateLookupMap.get(userIdStr) || {};

    // Validate component scores (0 - 100)
    const skillScore = Math.min(Math.max(parseInt(match.skillScore, 10) || 0, 0), 100);
    const roleFitScore = Math.min(Math.max(parseInt(match.roleFitScore, 10) || 0, 0), 100);
    const projectRelevanceScore = Math.min(Math.max(parseInt(match.projectRelevanceScore, 10) || 0, 0), 100);
    const interestScore = Math.min(Math.max(parseInt(match.interestScore, 10) || 0, 0), 100);
    const availabilityScore = Math.min(Math.max(parseInt(match.availabilityScore, 10) || 0, 0), 100);
    const teamComplementScore = Math.min(Math.max(parseInt(match.teamComplementScore, 10) || 0, 0), 100);

    // Backend calculates the final composite score
    const finalScore = calculateFinalBackendScore({
      skillScore,
      roleFitScore,
      projectRelevanceScore,
      interestScore,
      availabilityScore,
      teamComplementScore,
    });

    const roleName = typeof match.roleName === 'string' && match.roleName.trim().length > 0
      ? match.roleName.trim().slice(0, 50)
      : (match.roleFit || 'Project Contributor');

    const reasons = Array.isArray(match.reasons)
      ? match.reasons.slice(0, 4).map((r) => String(r).trim().slice(0, 100)).filter(Boolean)
      : [];

    const strengths = Array.isArray(match.strengths)
      ? match.strengths.slice(0, 4).map((s) => String(s).trim().slice(0, 50)).filter(Boolean)
      : [];

    const concerns = Array.isArray(match.concerns)
      ? match.concerns.slice(0, 3).map((c) => String(c).trim().slice(0, 60)).filter(Boolean)
      : [];

    validatedMatches.push({
      userId: userIdStr,
      name: originalCand.name || 'Student Candidate',
      college: originalCand.college || 'University Student',
      degree: originalCand.degree || '',
      yearOfStudy: originalCand.yearOfStudy || originalCand.year_of_study || '',
      verificationStatus: originalCand.verificationStatus || originalCand.verification_status || 'UNVERIFIED',
      matchPercentage: finalScore,
      roleName,
      skillScore,
      roleFitScore,
      projectRelevanceScore,
      interestScore,
      availabilityScore,
      teamComplementScore,
      reasons,
      strengths,
      concerns,
      candidate: originalCand,
      evaluated: true,
    });
  }

  // Handle missing candidates: evaluate them deterministically instead of fabricating 0%
  for (const [candId, originalCand] of candidateLookupMap.entries()) {
    if (!processedUserIds.has(candId)) {
      const fallbackResult = calculateMatch(projectObj, originalCand, teamContext);
      const matchedSkills = fallbackResult.details?.matchedSkills || [];
      const missingSkills = fallbackResult.details?.missingSkills || [];

      validatedMatches.push({
        userId: candId,
        name: originalCand.name || 'Student Candidate',
        college: originalCand.college || 'University Student',
        degree: originalCand.degree || '',
        yearOfStudy: originalCand.yearOfStudy || originalCand.year_of_study || '',
        verificationStatus: originalCand.verificationStatus || originalCand.verification_status || 'UNVERIFIED',
        matchPercentage: fallbackResult.score,
        roleName: fallbackResult.roleName,
        skillScore: fallbackResult.breakdown.skillScore,
        roleFitScore: fallbackResult.breakdown.roleFitScore,
        projectRelevanceScore: fallbackResult.breakdown.projectRelevanceScore,
        interestScore: fallbackResult.breakdown.interestScore,
        availabilityScore: fallbackResult.breakdown.availabilityScore,
        teamComplementScore: fallbackResult.breakdown.teamComplementScore,
        reasons: generateMatchReasons(fallbackResult, projectObj, originalCand),
        strengths: matchedSkills.map(s => `Skill match: ${s}`),
        concerns: missingSkills.slice(0, 2).map(s => `Lacks ${s}`),
        candidate: originalCand,
        evaluated: true,
      });
    }
  }

  // Consistent Sort strictly by matchPercentage descending
  validatedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  const validateDuration = Date.now() - validateStartTime;
  const totalDuration = Date.now() - totalStartTime;

  console.log(`[AI MATCH] JSON validation & scoring: ${validateDuration}ms`);
  console.log(`[AI MATCH] Total AI Pipeline: ${totalDuration}ms`);

  return {
    success: true,
    generatedBy: providerUsed,
    matches: validatedMatches,
  };
};

/**
 * Normalizes filter object for deterministic hashing and payload inclusion.
 */
const normalizeFilterState = (filters = {}) => {
  const normalized = {};
  if (filters.city && typeof filters.city === 'string' && filters.city.trim()) {
    normalized.city = filters.city.trim();
  }
  if (filters.college && typeof filters.college === 'string' && filters.college.trim()) {
    normalized.college = filters.college.trim();
  }
  if (filters.branch && typeof filters.branch === 'string' && filters.branch.trim()) {
    normalized.branch = filters.branch.trim();
  }
  if (filters.year && typeof filters.year === 'string' && filters.year.trim()) {
    normalized.year = filters.year.trim();
  }
  const skills = normalizeSkillArray(filters.skills || []);
  if (skills.length > 0) {
    normalized.skills = skills.sort();
    if (filters.skillMatchMode) {
      normalized.skillMatchMode = filters.skillMatchMode.toLowerCase();
    }
  }
  return normalized;
};

const buildCompactPayload = (linkup, candidateStudents, filters = {}) => {
  const teamAnalysis = analyzeTeamComplement(linkup, linkup.members || []);
  const normalizedReqSkills = normalizeSkillArray(linkup.requiredSkills || []);
  const normalizedFilters = normalizeFilterState(filters);

  const projectPayload = {
    meldId: linkup.id,
    title: linkup.title || '',
    description: linkup.description || '',
    category: linkup.category || 'General',
    requiredSkills: normalizedReqSkills,
    projectDuration: linkup.projectDuration || linkup.project_duration || 'Not specified',
    roles: teamAnalysis.derivedRoles.map(r => ({
      name: r.name,
      skills: r.skills,
      status: teamAnalysis.filledRoles.some(f => f.roleName === r.name) ? 'FILLED' : 'OPEN',
    })),
    // Privacy Data Minimization: Send anonymized member tokens instead of real names to external AI
    currentTeam: teamAnalysis.currentTeamMembers.map((m, idx) => ({
      memberToken: `member_${idx + 1}`,
      role: m.role || 'Member',
      skills: m.skills || [],
    })),
    unmetNeeds: teamAnalysis.unmetNeeds,
  };

  const candidateIdsSet = new Set();
  const candidateLookupMap = new Map();

  // Send top candidates to AI (up to 20 for efficient token usage and speed)
  const candidatePayloads = candidateStudents.slice(0, 20).map((cand) => {
    const p = cand.candidate || cand;
    const userIdStr = String(p.id || p.userId);

    candidateIdsSet.add(userIdStr);
    candidateLookupMap.set(userIdStr, p);

    const compactCand = {
      userId: userIdStr,
      skills: normalizeSkillArray(p.skills || []),
      interests: Array.isArray(p.interests) ? p.interests.map((i) => (typeof i === 'object' ? i.name : i)) : [],
      availability: p.availability || 'Flexible',
      degree: p.degree || '',
      college: p.college || '',
    };

    if (p.bio && typeof p.bio === 'string' && p.bio.trim().length > 0) {
      compactCand.bio = p.bio.trim().slice(0, 250);
    }

    return compactCand;
  });

  const compactPayload = {
    algorithmVersion: MATCHING_ALGORITHM_VERSION,
    filters: normalizedFilters,
    project: projectPayload,
    candidates: candidatePayloads,
  };

  return {
    compactPayload,
    candidateIdsSet,
    candidateLookupMap,
    normalizedFilters,
    algorithmVersion: MATCHING_ALGORITHM_VERSION,
  };
};

module.exports = {
  MATCHING_ALGORITHM_VERSION,
  normalizeFilterState,
  matchCandidates,
  buildCompactPayload,
};
