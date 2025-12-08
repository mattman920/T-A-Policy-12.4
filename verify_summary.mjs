
import { generateEmployeeHealthData } from './src/services/healthCheckDataService.js';
import { TIERS, VIOLATION_TYPES } from './src/utils/pointCalculator.js';

// Mock Data
const employee = { id: 'emp1', name: 'John Doe' };
const settings = {};

// Helper to create date
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
};

console.log("--- TEST SCENARIO 1: Tier 2 (Ed) with NO prior drops (Sticky = Educational) ---");
// Just enough violations to be in Educational
const violations1 = [
    { employeeId: 'emp1', date: daysAgo(10), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 150 - 30 = 120 (Good is > 126? No Good is 126+)
    // Good: 126-150. Ed: 101-125
    // 120 is Educational.
];

const result1 = generateEmployeeHealthData(employee, violations1, settings);
console.log("Tier:", result1.employeeStatus.currentTierName);
console.log("Sticky:", result1.employeeStatus.activeStickyDA);
console.log("Draft Summary:\n", result1.aiContext.draftSummary);


console.log("\n--- TEST SCENARIO 2: Tier 2 (Ed) with Sticky SEVERE DA ---");
// Drop to Severe, then climb back
const violations2 = [
    // Drop to Ed
    { employeeId: 'emp1', date: daysAgo(50), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 120 (Ed)
    // Drop to Coaching (76-100)
    { employeeId: 'emp1', date: daysAgo(48), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 90 (Coach)
    // Drop to Severe (51-75)
    { employeeId: 'emp1', date: daysAgo(46), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 60 (Severe)

    // Now climb back up (simulate reset/promotion or just point accretion?)
    // Points usually reset on promotion.
    // Let's rely on the calculator's promotion logic.
    // To promote from Severe to Coaching, we need to stay clean for 30 days.
    // 46 days ago was the violation.
    // 16 days ago (30 days later) -> Promote to Coaching (Target 100).
    // 16 days stable? 
    // Wait, the detailed logic is in calculateUserState. 
    // If I just pass violations, the calculator will re-run.
    // If I want to be in Tier 2, I need to have promoted twice.
    // Severe -> Coaching -> Educational.
    // If time flows naturally:
    // T-50: Violation (-30) -> 120 (Ed)
    // T-48: Violation (-30) -> 90 (Coach)
    // T-46: Violation (-30) -> 60 (Severe)
    // T-16: (30 days since T-46) -> Auto Promote to Coaching (Reset to 100)
    // Now at 100 (Coaching). To go to Ed (125 target? No, Ed min is 101).
    // If I am at 100, I am Coaching.
    // I need passing of time. 
    // T+14 (from T-16) is today? 16 days ago was promotion.
    // I need another 14 days to promote? cycle is 30 days.
    // So current status would be Coaching?

    // Let's force points? No, calculator is strict.
    // Let's make the drops OLDER.
    // T-90: Drop to Severe.
    // T-60: Promote to Coaching.
    // T-30: Promote to Educational.
    // Today: Educational.
];

// Helper to simulate time passing for promotions requires precise dates.
// T-90 vio makes points 60.
// T-60 (30 days later) -> Pts 100 (Coach).
// T-30 (30 days later) -> Pts 125 (Ed).
// Today (30 days later) -> Pts 150 (Good)? No, I want to BE in Tier 2.
// So make drops recent enough that I haven't promoted to Good yet.
// T-70: Vio -> Severe.
// T-40: Promote to Coach.
// T-10: Promote to Ed.
// Today (T-0): 10 days into Ed cycle.

const violations2_refined = [
    { employeeId: 'emp1', date: daysAgo(75), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 120 (Ed)
    { employeeId: 'emp1', date: daysAgo(73), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 90 (Coach)
    { employeeId: 'emp1', date: daysAgo(71), type: VIOLATION_TYPES.TARDY_30_PLUS, pointsDeducted: 30 }, // 60 (Severe)
    // 30 days of silence...
    // T-41: Promote to Coach (100)
    // 30 days of silence...
    // T-11: Promote to Ed (125)
    // Today: Ed.
];

const result2 = generateEmployeeHealthData(employee, violations2_refined, settings);
console.log("Tier:", result2.employeeStatus.currentTierName);
console.log("Sticky:", result2.employeeStatus.activeStickyDA);
console.log("Draft Summary:\n", result2.aiContext.draftSummary);
