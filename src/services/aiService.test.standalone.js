// Mock fetch
global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const text = body.contents[0].parts[0].text;

    console.log("--- Request Body Check ---");
    if (text.includes("Employee Name: EMP_001")) {
        console.log("PASS: Placeholder 'EMP_001' found in request.");
    } else {
        console.error("FAIL: Placeholder 'EMP_001' NOT found in request.");
        console.log("Request Text:", text);
    }

    if (text.includes("John Doe")) {
        console.error("FAIL: Real name 'John Doe' found in request!");
    } else {
        console.log("PASS: Real name 'John Doe' NOT found in request.");
    }

    return {
        ok: true,
        json: async () => ({
            candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify({
                            summary: "EMP_001 has been doing well.",
                            tips: ["EMP_001 should keep it up."]
                        })
                    }]
                }
            }]
        })
    };
};

// --- COPIED LOGIC FROM aiService.js (Modified to remove exports for standalone run) ---

const generateHealthCheckFeedback = async (payload, apiKey) => {
    if (!apiKey) {
        console.warn("No API Key provided for AI Service. Returning mock data.");
        return generateMockFeedback(payload);
    }

    const { score, stage, stageLabel, recentViolations, employeeName } = payload;

    // --- PII SANITIZATION START ---
    // 1. Pre-Processing: Create a temporary mapping
    const placeholder = "EMP_001"; // Simple placeholder since we process one at a time
    const nameMap = new Map();
    if (employeeName) {
        nameMap.set(placeholder, employeeName);
    }
    // --- PII SANITIZATION END ---

    const systemPrompt = `
Role: You are an expert HR Performance Coach & Behavioral Scientist.
Task: Write a 2-sentence "Status Summary" and 3 bullet points of "Strategic Advice" for an employee based on their attendance data.

Strict Content Rules:
- No Monetary Promises: NEVER suggest asking for a raise, promotion, or bonus. Focus entirely on professional reputation, reliability, and team impact.
- Stage-Specific Tone:
    - Green (>125): Affirmative, reinforcing, leadership-focused.
    - Yellow (100-124): Warning tone. Focus on "course correction" and "preventing habits."
    - Orange/Red (<100): Serious, formal tone. Focus on "immediate change" and "consequences."
- Data-Driven Customization: If the data shows "Late Arrivals," focus tips on punctuality routines. If "No Shows," focus on communication.
- Positive Trend Logic: If "Recent Violation Types" is "None" but the Score is low (Yellow/Orange/Red), acknowledge the recent good behavior ("Great job keeping a clean record this period") but emphasize that the overall score is still recovering ("However, your overall score remains in a critical zone"). Be motivating but firm about consistency.
- Scientific/Professional Approach: Use concepts like "decision fatigue," "habit stacking," or "professional brand."
- Variation: Ensure the output phrasing varies slightly each time.

Output Format (JSON):
{
  "summary": "Two sentence summary here.",
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
`;

    // 2. Sanitization: Use placeholder in the prompt
    const userPrompt = `
Employee Name: ${placeholder}
Employee Score: ${score}/150
Current Stage: ${stage} (${stageLabel})
Recent Violation Types: ${recentViolations}
`;

    const cleanKey = apiKey.trim();
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt + "\n\n" + userPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text(); // Get full error details
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const jsonResponse = JSON.parse(text);

        // --- PII POST-PROCESSING START ---
        // 3. Post-Processing: Swap placeholder back to real name
        let summary = jsonResponse.summary;
        let tips = jsonResponse.tips;

        if (nameMap.has(placeholder)) {
            const realName = nameMap.get(placeholder);
            const regex = new RegExp(placeholder, 'g');

            if (summary) {
                summary = summary.replace(regex, realName);
            }

            if (tips && Array.isArray(tips)) {
                tips = tips.map(tip => tip.replace(regex, realName));
            }
        }
        // --- PII POST-PROCESSING END ---

        return {
            summary: summary,
            tips: tips,
            source: 'Gemini AI'
        };

    } catch (error) {
        console.error("AI Generation Failed:", error);
        let userMessage = error.message;
        if (error.message === 'Failed to fetch') {
            userMessage = "Network Error: Could not connect to Google API. Check your internet connection or ad blockers.";
        }
        return { ...generateMockFeedback(payload), error: userMessage }; // Fallback to mock on error
    }
};

const generateMockFeedback = (payload) => {
    const { score, stageLabel } = payload;
    let summary = "";
    let tips = [];

    if (stageLabel === 'Green') {
        summary = "You are currently in the Green zone, demonstrating strong reliability. Continue to set the standard for the team.";
        tips = ["Maintain your current routine.", "Mentor peers on time management.", "Focus on consistency."];
    } else if (stageLabel === 'Yellow') {
        summary = "You have entered the Educational Stage. It is critical to arrest this trend immediately.";
        tips = ["Audit your morning routine.", "Review notification policies.", "Focus on habit consistency."];
    } else {
        summary = "Your attendance status is critical. Continued violations will lead to further disciplinary action.";
        tips = ["Treat every shift as mandatory.", "Implement a fail-safe alarm.", "Reliability must be your priority."];
    }

    return { summary, tips, source: 'Mock Generator' };
};

// --- TEST RUNNER ---

async function runTest() {
    const payload = {
        score: 130,
        stage: 'Educational Stage',
        stageLabel: 'Green',
        recentViolations: 'None',
        employeeName: 'John Doe'
    };

    console.log("Running generateHealthCheckFeedback...");
    const result = await generateHealthCheckFeedback(payload, "fake-api-key");

    console.log("\n--- Response Check ---");
    if (result.summary.includes("John Doe")) {
        console.log("PASS: Summary contains real name 'John Doe'.");
    } else {
        console.error("FAIL: Summary does NOT contain real name 'John Doe'.");
        console.log("Summary:", result.summary);
    }

    if (result.tips[0].includes("John Doe")) {
        console.log("PASS: Tips contain real name 'John Doe'.");
    } else {
        console.error("FAIL: Tips do NOT contain real name 'John Doe'.");
        console.log("Tips:", result.tips);
    }
}

runTest();
