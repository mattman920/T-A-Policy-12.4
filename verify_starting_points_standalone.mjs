
// --- Copied from pointCalculator.js ---

const STARTING_POINTS = 25;

const TIERS = {
    GOOD: { name: 'Good Standing', min: 126, nextStart: 150, maxBonus: 150 },
    EDUCATIONAL: { name: 'Educational Stage', min: 101, nextStart: 125, maxBonus: 140 },
    COACHING: { name: 'Coaching', min: 76, nextStart: 125, maxBonus: 115 },
    SEVERE: { name: 'Severe', min: 51, nextStart: 100, maxBonus: 90 },
    FINAL: { name: 'Final', min: 0, nextStart: 75, maxBonus: 0 },
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0 },
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
        if (points > customTiers.educational) return TIERS.GOOD;
        if (points > customTiers.coaching) return { ...TIERS.EDUCATIONAL, min: customTiers.educational };
        if (points > customTiers.severe) return { ...TIERS.COACHING, min: customTiers.coaching };
        if (points > customTiers.final) return { ...TIERS.SEVERE, min: customTiers.severe };
        if (points >= 0) return { ...TIERS.FINAL, min: customTiers.final };
        return TIERS.TERMINATION;
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
        const d = new Date(v.date);
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
        const d = new Date(v.date);
        return d >= prevQStartDate && d <= prevQEndDate;
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

    if (prevStart < maxPoints) {
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

// --- End of Copied Code ---

// Mock Data
const mockSettings = {
    startingPoints: 150,
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 0
    },
    violationPenalties: {
        tardy: {
            [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5],
            [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 15],
            [VIOLATION_TYPES.TARDY_12_29]: [15, 20, 25, 25],
            [VIOLATION_TYPES.TARDY_30_PLUS]: [25, 35, 50, 50]
        },
        callout: [15, 20, 25, 30, 35, 40]
    }
};

const mockViolations = [
    // Q1 Violations
    { date: '2025-01-15', type: VIOLATION_TYPES.TARDY_1_5, employeeId: 'emp1' },
    { date: '2025-02-20', type: VIOLATION_TYPES.CALLOUT, employeeId: 'emp1' },

    // Q2 Violations
    { date: '2025-04-10', type: VIOLATION_TYPES.TARDY_30_PLUS, employeeId: 'emp1' },
    { date: '2025-05-05', type: VIOLATION_TYPES.CALLOUT, employeeId: 'emp1' },
    { date: '2025-05-06', type: VIOLATION_TYPES.CALLOUT, employeeId: 'emp1' }, // Consecutive

    // Q3 Violations - Clean

    // Q4 Violations
    { date: '2025-10-01', type: VIOLATION_TYPES.CALLOUT, employeeId: 'emp1' }
];

const empId = 'emp1';
const currentYear = 2025;
const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
const qMap = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };

console.log('--- Starting Points Report Verification ---');

quarters.forEach(q => {
    const qKey = `${currentYear}-${q}`;
    const months = qMap[q];

    // Get violations for this quarter
    const qViolations = mockViolations.filter(v =>
        v.employeeId === empId &&
        months.includes(parseInt(v.date.split('-')[1]) - 1) &&
        v.date.startsWith(currentYear.toString())
    );

    // Calculate Starting Points
    const startPoints = calculateQuarterlyStart(qKey, mockViolations.filter(v => v.employeeId === empId), mockSettings);

    // Calculate End Score
    const endPoints = calculateCurrentPoints(startPoints, qViolations, mockSettings.violationPenalties);

    // Determine DA Threshold (Tier) at end of quarter
    const tier = determineTier(endPoints, mockSettings.daSettings);

    // Count Violations by Type
    const counts = {
        [VIOLATION_TYPES.CALLOUT]: 0,
        [VIOLATION_TYPES.TARDY_1_5]: 0,
        [VIOLATION_TYPES.TARDY_6_11]: 0,
        [VIOLATION_TYPES.TARDY_12_29]: 0,
        [VIOLATION_TYPES.TARDY_30_PLUS]: 0
    };

    let otherViolations = 0;

    qViolations.forEach(v => {
        if (counts[v.type] !== undefined) {
            counts[v.type]++;
        } else {
            otherViolations++;
        }
    });

    console.log(`\nQuarter: ${q}`);
    console.log(`Starting Score: ${startPoints}`);
    console.log(`Violations: ${JSON.stringify(counts)}`);
    console.log(`End Score: ${endPoints}`);
    console.log(`DA Threshold: ${tier.name}`);
});
