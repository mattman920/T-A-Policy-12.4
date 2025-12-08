
const generateDraftSummary = ({ tierName, tierLevel, highestDA, nextTierDown, daysToPromote }) => {
    // 1. Current Tier
    const tierNumber = 6 - tierLevel;
    const displayTier = tierLevel === 5 ? "Tier 1 (Good Standing)" : `Tier ${tierNumber}`;

    // 2. Highest DA / reason
    let daPhrase = `you have received up to a ${highestDA} DA`;
    if (!highestDA || highestDA === 'None' || highestDA === 'Good Standing') {
        daPhrase = "you have received no Disciplinary Actions";
    }

    // 3. Next Consequence
    let nextConsequence = "further disciplinary action";
    const daStages = ['Good Standing', 'Educational', 'Coaching', 'Severe', 'Final', 'Termination'];

    // Normalize highestDA input
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

    const currentDaNormal = normalizeDaName(highestDA);
    let currentDaIndex = daStages.indexOf(currentDaNormal);

    // Fallback
    if (currentDaIndex === -1 || highestDA === 'None') {
        const tierMap = {
            1: 'Good Standing',
            2: 'Educational',
            3: 'Coaching',
            4: 'Severe',
            5: 'Final'
        };
        const impliedDA = tierMap[tierNumber] || 'Good Standing';
        currentDaIndex = daStages.indexOf(impliedDA);
    }

    // Calculate Next Step
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

    return {
        highestDA,
        currentDaNormal,
        currentDaIndex,
        nextConsequence
    };
};

// TEST CASES
console.log("Test 1 (Coaching):", generateDraftSummary({ tierName: 'Tier 2', tierLevel: 4, highestDA: 'Coaching' }));
console.log("Test 2 (Written):", generateDraftSummary({ tierName: 'Tier 2', tierLevel: 4, highestDA: 'Written Warning' }));
console.log("Test 3 (Educational):", generateDraftSummary({ tierName: 'Tier 2', tierLevel: 4, highestDA: 'Educational Stage' }));
console.log("Test 4 (None):", generateDraftSummary({ tierName: 'Tier 2', tierLevel: 4, highestDA: 'None' }));
