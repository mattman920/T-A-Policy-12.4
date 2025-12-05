
import pkg from './src/utils/pointCalculator.js';
const { calculateDeductions, VIOLATION_TYPES } = pkg;

console.log("--- Verification: Tardy Escalation with Date Parsing Fix ---");

// Test Case: Violations on consecutive days across month boundary (or just early in month)
// Previously: 2023-10-01 parsed as Sep 30, 2023-10-02 parsed as Oct 1 (if UTC->Local shift was happening differently? No, both shifted back)
// Actually, if 2023-10-01 -> Sep 30, and 2023-11-01 -> Oct 31.
// The issue was likely that 2023-10-01 became Sep 30, so it counted for September.
// And 2023-10-02 became Oct 1 (wait, 2023-10-02T00:00Z is 2023-10-01T19:00 CST).
// So 2023-10-01 (UTC) -> 2023-09-30 (Local)
// 2023-10-02 (UTC) -> 2023-10-01 (Local)

// So if I have:
// V1: 2023-10-01
// V2: 2023-10-02

// OLD BEHAVIOR:
// V1 -> Sep 30 -> Month 9
// V2 -> Oct 1 -> Month 10
// Result: Count 1 in Sep, Count 1 in Oct. Total Penalty: 2 + 2 = 4.

// NEW BEHAVIOR (Expected):
// V1 -> Oct 1 -> Month 10
// V2 -> Oct 2 -> Month 10
// Result: Count 1 in Oct, Count 2 in Oct. Total Penalty: 2 + 3 = 5.

const violations = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-10-01' },
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-10-02' }
];

const totalDeduction = calculateDeductions(violations);
console.log(`Total Deductions: ${totalDeduction}`);

if (totalDeduction === 5) {
    console.log("SUCCESS: Violations correctly grouped in October.");
} else {
    console.log("FAILURE: Violations not grouped correctly.");
}
