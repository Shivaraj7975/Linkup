/**
 * Generic OpenAI-Compatible Service for Linkup AI Teammate Matching
 * 
 * Reusable for providers like Groq, NVIDIA Llama, VoidAI, etc.
 */

const analyzeMatchesWithOpenAICompatible = async (compactPayload, config) => {
  const { endpoint, apiKey, modelName, providerName, timeoutMs = 7000 } = config;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_')) {
    throw new Error(`${providerName} API key is missing or unconfigured.`);
  }

  const systemInstruction = `You are MELD's fast teammate matching engine.
Compare the project requirements with each candidate.
For every candidate:
- calculate a match score from 0 to 100
- identify 1 to 3 concise matching reasons
- identify key strengths
- identify potential concerns

Use ONLY supplied data. Never invent skills, interests, or availability.
Return ONLY valid JSON adhering to the specified schema. No markdown codeblock fences, no prose outside JSON.`;

  const promptText = `Match project requirements with candidate profiles:
${JSON.stringify(compactPayload, null, 2)}

Respond with JSON adhering to this exact schema:
{
  "matches": [
    {
      "userId": "string",
      "matchPercentage": 85,
      "reasons": ["short reason 1", "short reason 2"],
      "strengths": ["skill 1"],
      "concerns": []
    }
  ]
}`;

  const requestBody = {
    model: modelName,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: promptText },
    ],
    temperature: 0.1,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: ${providerName} request took longer than ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    const isRateLimited = response.status === 429;
    const errorMsg = `${providerName} API HTTP ${response.status}: ${errorText.slice(0, 150)}`;
    const err = new Error(errorMsg);
    err.isRateLimited = isRateLimited;
    throw err;
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error(`Empty payload returned from ${providerName} API.`);
  }

  let cleaned = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.substring(firstBrace);
  }

  try {
    return JSON.parse(cleaned.replace(/,\s*([\]}])/g, '$1'));
  } catch (err) {
    // Attempt auto-repair for truncated JSON
    const matchesIdx = cleaned.indexOf('"matches"');
    if (matchesIdx !== -1) {
      const lastObjEnd = cleaned.lastIndexOf('}');
      if (lastObjEnd > matchesIdx) {
        let repaired = cleaned.substring(0, lastObjEnd + 1).replace(/,\s*$/, '');
        if (!repaired.endsWith(']')) repaired += ']';
        if (!repaired.endsWith('}')) repaired += '}';
        try {
          return JSON.parse(repaired.replace(/,\s*([\]}])/g, '$1'));
        } catch (e2) {}
      }
    }
    throw err;
  }
};

module.exports = {
  analyzeMatchesWithOpenAICompatible,
};
