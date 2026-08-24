/**
 * NVIDIA Nemotron Service for Linkup AI Teammate Matching
 * 
 * Configured for high-speed, compact JSON mode output with zero chain-of-thought.
 */

const analyzeMatchesWithNvidia = async (compactPayload) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  const modelName = process.env.NEMOTRON_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_nvidia_api_key')) {
    throw new Error('NVIDIA_API_KEY is missing or unconfigured.');
  }

  const systemInstruction = `You are Linkup's fast teammate matching engine.
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

  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA API HTTP ${response.status}: ${errorText.slice(0, 150)}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Empty payload returned from NVIDIA API.');
  }

  let cleaned = rawContent.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.substring(firstBrace);
  }

  try {
    return JSON.parse(cleaned.replace(/,\s*([\]}])/g, '$1'));
  } catch (err) {
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
  analyzeMatchesWithNvidia,
};
