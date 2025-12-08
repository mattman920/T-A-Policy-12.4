
import { calculateUserState, VIOLATION_TYPES } from './src/utils/pointCalculator.temp.mjs';

console.log('--- Verifying Consecutive Callout Logic ---');

const settings = {
    violationPenalties: {
        calloutStandard: 24,
        calloutSurge: 40,
        surgeLookback: 60
    }
};

const violations = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-01', shift: 'AM' },
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-02', shift: 'AM' }, // Consecutive (Should be 0)
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-03', shift: 'AM' }, // Consecutive (Should be 0)
    { type: VIOLATION_TYPES.CALLOUT, date: '2024-01-05', shift: 'AM' }, // Break (Should be penalized, potential Surge)
];

const state = calculateUserState(violations, settings);

console.log('Final Score:', state.points);

state.eventLog.filter(e => e.type === 'violation').forEach((e, idx) => {
    console.log(`[${idx + 1}] Date: ${e.date.toISOString().split('T')[0]}, Change: ${e.change}, Details: ${e.details}`);
});

// Assertions
const v1 = state.eventLog.find(e => e.date.toISOString().startsWith('2024-01-01'));
const v2 = state.eventLog.find(e => e.date.toISOString().startsWith('2024-01-02'));
const v3 = state.eventLog.find(e => e.date.toISOString().startsWith('2024-01-03'));
const v4 = state.eventLog.find(e => e.date.toISOString().startsWith('2024-01-05'));

const pass1 = Math.abs(v1.change) === 24;
const pass2 = Math.abs(v2.change) === 0 && v2.details.includes('Consecutive');
const pass3 = Math.abs(v3.change) === 0 && v3.details.includes('Consecutive');
const pass4 = Math.abs(v4.change) > 0; // Surge or Standard

console.log('Test 1 (Day 1 Standard):', pass1 ? 'PASS' : 'FAIL');
console.log('Test 2 (Day 2 Consecutive):', pass2 ? 'PASS' : 'FAIL');
console.log('Test 3 (Day 3 Consecutive):', pass3 ? 'PASS' : 'FAIL');
console.log('Test 4 (Day 5 Break):', pass4 ? 'PASS' : `FAIL (Change: ${v4?.change})`);

if (pass1 && pass2 && pass3 && pass4) {
    console.log('ALL TESTS PASSED');
} else {
    console.log('SOME TESTS FAILED');
    process.exit(1);
}
