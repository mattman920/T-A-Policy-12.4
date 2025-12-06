import { calculateCurrentPoints, VIOLATION_TYPES, calculateDeductions } from '../src/utils/pointCalculator.mjs';

// Mock Data
const startingPoints = 100;
const penalties = {
    callout: [15, 20, 25, 30, 35, 40],
    tardy: {
        'Tardy (1-5 min)': [2, 3, 5, 5]
    },
    positiveAdjustments: {}
};

// Test Case 1: Legacy "Callout" string
const legacyViolations = [
    { type: 'Callout', date: '2024-01-01', pointsDeducted: 15 }
];

// Test Case 2: Correct "Call Out" string
const correctViolations = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-02', pointsDeducted: 15 }
];

// Test Case 3: Mixed
const mixedViolations = [
    { type: 'Callout', date: '2024-01-01', pointsDeducted: 15 },
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-10', pointsDeducted: 20 } // Should be 2nd offense
];

console.log('--- Verification Test ---');

const scoreLegacy = calculateCurrentPoints(startingPoints, legacyViolations, penalties);
console.log(`Legacy 'Callout' Score (Expected 85): ${scoreLegacy}`);

const scoreCorrect = calculateCurrentPoints(startingPoints, correctViolations, penalties);
console.log(`Correct 'Call Out' Score (Expected 85): ${scoreCorrect}`);

const scoreMixed = calculateCurrentPoints(startingPoints, mixedViolations, penalties);
console.log(`Mixed Score (Expected 65 [100 - 15 - 20]): ${scoreMixed}`);

if (scoreLegacy === 85 && scoreCorrect === 85 && scoreMixed === 65) {
    console.log('✅ SUCCESS: Calculation logic handles both formats correctly.');
} else {
    console.error('❌ FAILURE: Calculation logic is incorrect.');
}
