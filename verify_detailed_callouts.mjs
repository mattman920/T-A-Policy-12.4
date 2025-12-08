
import { calculateUserState, VIOLATION_TYPES, parseDate } from './src/utils/pointCalculator.temp3.mjs';

console.log('--- Verifying Detailed Consecutive Callout Logic ---');

const settings = {
    violationPenalties: {
        calloutStandard: 24,
        calloutSurge: 40,
        surgeLookback: 60
    }
};

// Test Case 1: Mixed formats (YYYY-MM-DD string, mixed types)
const violations = [
    { type: 'Call Out', date: '2024-01-01', shift: 'AM' }, // Standard String
    { type: 'Callout', date: '2024-01-02', shift: 'AM' },  // Legacy 'Callout' Type + Standard String -> Should be consecutive
    { type: VIOLATION_TYPES.CALLOUT, date: new Date('2024-01-03T10:00:00'), shift: 'AM' }, // Date Object (Day 3) -> Consecutive
    { type: 'Call Out', date: '2024-01-05', shift: 'AM' }, // Break
];

console.log('Testing Mixed Formats...');
const state = calculateUserState(violations, settings);

state.eventLog.filter(e => e.type === 'violation').forEach((e, idx) => {
    console.log(`[${idx + 1}] Date: ${e.date.toLocaleDateString()} (${e.violation}), Change: ${e.change}, Details: ${e.details}`);
});

// Assertions
const v1 = state.eventLog[1]; // Jan 1
const v2 = state.eventLog[2]; // Jan 2
const v3 = state.eventLog[3]; // Jan 3
const v4 = state.eventLog[4]; // Jan 5

// Note: index 0 is 'initial'

const p1 = Math.abs(state.eventLog[1].change) === 24 ? "PASS" : "FAIL";
const p2 = Math.abs(state.eventLog[2].change) === 0 ? "PASS" : "FAIL";
const p3 = Math.abs(state.eventLog[3].change) === 0 ? "PASS" : "FAIL";
const p4 = Math.abs(state.eventLog[4].change) > 0 ? "PASS" : "FAIL";

console.log(`Day 1: ${p1}`);
console.log(`Day 2 (Legacy Type): ${p2} (${state.eventLog[2].details})`);
console.log(`Day 3 (Date Object): ${p3} (${state.eventLog[3].details})`);
console.log(`Day 5 (Break): ${p4}`);

// Test Parse Date
console.log('\nTesting parseDate explicitly:');
const d1 = parseDate('2024-01-01');
console.log(`'2024-01-01' -> ${d1.toLocaleString()} (Day: ${d1.getDate()})`);
const d2 = parseDate(new Date('2024-01-01T23:00:00')); // Local time might shift if not careful?
console.log(`Date(2024-01-01T23:00:00) -> ${d2.toLocaleString()} (Day: ${d2.getDate()})`);

if (p1 === "PASS" && p2 === "PASS" && p3 === "PASS" && p4 === "PASS") {
    console.log('\nALL TESTS PASSED');
    process.exit(0);
} else {
    console.log('\nSOME TESTS FAILED');
    process.exit(1);
}
