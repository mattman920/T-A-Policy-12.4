
import { generateEmployeeHealthData } from './src/services/healthCheckDataService.js';
import { TIERS, VIOLATION_TYPES } from './src/utils/pointCalculator.js';

// Mock Data
const employee = {
    id: 'user1',
    name: 'Test User'
};

const now = new Date('2025-10-20T12:00:00Z');

// Scenario:
// 1. Initial Good Standing (Implicit)
// 2. Drop to Educational
// 3. Drop to Coaching
// 4. Drop to Severe
// 5. Climb back to Coaching
// 6. Climb back to Educational

const violations = [
    // Drop to Edu (Needs < 126 pts)
    { employeeId: 'user1', date: '2025-09-01', type: VIOLATION_TYPES.NO_SHOW, pointsDeducted: 50 }, // 150 - 50 = 100 (Educational) -> Starts active cycle

    // Drop to Coaching (Needs < 101 pts)
    // Actually NO_SHOW 50 pts puts them at 100.
    // Reset target for Ed is 125. Wait, demotion resets points!
    // 150 - 50 = 100. Demotion to Ed. Points reset to 125.

    // Drop to Coaching (< 101 from 125)
    // Need 25 pts loss.
    { employeeId: 'user1', date: '2025-09-10', type: VIOLATION_TYPES.CALLOUT }, // 125 - 24 = 101 (Ed)
    { employeeId: 'user1', date: '2025-09-11', type: VIOLATION_TYPES.TARDY_1_5 }, // 101 - 3 = 98 (Coaching). Demotion. Reset to 100.

    // Drop to Severe (< 76 from 100)
    // Need 25 pts loss.
    { employeeId: 'user1', date: '2025-09-20', type: VIOLATION_TYPES.CALLOUT }, // 100 - 24 = 76 (Coaching)
    { employeeId: 'user1', date: '2025-09-21', type: VIOLATION_TYPES.TARDY_1_5 }, // 76 - 3 = 73 (Severe). Demotion to Severe. Reset to 75.

    // Climb back (Needs 30 days of stability? Or manual points adjustment?)
    // Simulation logic "Promotion" happens after 30 days stable.
    // To simulate fast promotion for testing, we can inject "Bonus" or just manually force time passing.
    // However, `generateEmployeeHealthData` recalculates state from violations.
    // So we just need enough TIME to pass without violations.

    // Date: 2025-09-21 we are Severe.
    // 30 days later: Oct 21. Promotion to Coaching.
    // 30 days later: Nov 21. Promotion to Educational.

    // The user says "You are currently in Educational Stage".
    // And "issued da all the way down to severe".
    // "10 days remaining until you enter the next tier".

    // So let's simulate:
    // Sep 21: Severe.
    // Oct 21: Promote to Coaching. (Wait, if `now` is Oct 20, we haven't promoted yet?)
    // Wait, the user says "You are currently in Educational Stage".
    // So they must have promoted TWICE? Or they were Severe a long time ago?

    // Let's create specific dates.
    // Jan 1: Demo to Ed.
    // Feb 1: Demo to Coach.
    // Mar 1: Demo to Severe.
    // Apr 1: Promote to Coach.
    // May 1: Promote to Ed.
    // Jun 1: (Current Status Ed).

    // But we need to ensure the "Cycle" hasn't reset to Good Standing.
    // If they promoted to Ed, but not Good, the cycle is still active.
];

// Let's try to construct a timeline that results in Ed status, Severe history in cycle.
const violations2 = [
    // Start fresh
    { employeeId: 'user1', date: '2025-01-01', type: VIOLATION_TYPES.NO_SHOW }, // 100 pts -> Ed. Reset 125.

    { employeeId: 'user1', date: '2025-01-10', type: VIOLATION_TYPES.NO_SHOW }, // 125 - 50 = 75 -> Severe (Directly? 76 is Coach min. 75 is Severe reset? No Severe min is 51.)
    // 125 - 50 = 75.
    // Coach min 76. Severe min 51.
    // 75 is < 76. So Demotion to Severe?
    // Intermediate demotions? Logic usually handles one step at a time or jumps?
    // Logic: `getTierFn(75)` returns Severe (if 75 >= 51).
    // So it jumps Ed -> Severe.
    // Does it log "Coaching" in between? 
    // Logic `daStageIndex` ratchets up.
    // If Ed(4) to Severe(2).
    // TargetIndex = 5 - 2 = 3 (Severe).
    // `daStageIndex` becomes 3. 

    // So we hit Severe.

    // Now we need to climb back to Ed.
    // Severe -> Coach -> Ed.
    // Requires 2 x 30 day cycles.

    // Current date: Let's pick a date 70 days later.
    // 2025-01-10 + 70 days approx = March 20.
];

// Refined Mock Violations
const violations3 = [
    { employeeId: 'user1', date: '2025-06-01', type: 'No Call No Show' }, // -50. 150->100. Ed. Reset 125.
    { employeeId: 'user1', date: '2025-06-02', type: 'No Call No Show' }, // 125->75. Severe. Reset 75.

    // Validate we are Severe on June 2.
    // Now silence until Sept.
];

const referenceDate = new Date('2025-09-01'); // 3 months later.
// June 2 -> July 2 (Promote Coach).
// July 2 -> Aug 2 (Promote Ed).
// Aug 2 -> Sept 1 (Still Ed, working on Good).

console.log("Running reproduction...");

const result = generateEmployeeHealthData(employee, violations3, {}, referenceDate);

console.log("Current Tier:", result.employeeStatus.currentTierName);
console.log("Active Sticky DA:", result.employeeStatus.activeStickyDA);
console.log("Cycle Events Count:", result.cycleData.cycleHistory.length);
console.log("Cycle DA's:", JSON.stringify(result.cycleData.currentCycleDAs, null, 2));
console.log("Draft Summary:", result.aiContext.draftSummary);

