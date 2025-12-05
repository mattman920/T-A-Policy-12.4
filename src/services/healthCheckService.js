import { calculateCurrentPoints, VIOLATION_TYPES } from '../utils/pointCalculator';

export const HEALTH_STAGES = {
    GREEN: { min: 126, name: 'Good Standing', color: '#10B981', label: 'Green' }, // 126 - 150
    EDUCATIONAL: { min: 101, name: 'Educational Stage', color: '#10B981', label: 'Green' }, // 101 - 125
    YELLOW: { min: 76, name: 'Coaching DA', color: '#F59E0B', label: 'Yellow' }, // 76 - 100
    ORANGE: { min: 51, name: 'Severe DA', color: '#F97316', label: 'Orange' }, // 51 - 75
    RED: { min: 0, name: 'Final DA', color: '#EF4444', label: 'Red' }, // 0 - 50
    PURPLE: { min: -Infinity, name: 'Termination Review', color: '#8B5CF6', label: 'Purple' } // < 0
};

export const getHealthStage = (score, customSettings = null) => {
    if (customSettings) {
        if (score > customSettings.educational) return HEALTH_STAGES.GREEN;
        if (score > customSettings.coaching) return { ...HEALTH_STAGES.EDUCATIONAL, min: customSettings.educational };
        if (score > customSettings.severe) return { ...HEALTH_STAGES.YELLOW, min: customSettings.coaching };
        if (score > customSettings.final) return { ...HEALTH_STAGES.ORANGE, min: customSettings.severe };
        if (score >= 0) return { ...HEALTH_STAGES.RED, min: customSettings.final };
        return HEALTH_STAGES.PURPLE;
    }

    if (score >= 126) return HEALTH_STAGES.GREEN;
    if (score >= 101) return HEALTH_STAGES.EDUCATIONAL;
    if (score >= 76) return HEALTH_STAGES.YELLOW;
    if (score >= 51) return HEALTH_STAGES.ORANGE;
    if (score >= 0) return HEALTH_STAGES.RED;
    return HEALTH_STAGES.PURPLE;
};

export const prepareAiPayload = (employee, score, violations, customSettings = null) => {
    const stage = getHealthStage(score, customSettings);

    // Calculate Reward Tier for Good Standing
    let rewardTier = null;
    if (score >= 126) {
        if (score >= 145) rewardTier = "Gold Tier";
        else if (score >= 138) rewardTier = "Silver Tier";
        else if (score >= 130) rewardTier = "Bronze Tier";
    }

    // Summarize recent violation types (last 30 days or just all passed violations?)
    // Prompt says "Recent Violation Types". Let's take the last 5 violations.
    const sortedViolations = [...violations].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentViolations = sortedViolations.slice(0, 5);

    const violationCounts = {};
    recentViolations.forEach(v => {
        violationCounts[v.type] = (violationCounts[v.type] || 0) + 1;
    });

    const violationSummary = Object.entries(violationCounts)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');

    return {
        employeeName: employee.name,
        score: score,
        stage: stage.name, // e.g. "Good Standing"
        stageLabel: stage.label, // e.g. "Green"
        rewardTier: rewardTier, // e.g. "Gold Tier" or null
        recentViolations: violationSummary || "None"
    };
};
