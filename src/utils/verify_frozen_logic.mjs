
import { calculateUserState, TIERS, VIOLATION_TYPES } from './pointCalculator.mjs';

console.log("Running Frozen Logic Verification...");

const makeViolation = (dateStr, type = VIOLATION_TYPES.CALLOUT) => ({
    date: dateStr,
    type: type,
    points: 0 // logic calculates points
});

const runTest = () => {
    const violations = [];

    // 1. Jan 1: Start (Tier 1 Default)

    // 2. Feb 1: Drop #1 (T1 -> T2)
    // To drop from 150 to <126 (Good Min), we need >24 points.
    // Callout = 24. So 1 callout = 126 (Still Good). 
    // We need 2 callouts or 1 callout + tardy to drop.
    // Let's use 2 Callouts.
    console.log("--- Simulating Drop #1 (Feb 1) ---");
    violations.push(makeViolation("2024-02-01"));
    violations.push(makeViolation("2024-02-01"));

    // 3. Mar 1: Recover to Tier 1

    // 4. Apr 1: Drop #2 (T1 -> T2)
    console.log("--- Simulating Drop #2 (Apr 1) ---");
    violations.push(makeViolation("2024-04-01"));
    violations.push(makeViolation("2024-04-01"));

    // 5. May 1: Recover to Tier 1

    // 6. Jun 1: Drop #3 (T1 -> T2) -> SHOULD FREEZE
    console.log("--- Simulating Drop #3 (Jun 1) ---");
    violations.push(makeViolation("2024-06-01"));
    violations.push(makeViolation("2024-06-01"));

    // Calculate State
    const result = calculateUserState(violations, { targetDate: "2024-07-01" });

    // Analyze Log
    console.log("\n--- Event Log Analysis ---");
    const demotions = result.eventLog.filter(e => e.type === 'demotion');
    demotions.forEach((d, i) => {
        console.log(`Demotion ${i + 1}: ${d.date.toISOString().split('T')[0]} - ${d.details}`);
    });

    const resets = result.eventLog.filter(e => e.type === 'reset');
    resets.forEach((r, i) => {
        console.log(`Reset ${i + 1}: ${r.date.toISOString().split('T')[0]} - ${r.details}`);
    });

    const freezes = result.eventLog.filter(e => e.type === 'freeze_skip');
    freezes.forEach((f, i) => {
        console.log(`Freeze Skip ${i + 1}: ${f.date.toISOString().split('T')[0]} - ${f.details}`);
    });

    // Verification
    const lastDemotion = demotions[demotions.length - 1];
    const isFrozen = lastDemotion && lastDemotion.details.includes("(FROZEN)");

    if (isFrozen) {
        console.log("\n✅ SUCCESS: 3rd Drop triggered FREEZE.");
    } else {
        console.error("\n❌ FAILURE: 3rd Drop did NOT trigger FREEZE.");
    }

    // Check if recovery is blocked
    const juneDropDate = new Date("2024-06-01");
    const potentialResetDate = new Date(juneDropDate);
    potentialResetDate.setDate(potentialResetDate.getDate() + 30);

    const resetAfterJun = resets.find(r => r.date >= potentialResetDate);
    if (!resetAfterJun) {
        console.log("✅ SUCCESS: Recovery blocked (No reset found after Jun 1 + 30 days).");
    } else {
        console.error("❌ FAILURE: Recovery occurred despite freeze.");
    }

    // BONUS TEST: Non-Tier 1 Drop
    console.log("\n--- Testing Non-Tier 1 Drop Logic (Corrected Scenario) ---");

    // 1. Jan 1: Drop #1 (from Good).
    // 2. Jan 10: Drop #2 (from Edu -> Coach). Should be IGNORED by count.
    // 3. May 1: Drop #3 (from Good). Should be counted as #2. NO FREEZE.

    const violations2 = [
        makeViolation("2024-01-01"), makeViolation("2024-01-01"), // Drop 1 (From Good)
        makeViolation("2024-01-10"), makeViolation("2024-01-10"), // Drop (Low Tier Drop - Ignore)
        makeViolation("2024-05-01"), makeViolation("2024-05-01")  // Drop 2 (From Good)
    ];

    const result2 = calculateUserState(violations2, { targetDate: "2024-06-01" });
    const demotions2 = result2.eventLog.filter(e => e.type === 'demotion');
    const lastDemotion2 = demotions2[demotions2.length - 1];

    if (lastDemotion2 && lastDemotion2.details.includes("(FROZEN)")) {
        console.error("❌ FAILURE: Non-Tier 1 Drop incorrectly contributed to freeze count.");
        demotions2.forEach(d => console.log(`  - ${d.date.toISOString()} ${d.details}`));
    } else {
        console.log("✅ SUCCESS: Drop from Tier 2 did NOT trigger freeze.");
    }

};

runTest();
