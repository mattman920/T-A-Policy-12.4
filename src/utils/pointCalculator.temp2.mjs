// Constants
export const STARTING_POINTS = 150; // New default

export const TIERS = {
    GOOD: { name: 'Good Standing', min: 126, resetTarget: 150, color: '#10B981', level: 5 },
    EDUCATIONAL: { name: 'Educational Stage', min: 101, resetTarget: 125, color: '#10B981', level: 4 },
    COACHING: { name: 'Coaching', min: 76, resetTarget: 100, color: '#F59E0B', level: 3 },
    SEVERE: { name: 'Severe', min: 51, resetTarget: 75, color: '#F97316', level: 2 },
    FINAL: { name: 'Final', min: 0, resetTarget: 50, color: '#EF4444', level: 1 },
    TERMINATION: { name: 'Termination Review', min: -Infinity, resetTarget: 0, color: '#EF4444', level: 0 },
};

export const VIOLATION_TYPES = {
    CALLOUT: 'Call Out',
    TARDY_1_5: 'Tardy (1-5 min)',
    TARDY_6_11: 'Tardy (6-11 min)',
    TARDY_12_29: 'Tardy (12-29 min)',
    TARDY_30_PLUS: 'Tardy (30+ min)',
    EARLY_ARRIVAL: 'Early Arrival',
    SHIFT_PICKUP: 'Shift Pickup'
};

export const DA_STAGES = [
    'Good Standing',
    'Educational Stage',
    'Coaching',
    'Severe',
    'Final',
    'Termination Review'
];

export const DEFAULT_TARDY_PENALTIES = {
    [VIOLATION_TYPES.TARDY_1_5]: [3, 6, 10, 15],
    [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 20],
    [VIOLATION_TYPES.TARDY_12_29]: [15, 20, 25, 30], // Updated: Starts at 15
    [VIOLATION_TYPES.TARDY_30_PLUS]: [15, 20, 25, 30]
};

export const DEFAULT_CALLOUT_PENALTY = 24;
export const SURGE_CALLOUT_PENALTY = 40;
export const SURGE_LOOKBACK_DAYS = 60;
export const TIER_MONITORING_WINDOW = 30;

export const DEFAULT_POSITIVE_ADJUSTMENTS = {
    [VIOLATION_TYPES.EARLY_ARRIVAL]: 1,
    [VIOLATION_TYPES.SHIFT_PICKUP]: 5
};

/**
 * Helper to safely parse date string to local date object.
 * @param {string} dateStr 
 * @returns {Date}
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return new Date('Invalid');
    if (dateStr instanceof Date) return dateStr;

    // Explicitly handle "YYYY-MM-DD" to avoid timezone offset issues (UTC->Local)
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d); // Local Midnight
    }

    const d = new Date(dateStr);
    // Normalize to midnight
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

/**
 * Groups consecutive callouts.
 */
export function groupConsecutiveCallouts(violations) {
    const sorted = [...violations].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (current.type !== 'Call Out' && current.type !== VIOLATION_TYPES.CALLOUT && current.type !== 'Callout') {
            result.push(current);
            continue;
        }
        let isConsecutive = false;
        // Look backwards
        for (let j = i - 1; j >= 0; j--) {
            const prev = sorted[j];
            if (prev.type === 'Call Out' || prev.type === VIOLATION_TYPES.CALLOUT || prev.type === 'Callout') {
                const d1 = parseDate(current.date);
                const d2 = parseDate(prev.date);
                const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
                // Allow exactly 1 day difference
                if (Math.round(Math.abs(diff)) === 1) {
                    isConsecutive = true;
                    break;
                }
            }
        }
        if (!isConsecutive) result.push(current);
    }
    return result;
}

// ... (Rest of file) ...

// INSIDE calculateUserState Loop:
// Update condition:
if (v.type === VIOLATION_TYPES.CALLOUT || v.type === 'Callout') {

    const currentCount = (latenessCounts[v.type] || 0) + 1;
    latenessCounts[v.type] = currentCount;
    escalationCount = currentCount;

    // Check for Consecutive
    let isConsecutive = false;
    if (lastCalloutDate) {
        const diffTime = Math.abs(vDate - lastCalloutDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Exact 1 day difference means consecutive (e.g. Jan 1 -> Jan 2)
        if (diffDays === 1) {
            isConsecutive = true;
        }
    }

    if (isConsecutive) {
        pointsDeducted = 0;
        note = 'Consecutive Callout (Waived)';
    } else {
        const lookbackDate = new Date(vDate);
        lookbackDate.setDate(lookbackDate.getDate() - surgeLookback);
        const hasRecent = processedCallouts.some(d => d >= lookbackDate && d < vDate);
        pointsDeducted = hasRecent ? calloutSurge : calloutStandard;
        note = hasRecent ? 'Surge Penalty' : 'Standard Penalty';
    }

    // Update tracking
    processedCallouts.push(vDate);
    lastCalloutDate = vDate;

} else if (v.type.includes('Tardy')) {
    const penalties = tardyConfig[v.type] || [3, 5, 10, 15];
    const currentCount = (latenessCounts[v.type] || 0) + 1;
    latenessCounts[v.type] = currentCount;
    escalationCount = currentCount;

    // array is 0-indexed
    const index = Math.min(currentCount - 1, penalties.length - 1);
    pointsDeducted = penalties[index];
    note = 'Violation';
} else if (DEFAULT_POSITIVE_ADJUSTMENTS[v.type]) {
    pointsAdded = DEFAULT_POSITIVE_ADJUSTMENTS[v.type];
    note = 'Bonus';
}

// Apply Points Change
currentPoints = currentPoints - pointsDeducted + pointsAdded;
currentPoints = Math.min(currentPoints, 150);

eventLog.push({
    date: vDate,
    type: 'violation',
    tier: currentTier,
    startPoints: startPoints,
    points: currentPoints,
    change: pointsAdded - pointsDeducted,
    violation: v.type,
    details: note, // "Violation" or "Bonus"
    escalation: escalationCount, // New data point
    daStatus: DA_STAGES[daStageIndex],
    ...getCycleInfo(vDate, tierStartDate)
});

// C. Check Drop
const newTier = getTierFn(currentPoints);
if (newTier.level < currentTier.level) {
    // DEMOTION
    const prevTier = currentTier;
    currentTier = newTier;

    // DA RATCHET LOGIC
    const targetIndex = 5 - currentTier.level; // Good(5)->0, Edu(4)->1...
    daStageIndex = Math.max(daStageIndex + 1, targetIndex);
    // Cap at 5 (Termination)
    daStageIndex = Math.min(daStageIndex, 5);

    // Track state before reset for log
    const pointsBeforeReset = currentPoints;

    // FORCE RESET TO TIER CEILING
    currentPoints = newTier.resetTarget;

    tierStartDate = vDate;
    latenessCounts = {}; // Reset all escalations on Demotion

    let freezeInfo = null;

    // YO-YO LOGIC
    // YO-YO LOGIC
    // Rule: 90-Day Freeze triggers ONLY on the 3rd drop FROM Tier 1 (Good Standing) within 12 months.
    const isDropFromTier1 = prevTier.level === TIERS.GOOD.level;

    // We always track the drop details for future lookups
    let freezeExpiration = null;

    if (isDropFromTier1) {
        const oneYearAgo = new Date(vDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Count previous drops that were ALSO from Tier 1 in the last year
        const recentTier1Drops = processedDrops.filter(d =>
            d.date >= oneYearAgo &&
            d.fromTier &&
            d.fromTier.level === TIERS.GOOD.level
        );

        // If we have 2 or more previous Tier 1 drops (so this is #3+), FREEZE.
        if (recentTier1Drops.length >= 2) {
            freezeExpiration = new Date(vDate);
            freezeExpiration.setDate(freezeExpiration.getDate() + 90);
            freezeInfo = freezeExpiration;
        }
    }

    processedDrops.push({
        date: vDate,
        fromTier: prevTier, // Important: Track where we came from
        toTier: currentTier,
        freezeUntil: freezeExpiration
    });

    eventLog.push({
        date: vDate,
        type: 'demotion',
        tier: currentTier,
        startPoints: pointsBeforeReset, // Points just before reset
        points: currentPoints, // New reset points
        change: currentPoints - pointsBeforeReset, // Positive adjustment
        change: currentPoints - pointsBeforeReset, // Positive adjustment
        details: `Demoted from ${prevTier.name} to ${currentTier.name}${freezeInfo ? ' (FROZEN)' : ''}`,
        daStatus: DA_STAGES[daStageIndex],
        ...getCycleInfo(vDate, vDate)
    });

}
else if (newTier.level > currentTier.level) {
    // Promotion via Points (rare)
    const prevTier = currentTier;
    currentTier = newTier;
    tierStartDate = vDate;
    latenessCounts = {}; // Reset escalations

    eventLog.push({
        date: vDate,
        type: 'promotion_points',
        tier: currentTier,
        startPoints: startPoints, // No reset on points calc promotion usually, but resetTarget logic exists.
        points: currentPoints,
        details: `Points Promotion from ${prevTier.name} to ${currentTier.name}`,
        ...getCycleInfo(vDate, vDate)
    });
}
    }

// 5. Final Catch-up to Today (or target date)
const today = settings.targetDate ? parseDate(settings.targetDate) : new Date();
let loops = 0;
while (loops < 12) {
    const diffDays = Math.ceil((today - tierStartDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= TIER_MONITORING_WINDOW) break;

    const candidateDate = new Date(tierStartDate);
    candidateDate.setDate(candidateDate.getDate() + TIER_MONITORING_WINDOW);

    if (candidateDate > today) break;

    let isFrozen = false;
    if (processedDrops.length > 0) {
        const activeFreezes = processedDrops.filter(d => d.freezeUntil && d.freezeUntil > candidateDate);
        if (activeFreezes.length > 0) {
            const effectiveFreeze = activeFreezes.find(d => d.date <= candidateDate);
            if (effectiveFreeze) isFrozen = true;
        }
    }

    if (!isFrozen) {
        if (currentTier.level === TIERS.GOOD.level) {
            // RESET LOGIC
            currentPoints = 150;
            tierStartDate = candidateDate;
            latenessCounts = {};
            daStageIndex = 0;
            eventLog.push({
                date: candidateDate,
                type: 'reset',
                tier: currentTier,
                startPoints: 150,
                points: 150,
                details: 'Reset back to 150 points',
                daStatus: DA_STAGES[daStageIndex],
                ...getCycleInfo(candidateDate, candidateDate),
            });
        } else {
            const nextLevel = currentTier.level + 1;
            const nextTier = Object.values(TIERS).find(t => t.level === nextLevel) || TIERS.GOOD;
            const prevTier = currentTier;
            currentPoints = nextTier.resetTarget;
            currentTier = nextTier;
            tierStartDate = candidateDate;
            latenessCounts = {}; // Reset
            if (currentTier.level === TIERS.GOOD.level) daStageIndex = 0;

            eventLog.push({
                date: candidateDate,
                type: 'promotion',
                tier: currentTier,
                startPoints: currentPoints,
                points: currentPoints,
                details: `Promoted from ${prevTier.name} to ${currentTier.name}`,
                daStatus: DA_STAGES[daStageIndex],
                ...getCycleInfo(candidateDate, candidateDate)
            });
        }
        loops++;
    } else {
        tierStartDate = candidateDate;
        eventLog.push({
            date: candidateDate,
            type: 'freeze_skip',
            tier: currentTier,
            startPoints: currentPoints,
            points: currentPoints,
            details: 'Promotion skipped (Frozen)',
            ...getCycleInfo(candidateDate, candidateDate)
        });
        loops++;
    }
}

return {
    points: currentPoints,
    tier: currentTier,
    latenessCount: 0, // Legacy field, mostly irrelevant now
    tierStartDate,
    daStage: DA_STAGES[daStageIndex],
    daStageIndex: daStageIndex,
    historyLog: processedDrops,
    eventLog
};
}

// Adapters for Legacy
export function calculateDeductions(violations, penalties = null) {
    const callouts = groupConsecutiveCallouts(violations.filter(v => v.type === VIOLATION_TYPES.CALLOUT));
    return callouts.length * 24;
}

export function calculateCurrentPoints(startingPoints, violations, settings) {
    if (!settings) settings = {};
    const state = calculateUserState(violations, settings);
    return state.points;
}

export function determineTier(points, customTiers = null) {
    if (points >= TIERS.GOOD.min) return TIERS.GOOD;
    if (points >= TIERS.EDUCATIONAL.min) return TIERS.EDUCATIONAL;
    if (points >= TIERS.COACHING.min) return TIERS.COACHING;
    if (points >= TIERS.SEVERE.min) return TIERS.SEVERE;
    if (points >= TIERS.FINAL.min) return TIERS.FINAL;
    return TIERS.TERMINATION;
}

export function calculateQuarterlyStart(targetQuarterKey, allViolations, settings) {
    const state = calculateUserState(allViolations, settings);
    return state.points;
}

export function calculateEmployeeState(employee, violations, settings) {
    const state = calculateUserState(violations, settings);
    return {
        score: state.points,
        tier: state.tier,
        lastTierChangeDate: state.tierStartDate,
        daStage: state.daStage,
        daStageIndex: state.daStageIndex,
        historyLog: state.historyLog,
        eventLog: state.eventLog
    };
}

export function calculateViolationPenalty(newViolation, existingViolations, settings) {
    const simulatedViolations = [...existingViolations, {
        ...newViolation,
        type: newViolation.type || newViolation.violationType,
        date: newViolation.date
    }];

    const state = calculateUserState(simulatedViolations, settings);

    const targetDate = parseDate(newViolation.date);

    const matchingEvents = state.eventLog.filter(e =>
        e.type === 'violation' &&
        parseDate(e.date).getTime() === targetDate.getTime() &&
        e.violation === newViolation.type
    );

    if (matchingEvents.length > 0) {
        const lastMatch = matchingEvents[matchingEvents.length - 1];
        return Math.abs(lastMatch.change);
    }

    return 0;
}
