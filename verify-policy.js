
// --- MOCKED LOGIC FROM pointCalculator.js ---

const STARTING_POINTS = 25;

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

function calculateCurrentPoints(startBalance, violations, bonusPoints = 0, maxPoints = 150) {
    const deductions = calculateDeductions(violations);
    let points = startBalance - deductions + bonusPoints;
    return Math.min(points, maxPoints);
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

function calculateNextQuarterStart(lowestQuarterlyPoints, quarterlyBonusPoints, maxPoints = 150) {
    const lowestTier = determineTier(lowestQuarterlyPoints);
    let baseStart = lowestTier.nextStart;

    // Override for Good Standing to match dynamic maxPoints
    if (lowestTier.name === TIERS.GOOD.name) {
        baseStart = maxPoints;
    }

    const bonusToApply = Math.min(quarterlyBonusPoints, 15);
    const calculatedStart = baseStart + bonusToApply;
    return Math.min(calculatedStart, maxPoints);
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

// 5. QUARTER PROGRESSION & DYNAMIC CAP
console.log('\nTesting Quarter Progression & Dynamic Cap...');

// Scenario A: Good Standing (Lowest 130) + 15 bonus -> Starts at 150 (Default Max 150)
const nextA = calculateNextQuarterStart(130, 15, 150);
assert(nextA === 150, `Progression Good (Default): Expected 150, Got ${nextA}`);

// Scenario B: Good Standing (Lowest 130) + 15 bonus -> Starts at 160 (Custom Max 160)
const nextB = calculateNextQuarterStart(130, 15, 160);
assert(nextB === 160, `Progression Good (Custom 160): Expected 160, Got ${nextB}`);

// Scenario C: Coaching (Lowest 100) + 15 bonus -> Starts at 125 + 15 = 140 (Max 150)
const nextC = calculateNextQuarterStart(100, 15, 150);
assert(nextC === 140, `Progression Coaching w/ Bonus: Expected 140, Got ${nextC}`);

// Scenario D: Severe (Lowest 60) + 20 bonus (capped at 15) -> Starts at 100 + 15 = 115
const nextD = calculateNextQuarterStart(60, 20, 150);
assert(nextD === 115, `Progression Severe w/ Capped Bonus: Expected 115, Got ${nextD}`);

// Scenario E: "Sticky Status" - Ended High but Dipped Low
// Employee dropped to 60 (Severe) but climbed back to 130 (Good).
// Should reset based on LOWEST (Severe) -> Start at 100.
const nextE = calculateNextQuarterStart(60, 15, 150);
assert(nextE === 115, `Sticky Status (Lowest 60): Expected 115 (Severe Start + Bonus), Got ${nextE}`);

console.log('\n--- ALL POLICY CHECKS PASSED ---');
