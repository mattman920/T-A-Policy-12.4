
import { calculateQuarterlyStart, VIOLATION_TYPES } from './src/utils/pointCalculator.js';

const mockSettings = {
    startingPoints: 150,
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

// Mock Violations for Q3 (July-Sept)
// We want to end up with 90 points.
// Start: 150.
// Deductions needed: 60.
// 4 Callouts: 15 + 20 + 25 + 30 = 90 deductions? No.
// 15+20=35. 35+25=60.
// So 3 Callouts = 60 points deduction.
// 150 - 60 = 90.

const violations = [
    {
        date: '2025-07-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 15
    },
    {
        date: '2025-08-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 20
    },
    {
        date: '2025-09-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 25
    }
];

// Target: Q4 2025
const targetQuarter = '2025-Q4';

console.log("Calculating Start for Q4...");
const startQ4 = calculateQuarterlyStart(targetQuarter, violations, mockSettings);

console.log(`Start Q4 Points: ${startQ4}`);

if (startQ4 === 150) {
    console.log("BUG REPRODUCED: Points reset to 150.");
} else if (startQ4 === 125) {
    console.log("Working as expected: Points reset to 125 (Educational Threshold).");
} else {
    console.log(`Unexpected result: ${startQ4}`);
}
