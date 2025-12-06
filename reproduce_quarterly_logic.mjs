
import { calculateDeductions, VIOLATION_TYPES } from './src/utils/pointCalculator.mjs';

const penalties = {
    tardy: {
        [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5] // 1st: 2, 2nd: 3, 3rd: 5
    }
};

const violations = [
    { date: '2024-10-01', type: VIOLATION_TYPES.TARDY_1_5 }, // Q4
    { date: '2024-11-01', type: VIOLATION_TYPES.TARDY_1_5 }, // Q4
    { date: '2024-12-01', type: VIOLATION_TYPES.TARDY_1_5 }  // Q4
];

const totalDeduction = calculateDeductions(violations, penalties);

console.log('Total Deduction:', totalDeduction);

// Expected Current (Monthly Reset): 2 + 2 + 2 = 6
// Expected New (Quarterly Accumulation): 2 + 3 + 5 = 10

if (totalDeduction === 6) {
    console.log('Current Behavior: Monthly Reset (Confirmed)');
} else if (totalDeduction === 10) {
    console.log('New Behavior: Quarterly Accumulation (Verified)');
} else {
    console.log('Unexpected Result:', totalDeduction);
}
