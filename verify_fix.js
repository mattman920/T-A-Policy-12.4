
const violations = [
    { date: '2023-10-01T10:00:00' },
    { date: '2023-10-01T10:00:00' } // Exact same time
];

function calculateRisk(empViolations) {
    const today = new Date('2023-11-05T10:00:00'); // 35 days later

    let totalDaysDiff = 0;
    for (let i = 1; i < empViolations.length; i++) {
        const d1 = new Date(empViolations[i - 1].date);
        const d2 = new Date(empViolations[i].date);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDaysDiff += diffDays;
    }
    // FIX: Math.max(1, ...)
    const avgDaysBetween = Math.max(1, totalDaysDiff / (empViolations.length - 1));

    const lastViolationDate = new Date(empViolations[empViolations.length - 1].date);
    const daysSinceLast = Math.ceil((today - lastViolationDate) / (1000 * 60 * 60 * 24));

    let rawProb = (daysSinceLast / avgDaysBetween) * 100;
    const probability = Math.min(99, Math.round(rawProb));

    return {
        totalDaysDiff,
        avgDaysBetween,
        daysSinceLast,
        rawProb,
        probability
    };
}

const result = calculateRisk(violations);
console.log('Result:', result);
