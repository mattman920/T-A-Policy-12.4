export const generateHealthCheckFeedback = async (payload, apiKey) => {
    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please configure it in Settings.");
    }

    const { name, currentTier, stickyDA, daysStabilized, recentViolationType, isRecoveryRisk, surgeActive, draftSummary } = payload;

    // --- PII SANITIZATION START ---
    // Scramble the name to a random ID
    const randomId = Math.random().toString(36).substring(7);
    const scrambledId = `EMP_${randomId.toUpperCase()}`;
    const nameMap = new Map();
    if (name) {
        nameMap.set(scrambledId, name);
    }
    // --- PII SANITIZATION END ---

    const inputData = draftSummary
        ? `DRAFT SUMMARY: "${draftSummary}"`
        : `TIER: ${currentTier}, STICKY DA: ${stickyDA}, DAYS STABILIZED: ${daysStabilized}`;

    // Inject a random seed to prevent caching and encourage diversity
    const seed = Math.random().toString(36).substring(7);

    const systemPrompt = `
System Instruction: Attendance Coach AI
ROLE: You are a professional HR assistant reviewing employee summaries.
GOAL: Rewrite the provided "DRAFT SUMMARY" to sound natural, professional, and unique.

CRITICAL RULES:
1. FACTS ARE SACRED: You must retain all numbers, dates, tiers, and DA names EXACTLY as they appear.
2. NO NEW FACTS: Do not invent information.
3. TONE: Professional, direct, yet encouraging.
4. VARIATION: You MUST vary the sentence structure. Do not just swap synonyms. Rearrange the order of information where logical (except for the warning/consequences which should usually follow the status).
   - "You are currently in Tier 2..." -> "Your current status is Tier 2..."
   - "If you drop tiers again..." -> "Be aware that a further drop..."
5. DIVERSITY SEED: ${seed} (Use this random noise to influence your word choices).

INPUT DATA:
- ID: ${scrambledId}
- ${inputData}

OUTPUT FORMAT (JSON):
{
  "summary": "The rewritten summary."
}
`;

    const cleanKey = apiKey.trim();
    try {
        // Use the stable alias 'gemini-flash-latest' to ensure availability.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${cleanKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.9 // High temperature for more variation
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const jsonResponse = JSON.parse(text);

        // --- PII POST-PROCESSING START ---
        // Swap scrambled ID back to real name if it appears in the text
        let summary = jsonResponse.summary || "No summary generated.";

        // --- TEXT SANITIZING START ---
        // Remove Emojis and Non-ASCII characters that might break jsPDF
        // Replace smart quotes with standard ones
        summary = summary
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII (emojis, etc)
            .trim();
        // --- TEXT SANITIZING END ---

        if (nameMap.has(scrambledId)) {
            const realName = nameMap.get(scrambledId);
            const regex = new RegExp(scrambledId, 'g');
            summary = summary.replace(regex, realName);
        }
        // --- PII POST-PROCESSING END ---

        return {
            summary,
            source: 'Gemini AI'
        };

    } catch (error) {
        console.error("AI Generation Failed:", error);
        // Fallback to draft summary if AI fails
        return {
            summary: draftSummary || "Unable to generate summary.",
            source: 'System (Fallback)'
        };
    }
};
