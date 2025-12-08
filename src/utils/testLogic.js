import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    calculateEmployeeState,
    TIERS,
    VIOLATION_TYPES
} from './pointCalculator';

export const runTestsAndDownloadReport = () => {
    const results = [];
    let passedCount = 0;
    let failedCount = 0;

    const addResult = (category, testName, expected, actual, passed, details = '') => {
        if (passed) passedCount++;
        else failedCount++;
        results.push({ category, testName, expected, actual, passed, details });
    };

    const mockSettings = {
        stabilizationDays: 90,
        calloutSurgeLookbackDays: 14,
        surgeDeductionPoints: 30,
        standardCalloutDeduction: 15,
        violationPenalties: {
            callout: [15, 20, 25, 30, 35, 40], // Custom progressive if needed, but Rolling uses fixed or surge
            tardy: {
                [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5],
                [VIOLATION_TYPES.TARDY_6_11]: [5, 10, 15, 15]
            },
            positiveAdjustments: {
                [VIOLATION_TYPES.EARLY_ARRIVAL]: 1,
                [VIOLATION_TYPES.SHIFT_PICKUP]: 5
            }
        }
    };

    const mockEmp = { id: 'test1', name: 'Test User' };

    // --- Rolling Stabilization Tests ---

    // Test 1: Basic Violation Impact
    const t1Violations = [{ type: VIOLATION_TYPES.CALLOUT, date: new Date().toISOString() }];
    const t1State = calculateEmployeeState(mockEmp, t1Violations, mockSettings);
    // 150 - 15 = 135
    addResult('Rolling Logic', 'Single Callout', 135, t1State.score, t1State.score === 135, 'Standard deduction');

    // Test 2: Callout Surge (2 in 14 days)
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const t2Violations = [
        { type: VIOLATION_TYPES.CALLOUT, date: today.toISOString() },
        { type: VIOLATION_TYPES.CALLOUT, date: yesterday.toISOString() }
    ];
    const t2State = calculateEmployeeState(mockEmp, t2Violations, mockSettings);
    // 1st: 150 - 15 = 135.
    // 2nd: Surge Triggered? Yes. 135 - 30 = 105.
    addResult('Rolling Logic', 'Callout Surge', 105, t2State.score, t2State.score === 105, '15 (Std) + 30 (Surge)');

    // Test 3: Tier Drop Reset
    // Drop to Coaching (<125). 
    // 3 Callouts in short span: 15 (135), 30 (105), 30 (75) -> Severe?
    // Let's try 2 calls: 135, 105 (Coaching).
    // Drop to Coaching should reset score to Cap of Coaching (124).
    // Wait, recent logic said "Reset to Ceiling of new Tier".
    // Coaching Ceiling is 124.
    // So 1st Callout: 135 (Good).
    // 2nd Callout: 105 (Would be Coaching).
    // Logic: If Drop -> Score becomes Tier Max (124).
    addResult('Tier Logic', 'Drop to Coaching', 124, t2State.score === 124 ? 124 : t2State.score, t2State.score === 124, 'Should reset to Tier Max (124)');

    // Test 4: Stabilization (Violation expires)
    // 1 Callout 91 days ago.
    const oldDate = new Date(); oldDate.setDate(today.getDate() - 91);
    const t4Violations = [{ type: VIOLATION_TYPES.CALLOUT, date: oldDate.toISOString() }];
    const t4State = calculateEmployeeState(mockEmp, t4Violations, mockSettings);
    addResult('Rolling Logic', 'Expired Violation', 150, t4State.score, t4State.score === 150, 'Violation > 90 days should produce Good Standing 150');

    // Test 5: Positive Adjustments
    const t5Violations = [{ type: VIOLATION_TYPES.SHIFT_PICKUP, date: today.toISOString() }];
    // 150 + 5 = 150 (Cap).
    const t5State = calculateEmployeeState(mockEmp, t5Violations, mockSettings);
    addResult('Points', 'Cap at 150', 150, t5State.score, t5State.score === 150, 'Score cannot exceed 150');

    // Test 6: Positive Adjustment recovery
    // 1 Callout (135), 1 Pickup (+5) -> 140.
    const t6Violations = [
        { type: VIOLATION_TYPES.CALLOUT, date: today.toISOString() },
        { type: VIOLATION_TYPES.SHIFT_PICKUP, date: today.toISOString() }
    ];
    const t6State = calculateEmployeeState(mockEmp, t6Violations, mockSettings);
    // 150 - 15 = 135; 135 + 5 = 140.
    addResult('Points', 'Recovery', 140, t6State.score, t6State.score === 140, '150 - 15 + 5 = 140');


    // Test 7: Tier 1 Reset Logic
    // Employee in Tier 1 for > 30 days should reset.
    // Start: 40 days ago.
    const start40 = new Date(); start40.setDate(today.getDate() - 40);
    // Violation today (Day 10 of new cycle).
    // If reset happened at Day 30, points should be 150 before this violation.
    // Penalty: 15. End Score: 135.
    // If NO reset happened, points would be 150 - 15 = 135 anyway? 
    // Wait, if no reset, it's just 150 - 15 = 135.
    // We need to check the EVENT LOG for the "reset" event.
    const t7Violations = [{ type: VIOLATION_TYPES.CALLOUT, date: today.toISOString() }];
    // We need to simulate that they STARTED 40 days ago. 
    // calculateUserState assumes start date is first violation date OR today if empty? 
    // Actually `calculateUserState` sets `tierStartDate` from first violation.
    // So to test reset, we need an INITIAL violation or state set 40 days ago.
    // Let's add an "initial" violation 40 days ago (e.g. Info or just a small one).
    // Or we just rely on the fact that if they have a history starting 40 days ago...
    // Let's perform a dummy violation 40 days ago so start date is set.
    // BUT that violation calculates points.
    // Let's say 40 days ago: Callout (-15) -> 135.
    // 30 days later (Day 30): Reset to 150. (Since 135 is Tier 1 Good Standing).
    // Today (Day 40, i.e. Day 10 of new cycle): Callout (-15) -> 135.
    // Net Result: 135.
    // If NO Reset:
    // Day 0: 135.
    // Day 40: Another Callout (-15) -> 120.
    // So: With Reset -> 135. Without Reset -> 120.

    const t7ViolationsData = [
        { type: VIOLATION_TYPES.CALLOUT, date: start40.toISOString() },
        { type: VIOLATION_TYPES.CALLOUT, date: today.toISOString() }
    ];
    const t7State = calculateEmployeeState(mockEmp, t7ViolationsData, mockSettings);
    // Check for 135.
    addResult('Tier Logic', 'Tier 1 Reset', 135, t7State.score, t7State.score === 135, 'Day 0 Callout (135) -> Day 30 Reset (150) -> Day 40 Callout (135). If fail (120), reset missing.');


    // --- Generate PDF ---
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Application Logic Test Report (Rolling)', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 35, pageWidth - 28, 25, 'F');

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Tests: ${results.length}`, 20, 45);
    doc.setTextColor(0, 128, 0);
    doc.text(`Passed: ${passedCount}`, 20, 53);
    doc.setTextColor(255, 0, 0);
    doc.text(`Failed: ${failedCount}`, 80, 53);

    // Results Table
    autoTable(doc, {
        startY: 70,
        head: [['Category', 'Test Name', 'Expected', 'Actual', 'Status', 'Details']],
        body: results.map(r => [
            r.category,
            r.testName,
            JSON.stringify(r.expected),
            JSON.stringify(r.actual),
            r.passed ? 'PASS' : 'FAIL',
            r.details
        ]),
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
        columnStyles: {
            4: { fontStyle: 'bold', textColor: (row) => row.raw === 'PASS' ? [0, 128, 0] : [255, 0, 0] }
        },
        didParseCell: function (data) {
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw === 'PASS') {
                    data.cell.styles.textColor = [0, 128, 0];
                } else {
                    data.cell.styles.textColor = [200, 0, 0];
                }
            }
        }
    });

    // Logic Documentation (Brief)
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Rolling Logic Overview', 14, finalY);
    doc.setFontSize(10);
    doc.setTextColor(80);
    const logicText = [
        '1. Score is calculated by replaying history over a 90-day rolling window.',
        '2. Callout Surge: 2+ callouts in 14 days trigger higher deduction.',
        '3. Tier Drop: Dropping a tier resets score to that tier\'s ceiling.',
        '4. Tier Climb: Holding a tier for 90 days boosts to higher tier.',
        '5. Points capped at 150.',
        '6. Positive adjustments can help recover score.'
    ];
    doc.text(logicText, 14, finalY + 10);

    doc.save('logic_test_report.pdf');
};
