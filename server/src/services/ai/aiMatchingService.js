const { analyzeMatchesWithGemini } = require('./geminiService');
const { analyzeMatchesWithNvidia } = require('./nvidiaService');
const { analyzeMatchesWithOpenAICompatible } = require('./openAiCompatibleService');

const providerCooldowns = new Map();

/**
 * AI Provider Abstraction Service for Linkup Teammate Matching
 * 
 * Flow:
 * 1. Build compact, minimal Linkup & Candidate JSON payloads.
 * 2. Send SINGLE batch AI request to primary AI provider (Gemini).
 * 3. Validate JSON schema & candidate user IDs.
 * 4. Sort results strictly by AI matchPercentage (NO JS re-matching).
 * 5. Log stage-by-stage timing metrics.
 */

const matchCandidates = async (compactPayload, candidateIdsSet, candidateLookupMap) => {
  const totalStartTime = Date.now();

  // 1 & 2 done prior to calling this function

  // 3. Send Single AI Call via Provider Waterfall
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
      fn: () => analyzeMatchesWithNvidia(compactPayload)
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
      break; // Success! Break out of the loop
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

  // 4. Validate JSON & Candidate User IDs
  const validateStartTime = Date.now();
  if (!aiRawResult || !Array.isArray(aiRawResult.matches)) {
    throw new Error('AI returned an invalid response structure without a matches array.');
  }

  const validatedMatches = [];
  const processedUserIds = new Set();

  for (const match of aiRawResult.matches) {
    const userIdStr = String(match.userId);

    // Skip if userId is invalid, not in sent candidates list, or duplicate
    if (!userIdStr || !candidateIdsSet.has(userIdStr) || processedUserIds.has(userIdStr)) {
      continue;
    }

    processedUserIds.add(userIdStr);
    const originalCand = candidateLookupMap.get(userIdStr) || {};

    const rawScore = parseInt(match.matchPercentage, 10);
    const matchPercentage = isNaN(rawScore) ? 0 : Math.min(Math.max(rawScore, 0), 100);

    const reasons = Array.isArray(match.reasons)
      ? match.reasons.slice(0, 3).map((r) => String(r).trim().slice(0, 80))
      : [];

    const strengths = Array.isArray(match.strengths)
      ? match.strengths.slice(0, 3).map((s) => String(s).trim().slice(0, 50))
      : [];

    const concerns = Array.isArray(match.concerns)
      ? match.concerns.slice(0, 2).map((c) => String(c).trim().slice(0, 50))
      : [];

    validatedMatches.push({
      userId: userIdStr,
      name: originalCand.name || 'Student Candidate',
      college: originalCand.college || 'University Student',
      degree: originalCand.degree || '',
      yearOfStudy: originalCand.yearOfStudy || originalCand.year_of_study || '',
      verificationStatus: originalCand.verificationStatus || originalCand.verification_status || 'UNVERIFIED',
      matchPercentage,
      reasons,
      strengths,
      concerns,
      candidate: originalCand,
    });
  }

  // Ensure candidates missed by AI are appended with 0% fallback if any
  for (const [candId, originalCand] of candidateLookupMap.entries()) {
    if (!processedUserIds.has(candId)) {
      validatedMatches.push({
        userId: candId,
        name: originalCand.name || 'Student Candidate',
        college: originalCand.college || 'University Student',
        degree: originalCand.degree || '',
        yearOfStudy: originalCand.yearOfStudy || originalCand.year_of_study || '',
        verificationStatus: originalCand.verificationStatus || originalCand.verification_status || 'UNVERIFIED',
        matchPercentage: 0,
        reasons: ['Profile evaluated'],
        strengths: [],
        concerns: [],
        candidate: originalCand,
      });
    }
  }

  // Primary sort by Verified Student status (VERIFIED first), secondary sort by matchPercentage descending
  validatedMatches.sort((a, b) => {
    const aVerified = a.verificationStatus === 'VERIFIED' ? 1 : 0;
    const bVerified = b.verificationStatus === 'VERIFIED' ? 1 : 0;
    if (aVerified !== bVerified) {
      return bVerified - aVerified;
    }
    return b.matchPercentage - a.matchPercentage;
  });

  const validateDuration = Date.now() - validateStartTime;
  const totalDuration = Date.now() - totalStartTime;

  console.log(`[AI MATCH] JSON validation & ID check: ${validateDuration}ms`);
  console.log(`[AI MATCH] Total AI Pipeline: ${totalDuration}ms`);

  return {
    success: true,
    generatedBy: providerUsed,
    matches: validatedMatches,
  };
};

const buildCompactPayload = (linkup, candidateStudents) => {
  const linkupPayload = {
    category: linkup.category || 'General',
    requiredSkills: Array.isArray(linkup.requiredSkills)
      ? linkup.requiredSkills.map((s) => (typeof s === 'object' ? s.name : s))
      : [],
    commitmentLevel: linkup.commitmentLevel || linkup.commitment_level || 'Flexible',
    projectDuration: linkup.projectDuration || linkup.project_duration || 'Not specified',
  };

  const candidateIdsSet = new Set();
  const candidateLookupMap = new Map();

  const candidatePayloads = candidateStudents.map((cand) => {
    const p = cand.candidate || cand;
    const userIdStr = String(p.id || p.userId);

    candidateIdsSet.add(userIdStr);
    candidateLookupMap.set(userIdStr, p);

    const compactCand = {
      userId: userIdStr,
      skills: Array.isArray(p.skills) ? p.skills.map((s) => (typeof s === 'object' ? s.name : s)) : [],
      interests: Array.isArray(p.interests) ? p.interests.map((i) => (typeof i === 'object' ? i.name : i)) : [],
      availability: p.availability || 'Flexible',
    };

    if (p.bio && typeof p.bio === 'string' && p.bio.trim().length > 0 && p.bio.trim().length < 150) {
      compactCand.bio = p.bio.trim();
    }

    return compactCand;
  });

  const compactPayload = {
    project: linkupPayload,
    candidates: candidatePayloads,
  };

  return { compactPayload, candidateIdsSet, candidateLookupMap };
};

module.exports = {
  matchCandidates,
  buildCompactPayload,
};
