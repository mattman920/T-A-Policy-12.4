const { calculateUserState, VIOLATION_TYPES } = require('./src/utils/pointCalculator.js');

// Mock Data
const violations = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-01' }, // -3 => 147
    { type: VIOLATION_TYPES.TARDY_6_11, date: '2023-01-05' }, // -5 => 142
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-02-01' },    // -24 => 118 (Tier Change?)
];

// Test 1: Current State (No target date)
console.log("--- Test 1: Current State ---");
const state1 = calculateUserState(violations, {});
console.log(`Current Score: ${state1.points}`);

// Test 2: Time Travel (Before Callout)
console.log("\n--- Test 2: Time Travel (Jan 31, 2023) ---");
const targetDate = new Date('2023-01-31T23:59:59');
const state2 = calculateUserState(violations, { targetDate });
console.log(`Score on Jan 31: ${state2.points}`);

// Expected:
// Jan 1: 147
// Jan 5: 142
// Jan 31: Should be 142 (Before Callout)
// Feb 1: 118 (After Callout)

if (state2.points === 142 && state1.points <= 118) {
    console.log("SUCCESS: Time travel logic works.");
} else {
    console.log("FAILURE: Time travel logic mismatch.");
    console.log(`Expected 142, got ${state2.points}`);
}
