
import pkg from './src/utils/pointCalculator.js';
const { calculateDeductions, VIOLATION_TYPES } = pkg;

console.log("--- Verification: Violation Type Mismatch ---");

const WRONG_TYPE = "Callout";
const CORRECT_TYPE = VIOLATION_TYPES.CALLOUT; // "Call Out"

console.log(`Wrong Type: "${WRONG_TYPE}"`);
console.log(`Correct Type: "${CORRECT_TYPE}"`);

const violationsWrong = [{ type: WRONG_TYPE, date: '2023-10-01' }];
const violationsCorrect = [{ type: CORRECT_TYPE, date: '2023-10-01' }];

const deductionWrong = calculateDeductions(violationsWrong);
const deductionCorrect = calculateDeductions(violationsCorrect);

console.log(`Deduction with Wrong Type: ${deductionWrong}`);
console.log(`Deduction with Correct Type: ${deductionCorrect}`);

if (deductionWrong === 0 && deductionCorrect > 0) {
    console.log("SUCCESS: Mismatch confirmed. 'Callout' results in 0 deduction.");
} else {
    console.log("FAILURE: Mismatch not the cause or logic differs.");
}
