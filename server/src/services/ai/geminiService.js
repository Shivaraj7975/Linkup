/**
 * Google Gemini Service for Linkup AI Teammate Matching
 * 
 * Optimized for ultra-fast response using Gemini 1.5 Flash with native JSON mode.
 */

const analyzeMatchesWithGemini = async (compactPayload) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    throw new Error('GEMINI_API_KEY is missing or unconfigured.');
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

  // Native JSON Mode configured with Gemini models
  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite'
  ];

  let rawContent = null;
  let lastError = null;

  for (const modelName of modelsToTry) {
    console.log(`[AI MATCH] Trying Gemini model: ${modelName}...`);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 150)}`);
      }

      const data = await response.json();
      rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (rawContent) {
        console.log(`[AI MATCH] Gemini model ${modelName} success.`);
        break; // Success, break out of loop
      } else {
        throw new Error('Empty payload returned from Gemini API.');
      }
    } catch (err) {
      console.warn(`⚠️ Gemini model ${modelName} failed: ${err.message}`);
      lastError = err;
      continue;
    }
  }

  if (!rawContent) {
    throw new Error(`All Gemini models exhausted. Last error: ${lastError?.message}`);
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
  analyzeMatchesWithGemini,
};
