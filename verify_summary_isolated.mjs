
// Isolated test for generateDraftSummary logic

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
    if (!highestDA || highestDA === 'None') {
        daPhrase = "you have received no Disciplinary Actions";
    }

    // 3. Next Consequence
    // Logic: Look at the HIGHEST DA currently active (highestDA).
    // The next drop will trigger the NEXT stage after that.
    let nextConsequence = "further disciplinary action";
    const daStages = ['Good Standing', 'Educational Stage', 'Coaching', 'Severe', 'Final', 'Termination'];

    // Normalize highestDA to match stages if needed, or find index
    let currentDaIndex = daStages.findIndex(s => s.toLowerCase() === (highestDA || "").toLowerCase());

    // Fallback if not found (e.g. if highestDA is null), use current Tier as baseline
    if (currentDaIndex === -1) {
        // If no sticky DA, assume DA stage matches current tier (inverted)
        // Tier 1 (Lvl 5) -> Index 0
        // Tier 2 (Lvl 4) -> Index 1
        currentDaIndex = 5 - tierLevel;
    }

    const nextDaIndex = currentDaIndex + 1;
    if (nextDaIndex < daStages.length) {
        const nextStageName = daStages[nextDaIndex];
        if (nextStageName === 'Termination') {
            nextConsequence = "Termination";
        } else {
            nextConsequence = `a ${nextStageName} DA`;
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
        promotionPhrase = "You are currently in Tier 1 (Good Standing)";
    }

    return `You are currently in ${displayTier}, ${daPhrase} due to the drops between tiers due to lack of good attendance. If you drop tiers again from your current tier which is ${displayTier} to ${nextTierDisplay} you will receive ${nextConsequence}. ${promotionPhrase}. Please maintain good attendance to get those DA's dropped and get your full meal benefit back.`;
};

// --- TESTS ---

console.log("TEST 1: Standard Educational Stage (Tier 2)");
// Tier Level 4 = Educational. Highest DA = Educational Stage (or None? Usually Ed Stage).
// Next drop -> Coaching.
console.log(generateDraftSummary({
    tierName: "Educational Stage",
    tierLevel: 4,
    highestDA: "Educational Stage",
    nextTierDown: "Coaching",
    daysToPromote: 10
}));
// Exp: "Currently in Tier 2... up to Educational Stage DA... if you drop to Tier 3... receive a Coaching DA."

console.log("\nTEST 2: Tier 2 (Ed) but Sticky SEVERE DA");
// Tier Level 4 = Ed. Highest DA = Severe.
// Next drop -> Final.
console.log(generateDraftSummary({
    tierName: "Educational Stage",
    tierLevel: 4,
    highestDA: "Severe",
    nextTierDown: "Coaching", // The prompt might pass 'Coaching' as next tier, but sticky makes consequence worse
    daysToPromote: 10
}));
// Exp: "Currently in Tier 2... up to Severe DA... if you drop to Tier 3... receive a Final DA."

console.log("\nTEST 3: Tier 3 (Coaching) standard");
// Tier Level 3 = Coaching. Highest DA = Coaching.
// Next drop -> Severe.
console.log(generateDraftSummary({
    tierName: "Coaching",
    tierLevel: 3,
    highestDA: "Coaching",
    nextTierDown: "Severe",
    daysToPromote: 25
}));
// Exp: "Currently in Tier 3... up to Coaching DA... if you drop to Tier 4... receive a Severe DA."

console.log("\nTEST 4: Tier 4 (Severe) standard");
// Tier Level 2. Highest DA = Severe.
// Next drop -> Final.
console.log(generateDraftSummary({
    tierName: "Severe",
    tierLevel: 2,
    highestDA: "Severe",
    nextTierDown: "Final",
    daysToPromote: 5
}));

console.log("\nTEST 5: Tier 2 NO DA (should imply Ed Stage DA if tier is Ed?)");
// If tier is Ed, implies Ed Stage warning.
console.log(generateDraftSummary({
    tierName: "Educational Stage",
    tierLevel: 4,
    highestDA: "None", // Or undefined
    nextTierDown: "Coaching",
    daysToPromote: 10
}));
