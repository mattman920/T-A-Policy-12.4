/**
 * deterministic Summary Generator
 * Replaces AI to generate consistent, rule-based feedback for the Health Check Report.
 */

export const generateSummary = ({ employeeStatus, forecast, cycleData }) => {
    const { currentTierName, currentTier, activeStickyDA } = employeeStatus;
    const { nextStepIfFail, daysToPromotion } = forecast;
    const { dropsFromTier1 } = cycleData;

    // 1. Current Tier Logic
    // Tier 1 (Good Standing) vs Tiers 2-5
    // Map internal names/levels to "Tier X"
    // Level 5 = Tier 1 (Good)
    // Level 4 = Tier 2 (Ed)
    // Level 3 = Tier 3 (Coach)
    // Level 2 = Tier 4 (Severe)
    // Level 1 = Tier 5 (Final)

    // Safety check for level
    let tierNum = 1;
    if (typeof currentTier === 'number') {
        tierNum = 6 - currentTier; // 6 - 5 = 1, 6 - 4 = 2, etc.
    }

    const displayTier = tierNum === 1 ? "Tier 1 (Good Standing)" : `Tier ${tierNum}`;

    // 2. Highest DA / Reason
    // "you have received up to a [Highest DA] due to the drops between tiers..."
    let daPhrase = `you have received up to a ${activeStickyDA} DA`;
    if (!activeStickyDA || activeStickyDA === 'Good Standing' || activeStickyDA === 'None') {
        if (tierNum === 1) {
            daPhrase = "you have received no Disciplinary Actions";
        } else {
            // Fallback if they are in Tier 2+ but data says no sticky DA? allow it.
            daPhrase = "you have dropped in status";
        }
    }

    // 3. Next Consequence
    // Logic: Sticky DA drives the consequence, not just the Tier.
    const nextTierNum = tierNum + 1;
    const nextTierDisplay = `Tier ${nextTierNum}`;

    let nextConsequence = "further disciplinary action";
    const daStages = ['Good Standing', 'Educational', 'Coaching', 'Severe', 'Final', 'Termination'];

    const normalizeDaName = (name) => {
        if (!name) return 'Good Standing';
        const n = name.toLowerCase();
        if (n.includes('education')) return 'Educational';
        if (n.includes('coaching') || n.includes('written')) return 'Coaching';
        if (n.includes('severe')) return 'Severe';
        if (n.includes('final')) return 'Final';
        if (n.includes('term')) return 'Termination';
        return 'Good Standing';
    };

    const currentDaNormal = normalizeDaName(activeStickyDA);
    let currentDaIndex = daStages.indexOf(currentDaNormal);

    // Fallback: If no sticky DA, use current Tier to guess "standard" path
    if (currentDaIndex === -1 || !activeStickyDA || activeStickyDA === 'None' || activeStickyDA === 'Good Standing') {
        // Tier 2 (Ed) -> next is Coaching (idx 2)
        // Tier 3 (Coach) -> next is Severe (idx 3)
        // Map Tier Num to Current DA Index:
        // Tier 1=0, Tier 2=1 (Ed), Tier 3=2 (Coach)...
        // currentTier is level? activeStickyDA is cleaner.
        // If tierNum=2 (Tier 2/Ed), index=1.
        currentDaIndex = tierNum - 1;
    }

    const nextDaIndex = currentDaIndex + 1;
    if (nextDaIndex < daStages.length) {
        const nextStage = daStages[nextDaIndex];
        if (nextStage === 'Termination') {
            nextConsequence = "Termination";
        } else {
            nextConsequence = `a ${nextStage} DA`;
        }
    } else {
        nextConsequence = "Termination";
    }

    // 4. Promotion / Days Left
    // "You have [Days] days left till you enter [Next Up Tier]. Please maintain..."
    const nextUpTier = tierNum === 2 ? "Tier 1" : "the next tier";
    let promotionPhrase = `You have ${daysToPromotion} days left till you enter ${nextUpTier}.`;
    if (tierNum === 1) {
        promotionPhrase = "Keep up the good work to maintain your status.";
    }

    // 5. Freeze Warning
    let freezeWarning = "";
    if (dropsFromTier1 === 2) {
        freezeWarning = " WARNING: You are at 2/3 drops. One more drop will FREEZE your promotion eligibility for 90 days.";
    } else if (dropsFromTier1 >= 3) {
        freezeWarning = " ALERT: Your promotion eligibility is currently FROZEN due to excessive drops.";
    }

    // Construct the sentence
    const closingSentence = `Please maintain good attendance to get back to tier 1 and get those DA's dropped and get your full meal benefit back.${freezeWarning}`;

    // FIX: Handle Final Tier (Tier 5) or Final DA Status
    const isFinalTier = tierNum >= 5; // Level 1 (Tier 5) or lower
    const isFinalDA = activeStickyDA && (activeStickyDA.includes('Final') || activeStickyDA.includes('Termination'));

    if (tierNum === 1 && !isFinalDA) {
        // Good Standing Template
        return `You are currently in Tier 1 (Good Standing). You have no active Disciplinary Actions. If you drop to Tier 2, you will receive an Educational Stage DA. Please maintain your attendance to keep your full meal benefits.${freezeWarning}`;
    }

    if (isFinalTier || isFinalDA) {
        // Specific grammar for Final cases:
        return `You are currently in ${displayTier}, ${daPhrase} due to the drops between tiers due to lack of good attendance. If you drop tiers again from your current tier which is ${displayTier}, you will be terminated. ${promotionPhrase} ${closingSentence}`;
    }

    // Standard Template
    return `You are currently in ${displayTier}, ${daPhrase} due to the drops between tiers due to lack of good attendance. If you drop tiers again from your current tier which is ${displayTier} to ${nextTierDisplay} you will receive ${nextConsequence}. ${promotionPhrase} ${closingSentence}`;
};
