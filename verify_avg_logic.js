
const VIOLATION_TYPES = {
    CALLOUT: 'Call Out'
};

const selectedRiskType = VIOLATION_TYPES.CALLOUT;

function calculateRisk(violations, empId) {
    const empViolations = violations
        .filter(v => v.employeeId === empId && v.type === selectedRiskType)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (empViolations.length < 2) return null;

    // Current Logic from Projections.jsx
    let totalDaysDiff = 0;
    for (let i = 1; i < empViolations.length; i++) {
        const d1 = new Date(empViolations[i - 1].date);
        const d2 = new Date(empViolations[i].date);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDaysDiff += diffDays;
    }
    const avgDaysBetween = totalDaysDiff / (empViolations.length - 1);

    // Alternative Logic (Last - First)
    const firstDate = new Date(empViolations[0].date);
    const lastDate = new Date(empViolations[empViolations.length - 1].date);
    const totalTime = Math.abs(lastDate - firstDate);
    const totalDays = Math.ceil(totalTime / (1000 * 60 * 60 * 24));
    const altAvg = totalDays / (empViolations.length - 1);

    return {
        count: empViolations.length,
        dates: empViolations.map(v => v.date),
        avgCurrent: avgDaysBetween,
        avgAlt: altAvg,
        match: Math.abs(avgDaysBetween - altAvg) < 0.01
    };
}

// Test Cases
const testCases = [
    {
        name: "Regular Weekly",
        violations: [
            { employeeId: 1, type: 'Call Out', date: '2023-01-01' },
            { employeeId: 1, type: 'Call Out', date: '2023-01-08' },
            { employeeId: 1, type: 'Call Out', date: '2023-01-15' }
        ],
        expected: 7
    },
    {
        name: "Irregular",
        violations: [
            { employeeId: 1, type: 'Call Out', date: '2023-01-01' },
            { employeeId: 1, type: 'Call Out', date: '2023-01-05' }, // 4 days
            { employeeId: 1, type: 'Call Out', date: '2023-01-11' }  // 6 days
        ],
        expected: 5 // (4+6)/2 = 5
    },
    {
        name: "Across Month Boundary",
        violations: [
            { employeeId: 1, type: 'Call Out', date: '2023-01-30' },
            { employeeId: 1, type: 'Call Out', date: '2023-02-02' }  // 3 days
        ],
        expected: 3
    }
];

testCases.forEach(tc => {
    const result = calculateRisk(tc.violations, 1);
    console.log(`Test: ${tc.name}`);
    console.log(`Expected: ${tc.expected}, Got: ${result.avgCurrent}`);
    console.log(`Match Alternative? ${result.match}`);
    console.log('---');
});
