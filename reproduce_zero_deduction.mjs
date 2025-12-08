
// CONSTANTS
const STARTING_POINTS = 25;

const TIERS = {
    GOOD: { name: 'Good Standing', min: 126, nextStart: 150, maxBonus: 150, color: '#10B981' },
    EDUCATIONAL: { name: 'Educational Stage', min: 101, nextStart: 125, maxBonus: 140, color: '#10B981' },
    COACHING: { name: 'Coaching', min: 76, nextStart: 125, maxBonus: 115, color: '#F59E0B' },
    SEVERE: { name: 'Severe', min: 51, nextStart: 100, maxBonus: 90, color: '#F97316' },
    FINAL: { name: 'Final', min: 0, nextStart: 75, maxBonus: 0, color: '#EF4444' },
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0, color: '#EF4444' },
};

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

const DEFAULT_POSITIVE_ADJUSTMENTS = {
    [VIOLATION_TYPES.EARLY_ARRIVAL]: 1,
    [VIOLATION_TYPES.SHIFT_PICKUP]: 5
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date('Invalid');

    // Handle MM/DD/YYYY or DD/MM/YYYY (slashes)
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
        }
    }

    // Handle MM-DD-YYYY or M-D-YYYY (dashes)
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
            const [p1, p2, p3] = parts;
            const m = p1.length === 1 ? `0${p1}` : p1;
            const d = p2.length === 1 ? `0${p2}` : p2;
            return new Date(`${p3}-${m}-${d}T00:00:00`);
        }
    }

    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(`${dateStr}T00:00:00`);
};

function calculateDeductions(violations, penalties = null) {
    const calloutPenalties = penalties?.callout || DEFAULT_CALLOUT_PENALTIES;
    const tardyPenalties = penalties?.tardy || DEFAULT_TARDY_PENALTIES;
    const sortedViolations = [...violations].sort((a, b) => parseDate(a.date) - parseDate(b.date));

    let calloutCount = 0;
    const tardyCountsByMonth = {};
    let totalDeduction = 0;

    const normalizeType = (type) => {
        if (type === 'Callout') return VIOLATION_TYPES.CALLOUT;
        return type;
    };

    sortedViolations.forEach(v => {
        const type = normalizeType(v.type);
        if (type === VIOLATION_TYPES.CALLOUT) {
            const penalty = calloutPenalties[Math.min(calloutCount, calloutPenalties.length - 1)];
            totalDeduction += penalty;
            calloutCount++;
        } else if (tardyPenalties[type]) {
            const date = parseDate(v.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

            if (!tardyCountsByMonth[monthKey]) tardyCountsByMonth[monthKey] = {};
            if (!tardyCountsByMonth[monthKey][type]) tardyCountsByMonth[monthKey][type] = 0;

            const count = tardyCountsByMonth[monthKey][type];
            const penaltyList = tardyPenalties[type];
            const penalty = penaltyList[Math.min(count, penaltyList.length - 1)];

            totalDeduction += penalty;
            tardyCountsByMonth[monthKey][type]++;
        }
    });

    return totalDeduction;
}

function calculatePositiveAdjustments(violations, penalties = null) {
    const adjustments = penalties?.positiveAdjustments || DEFAULT_POSITIVE_ADJUSTMENTS;
    let total = 0;

    violations.forEach(v => {
        if (adjustments[v.type]) {
            total += adjustments[v.type];
        }
    });

    return total;
}

function calculateCurrentPoints(startingPoints, violations, penalties = null) {
    const deductions = calculateDeductions(violations, penalties);
    const additions = calculatePositiveAdjustments(violations, penalties);
    const current = startingPoints - deductions + additions;
    return Math.min(current, startingPoints);
}

function determineTier(points, customTiers = null) {
    if (customTiers) {
        if (points >= customTiers.educational) return { ...TIERS.GOOD, color: TIERS.GOOD.color };
        if (points > customTiers.coaching) return { ...TIERS.EDUCATIONAL, min: customTiers.educational, color: TIERS.EDUCATIONAL.color };
        if (points > customTiers.severe) return { ...TIERS.COACHING, min: customTiers.coaching, color: TIERS.COACHING.color };
        if (points > customTiers.final) return { ...TIERS.SEVERE, min: customTiers.severe, color: TIERS.SEVERE.color };
        if (points >= 0) return { ...TIERS.FINAL, min: customTiers.final, color: TIERS.FINAL.color };
        return { ...TIERS.TERMINATION, color: TIERS.TERMINATION.color };
    }
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
    if (points >= TIERS.EDUCATIONAL.min) return TIERS.EDUCATIONAL;
    if (points >= TIERS.COACHING.min) return TIERS.COACHING;
    if (points >= TIERS.SEVERE.min) return TIERS.SEVERE;
    if (points >= TIERS.FINAL.min) return TIERS.FINAL;
    return TIERS.TERMINATION;
}

function calculateQuarterlyStart(targetQuarterKey, allViolations, settings) {
    const { daSettings, quarterlyPurges, startingPoints } = settings;
    const maxPoints = startingPoints || 150;

    if (quarterlyPurges && quarterlyPurges[targetQuarterKey]) {
        return maxPoints;
    }

    const [yearStr, qStr] = targetQuarterKey.split('-');
    const year = parseInt(yearStr);
    const q = parseInt(qStr.replace('Q', ''));

    let prevYear = year;
    let prevQ = q - 1;
    if (prevQ < 1) {
        prevQ = 4;
        prevYear--;
    }
    const prevQuarterKey = `${prevYear}-Q${prevQ}`;

    const hasHistory = allViolations.some(v => {
        const d = parseDate(v.date);
        if (isNaN(d.getTime())) return false;

        const vYear = d.getFullYear();
        const vMonth = d.getMonth();
        const vQ = Math.floor(vMonth / 3) + 1;
        if (vYear < prevYear) return true;
        if (vYear === prevYear && vQ <= prevQ) return true;
        return false;
    });

    if (!hasHistory) {
        return maxPoints;
    }

    const prevStart = calculateQuarterlyStart(prevQuarterKey, allViolations, settings);

    const prevQStartMonth = (prevQ - 1) * 3;
    const prevQEndMonth = prevQ * 3;
    const prevQStartDate = new Date(prevYear, prevQStartMonth, 1);
    const prevQEndDate = new Date(prevYear, prevQEndMonth, 0, 23, 59, 59);

    const prevQuarterViolations = allViolations.filter(v => {
        const d = parseDate(v.date);
        const isValid = !isNaN(d.getTime());
        const inRange = isValid && d >= prevQStartDate && d <= prevQEndDate;
        return inRange;
    });

    const endScore = calculateCurrentPoints(prevStart, prevQuarterViolations, settings.violationPenalties);
    const endingTier = determineTier(endScore, daSettings);

    const getNextStart = (tier, daConfig, max) => {
        const defaults = { severe: 75, coaching: 100, educational: 125 };
        const config = daConfig || defaults;

        if (tier.name === TIERS.FINAL.name) return config.severe;
        if (tier.name === TIERS.SEVERE.name) return config.coaching;
        if (tier.name === TIERS.COACHING.name) return config.educational;
        return max;
    };

    const nextStart = getNextStart(endingTier, daSettings, maxPoints);

    if (typeof prevStart === 'number' && prevStart < maxPoints) {
        const startTier = determineTier(prevStart, daSettings);
        const getTierLevel = (t) => {
            if (t.name === TIERS.GOOD.name) return 5;
            if (t.name === TIERS.EDUCATIONAL.name) return 4;
            if (t.name === TIERS.COACHING.name) return 3;
            if (t.name === TIERS.SEVERE.name) return 2;
            if (t.name === TIERS.FINAL.name) return 1;
            return 0;
        };
        const startLevel = getTierLevel(startTier);
        const endLevel = getTierLevel(endingTier);

        if (startLevel - endLevel >= 2) {
            return nextStart;
        }

        if (endingTier.name === TIERS.TERMINATION.name) {
            return 0;
        }
        return maxPoints;
    }

    return nextStart;
}

// TEST EXECUTION
console.log("--- STARTING TEST ---");

const SETTINGS = {
    startingPoints: 75,
    violationPenalties: {
        callout: [15, 20, 25, 30, 35, 40],
        tardy: { "Tardy (1-5 min)": [2, 3, 5, 5] },
        positiveAdjustments: { "Early Arrival": 1 }
    },
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    }
};

const QUARTER_KEY = '2025-Q1';
const QUARTER_START = new Date('2025-01-01T00:00:00');
const REPORT_DATE = new Date('2025-01-31T23:59:59');

console.log("--- TEST CASE: Starting Points 75, 1 Violation (-25) ---");

// 2. Employee WITH 1 Violation
// Using Call Out for simplicity (15 points first offense)
const empWithViolation = [
    { type: 'Call Out', date: '2025-01-15' }
];

const startPoints2 = calculateQuarterlyStart(QUARTER_KEY, empWithViolation, SETTINGS);
console.log(`Start Points (With Violation): ${startPoints2}`);

const relevantViolations2 = empWithViolation.filter(v => {
    const d = parseDate(v.date);
    return d >= QUARTER_START && d <= REPORT_DATE;
});
console.log(`Relevant Violations Count: ${relevantViolations2.length}`);

const currentPoints2 = calculateCurrentPoints(startPoints2, relevantViolations2, SETTINGS.violationPenalties);
console.log(`Current Points (With Violation): ${currentPoints2}`);

const tier2 = determineTier(currentPoints2, SETTINGS.daSettings);
console.log(`Tier (With Violation): ${tier2.name}`);

// 3. Employee WITH Severe Violations
const empSevere = [
    { type: 'Call Out', date: '2025-01-10' },
    { type: 'Call Out', date: '2025-01-11' }
    // 15 + 20 = 35 points deducted
];

const startPoints3 = calculateQuarterlyStart(QUARTER_KEY, empSevere, SETTINGS);
console.log(`Start Points (Severe): ${startPoints3}`);

const relevantViolations3 = empSevere.filter(v => {
    const d = parseDate(v.date);
    return d >= QUARTER_START && d <= REPORT_DATE;
});

const currentPoints3 = calculateCurrentPoints(startPoints3, relevantViolations3, SETTINGS.violationPenalties);
console.log(`Current Points (Severe): ${currentPoints3}`);

const tier3 = determineTier(currentPoints3, SETTINGS.daSettings);
console.log(`Tier (Severe): ${tier3.name}`);
console.log(`Tier Name is Good Standing? ${tier3.name === TIERS.GOOD.name}`);
