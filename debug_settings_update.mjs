
import { calculateQuarterlyStart, determineTier, TIERS } from './pointCalculator.mjs';

// Mock DataContext Logic
let localData = {
    settings: {
        startingPoints: 150,
        daSettings: {
            educational: 150, // Bad value from backup
            coaching: 100,
            severe: 75,
            final: 50
        },
        violationPenalties: { callout: [15] }
    },
    employees: [
        { id: 'emp1', name: 'Test Employee', currentPoints: 150 }
    ],
    violations: [
        // Q3 Violations (End at 90)
        { date: '2024-07-15', type: 'Call Out', pointsDeducted: 15, employeeId: 'emp1' },
        { date: '2024-08-15', type: 'Call Out', pointsDeducted: 15, employeeId: 'emp1' },
        { date: '2024-09-01', type: 'Call Out', pointsDeducted: 15, employeeId: 'emp1' },
        { date: '2024-09-15', type: 'Call Out', pointsDeducted: 15, employeeId: 'emp1' }
    ]
};

// Mock updateSettings
async function updateSettings(newSettings) {
    console.log("Updating settings with:", JSON.stringify(newSettings, null, 2));
    const mergedSettings = { ...localData.settings, ...newSettings };

    // Simulate persistence
    localData.settings = mergedSettings;
    console.log("Merged Settings DA:", JSON.stringify(localData.settings.daSettings, null, 2));

    // Recalculate
    const currentQuarterKey = '2024-Q4';
    const employeeViolations = localData.violations.filter(v => v.employeeId === 'emp1');

    console.log("Recalculating with merged settings...");
    const startingPoints = calculateQuarterlyStart(currentQuarterKey, employeeViolations, mergedSettings);
    console.log(`Calculated Starting Points: ${startingPoints}`);

    return startingPoints;
}

async function runTest() {
    console.log("--- Initial State ---");
    // Initial calc with bad settings (150)
    const initStart = calculateQuarterlyStart('2024-Q4', localData.violations, localData.settings);
    console.log(`Initial Starting Points (Educational=150): ${initStart}`);
    // Expected: 150 (because Educational=150, so 90 is Coaching. 150->90 is 2 levels? No.
    // If Ed=150. 150 is Good. 149 is Ed.
    // Start 150 (Good). End 90 (Coaching).
    // Good(5) - Coaching(3) = 2.
    // Clean Slate Fails.
    // Returns nextStart of Coaching -> Educational.
    // Educational is 150.
    // So returns 150. Correct.

    console.log("\n--- Updating Settings to 125 ---");
    const newResult = await updateSettings({
        daSettings: {
            educational: 125,
            coaching: 100,
            severe: 75,
            final: 50
        }
    });

    // Expected: 125.
    // If Ed=125.
    // Start 150 (Good). End 90 (Coaching).
    // Good(5) - Coaching(3) = 2.
    // Clean Slate Fails.
    // Returns nextStart of Coaching -> Educational.
    // Educational is 125.
    // So returns 125.

    if (newResult === 125) {
        console.log("SUCCESS: Updated to 125.");
    } else {
        console.log(`FAILURE: Expected 125, got ${newResult}`);
    }
}

runTest();
