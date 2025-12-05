
const { calculateDeductions, VIOLATION_TYPES } = require('./src/utils/pointCalculator.js');

const mockViolations = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-01', shiftCovered: false }, // Should count (15 pts)
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-02', shiftCovered: true },  // Should NOT count
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-03', shiftCovered: false }  // Should count (20 pts)
];

console.log('Testing Shift Covered Logic...');

const deduction = calculateDeductions(mockViolations);
console.log(`Total Deduction: ${deduction}`);

if (deduction === 35) {
    console.log('PASS: Covered callout was ignored correctly (15 + 20 = 35).');
} else {
    console.log(`FAIL: Expected 35, got ${deduction}.`);
}
