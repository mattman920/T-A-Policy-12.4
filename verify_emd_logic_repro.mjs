
const testScenarios = [
    { points: 150, expectedBonus: 0.20, label: "150 (Max)" },
    { points: 148, expectedBonus: 0.20, label: "148 (High)" },
    { points: 147, expectedBonus: 0.10, label: "147 (Mid)" },
    { points: 146, expectedBonus: 0.10, label: "146 (Mid)" },
    { points: 145, expectedBonus: 0.00, label: "145 (Drop)" },
    { points: 138, expectedBonus: 0.00, label: "138 (Old Silver)" },
    { points: 130, expectedBonus: 0.00, label: "130 (Old Bronze)" }
];

function calculateBonus_Current(currentPoints) {
    // COPY OF CURRENT LOGIC FROM EMDReportModal.jsx
    let bonusPercent = 0;
    if (currentPoints >= 145) bonusPercent = 0.20;      // Gold
    else if (currentPoints >= 138) bonusPercent = 0.10; // Silver
    else if (currentPoints >= 130) bonusPercent = 0.05; // Bronze
    return bonusPercent;
}

function calculateBonus_Proposed(currentPoints) {
    // PROPOSED LOGIC
    let bonusPercent = 0;
    if (currentPoints >= 148) {
        bonusPercent = 0.20;
    } else if (currentPoints >= 146) {
        bonusPercent = 0.10;
    }
    return bonusPercent;
}

console.log("--- EMD Logic Verification ---");
console.log("Points | Expected | Current | Proposed | Status");
console.log("-------|----------|---------|----------|-------");

testScenarios.forEach(scen => {
    const current = calculateBonus_Current(scen.points);
    const proposed = calculateBonus_Proposed(scen.points);

    // Status check for Proposed vs Expected
    const status = proposed === scen.expectedBonus ? "PASS" : "FAIL";

    console.log(`${scen.points.toString().padEnd(6)} | ${(scen.expectedBonus * 100).toFixed(0).padStart(3)}%     | ${(current * 100).toFixed(0).padStart(3)}%    | ${(proposed * 100).toFixed(0).padStart(3)}%     | ${status}`);
});

console.log("\n--- Date Logic Verification (Simulation) ---");
const y = 2023;
const m = 0; // Jan
const lastDay = new Date(y, m + 1, 0);
console.log(`Month: Jan ${y}`);
console.log(`Calculated Last Day: ${lastDay.toDateString()}`);
if (lastDay.getDate() === 31 && lastDay.getMonth() === 0) {
    console.log("Date Logic: PASS (Correctly identifies end of month)");
} else {
    console.log("Date Logic: FAIL");
}
