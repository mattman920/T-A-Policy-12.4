import { calculateUserState, TIERS } from '../utils/pointCalculator';

// Helper to get Quarter Key (e.g., "2024-Q1")
const getQuarterKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
};

/**
 * Identifies all Disciplinary Actions (DAs) that need to be issued for an employee.
 * Scans historical drop events to find unissued DAs.
 */
export const getRequiredDAs = (employee, allViolations, settings, issuedDAs = []) => {
    const allDAs = [];
    const empViolations = allViolations.filter(v => v.employeeId === employee.id);
    const state = calculateUserState(empViolations, settings);
    const historyLog = state.historyLog || []; // processedDrops

    // 1. NCNS Check (Immediate Termination/Final logic)
    const ncnsViolations = empViolations.filter(v => v.type === 'No Call No Show');
    ncnsViolations.forEach((v, index) => {
        let tierName = null;
        let suffix = '';
        if (index === 0) {
            tierName = TIERS.FINAL.name;
            suffix = 'NCNS';
        } else if (index === 1) {
            tierName = TIERS.TERMINATION.name;
            suffix = 'NCNS';
        }

        if (tierName) {
            const daKey = `${employee.id}-${tierName}-${suffix}`;
            const isIssued = issuedDAs.includes(daKey);

            // Only add if likely valid (simple NCNS logic check)
            allDAs.push({
                employeeId: employee.id,
                employeeName: employee.name,
                tier: tierName,
                reason: `No Call No Show (${index + 1}${index === 0 ? 'st' : 'nd'} Offense)`,
                quarter: getQuarterKey(new Date(v.date)),
                points: 0,
                key: daKey,
                date: v.date,
                status: isIssued ? 'issued' : 'pending'
            });
        }
    });

    // 2. Scan History for Drop Events (Sticky/Persistent DAs)
    historyLog.forEach(drop => {
        // drop: { date, fromTier, toTier, freezeUntil }
        // We trigger a DA when entering a bad tier (below Good)
        if (drop.toTier.level < TIERS.GOOD.level) {
            const dateStr = drop.date.toISOString().split('T')[0];
            const tierName = drop.toTier.name;
            const daKey = `${employee.id}-${tierName}-${dateStr}`;

            const isIssued = issuedDAs.includes(daKey);

            allDAs.push({
                employeeId: employee.id,
                employeeName: employee.name,
                tier: tierName,
                reason: `Dropped to ${tierName} on ${dateStr}`,
                quarter: getQuarterKey(drop.date),
                points: drop.toTier.resetTarget, // or capture actual points at time?
                key: daKey,
                date: dateStr,
                status: isIssued ? 'issued' : 'pending'
            });
        }
    });

    // 3. 3-Strike Global Cap logic REMOVED.

    return allDAs;
};

/**
 * Calculates current Freeze status for an employee.
 */
export const getFreezeStatus = (employee, violations, settings) => {
    const empViolations = violations.filter(v => v.employeeId === employee.id);
    const state = calculateUserState(empViolations, settings);
    const historyLog = state.historyLog || [];

    // Find active freeze
    // freezeUntil is a Date object in historyLog
    const now = new Date();
    const activeFreezeDrop = historyLog.find(d => d.freezeUntil && d.freezeUntil > now);

    // Count drops from Tier 1 in last 12 months
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Filter relevant drops: Within last year AND from Tier 1
    const relevantDrops = historyLog.filter(d =>
        d.date >= oneYearAgo &&
        d.fromTier &&
        d.fromTier.level === TIERS.GOOD.level
    ).sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first

    const dropsFromTier1 = relevantDrops.length;

    // Calculate time until oldest drop expires (resets count)
    let daysUntilDropReset = 0;
    let resetDate = null;
    if (dropsFromTier1 > 0) {
        // The count resets when the *oldest* relevant drop falls out of the 12-month window.
        // That happens 1 year after the oldest drop date.
        const oldestDrop = relevantDrops[0];
        const expirationDate = new Date(oldestDrop.date);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1); // +1 Year

        if (expirationDate > now) {
            daysUntilDropReset = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
            resetDate = expirationDate;
        }
    }

    return {
        isFrozen: !!activeFreezeDrop,
        freezeUntil: activeFreezeDrop ? activeFreezeDrop.freezeUntil : null,
        freezeDate: activeFreezeDrop ? activeFreezeDrop.date : null,
        dropCountFromTier1: dropsFromTier1,
        // Active freeze remaining
        daysRemaining: activeFreezeDrop ? Math.ceil((activeFreezeDrop.freezeUntil - now) / (1000 * 60 * 60 * 24)) : 0,
        // Drop reset timer
        daysUntilDropReset: daysUntilDropReset,
        dropResetDate: resetDate
    };
};

/**
 * Calculates the current probation/disciplinary state for an employee.
 * Used for storing persistent state on the employee record.
 */
export const calculateNewProbationState = (employee, violations, settings) => {
    const state = calculateUserState(violations, settings);
    const ncnsViolations = violations.filter(v => v.type === 'No Call No Show');

    return {
        isOnProbation: state.tier.level < 5, // Any tier below Good Standing is considered active disciplinary status
        highestLevel: state.tier.level,
        ncnsCount: ncnsViolations.length,
        currentTier: state.tier.name,
        points: state.points
    };
};
