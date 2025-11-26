
// --- MOCKED LOGIC FROM pointCalculator.js ---

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
            const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
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

function determineTier(points) {
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
    if (points >= TIERS.COACHING.min) return TIERS.COACHING;
    if (points >= TIERS.SEVERE.min) return TIERS.SEVERE;
    if (points >= TIERS.FINAL.min) return TIERS.FINAL;
    return TIERS.TERMINATION;
}

function calculateMonthlyBonus(violationsInMonth, shiftsWorked) {
    if (shiftsWorked < 15) return 0;
    const hasCallouts = violationsInMonth.some(v => v.type === VIOLATION_TYPES.CALLOUT);
    const hasTardiness = violationsInMonth.some(v => v.type !== VIOLATION_TYPES.CALLOUT);
    let bonus = 0;
    if (!hasCallouts && !hasTardiness) bonus += 10;
    if (!hasTardiness) bonus += 5;
    return Math.min(bonus, 15);
}

// --- NEW LOGIC: QUARTER TRANSITION ---

function calculateNextQuarterStart(endingPoints, quarterlyBonusPoints) {
    const tier = determineTier(endingPoints);
    const baseStart = tier.nextStart;

    // "Bonus points can affect next quarter's starting balance (up to 15 points)"
    const bonusToApply = Math.min(quarterlyBonusPoints, 15);

    // "Cannot skip multiple levels regardless of bonus points earned"
    // "Max potential" is defined in TIERS.
    const maxPotential = tier.maxBonus;

    const calculatedStart = baseStart + bonusToApply;
    return Math.min(calculatedStart, maxPotential);
}

// --- VERIFICATION TESTS ---

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('--- STARTING POLICY VERIFICATION ---');

// 1. TARDINESS (Monthly Reset)
console.log('\nTesting Tardiness Logic...');
const tardyJan = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-01' }, // -2
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-02' }, // -3
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-03' }, // -5
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-01-04' }, // -8 (4th)
];
// Total Jan: 18
const tardyFeb = [
    { type: VIOLATION_TYPES.TARDY_1_5, date: '2023-02-01' }, // -2 (Reset!)
];
// Total Feb: 2
// Total Deductions: 20. Points: 150 - 20 = 130.
const p1 = calculateCurrentPoints(150, [...tardyJan, ...tardyFeb]);
assert(p1 === 130, `Tardiness Monthly Reset: Expected 130, Got ${p1}`);

// 2. CALLOUTS (Quarterly Accumulation)
console.log('\nTesting Callout Logic...');
const callouts = [
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-01-01' }, // -15
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-02-01' }, // -20 (2nd)
    { type: VIOLATION_TYPES.CALLOUT, date: '2023-03-01' }, // -25 (3rd)
];
// Total Deductions: 60. Points: 150 - 60 = 90.
const p2 = calculateCurrentPoints(150, callouts);
assert(p2 === 90, `Callout Accumulation: Expected 90, Got ${p2}`);

// 3. BONUS LOGIC
console.log('\nTesting Bonus Logic...');
// Perfect Month
const bonusJan = calculateMonthlyBonus([], 15); // No violations, 15 shifts
assert(bonusJan === 15, `Perfect Attendance Bonus: Expected 15, Got ${bonusJan}`);

// No Tardiness (but Callout)
const violationsFeb = [{ type: VIOLATION_TYPES.CALLOUT, date: '2023-02-01' }];
const bonusFeb = calculateMonthlyBonus(violationsFeb, 15);
// Has Callout -> No P/A (+0). No Tardiness -> N/T (+5). Total 5.
assert(bonusFeb === 5, `No Tardiness Bonus: Expected 5, Got ${bonusFeb}`);

// 4. DA THRESHOLDS
console.log('\nTesting DA Thresholds...');
assert(determineTier(130).name === 'Good Standing', '130 -> Good Standing');
assert(determineTier(100).name === 'Coaching', '100 -> Coaching');
assert(determineTier(60).name === 'Severe', '60 -> Severe');
assert(determineTier(40).name === 'Final', '40 -> Final');
assert(determineTier(-10).name === 'Termination Review', '-10 -> Termination');

// 5. QUARTER PROGRESSION
console.log('\nTesting Quarter Progression...');
// Scenario A: Good Standing (130 pts) + 15 bonus -> Starts at 150 (Max 150)
const nextA = calculateNextQuarterStart(130, 15);
assert(nextA === 150, `Progression Good: Expected 150, Got ${nextA}`);

// Scenario B: Coaching (100 pts) + 15 bonus -> Starts at 125 + 15 = 140
const nextB = calculateNextQuarterStart(100, 15);
assert(nextB === 140, `Progression Coaching w/ Bonus: Expected 140, Got ${nextB}`);

// Scenario C: Coaching (100 pts) + 0 bonus -> Starts at 125
const nextC = calculateNextQuarterStart(100, 0);
assert(nextC === 125, `Progression Coaching No Bonus: Expected 125, Got ${nextC}`);

// Scenario D: Severe (60 pts) + 20 bonus (capped at 15) -> Starts at 100 + 15 = 115
const nextD = calculateNextQuarterStart(60, 20);
assert(nextD === 115, `Progression Severe w/ Capped Bonus: Expected 115, Got ${nextD}`);

console.log('\n--- ALL POLICY CHECKS PASSED ---');
