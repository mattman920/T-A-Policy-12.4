
// Constants
export const STARTING_POINTS = 150;
export const MAX_POINTS = 150;

export const TIERS = {
    GOOD: { name: 'Good Standing', min: 125, nextStart: 150, maxBonus: 150 }, // maxBonus is effectively cap
    COACHING: { name: 'Coaching', min: 85, nextStart: 125, maxBonus: 140 },
    SEVERE: { name: 'Severe', min: 50, nextStart: 100, maxBonus: 115 },
    FINAL: { name: 'Final', min: 1, nextStart: 75, maxBonus: 90 },
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0 },
};

export const VIOLATION_TYPES = {
    TARDY_1_5: 'Tardy (1-5 min)',
    TARDY_6_11: 'Tardy (6-11 min)',
    TARDY_12_29: 'Tardy (12-29 min)',
    TARDY_30_PLUS: 'Tardy (30+ min)',
    CALLOUT: 'Callout',
};

// Deduction Rules
// Deduction Rules
export const DEFAULT_TARDY_PENALTIES = {
    'Tardy (1-5 min)': [2, 3, 5, 8], // 4th+ is 8
    'Tardy (6-11 min)': [3, 5, 8, 12],
    'Tardy (12-29 min)': [5, 8, 15, 20],
    'Tardy (30+ min)': [8, 12, 20, 25],
};

export const DEFAULT_CALLOUT_PENALTIES = [15, 20, 25, 30, 40, 50]; // 6th is 50

/**
 * Calculates the total points deducted for a list of violations in a quarter.
 * @param {Array} violations - List of violation objects { type, date }
 * @param {Object} penalties - Optional custom penalties configuration
 * @returns {number} Total points deducted
 */
export function calculateDeductions(violations, penalties = {}) {
    let totalDeduction = 0;

    const tardyPenalties = penalties.tardy || DEFAULT_TARDY_PENALTIES;
    const calloutPenalties = penalties.callout || DEFAULT_CALLOUT_PENALTIES;

    const violationsByMonth = {};
    const callouts = [];

    violations.forEach(v => {
        if (v.type === VIOLATION_TYPES.CALLOUT) {
            callouts.push(v);
        } else {
            // Parse date string (YYYY-MM-DD) as UTC to avoid timezone shifts
            const [year, month, day] = v.date.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));
            const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
            if (!violationsByMonth[monthKey]) violationsByMonth[monthKey] = [];
            violationsByMonth[monthKey].push(v);
        }
    });

    // Calculate Callout Deductions
    callouts.forEach((_, index) => {
        if (index < calloutPenalties.length) {
            totalDeduction += calloutPenalties[index];
        } else {
            totalDeduction += calloutPenalties[calloutPenalties.length - 1];
        }
    });

    // Calculate Tardy Deductions (Per Month)
    Object.values(violationsByMonth).forEach(monthViolations => {
        const counts = {
            [VIOLATION_TYPES.TARDY_1_5]: 0,
            [VIOLATION_TYPES.TARDY_6_11]: 0,
            [VIOLATION_TYPES.TARDY_12_29]: 0,
            [VIOLATION_TYPES.TARDY_30_PLUS]: 0,
        };

        // Sort by date to be precise
        monthViolations.sort((a, b) => new Date(a.date) - new Date(b.date));

        monthViolations.forEach(v => {
            if (tardyPenalties[v.type]) {
                const count = counts[v.type];
                const penaltyList = tardyPenalties[v.type];
                const penalty = count < penaltyList.length ? penaltyList[count] : penaltyList[penaltyList.length - 1];
                totalDeduction += penalty;
                counts[v.type]++;
            }
        });
    });

    return totalDeduction;
}

/**
 * Calculates the current point balance.
 * @param {number} startBalance - Points at start of quarter
 * @param {Array} violations - List of violations
 * @param {Object} penalties - Optional custom penalties configuration
 * @param {number} bonusPoints - Total bonus points earned (optional input if tracked separately)
 * @returns {number} Current points
 */
export function calculateCurrentPoints(startBalance, violations, penalties = {}, bonusPoints = 0) {
    const deductions = calculateDeductions(violations, penalties);
    let points = startBalance - deductions + bonusPoints;
    return Math.min(points, MAX_POINTS); // Cap at 150
}

/**
 * Determines the disciplinary tier based on points.
 * @param {number} points 
 * @returns {Object} Tier object
 */
export function determineTier(points) {
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
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
export function calculateMonthlyBonus(violationsInMonth, shiftsWorked) {
    if (shiftsWorked < 15) return 0;

    const hasCallouts = violationsInMonth.some(v => v.type === VIOLATION_TYPES.CALLOUT);
    const hasTardiness = violationsInMonth.some(v => v.type !== VIOLATION_TYPES.CALLOUT);

    let bonus = 0;
    if (!hasCallouts && !hasTardiness) {
        bonus += 10; // Perfect Attendance
    }

    // "No Tardiness: +5 points" - implies if you have callouts but no tardies, you get 5?
    // "Perfect Attendance: +10 points (No callouts, No tardiness)"
    // "No Tardiness: +5 points (All shifts started on time)"
    // If I have perfect attendance, do I get 10 + 5?
    // Prompt says "Maximum Monthly Bonus: 15 points".
    // Example: "Month 1: Perfect attendance (+10), No tardiness (+5)" -> Total 15.
    // So yes, they stack.

    if (!hasTardiness) {
        bonus += 5;
    }

    return Math.min(bonus, 15);
}

/**
 * Calculates the starting balance for the next quarter based on ending status and bonus.
 * @param {number} endingPoints - Points at the end of the quarter
 * @param {number} quarterlyBonusPoints - Total bonus points earned in the quarter (capped at 45 for accumulation, but only 15 apply here)
 * @returns {number} Starting balance for next quarter
 */
export function calculateNextQuarterStart(endingPoints, quarterlyBonusPoints) {
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
