
// Mock constants and function for verification
const VIOLATION_TYPES = {
    CALLOUT: 'Call Out'
};

const calculateDeductions = (violations) => {
    let total = 0;
    violations.forEach(v => {
        if (v.type === VIOLATION_TYPES.CALLOUT) total += 15; // Mock penalty
    });
    return total;
};

console.log("--- Verification: Migration and Score Calculation ---");

// Simulate the migration logic
const rawViolations = [
    { type: 'Callout', date: '2023-10-01' }, // Old bad data
    { type: 'Call Out', date: '2023-10-05' } // Good data
];

console.log("Original Violations:", rawViolations);

const migratedViolations = rawViolations.map(v => {
    if (v.type === 'Callout') {
        return { ...v, type: VIOLATION_TYPES.CALLOUT };
    }
    return v;
});

console.log("Migrated Violations:", migratedViolations);

const deduction = calculateDeductions(migratedViolations);
console.log(`Total Deduction: ${deduction}`);

// Expected: 15 (1st) + 20 (2nd) = 35
if (deduction === 35) {
    console.log("SUCCESS: Migration worked and score is correct.");
} else {
    console.log(`FAILURE: Expected 35, got ${deduction}`);
}
