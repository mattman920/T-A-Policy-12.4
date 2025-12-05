
// Constants
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
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T')) return new Date(dateStr);
        return new Date(`${dateStr}T00:00:00`);
    };

    const sorted = [...violations].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];

        if (current.type !== VIOLATION_TYPES.CALLOUT) {
            result.push(current);
            continue;
        }

        let isConsecutive = false;
        for (let j = i - 1; j >= 0; j--) {
            if (sorted[j].type === VIOLATION_TYPES.CALLOUT) {
                const currentDate = parseDate(current.date);
                const prevDate = parseDate(sorted[j].date);

                const d1 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                const d2 = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());

                const diffTime = Math.abs(d1 - d2);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    isConsecutive = true;
                }
                break;
            }
        }

        if (!isConsecutive) {
            result.push(current);
        }
    }

    return result;
}

function calculateDeductions(violations, penalties = null) {
    const calloutPenalties = penalties?.callout || DEFAULT_CALLOUT_PENALTIES;
    const tardyPenalties = penalties?.tardy || DEFAULT_TARDY_PENALTIES;

    let totalDeduction = 0;

    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('T')) return new Date(dateStr);
        return new Date(`${dateStr}T00:00:00`);
    };

    // Filter out covered callouts BEFORE grouping or calculating
    const activeViolations = violations.filter(v => !v.shiftCovered);

    const groupedViolations = groupConsecutiveCallouts(activeViolations);

    const sortedViolations = [...groupedViolations].sort((a, b) => parseDate(a.date) - parseDate(b.date));

    let calloutCount = 0;
    const tardyCountsByMonth = {};

    sortedViolations.forEach(v => {
        if (v.type === VIOLATION_TYPES.CALLOUT) {
            const penalty = calloutPenalties[Math.min(calloutCount, calloutPenalties.length - 1)];
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

            totalDeduction += penalty;
            tardyCountsByMonth[monthKey][v.type]++;
        }
    });

    return totalDeduction;
}

// --- TEST LOGIC ---

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
