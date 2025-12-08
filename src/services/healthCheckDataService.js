import { calculateEmployeeState, TIERS, VIOLATION_TYPES } from '../utils/pointCalculator';

/**
 * Generates the data payload for the Employee Health Check Report.
 * 
 * @param {Object} employee - The employee object.
 * @param {Array} allViolations - All violations for the company (will be filtered for employee).
 * @param {Object} settings - Application settings (for point calculation).
 * @param {Date} referenceDate - The anchor date for the report (default: Now).
 * @returns {Object} JSON payload for the report.
 */
export const generateEmployeeHealthData = (employee, allViolations, settings, referenceDate = new Date()) => {
    const now = new Date(referenceDate);

    // 1. Time Windows
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // 2. Filter Violations
    const empViolations = allViolations.filter(v => v.employeeId === employee.id);
    empViolations.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Calculate State (Current & Trend)
    const violationsUpToNow = empViolations.filter(v => new Date(v.date) <= now);
    const state = calculateEmployeeState(employee, violationsUpToNow, settings, now);

    const violationsUpTo14DaysAgo = empViolations.filter(v => new Date(v.date) <= fourteenDaysAgo);
    const state14DaysAgo = calculateEmployeeState(employee, violationsUpTo14DaysAgo, settings, fourteenDaysAgo);

    // Trend Logic
    const currentScore = state.score;
    const previousScore = state14DaysAgo.score;
    const scoreDiff = currentScore - previousScore;
    const trendDirection = scoreDiff > 0 ? 'UP' : (scoreDiff < 0 ? 'DOWN' : 'FLAT');

    // 4. "Under Review" Banner Logic (Legacy Support, hidden in new report but passed)
    let showUnderReview = false;
    if (employee.disciplinary_action_queue && Array.isArray(employee.disciplinary_action_queue)) {
        showUnderReview = employee.disciplinary_action_queue.some(da =>
            da.status === 'PENDING_MANAGER_ACTION' || da.status === 'PENDING_EMPLOYEE_SIGNATURE'
        );
    }

    // 5. Tier & EMD Logic
    const currentTier = state.tier;
    const emdAllocationMap = {
        [TIERS.GOOD.name]: 100,
        [TIERS.EDUCATIONAL.name]: 75,
        [TIERS.COACHING.name]: 50,
        [TIERS.SEVERE.name]: 25,
        [TIERS.FINAL.name]: 0,
        [TIERS.TERMINATION.name]: 0
    };
    let emdPercentage = emdAllocationMap[currentTier.name] || 0;

    // BONUS LOGIC (Tier 1 Only)
    if (currentTier.name === TIERS.GOOD.name) {
        if (state.score >= 148) {
            emdPercentage = 120;
        } else if (state.score >= 146) {
            emdPercentage = 110;
        }
    }

    // 6. Probation Cycle Logic (Full History & Timeline)
    let activeStickyDA = null;
    let nextStepIfFail = null;
    let probationHistory = [];
    let timelineEvents = [];

    // Find last "Good Standing"
    const reversedLog = [...state.eventLog].reverse();
    // Logic: Identify the current cycle.
    // If resetting to Good Standing ends a cycle, then the cycle is everything AFTER the last Good Standing reset/promotion.
    // BUT if we dropped FROM Good Standing, that drop starts the cycle.

    let cycleEventsReversed = [];

    if (currentTier.name === TIERS.GOOD.name) {
        // If in Good Standing, cycle is theoretically empty or just "Stable".
        // Use empty array to signify "No active probation cycle".
        cycleEventsReversed = [];
    } else {
        // Find the last event where we were Tier 1 / Good Standing.
        const lastGoodIndex = reversedLog.findIndex(e => e.tier && e.tier.name === TIERS.GOOD.name);
        if (lastGoodIndex !== -1) {
            cycleEventsReversed = reversedLog.slice(0, lastGoodIndex);
        } else {
            cycleEventsReversed = reversedLog; // All history
        }
    }

    // "Current Cycle DAs" (Demotions Only)
    const currentCycleDAs = cycleEventsReversed
        .filter(e => e.type === 'demotion')
        .reverse() // Chronological
        .map(e => ({
            date: e.date,
            tier: e.daStatus || e.tier.name, // Use DA Status (e.g. Severe) if available, fallback to Tier
            details: e.details
        }));

    // "Cycle History" (Ups and Downs)
    const cycleHistory = cycleEventsReversed
        .filter(e => e.type === 'demotion' || e.type === 'promotion' || e.type === 'promotion_points' || e.type === 'reset')
        .reverse()
        .map(e => ({
            date: e.date,
            type: e.type === 'demotion' ? 'Drop' : 'Climb',
            tier: e.tier.name,
            details: e.details
        }));

    // Timeline Data (Chart) - Keep existing logic if needed or simplify
    const cycleEventsChrono = [...cycleEventsReversed].reverse();
    timelineEvents = cycleEventsChrono.map(e => ({
        date: new Date(e.date).toISOString().split('T')[0],
        score: e.points,
        tier: e.tier.name
    }));
    if (timelineEvents.length === 0 || timelineEvents[timelineEvents.length - 1].date !== now.toISOString().split('T')[0]) {
        timelineEvents.push({
            date: now.toISOString().split('T')[0],
            score: currentScore,
            tier: currentTier.name
        });
    }

    // Sticky DA Logic (Refactored to use Point Calculator's Ratchet Logic)
    // The point calculator maintains a daStageIndex that only resets on return to Good Standing.
    // This is the authoritative source for "Sticky DA".
    activeStickyDA = state.daStage || null;
    if (activeStickyDA === 'Good Standing') {
        // "Good Standing" isn't a DA, so treat as null for UI "Sticky DA" display if implied
        // But for summary generation, "Good Standing" is fine as a baseline.
        // Let's keep it as the stage name.
    }

    // Forecast Logic
    const tierLevels = [TIERS.GOOD, TIERS.EDUCATIONAL, TIERS.COACHING, TIERS.SEVERE, TIERS.FINAL, TIERS.TERMINATION];
    const currentLevelIndex = tierLevels.findIndex(t => t.name === currentTier.name);

    if (currentLevelIndex < tierLevels.length - 1) {
        // e.g. Coach -> Severe
        const nextT = tierLevels[currentLevelIndex + 1];
        nextStepIfFail = `${nextT.name} (Tier ${5 - nextT.level + 1})`; // roughly
        // Better:
        nextStepIfFail = nextT.name;
    } else {
        nextStepIfFail = "Termination";
    }

    let nextStepUp = "Good Standing";
    let daysToPromotion = 0;

    // Days Stabilized
    const lastChangeDate = state.lastTierChangeDate ? new Date(state.lastTierChangeDate) : null;
    let daysStabilized = 0;
    if (lastChangeDate) {
        const diffTime = Math.abs(now - lastChangeDate);
        daysStabilized = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    if (currentLevelIndex > 0) {
        nextStepUp = tierLevels[currentLevelIndex - 1].name;
        // 30 day cycle - days stabilized
        daysToPromotion = Math.max(0, 30 - daysStabilized);
    } else {
        daysToPromotion = 0; // Already at top
        nextStepUp = "N/A (Max Tier)";
    }

    // Yo-Yo Counter (Drops from Tier 1 in last 12 months)
    const dropsFromTier1 = state.historyLog.filter(drop =>
        new Date(drop.date) >= oneYearAgo &&
        drop.fromTier &&
        drop.fromTier.name === TIERS.GOOD.name
    ).length;

    // Use legacy 'recoveriesUsed' as nickname for this value
    const recoveriesUsed = dropsFromTier1;

    // Surge
    const surgeActive = empViolations.some(v =>
        (v.type === VIOLATION_TYPES.CALLOUT || v.type === 'Callout') &&
        new Date(v.date) >= sixtyDaysAgo &&
        new Date(v.date) <= now
    );

    // 8. Recent Activity (60d)
    const recentActivity = empViolations.filter(v => new Date(v.date) >= sixtyDaysAgo && new Date(v.date) <= now);

    const shiftPickups = recentActivity.filter(v => v.type === VIOLATION_TYPES.SHIFT_PICKUP || v.type === 'Shift Pickup').length;
    const earlyArrivals = recentActivity.filter(v => v.type === VIOLATION_TYPES.EARLY_ARRIVAL || v.type === 'Early Arrival').length;
    const latenessCount = recentActivity.filter(v => v.type === VIOLATION_TYPES.LATE || v.type === 'Late Arrival').length;
    const calloutCount = recentActivity.filter(v => v.type === VIOLATION_TYPES.CALLOUT || v.type === 'Callout').length;
    const ncnsCount = recentActivity.filter(v => v.type === VIOLATION_TYPES.NO_SHOW || v.type === 'No Call No Show').length;

    const violationList60d = recentActivity
        .filter(v =>
            v.type !== VIOLATION_TYPES.SHIFT_PICKUP && v.type !== 'Shift Pickup' &&
            v.type !== VIOLATION_TYPES.EARLY_ARRIVAL && v.type !== 'Early Arrival'
        )
        .map(v => ({
            date: v.date,
            type: v.type,
            points: v.pointsDeducted || 0
        }));

    const violations90dCount = empViolations.filter(v =>
        new Date(v.date) >= ninetyDaysAgo &&
        new Date(v.date) <= now &&
        v.type !== VIOLATION_TYPES.SHIFT_PICKUP &&
        v.type !== 'Shift Pickup' &&
        v.type !== VIOLATION_TYPES.EARLY_ARRIVAL &&
        v.type !== 'Early Arrival'
    ).length;

    // 9. Improvement Actions
    const improvementActions = [];
    improvementActions.push("Avoid new violations to maintain stabilization streaks.");
    if (latenessCount > 0) improvementActions.push("Arrive 5 minutes early to build a buffer against traffic/delays.");
    if (calloutCount > 0) improvementActions.push("Update 7Shifts availability to match your actual schedule constraints.");
    if (ncnsCount > 0) improvementActions.push("ALWAYS communicate. Even a late call is better than a No Call No Show.");
    if (shiftPickups === 0) improvementActions.push("Pick up open shifts to demonstrate reliability.");

    // 10. AI Context
    const summaryContext = {
        name: employee.name,
        currentTier: currentTier.name,
        stickyDA: activeStickyDA,
        daysStabilized,
        recentViolationType: violationList60d.length > 0 ? violationList60d[violationList60d.length - 1].type : "None",
        isRecoveryRisk: recoveriesUsed >= 2,
        surgeActive,
        summary: "AI Context unavailable.",
        // New: Draft Summary for Hybrid Approach
        draftSummary: generateDraftSummary({
            currentTier: currentTier.name,
            maxDA: activeStickyDA || "None", // Assuming stickyDA represents the highest active DA logic or similar
            nextTier: nextStepIfFail,
            nextConsequence: "a Final DA", // This needs to be dynamic based on nextStepIfFail logic
            daysToPromote: daysToPromotion
        })
    };

    // Helper to calc next consequence dynamically if needed, or stick to simple logic 
    // For now, let's refine the parameters passed to generateDraftSummary below.

    const draftParams = {
        tierName: currentTier.name,
        tierLevel: currentTier.level, // 1=Good, 5=Final
        highestDA: activeStickyDA || "None",
        nextTierDown: nextStepIfFail,
        daysToPromote: daysToPromotion
    };
    summaryContext.draftSummary = generateDraftSummary(draftParams);

    return {
        meta: {
            reportDate: now.toISOString(),
            showUnderReviewBanner: showUnderReview
        },
        employeeStatus: {
            currentTier: currentTier.level,
            currentTierName: currentTier.name,
            currentTierColor: currentTier.color,
            currentPoints: state.score,
            statusLevelIndex: currentLevelIndex, // Good=0, Ed=1...
            emdPercentage,
            emdAllocationMap, // Passing for reference if needed
            activeStickyDA,
            probationHistory, // LEGACY field (passed for backward compat if any)
            trendDirection,
            scoreDiff
        },
        forecast: {
            nextStepIfFail,
            nextStepUp,
            daysToPromotion,
            timelineEvents
        },
        cycleData: {
            isActive: currentTier.name !== TIERS.GOOD.name,
            currentCycleDAs,
            cycleHistory, // The NEW comprehensive list
            dropsFromTier1, // Freeze counter
            maxDrops: 3
        },
        progressMetrics: {
            daysStabilized,
            recoveriesUsed, // Same as dropsFromTier1
            maxRecoveries: 3,
            surgeActive
        },
        activityData: {
            shiftPickups30d: shiftPickups, // Keep name for compat or rename? Let's leave these count names generic or as is if simpler, but list is key.
            earlyArrivals30d: earlyArrivals,
            violationsList60d: violationList60d, // RENAMED
            totalViolations90d: violations90dCount
        },
        improvementActions,
        aiContext: summaryContext,
        footerExpectations: [
            "Show up on time.",
            "Call out by 8:30 AM if sick.",
            "Update availability in 7Shifts by Friday Noon.",
            "Request time off 12 days in advance."
        ]
    };
};

/**
 * Generates a strict, fact-based summary string.
 * Template: "You are currently in [Tier], you have recieved up to a [Highest DA] due to the drops between tiers due to lack of good attendance. 
 * If you drop tiers again from your current tier which is [Tier] to [Next Tier] you will receive [Next Consequence]. 
 * You have [Days] days left till you enter tier 1. Please maintain good attendance to get those DA's dropped and get your full meal benefit back."
 */
const generateDraftSummary = ({ tierName, tierLevel, highestDA, nextTierDown, daysToPromote }) => {
    // 1. Current Tier
    // Map internal names to Tier numbers.
    // Level 5 (Good) -> Tier 1
    // Level 4 (Ed) -> Tier 2
    // Level 3 (Coaching) -> Tier 3
    // Level 2 (Severe) -> Tier 4
    // Level 1 (Final) -> Tier 5
    const tierNumber = 6 - tierLevel;
    const displayTier = tierLevel === 5 ? "Tier 1 (Good Standing)" : `Tier ${tierNumber}`;

    // 2. Highest DA / reason
    let daPhrase = `you have received up to a ${highestDA} DA`;
    if (!highestDA || highestDA === 'None' || highestDA === 'Good Standing') {
        daPhrase = "you have received no Disciplinary Actions";
    }

    // 3. Next Consequence
    // Logic: Look at the HIGHEST DA currently active (highestDA).
    // The next drop will trigger the NEXT stage after that.
    let nextConsequence = "further disciplinary action";
    const daStages = ['Good Standing', 'Educational', 'Coaching', 'Severe', 'Final', 'Termination'];

    // Normalize highestDA input (handle variations like "Educational Stage")
    const normalizeDaName = (name) => {
        if (!name) return 'Good Standing';
        const n = name.toLowerCase();
        if (n.includes('education')) return 'Educational';
        if (n.includes('coaching') || n.includes('written')) return 'Coaching';
        if (n.includes('severe')) return 'Severe';
        if (n.includes('final')) return 'Final';
        if (n.includes('term')) return 'Termination';
        return 'Good Standing';
    };

    const currentDaNormal = normalizeDaName(highestDA);
    let currentDaIndex = daStages.indexOf(currentDaNormal);

    // If "None" passed in or not found, calculate implied DA based on current Tier
    if (currentDaIndex === -1 || highestDA === 'None') {
        const tierMap = {
            1: 'Good Standing', // Tier 1
            2: 'Educational',   // Tier 2
            3: 'Coaching',      // Tier 3
            4: 'Severe',        // Tier 4
            5: 'Final'          // Tier 5
        };
        const impliedDA = tierMap[tierNumber] || 'Good Standing';
        currentDaIndex = daStages.indexOf(impliedDA);
    }

    // Calculate Next Step
    const nextDaIndex = currentDaIndex + 1;
    if (nextDaIndex < daStages.length) {
        const nextStage = daStages[nextDaIndex];
        if (nextStage === 'Termination') {
            nextConsequence = "Termination";
        } else {
            // Add "DA" suffix unless it's Termination
            nextConsequence = `a ${nextStage} DA`;
        }
    } else {
        nextConsequence = "Termination";
    }

    // 4. Next Tier Name (Target of drop)
    // If currently Tier 2, dropping goes to Tier 3.
    const nextTierNum = tierNumber + 1;
    const nextTierDisplay = `Tier ${nextTierNum}`;

    // 5. Days to Promotion
    let promotionPhrase = `You have ${daysToPromote} days left till you enter ${tierLevel === 4 ? 'Tier 1' : 'the next tier'}`;
    if (tierLevel === 5) { // Tier 1
        promotionPhrase = "";
    }

    // SPECIAL CASE: Good Standing (Tier 1) with NO Sticky DA
    if (tierLevel === 5 && (!highestDA || highestDA === 'Good Standing' || highestDA === 'None')) {
        return `You are currently in Tier 1 (Good Standing). You have no active Disciplinary Actions and are fully compliant with the attendance policy. If you drop to Tier 2, you will receive an Educational Stage DA. Please maintain your excellent attendance to keep your full meal benefits.`;
    }

    return `You are currently in ${displayTier}, ${daPhrase} due to the drops between tiers due to lack of good attendance. If you drop tiers again from your current tier which is ${displayTier} to ${nextTierDisplay} you will receive ${nextConsequence}. ${promotionPhrase}. Please maintain good attendance to get those DA's dropped and get your full meal benefit back. [DB: ${highestDA} idx:${currentDaIndex}]`;
};
