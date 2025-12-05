
// Mock Constants and Functions from pointCalculator.js

const VIOLATION_TYPES = {
    CALLOUT: 'Call Out',
    TARDY_1_5: 'Tardy (1-5 min)',
    TARDY_6_11: 'Tardy (6-11 min)',
    TARDY_12_29: 'Tardy (12-29 min)',
    TARDY_30_PLUS: 'Tardy (30+ min)',
    EARLY_ARRIVAL: 'Early Arrival',
    SHIFT_PICKUP: 'Shift Pickup'
};

const DEFAULT_TARDY_PENALTIES = {
    [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5],
    [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 15],
    [VIOLATION_TYPES.TARDY_12_29]: [15, 20, 25, 25],
    [VIOLATION_TYPES.TARDY_30_PLUS]: [25, 35, 50, 50]
};

const DEFAULT_CALLOUT_PENALTIES = [15, 20, 25, 30, 35, 40];

function groupConsecutiveCallouts(violations) {
    const sorted = [...violations].sort((a, b) => new Date(a.date) - new Date(b.date));
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (current.type !== VIOLATION_TYPES.CALLOUT) {
            result.push(current);
            continue;
        }

        let isConsecutive = false;
        // Look backwards for the nearest previous callout
        for (let j = i - 1; j >= 0; j--) {
            if (sorted[j].type === VIOLATION_TYPES.CALLOUT) {
                const currentDate = new Date(current.date);
                const prevDate = new Date(sorted[j].date);

                // Normalize to midnight to avoid time issues
                const d1 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                const d2 = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());

                const diffTime = Math.abs(d1 - d2);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    isConsecutive = true;
                }
                break; // Found the immediate previous callout
            }
        }

        if (!isConsecutive) {
            result.push(current);
        }
    }

    return result;
}

// Helper to safely parse date string to local date object
const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    // If it's already a full ISO string with time, use it
    if (dateStr.includes('T')) return new Date(dateStr);
    // If it's just YYYY-MM-DD, append time to force local interpretation
    return new Date(`${dateStr}T00:00:00`);
};

function calculateDeductions(violations, penalties = null) {
    const calloutPenalties = penalties?.callout || DEFAULT_CALLOUT_PENALTIES;
    const tardyPenalties = penalties?.tardy || DEFAULT_TARDY_PENALTIES;

    let totalDeduction = 0;

    // First, group consecutive callouts so they count as one instance
    const groupedViolations = groupConsecutiveCallouts(violations);

    // Now sort again just to be safe, though grouping preserves order
    const sortedViolations = [...groupedViolations].sort((a, b) => parseDate(a.date) - parseDate(b.date));

    let calloutCount = 0;
    const tardyCountsByMonth = {};

    sortedViolations.forEach(v => {
        if (v.type === VIOLATION_TYPES.CALLOUT) {
            const penalty = calloutPenalties[Math.min(calloutCount, calloutPenalties.length - 1)];
            console.log(`Callout on ${v.date}: Penalty ${penalty} (Count: ${calloutCount + 1})`);
            totalDeduction += penalty;
            calloutCount++;
        } else if (tardyPenalties[v.type]) {
            const date = parseDate(v.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            if (!tardyCountsByMonth[monthKey]) tardyCountsByMonth[monthKey] = {};
            if (!tardyCountsByMonth[monthKey][v.type]) tardyCountsByMonth[monthKey][v.type] = 0;

            const count = tardyCountsByMonth[monthKey][v.type];
            const penaltyList = tardyPenalties[v.type];
            const penalty = penaltyList[Math.min(count, penaltyList.length - 1)];

            console.log(`Tardy (${v.type}) on ${v.date}: Penalty ${penalty} (Count: ${count + 1} in ${monthKey})`);

            totalDeduction += penalty;
            tardyCountsByMonth[monthKey][v.type]++;
        }
    });

    return totalDeduction;
}

// Test Cases
console.log("--- Test Case 1: Single Callout ---");
const violations1 = [{ type: VIOLATION_TYPES.CALLOUT, date: '2023-10-01' }];
console.log("Total Deductions:", calculateDeductions(violations1)); // Expected: 15

console.log("\n--- Test Case 2: Consecutive Callouts ---");
const violations2 = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-10-01' },
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-10-02' }
];
console.log("Total Deductions:", calculateDeductions(violations2)); // Expected: 15 (grouped)

console.log("\n--- Test Case 3: Non-Consecutive Callouts ---");
const violations3 = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-10-01' },
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-10-03' }
];
console.log("Total Deductions:", calculateDeductions(violations3)); // Expected: 15 + 20 = 35

console.log("\n--- Test Case 4: Tardy Escalation ---");
const violations4 = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-10-01' },
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-10-02' }
];
console.log("Total Deductions:", calculateDeductions(violations4)); // Expected: 2 + 3 = 5

console.log("\n--- Test Case 5: Tardy Reset Monthly ---");
const violations5 = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-10-01' },
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-11-01' }
];
console.log("Total Deductions:", calculateDeductions(violations5)); // Expected: 2 + 2 = 4

