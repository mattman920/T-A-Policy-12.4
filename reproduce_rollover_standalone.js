
// Constants
const STARTING_POINTS = 25; // Default fallback

const TIERS = {
    GOOD: { name: 'Good Standing', min: 126, nextStart: 150, maxBonus: 150, color: '#10B981' }, // Green
    EDUCATIONAL: { name: 'Educational Stage', min: 101, nextStart: 125, maxBonus: 140, color: '#10B981' }, // Green
    COACHING: { name: 'Coaching', min: 76, nextStart: 125, maxBonus: 115, color: '#F59E0B' }, // Yellow
    SEVERE: { name: 'Severe', min: 51, nextStart: 100, maxBonus: 90, color: '#F97316' }, // Orange
    FINAL: { name: 'Final', min: 0, nextStart: 75, maxBonus: 0, color: '#EF4444' }, // Red
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0, color: '#EF4444' }, // Red
};


// Violation Types
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
        // Look backwards for the nearest previous callout
        for (let j = i - 1; j >= 0; j--) {
            if (sorted[j].type === VIOLATION_TYPES.CALLOUT) {
                const currentDate = parseDate(current.date);
                const prevDate = parseDate(sorted[j].date);

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

function calculateDeductions(violations, penalties = null) {
    const calloutPenalties = penalties?.callout || DEFAULT_CALLOUT_PENALTIES;
    const tardyPenalties = penalties?.tardy || DEFAULT_TARDY_PENALTIES;

    let totalDeduction = 0;

    // Helper to safely parse date string to local date object
    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        // If it's already a full ISO string with time, use it
        if (dateStr.includes('T')) return new Date(dateStr);
        // If it's just YYYY-MM-DD, append time to force local interpretation
        return new Date(`${dateStr}T00:00:00`);
    };

    // Filter out covered callouts BEFORE grouping or calculating
    const activeViolations = violations.filter(v => !v.shiftCovered);

    // First, group consecutive callouts so they count as one instance
    const groupedViolations = groupConsecutiveCallouts(activeViolations);

    // Now sort again just to be safe, though grouping preserves order
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
    // If custom tiers are provided, construct the tier objects dynamically
    // customTiers should be { educational: 101, coaching: 76, severe: 51, final: 0 }

    if (customTiers) {
        // Good Standing: > Educational Threshold
        // Note: If educational threshold is set to max points (e.g. 150), we use >= to ensure max points is Good Standing.
        if (points >= customTiers.educational) return TIERS.GOOD;

        // Educational: <= Educational AND > Coaching
        if (points > customTiers.coaching) return { ...TIERS.EDUCATIONAL, min: customTiers.educational };

        // Coaching: <= Coaching AND > Severe
        if (points > customTiers.severe) return { ...TIERS.COACHING, min: customTiers.coaching };

        // Severe: <= Severe AND > Final
        if (points > customTiers.final) return { ...TIERS.SEVERE, min: customTiers.severe };

        // Final: <= Final AND >= 0
        if (points >= 0) return { ...TIERS.FINAL, min: customTiers.final };

        // Termination: < 0
        return TIERS.TERMINATION;
    }

    // Default fallback
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
    if (points >= TIERS.EDUCATIONAL.min) return TIERS.EDUCATIONAL;
    if (points >= TIERS.COACHING.min) return TIERS.COACHING;
    if (points >= TIERS.SEVERE.min) return TIERS.SEVERE;
    if (points >= TIERS.FINAL.min) return TIERS.FINAL;
    return TIERS.TERMINATION;
}

function calculateQuarterlyStart(targetQuarterKey, allViolations, settings) {
    const { daSettings, quarterlyPurges, startingPoints } = settings;
    const maxPoints = startingPoints || 150; // Use setting or default

    // 1. Check for Quarter Purge (Override)
    if (quarterlyPurges && quarterlyPurges[targetQuarterKey]) {
        return maxPoints;
    }

    // Parse target quarter
    const [yearStr, qStr] = targetQuarterKey.split('-');
    const year = parseInt(yearStr);
    const q = parseInt(qStr.replace('Q', ''));

    // Determine Previous Quarter
    let prevYear = year;
    let prevQ = q - 1;
    if (prevQ < 1) {
        prevQ = 4;
        prevYear--;
    }
    const prevQuarterKey = `${prevYear}-Q${prevQ}`;

    // Base Case: Check history
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

    // Recursive Step: Get Start of Previous Quarter
    const prevStart = calculateQuarterlyStart(prevQuarterKey, allViolations, settings);

    // Calculate End of Previous Quarter
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

    // Helper to determine next start based on dynamic settings
    const getNextStart = (tier, daConfig, max) => {
        // Fallbacks if daConfig is missing (shouldn't happen if settings loaded)
        const defaults = { severe: 75, coaching: 100, educational: 125 };
        const config = daConfig || defaults;

        if (tier.name === TIERS.FINAL.name) return config.severe;      // Final -> Severe Threshold
        if (tier.name === TIERS.SEVERE.name) return config.coaching;   // Severe -> Coaching Threshold
        if (tier.name === TIERS.COACHING.name) return config.educational; // Coaching -> Educational Threshold
        // Educational, Good, and others reset to max
        return max;
    };

    const nextStart = getNextStart(endingTier, daSettings, maxPoints);

    console.log(`[DEBUG] Q: ${targetQuarterKey}, PrevStart: ${prevStart}, EndScore: ${endScore}, EndTier: ${endingTier.name}, NextStart: ${nextStart}`);

    // Standard Rollover
    return nextStart;
}

// --- TEST CASE ---

const mockSettings = {
    startingPoints: 150,
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    },
    violationPenalties: {
        callout: [15, 20, 25, 30, 35, 40],
        tardy: {
            [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5],
            [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 15],
            [VIOLATION_TYPES.TARDY_12_29]: [15, 20, 25, 25],
            [VIOLATION_TYPES.TARDY_30_PLUS]: [25, 35, 50, 50]
        }
    }
};

// Mock Violations for Q3 (July-Sept)
// We want to end up with 90 points.
// Start: 150.
// Deductions needed: 60.
// 3 Callouts: 15 + 20 + 25 = 60 points deduction.
// 150 - 60 = 90.

const violations = [
    {
        date: '2025-07-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 15
    },
    {
        date: '2025-08-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 20
    },
    {
        date: '2025-09-15', // Q3
        type: VIOLATION_TYPES.CALLOUT,
        pointsDeducted: 25
    }
];

// Target: Q4 2025
const targetQuarter = '2025-Q4';

console.log("Calculating Start for Q4...");
const startQ4 = calculateQuarterlyStart(targetQuarter, violations, mockSettings);

console.log(`Start Q4 Points: ${startQ4}`);

if (startQ4 === 150) {
    console.log("BUG REPRODUCED: Points reset to 150.");
} else if (startQ4 === 125) {
    console.log("Working as expected: Points reset to 125 (Educational Threshold).");
} else {
    console.log(`Unexpected result: ${startQ4}`);
}

// --- TEST CASE 2: Start Educational (125) -> End Coaching (90) ---
console.log("\n--- TEST CASE 2: Start Educational (125) -> End Coaching (90) ---");
const violations2 = [
    // Q2 Violations to bring score down to 90 (Coaching)
    // Start Q2: 150. Deductions needed: 60.
    // 3 Callouts: 15 + 20 + 25 = 60.
    { date: '2025-05-15', type: VIOLATION_TYPES.CALLOUT },
    { date: '2025-05-20', type: VIOLATION_TYPES.CALLOUT },
    { date: '2025-05-25', type: VIOLATION_TYPES.CALLOUT },

    // Q3 Start will be 125 (Educational).
    // Q3 Violations to bring score down from 125 to 90 (Coaching).
    // 125 - 90 = 35.
    // 2 Callouts: 15 + 20 = 35.
    { date: '2025-08-15', type: VIOLATION_TYPES.CALLOUT },
    { date: '2025-08-20', type: VIOLATION_TYPES.CALLOUT }
];

// Q2 Start: 150.
// Q2 End: 90 (Coaching).
// Q3 Start: 125 (Educational).
// Q3 End: 90 (Coaching).
// Q4 Start: Should be 125 (Coaching -> Educational).
// OLD BUGGY BEHAVIOR: Would be 150 (Clean Slate).

const startQ4_2 = calculateQuarterlyStart(targetQuarter, violations2, mockSettings);
console.log(`Start Q4 (Case 2) Points: ${startQ4_2}`);
if (startQ4_2 === 125) {
    console.log("SUCCESS: Points reset to 125.");
} else {
    console.log(`FAILURE: Points are ${startQ4_2}`);
}
