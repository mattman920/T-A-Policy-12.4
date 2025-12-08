
import { calculateUserState, VIOLATION_TYPES } from './verify_temp.mjs';

console.log("--- Surge vs Consecutive Logic Verification ---");

// Helper to create violation
const createV = (date, type) => ({ date, type });

// Scenario:
// 1. Callout (Day 1) -> Standard Penalty (-24)
// 2. Callout (Day 3) -> Surge Penalty (-40) (Surge Active due to Day 1)
// 3. Callout (Day 4) -> Consecutive to Day 3 -> SHOULD BE 0 (Bypass Surge)

const violations = [
    createV('2024-01-01', VIOLATION_TYPES.CALLOUT), // Day 1
    createV('2024-01-03', VIOLATION_TYPES.CALLOUT), // Day 3
    createV('2024-01-04', VIOLATION_TYPES.CALLOUT)  // Day 4 (Consecutive to Day 3)
];

const state = calculateUserState(violations);

// find changes
const changes = state.eventLog.filter(e => e.type === 'violation').map(e => ({
    date: e.date.toLocaleDateString(),
    change: e.change,
    details: e.details
}));

console.log(JSON.stringify(changes, null, 2));

// Assertions
const day1 = changes.find(c => c.date.includes('1/1/2024'));
const day3 = changes.find(c => c.date.includes('1/3/2024'));
const day4 = changes.find(c => c.date.includes('1/4/2024'));

let passed = true;

if (day1.change !== -24) {
    console.error("FAIL: Day 1 should be Standard (-24)");
    passed = false;
}
if (day3.change !== -40) {
    console.error(`FAIL: Day 3 should be Surge (-40) but was ${day3.change}`);
    passed = false;
}
if (day4.change !== 0) {
    console.error(`FAIL: Day 4 should be Consecutive (0) but was ${day4.change}`);
    passed = false;
}

if (passed) {
    console.log("PASS: Surge logic correctly bypassed by Consecutive logic.");
} else {
    console.log("FAIL: Logic check failed.");
}
