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

/**
 * Helper to safely parse date string to local date object.
 * Handles MM/DD/YYYY, YYYY-MM-DD, and ISO strings.
 * @param {string} dateStr 
 * @returns {Date}
 */
const parseDate = (dateStr) => {
    if (!dateStr) return new Date();

    // Handle MM/DD/YYYY or DD/MM/YYYY (slashes)
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d;
        }
    }

    // Handle MM-DD-YYYY (dashes)
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        // If first part is 2 digits and last is 4 digits, it's likely MM-DD-YYYY
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
            const [p1, p2, p3] = parts;
            // Reformat to YYYY-MM-DD for consistent parsing
            return new Date(`${p3}-${p1}-${p2}T00:00:00`);
        }
    }

    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(`${dateStr}T00:00:00`);
};

/**
 * Groups consecutive callouts into single instances.
 * @param {Array} violations 
 * @returns {Array}
 */
function groupConsecutiveCallouts(violations) {
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

/**
 * Calculates total deductions based on violations and penalties.
 * @param {Array} violations 
 * @param {Object} penalties 
 * @returns {number}
 */
function calculateDeductions(violations, penalties = null) {
    const calloutPenalties = penalties?.callout || DEFAULT_CALLOUT_PENALTIES;
    const tardyPenalties = penalties?.tardy || DEFAULT_TARDY_PENALTIES;

    let totalDeduction = 0;

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

/**
 * Calculates total positive adjustments.
 * @param {Array} violations 
 * @param {Object} penalties 
 * @returns {number}
 */
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

/**
 * Calculates current points balance.
 * @param {number} startingPoints 
 * @param {Array} violations 
 * @param {Object} penalties 
 * @returns {number}
 */
function calculateCurrentPoints(startingPoints, violations, penalties = null) {
    const deductions = calculateDeductions(violations, penalties);
    const additions = calculatePositiveAdjustments(violations, penalties);
    const current = startingPoints - deductions + additions;
    return Math.min(current, startingPoints);
}

/**
 * Determines the disciplinary tier based on points.
 * @param {number} points 
 * @param {Object} customTiers - Optional custom tier configuration
 * @returns {Object} Tier object
 */
function determineTier(points, customTiers = null) {
    // If custom tiers are provided, construct the tier objects dynamically
    // customTiers should be { educational: 101, coaching: 76, severe: 51, final: 0 }

    if (customTiers) {
        // Good Standing: > Educational Threshold
        // Note: If educational threshold is set to max points (e.g. 150), we use >= to ensure max points is Good Standing.
        if (points >= customTiers.educational) return { ...TIERS.GOOD, color: TIERS.GOOD.color };

        // Educational: <= Educational AND > Coaching
        if (points > customTiers.coaching) return { ...TIERS.EDUCATIONAL, min: customTiers.educational, color: TIERS.EDUCATIONAL.color };

        // Coaching: <= Coaching AND > Severe
        if (points > customTiers.severe) return { ...TIERS.COACHING, min: customTiers.coaching, color: TIERS.COACHING.color };

        // Severe: <= Severe AND > Final
        if (points > customTiers.final) return { ...TIERS.SEVERE, min: customTiers.severe, color: TIERS.SEVERE.color };

        // Final: <= Final AND >= 0
        if (points >= 0) return { ...TIERS.FINAL, min: customTiers.final, color: TIERS.FINAL.color };

        // Termination: < 0
        return { ...TIERS.TERMINATION, color: TIERS.TERMINATION.color };
    }

    // Default fallback
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
    if (points >= TIERS.EDUCATIONAL.min) return TIERS.EDUCATIONAL;
    if (points >= TIERS.COACHING.min) return TIERS.COACHING;
    if (points >= TIERS.SEVERE.min) return TIERS.SEVERE;
    if (points >= TIERS.FINAL.min) return TIERS.FINAL;
    return TIERS.TERMINATION;
}

/**
 * Calculates bonus points for a month.
 * @param {Array} violationsInMonth - Violations in that specific month
 * @param {number} shiftsWorked - Number of shifts worked
 * @returns {number} Bonus points earned
 */
function calculateMonthlyBonus(violationsInMonth, shiftsWorked) {
    if (shiftsWorked < 15) return 0;

    const hasCallouts = violationsInMonth.some(v => v.type === VIOLATION_TYPES.CALLOUT);
    const hasTardiness = violationsInMonth.some(v => v.type !== VIOLATION_TYPES.CALLOUT);

    let bonus = 0;
    if (!hasCallouts && !hasTardiness) {
        bonus += 10; // Perfect Attendance
    }

    if (!hasTardiness) {
        bonus += 5; // No Tardiness
    }

    return Math.min(bonus, 15);
}

/**
 * Calculates the starting balance for a specific quarter, recursively checking history.
 * @param {string} targetQuarterKey - The quarter to calculate for (e.g., "2024-Q2")
 * @param {Array} allViolations - All violations for the employee
 * @param {Object} settings - Application settings (for penalties, tiers, purges)
 * @returns {number} Starting balance for the target quarter
 */
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
        const d = parseDate(v.date);
        if (isNaN(d.getTime())) {
            console.log(`Invalid date in hasHistory: ${v.date}`);
            return false;
        }

        const vYear = d.getFullYear();
        const vMonth = d.getMonth();
        const vQ = Math.floor(vMonth / 3) + 1;
        console.log(`History Check: ${v.date} -> ${d.toISOString()} (Q${vQ}) vs Prev Q${prevQ}-${prevYear}`);
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
        const d = parseDate(v.date);
        if (isNaN(d.getTime())) return false;
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

    // Clean Slate Logic
    // Ensure strict comparison: Clean Slate ONLY applies if they didn't start at max points.
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

        // "As long as they do not drop into the Severe Stage (two tiers down)..."
        // Logic: If they drop 2 or more levels, they fail clean slate.
        if (startLevel - endLevel >= 2) {
            return nextStart; // Failed clean slate, use standard rollover
        }

        if (endingTier.name === TIERS.TERMINATION.name) {
            return 0;
        }

        return maxPoints; // Success clean slate
    }

    // Standard Rollover
    return nextStart;
}

module.exports = {
    STARTING_POINTS,
    TIERS,
    VIOLATION_TYPES,
    DEFAULT_TARDY_PENALTIES,
    DEFAULT_CALLOUT_PENALTIES,
    DEFAULT_POSITIVE_ADJUSTMENTS,
    groupConsecutiveCallouts,
    calculateDeductions,
    calculatePositiveAdjustments,
    calculateCurrentPoints,
    determineTier,
    calculateMonthlyBonus,
    calculateQuarterlyStart
};
