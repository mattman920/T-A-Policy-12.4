import { generateHealthCheckFeedback } from './aiService.js';

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
