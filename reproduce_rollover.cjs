
const { calculateQuarterlyStart, VIOLATION_TYPES } = require('./src/utils/pointCalculator.js');

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
            'Tardy (1-5 min)': [2, 3, 5, 5],
            'Tardy (6-11 min)': [5, 10, 15, 15],
            'Tardy (12-29 min)': [15, 20, 25, 25],
            'Tardy (30+ min)': [25, 35, 50, 50]
        }
    }
};

// Mock Violations for Q3 (July-Sept)
// We want to end up with 90 points.
// Start: 150.
// Deductions needed: 60.
// 3 Callouts: 15 + 20 + 25 = 60 points deduction.
// 150 - 60 = 90.

const violations = [
    {
        date: '2025-07-15', // Q3
        type: 'Call Out',
        pointsDeducted: 15
    },
    {
        date: '2025-08-15', // Q3
        type: 'Call Out',
        pointsDeducted: 20
    },
    {
        date: '2025-09-15', // Q3
        type: 'Call Out',
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
