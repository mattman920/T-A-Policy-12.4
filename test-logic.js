// Constants
const STARTING_POINTS = 150;
const MAX_POINTS = 150;

const TIERS = {
    GOOD: { name: 'Good Standing', min: 125, nextStart: 150, maxBonus: 150 },
    COACHING: { name: 'Coaching', min: 85, nextStart: 125, maxBonus: 140 },
    SEVERE: { name: 'Severe', min: 50, nextStart: 100, maxBonus: 115 },
    FINAL: { name: 'Final', min: 1, nextStart: 75, maxBonus: 90 },
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0 },
};

const VIOLATION_TYPES = {
    TARDY_1_5: 'Tardy (1-5 min)',
    TARDY_6_11: 'Tardy (6-11 min)',
    TARDY_12_29: 'Tardy (12-29 min)',
    TARDY_30_PLUS: 'Tardy (30+ min)',
    CALLOUT: 'Callout',
};

const TARDY_PENALTIES = {
    'Tardy (1-5 min)': [2, 3, 5, 8],
    'Tardy (6-11 min)': [3, 5, 8, 12],
    'Tardy (12-29 min)': [5, 8, 15, 20],
    'Tardy (30+ min)': [8, 12, 20, 25],
};

const CALLOUT_PENALTIES = [15, 20, 25, 30, 40, 50];

function calculateDeductions(violations) {
    let totalDeduction = 0;

    const violationsByMonth = {};
    const callouts = [];

    violations.forEach(v => {
        if (v.type === VIOLATION_TYPES.CALLOUT) {
            callouts.push(v);
        } else {
            const date = new Date(v.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (!violationsByMonth[monthKey]) violationsByMonth[monthKey] = [];
            violationsByMonth[monthKey].push(v);
        }
    });

    callouts.forEach((_, index) => {
        if (index < CALLOUT_PENALTIES.length) {
            totalDeduction += CALLOUT_PENALTIES[index];
        } else {
            totalDeduction += CALLOUT_PENALTIES[CALLOUT_PENALTIES.length - 1];
        }
    });

    Object.values(violationsByMonth).forEach(monthViolations => {
        const counts = {
            [VIOLATION_TYPES.TARDY_1_5]: 0,
            [VIOLATION_TYPES.TARDY_6_11]: 0,
            [VIOLATION_TYPES.TARDY_12_29]: 0,
            [VIOLATION_TYPES.TARDY_30_PLUS]: 0,
        };

        monthViolations.sort((a, b) => new Date(a.date) - new Date(b.date));

        monthViolations.forEach(v => {
            if (TARDY_PENALTIES[v.type]) {
                const count = counts[v.type];
                const penalties = TARDY_PENALTIES[v.type];
                const penalty = count < penalties.length ? penalties[count] : penalties[penalties.length - 1];
                totalDeduction += penalty;
                counts[v.type]++;
            }
        });
    });

    return totalDeduction;
}

function calculateCurrentPoints(startBalance, violations, bonusPoints = 0) {
    const deductions = calculateDeductions(violations);
    let points = startBalance - deductions + bonusPoints;
    return Math.min(points, MAX_POINTS);
}

// TESTS
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('Running Logic Tests...');

// Test 1: Initial Balance
assert(calculateCurrentPoints(STARTING_POINTS, []) === 150, 'Initial balance should be 150');

const v4 = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-01' },
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-02' },
];
// 150 - 35 = 115
assert(calculateCurrentPoints(STARTING_POINTS, v4) === 115, '2 instances of Callout should deduct 35 points total');

// Test 6: Mixed Violations
// 1 Tardy 1-5 (-2) + 1 Callout (-15) = -17
const v5 = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-01' },
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-02' },
];
assert(calculateCurrentPoints(STARTING_POINTS, v5) === 133, 'Mixed violations should sum correctly');

console.log('All tests passed!');
