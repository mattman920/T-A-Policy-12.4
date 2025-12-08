
import { calculateUserState, TIERS, VIOLATION_TYPES, DA_STAGES } from './src/utils/pointCalculator.mjs';

// Mock data
const violations = [
    // Initial State: 150 points (Good Standing)

    // 1. Drop to Educational (Tier 2)
    // Tardy 30+ min (-15 pts) -> 135
    // Tardy 30+ min (-20 pts) -> 115
    // Tardy 30+ min (-25 pts) -> 90 -> Drop to Educational (Target for Educational)
    // Wait, Edu min is 101. Coaching min is 76.
    // Let's force points down to trigger drops.

    { date: '2024-01-01', type: VIOLATION_TYPES.TARDY_30_PLUS }, // -15 -> 135
    { date: '2024-01-02', type: VIOLATION_TYPES.TARDY_30_PLUS }, // -20 -> 115
    { date: '2024-01-03', type: VIOLATION_TYPES.TARDY_30_PLUS }, // -25 -> 90 (Below 101, so Tier dropped to Coaching? No, tiers are checked after each calc)
    // 90 is below Educational (101) but above Coaching (76). 
    // Actually: 
    // TIERS.GOOD.min = 126. 
    // 90 < 101? No wait. 
    // 150 -15=135 (Good). -20=115 (Edu? No, Edu min 101. 115 >= 101. So Educational? No, Good min is 126. So 115 is Educational.)
    // Wait. 135 > 126 (Good).
    // 115 < 126 (So Educational). -> Drop 1. DA Stage -> Educational. Points reset to 125.

    // Let's track expected state assuming reset happens:
    // 1/2: 135 (Good)
    // 1/3: 115 -> Drop to Edu. Reset to 125. DA: Educational (Index 1).

    // 2. Drop to Coaching (Tier 3)
    // Need to drop below 101.
    // 125 start.
    { date: '2024-01-10', type: VIOLATION_TYPES.TARDY_30_PLUS }, // -15 (Reset count? Yes on demotion). -> 110. (Still Edu).
    { date: '2024-01-11', type: VIOLATION_TYPES.TARDY_30_PLUS }, // -20 -> 90. (< 101). -> Drop to Coaching. Reset to 100. DA: Coaching (Index 2).

    // 3. Climb back to Educational
    // Need to stay clean for 30 days.
    // Last violation 1/11.
    // 2/10 -> Promote to Edu. Points 125. DA: Coaching (Sticky).

    // 4. Climb back to Good Standing
    // Last promo 2/10.
    // 3/12 -> Promote to Good. Points 150. DA: Should Reset to Good (Index 0).

    // 5. Drop to Educational again
    // 4/01: Tardy. -15 -> 135.
    // 4/02: Tardy. -20 -> 115. (< 126). Drop to Edu.
    // DA Logic: Math.max(daStageIndex + 1, targetIndex).
    // TargetIndex for Edu is 1.
    // If daStageIndex was 0, max(1, 1) = 1 (Educational).
    // If daStageIndex was 2 (Coaching, stuck), max(3, 1) = 3 (Severe).

    { date: '2024-04-01', type: VIOLATION_TYPES.TARDY_30_PLUS },
    { date: '2024-04-02', type: VIOLATION_TYPES.TARDY_30_PLUS }
];

// Target date far in future to allow all catch-ups
const settings = {
    targetDate: '2024-05-01'
};

const result = calculateUserState(violations, settings);

console.log('Final Tier:', result.tier.name);
console.log('Final DA Stage:', result.daStage);
console.log('Final DA Index:', result.daStageIndex);

const lastEvent = result.eventLog[result.eventLog.length - 1];
console.log('Last Event Details:', lastEvent.details);
console.log('Last Event DA Status:', lastEvent.daStatus);

// We want Last Event DA Status to be 'Educational Stage' (Index 1).
// If it's 'Severe' (Index 3), the bug is reproduced.

if (lastEvent.daStatus === 'Educational Stage') {
    console.log('SUCCESS: DA Status reset correctly.');
} else {
    console.log('FAILURE: DA Status did not reset. Got:', lastEvent.daStatus);
}
