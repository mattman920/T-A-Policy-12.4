
import pkg from '../src/utils/pointCalculator.js';
const { calculateQuarterlyStart, calculateCurrentPoints, determineTier, VIOLATION_TYPES } = pkg;

// Mock Settings
const settings = {
    startingPoints: 150,
    quarterlyPurges: {},
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    },
    violationPenalties: {
        callout: [15, 20, 25, 30, 35, 40],
        tardy: {
            [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5],
            [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 15],
            [VIOLATION_TYPES.TARDY_12_29]: [15, 20, 25, 25],
            [VIOLATION_TYPES.TARDY_30_PLUS]: [25, 35, 50, 50]
        }
    }
};

// Scenario 1: Violations in Q2, Checking Q3 Start (Previous Quarter Scenario)
// Q2: April, May, June
const violationsQ2 = [
    { type: 'Call Out', date: '05-15-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '05-16-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '05-17-2025', pointsDeducted: 25 },
    { type: 'Call Out', date: '05-18-2025', pointsDeducted: 30 }, // Total 90 deduction. 150 - 90 = 60 (Severe)
];

console.log("--- Testing Q3 Start (History in Q2) ---");
const q3Start = calculateQuarterlyStart('2025-Q3', violationsQ2, settings);
console.log(`Q3 Start Score: ${q3Start}`);
if (q3Start === 100) {
    console.log("SUCCESS: Q3 Start is 100 (Correctly rolled over from Q2 Severe)");
} else {
    console.log(`FAILURE: Q3 Start is ${q3Start} (Expected 100)`);
}

// Scenario 2: Violations in Q3, Checking Q4 Start (Current Quarter Scenario)
// Q3: July, Aug, Sept
const violationsQ3 = [
    { type: 'Call Out', date: '08-15-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '08-16-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '08-17-2025', pointsDeducted: 25 },
    { type: 'Call Out', date: '08-18-2025', pointsDeducted: 30 }, // Total 90 deduction. 150 - 90 = 60 (Severe)
];

console.log("\n--- Testing Q4 Start (History in Q3) ---");
const q4Start = calculateQuarterlyStart('2025-Q4', violationsQ3, settings);
console.log(`Q4 Start Score: ${q4Start}`);
if (q4Start === 100) {
    console.log("SUCCESS: Q4 Start is 100 (Correctly rolled over from Q3 Severe)");
} else {
    console.log(`FAILURE: Q4 Start is ${q4Start} (Expected 100)`);
}

// Scenario 3: Mixed Dates (MM-DD-YYYY and YYYY-MM-DD)
const violationsMixed = [
    { type: 'Call Out', date: '08-15-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '2025-08-16', pointsDeducted: 20 },
];
console.log("\n--- Testing Mixed Date Formats ---");
const q4StartMixed = calculateQuarterlyStart('2025-Q4', violationsMixed, settings);
// 150 - 35 = 115 (Educational). Next Start should be 125.
// Wait, logic says: if (tier.name === TIERS.COACHING.name) return config.educational;
// if (tier.name === TIERS.EDUCATIONAL.name) return max;
// So Educational -> 150.
// Let's make it Severe.
const violationsSevereMixed = [
    { type: 'Call Out', date: '08-15-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '08-16-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '2025-08-17', pointsDeducted: 25 },
    { type: 'Call Out', date: '2025-08-18', pointsDeducted: 30 }, // 90 pts off -> 60 -> Severe
];
const q4StartSevereMixed = calculateQuarterlyStart('2025-Q4', violationsSevereMixed, settings);
console.log(`Q4 Start Score (Mixed Dates): ${q4StartSevereMixed}`);
if (q4StartSevereMixed === 100) {
    console.log("SUCCESS: Q4 Start is 100 with mixed dates");
} else {
    console.log(`FAILURE: Q4 Start is ${q4StartSevereMixed} (Expected 100)`);
}
