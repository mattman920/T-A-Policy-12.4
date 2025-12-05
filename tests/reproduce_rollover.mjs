
import { calculateQuarterlyStart, calculateCurrentPoints, determineTier, TIERS, VIOLATION_TYPES } from './temp_pointCalculator.mjs';

// Mock Settings
const settings = {
    startingPoints: 150,
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    },
    violationPenalties: {
        callout: [15, 20, 25, 30, 35, 40], // Standard penalties
        tardy: {
            'Tardy (1-5 min)': [2, 3, 5, 5],
            'Tardy (6-11 min)': [5, 10, 15, 15],
            'Tardy (12-29 min)': [15, 20, 25, 25],
            'Tardy (30+ min)': [25, 35, 50, 50]
        }
    }
};

// Mock Violations
// Q3 is July-Sept.
// 4 Callouts in Q3.
// 1st: 15 pts
// 2nd: 20 pts
// 3rd: 25 pts
// 4th: 30 pts
// Total Deduction: 90 pts.
// Start 150 - 90 = 60 pts.
// 60 pts is > 50 (Final) and <= 75 (Severe). So Severe.

const violations = [
    {
        date: '2024-07-15',
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 15
    },
    {
        date: '2024-08-01',
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 20
    },
    {
        date: '2024-08-15',
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 25
    },
    {
        date: '2024-09-01',
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 30
    }
];

// Calculate Q4 Start
// Target: 2024-Q4
const q4Start = calculateQuarterlyStart('2024-Q4', violations, settings);

console.log('Q4 Start Score:', q4Start);

// Expected: 100 (Coaching Threshold) because Q3 ended in Severe.
if (q4Start === 100) {
    console.log('SUCCESS: Logic returned 100 as expected.');
} else {
    console.log(`FAILURE: Logic returned ${q4Start} instead of 100.`);
}

// Debugging Q3 End
const q3Start = calculateQuarterlyStart('2024-Q3', violations, settings);
console.log('Q3 Start Score:', q3Start); // Should be 150

const q3Violations = violations.filter(v => v.date >= '2024-07-01' && v.date <= '2024-09-30');
const q3End = calculateCurrentPoints(q3Start, q3Violations, settings.violationPenalties);
console.log('Q3 End Score:', q3End); // Should be 60

const q3Tier = determineTier(q3End, settings.daSettings);
console.log('Q3 End Tier:', q3Tier.name); // Should be Severe
