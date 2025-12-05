
const TIERS = {
    GOOD: { name: 'Good Standing', min: 126, nextStart: 150, maxBonus: 150 },
    EDUCATIONAL: { name: 'Educational Stage', min: 125, nextStart: 150, maxBonus: 150 },
    COACHING: { name: 'Coaching', min: 100, nextStart: 125, maxBonus: 140 },
    SEVERE: { name: 'Severe', min: 75, nextStart: 100, maxBonus: 115 },
    FINAL: { name: 'Final', min: 50, nextStart: 75, maxBonus: 90 },
    TERMINATION: { name: 'Termination Review', min: -Infinity, nextStart: 0, maxBonus: 0 },
};

function determineTier(points, customTiers = null) {
    // If custom tiers are provided, construct the tier objects dynamically
    // customTiers should be { educational: 125, coaching: 100, severe: 75, final: 50 }

    if (customTiers) {
        // Good Standing: > Educational Threshold
        if (points > customTiers.educational) return TIERS.GOOD;

        // Educational: <= Educational AND > Coaching
        if (points > customTiers.coaching) return { ...TIERS.EDUCATIONAL, min: customTiers.educational };

        // Coaching: <= Coaching AND > Severe
        if (points > customTiers.severe) return { ...TIERS.COACHING, min: customTiers.coaching };

        // Severe: <= Severe AND > Final
        if (points > customTiers.final) return { ...TIERS.SEVERE, min: customTiers.severe };

        // Final: <= Final AND > Termination (0)
        if (points > 0) return { ...TIERS.FINAL, min: customTiers.final };

        // Termination: <= 0
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

const customTiers = {
    educational: 125,
    coaching: 100,
    severe: 75,
    final: 50
};

const testCases = [
    { points: 126, expected: 'Good Standing' },
    { points: 125, expected: 'Educational Stage' },
    { points: 124, expected: 'Educational Stage' },
    { points: 101, expected: 'Educational Stage' },
    { points: 100, expected: 'Coaching' },
    { points: 76, expected: 'Coaching' },
    { points: 75, expected: 'Severe' },
    { points: 51, expected: 'Severe' },
    { points: 50, expected: 'Final' },
    { points: 1, expected: 'Final' },
    { points: 0, expected: 'Termination Review' }
];

console.log("Running DA Logic Tests...");

testCases.forEach(test => {
    const result = determineTier(test.points, customTiers);
    const passed = result.name === test.expected;
    console.log(`Points: ${test.points} | Expected: ${test.expected} | Got: ${result.name} | ${passed ? 'PASS' : 'FAIL'}`);
});
