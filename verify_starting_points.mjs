import {
    calculateQuarterlyStart,
    calculateCurrentPoints,
    determineTier,
    VIOLATION_TYPES,
    TIERS
} from './src/utils/pointCalculator.js';

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
    // Note: calculateQuarterlyStart might need to look at previous history, so we pass all violations
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
