
const { calculateQuarterlyStart, calculateCurrentPoints, determineTier, VIOLATION_TYPES } = require('./pointCalculator_temp');

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

// Scenario 1: Violations in Q2 (Non-consecutive), Checking Q3 Start
// Q2: April, May, June
const violationsQ2 = [
    { type: 'Call Out', date: '05-01-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '05-05-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '05-10-2025', pointsDeducted: 25 },
    { type: 'Call Out', date: '05-15-2025', pointsDeducted: 30 }, // Total 90 deduction. 150 - 90 = 60 (Severe)
];

console.log("--- Testing Q3 Start (History in Q2) ---");
const q3Start = calculateQuarterlyStart('2025-Q3', violationsQ2, settings);
console.log(`Q3 Start Score: ${q3Start}`);
if (q3Start === 100) {
    console.log("SUCCESS: Q3 Start is 100 (Correctly rolled over from Q2 Severe)");
} else {
    console.log(`FAILURE: Q3 Start is ${q3Start} (Expected 100)`);
}

// Scenario 2: Violations in Q3 (Non-consecutive), Checking Q4 Start
// Q3: July, Aug, Sept
const violationsQ3 = [
    { type: 'Call Out', date: '08-01-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '08-05-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '08-10-2025', pointsDeducted: 25 },
    { type: 'Call Out', date: '08-15-2025', pointsDeducted: 30 }, // Total 90 deduction. 150 - 90 = 60 (Severe)
];

console.log("\n--- Testing Q4 Start (History in Q3) ---");
const q4Start = calculateQuarterlyStart('2025-Q4', violationsQ3, settings);
console.log(`Q4 Start Score: ${q4Start}`);
if (q4Start === 100) {
    console.log("SUCCESS: Q4 Start is 100 (Correctly rolled over from Q3 Severe)");
} else {
    console.log(`FAILURE: Q4 Start is ${q4Start} (Expected 100)`);
}

// Scenario 3: Mixed Dates (Non-consecutive)
const violationsSevereMixed = [
    { type: 'Call Out', date: '08-01-2025', pointsDeducted: 15 },
    { type: 'Call Out', date: '08-05-2025', pointsDeducted: 20 },
    { type: 'Call Out', date: '2025-08-10', pointsDeducted: 25 },
    { type: 'Call Out', date: '2025-08-15', pointsDeducted: 30 }, // 90 pts off -> 60 -> Severe
];
console.log("\n--- Testing Mixed Date Formats ---");
const q4StartSevereMixed = calculateQuarterlyStart('2025-Q4', violationsSevereMixed, settings);
console.log(`Q4 Start Score (Mixed Dates): ${q4StartSevereMixed}`);
if (q4StartSevereMixed === 100) {
    console.log("SUCCESS: Q4 Start is 100 with mixed dates");
} else {
    console.log(`FAILURE: Q4 Start is ${q4StartSevereMixed} (Expected 100)`);
}
