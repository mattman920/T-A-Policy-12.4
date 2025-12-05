import { calculateQuarterlyStart, calculateCurrentPoints, determineTier, TIERS } from '../utils/pointCalculator';
import { getQuarterKey, getQuarterDates } from '../utils/dateUtils';

/**
 * Identifies all Disciplinary Actions (DAs) that need to be issued for an employee.
 * Checks historical quarters to ensure no missed DAs.
 * 
 * @param {Object} employee - The employee object.
 * @param {Array} allViolations - All violations in the system (or filtered for this employee).
 * @param {Object} settings - Application settings containing daSettings and violationPenalties.
 * @param {Array} issuedDAs - List of issued DA keys (e.g., "empId-Tier-Quarter" or legacy "empId-Tier").
 * @returns {Array} List of required DAs.
 */
export const getRequiredDAs = (employee, allViolations, settings, issuedDAs = []) => {
    const requiredDAs = [];
    const { daSettings, violationPenalties } = settings;

    // 1. Identify relevant quarters
    // We scan from the employee's start date (or first violation) up to the current quarter.
    // For simplicity and performance, let's look at quarters where they have violations, 
    // plus the current quarter.

    const empViolations = allViolations.filter(v => v.employeeId === employee.id);

    // Get all unique quarters from violations
    const violationQuarters = new Set(empViolations.map(v => getQuarterKey(new Date(v.date))));

    // Always include current quarter
    const currentQ = getQuarterKey();
    violationQuarters.add(currentQ);

    // Sort quarters chronologically
    const sortedQuarters = Array.from(violationQuarters).sort();

    // 2. Iterate through quarters and check status
    sortedQuarters.forEach(qKey => {
        // Calculate points for this quarter
        const startPoints = calculateQuarterlyStart(qKey, allViolations, settings);

        const { startDate, endDate } = getQuarterDates(qKey);
        const qViolations = empViolations.filter(v => {
            const d = new Date(v.date);
            return d >= startDate && d <= endDate;
        });

        const endPoints = calculateCurrentPoints(startPoints, qViolations, violationPenalties);
        const tier = determineTier(endPoints, daSettings);

        // 3. Check if DA is required
        // Actionable tiers: Coaching, Severe, Final, Termination
        // Note: Termination might be handled differently (e.g. immediate), but we'll list it.
        const actionableTiers = [TIERS.COACHING.name, TIERS.SEVERE.name, TIERS.FINAL.name, TIERS.TERMINATION.name];

        if (actionableTiers.includes(tier.name)) {
            // Construct keys
            const specificKey = `${employee.id}-${tier.name}-${qKey}`;
            const legacyKey = `${employee.id}-${tier.name}`; // Backward compatibility

            // Check if issued
            const isIssued = issuedDAs.includes(specificKey) || issuedDAs.includes(legacyKey);

            if (!isIssued) {
                requiredDAs.push({
                    employeeId: employee.id,
                    employeeName: employee.name,
                    tier: tier.name,
                    quarter: qKey,
                    points: endPoints,
                    key: specificKey // The key to use when issuing
                });
            }
        }
    });

    return requiredDAs;
};
