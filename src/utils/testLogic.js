import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    STARTING_POINTS,
    TIERS,
    VIOLATION_TYPES,
    DEFAULT_TARDY_PENALTIES,
    DEFAULT_CALLOUT_PENALTIES,
    DEFAULT_POSITIVE_ADJUSTMENTS,
    calculateDeductions,
    calculatePositiveAdjustments,
    calculateCurrentPoints,
    determineTier,
    calculateMonthlyBonus,
    calculateNextQuarterStart
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

    // --- Configuration Verification ---
    addResult('Configuration', 'Starting Points', 25, STARTING_POINTS, STARTING_POINTS === 25, 'Default starting points check');
    addResult('Configuration', 'Good Standing Min', 125, TIERS.GOOD.min, TIERS.GOOD.min === 125);
    addResult('Configuration', 'Coaching Min', 85, TIERS.COACHING.min, TIERS.COACHING.min === 85);
    addResult('Configuration', 'Severe Min', 50, TIERS.SEVERE.min, TIERS.SEVERE.min === 50);
    addResult('Configuration', 'Final Min', 1, TIERS.FINAL.min, TIERS.FINAL.min === 1);

    // --- Deduction Tests ---
    // Test 1: Single Callout
    const test1Violations = [{ type: VIOLATION_TYPES.CALLOUT, date: '2025-01-01' }];
    const test1Actual = calculateDeductions(test1Violations);
    addResult('Deductions', 'Single Callout (1st)', 15, test1Actual, test1Actual === 15, '1st Callout should be 15 points');

    // Test 2: Multiple Callouts (Progressive)
    const test2Violations = [
        { type: VIOLATION_TYPES.CALLOUT, date: '2025-01-01' },
        { type: VIOLATION_TYPES.CALLOUT, date: '2025-01-02' },
        { type: VIOLATION_TYPES.CALLOUT, date: '2025-01-03' }
    ];
    // 15 + 20 + 25 = 60
    const test2Actual = calculateDeductions(test2Violations);
    addResult('Deductions', '3 Callouts', 60, test2Actual, test2Actual === 60, '15+20+25 = 60');

    // Test 3: Tardy Progression (Same Month)
    const test3Violations = [
        { type: VIOLATION_TYPES.TARDY_1_5, date: '2025-01-01' },
        { type: VIOLATION_TYPES.TARDY_1_5, date: '2025-01-02' },
        { type: VIOLATION_TYPES.TARDY_1_5, date: '2025-01-03' }
    ];
    // 2 + 3 + 5 = 10
    const test3Actual = calculateDeductions(test3Violations);
    addResult('Deductions', '3 Tardies (1-5m) in Jan', 10, test3Actual, test3Actual === 10, '2+3+5 = 10');

    // Test 4: Tardy Reset (Different Months)
    const test4Violations = [
        { type: VIOLATION_TYPES.TARDY_1_5, date: '2025-01-01' }, // 2
        { type: VIOLATION_TYPES.TARDY_1_5, date: '2025-02-01' }  // 2 (reset)
    ];
    // 2 + 2 = 4
    const test4Actual = calculateDeductions(test4Violations);
    addResult('Deductions', 'Tardy Reset Monthly', 4, test4Actual, test4Actual === 4, 'Should reset count each month');

    // --- Positive Adjustment Tests ---
    const test5Violations = [
        { type: VIOLATION_TYPES.EARLY_ARRIVAL, date: '2025-01-01' },
        { type: VIOLATION_TYPES.SHIFT_PICKUP, date: '2025-01-02' }
    ];
    // 1 + 5 = 6
    const test5Actual = calculatePositiveAdjustments(test5Violations);
    addResult('Positive Adjustments', 'Early Arrival + Pickup', 6, test5Actual, test5Actual === 6, '1+5 = 6');

    // --- Current Points Calculation ---
    // Start 150, 1 Callout (15), 1 Pickup (5) -> 150 - 15 + 5 = 140
    const test6Violations = [
        { type: VIOLATION_TYPES.CALLOUT, date: '2025-01-01' },
        { type: VIOLATION_TYPES.SHIFT_PICKUP, date: '2025-01-02' }
    ];
    const test6Actual = calculateCurrentPoints(150, test6Violations);
    addResult('Current Points', 'Basic Calculation', 140, test6Actual, test6Actual === 140, '150 - 15 + 5 = 140');

    // Cap Check: Start 150, 1 Pickup (5) -> Should be 150 (max)
    const test7Violations = [{ type: VIOLATION_TYPES.SHIFT_PICKUP, date: '2025-01-01' }];
    const test7Actual = calculateCurrentPoints(150, test7Violations);
    addResult('Current Points', 'Max Cap', 150, test7Actual, test7Actual === 150, 'Should not exceed 150');

    // --- Tier Determination ---
    addResult('Tiers', 'Good Standing', 'Good Standing', determineTier(125).name, determineTier(125).name === 'Good Standing');
    addResult('Tiers', 'Coaching', 'Coaching', determineTier(124).name, determineTier(124).name === 'Coaching'); // 124 is < 125 but >= 85
    addResult('Tiers', 'Severe', 'Severe', determineTier(50).name, determineTier(50).name === 'Severe');
    addResult('Tiers', 'Final', 'Final', determineTier(1).name, determineTier(1).name === 'Final');
    addResult('Tiers', 'Termination', 'Termination Review', determineTier(0).name, determineTier(0).name === 'Termination Review');

    // --- Monthly Bonus ---
    // Perfect Attendance (No callouts, no tardies) -> 10 + 5 = 15
    const test8Violations = [];
    const test8Actual = calculateMonthlyBonus(test8Violations, 20); // 20 shifts
    addResult('Monthly Bonus', 'Perfect Attendance', 15, test8Actual, test8Actual === 15, '10 (Perfect) + 5 (No Tardy) = 15');

    // No Tardiness (Has callout, no tardies) -> 5
    const test9Violations = [{ type: VIOLATION_TYPES.CALLOUT, date: '2025-01-01' }];
    const test9Actual = calculateMonthlyBonus(test9Violations, 20);
    addResult('Monthly Bonus', 'No Tardiness Only', 5, test9Actual, test9Actual === 5, 'Has Callout, but No Tardies');

    // No Bonus (Has tardy)
    const test10Violations = [{ type: VIOLATION_TYPES.TARDY_1_5, date: '2025-01-01' }];
    const test10Actual = calculateMonthlyBonus(test10Violations, 20);
    addResult('Monthly Bonus', 'No Bonus', 0, test10Actual, test10Actual === 0, 'Has Tardy');

    // Not enough shifts (<15)
    const test11Actual = calculateMonthlyBonus([], 10);
    addResult('Monthly Bonus', 'Min Shifts Check', 0, test11Actual, test11Actual === 0, 'Less than 15 shifts');

    // --- Next Quarter Start ---
    // Lowest: 60 (Severe), Bonus: 10 -> Reset to 100 + 10 = 110
    const test12Actual = calculateNextQuarterStart(60, 10);
    addResult('Next Quarter', 'Severe Reset + Bonus', 110, test12Actual, test12Actual === 110, 'Severe base 100 + 10 bonus');

    // Lowest: 130 (Good), Bonus: 0 -> Reset to 150
    const test13Actual = calculateNextQuarterStart(130, 0);
    addResult('Next Quarter', 'Good Standing Reset', 150, test13Actual, test13Actual === 150, 'Good base 150');

    // --- Generate PDF ---
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Application Logic Test Report', pageWidth / 2, 20, { align: 'center' });

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

    // Configuration Table
    doc.autoTable({
        startY: 70,
        head: [['Configuration Key', 'Value']],
        body: [
            ['Starting Points', STARTING_POINTS],
            ['Good Standing Min', TIERS.GOOD.min],
            ['Coaching Min', TIERS.COACHING.min],
            ['Severe Min', TIERS.SEVERE.min],
            ['Final Min', TIERS.FINAL.min],
            ['Max Bonus (Monthly)', '15'],
            ['Max Bonus (Quarterly Start)', '15']
        ],
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 10 }
    });

    // Results Table
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 15,
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
    doc.text('Logic Overview', 14, finalY);
    doc.setFontSize(10);
    doc.setTextColor(80);
    const logicText = [
        '1. Deductions are progressive within a calendar month for tardies.',
        '2. Callouts are progressive across the entire quarter.',
        '3. Positive adjustments (Early Arrival +1, Shift Pickup +5) increase points.',
        '4. Points are capped at 150 (Good Standing).',
        '5. Monthly bonuses are awarded for Perfect Attendance (+10) and No Tardiness (+5).',
        '6. Quarterly resets are based on the lowest tier reached, plus up to 15 bonus points.'
    ];
    doc.text(logicText, 14, finalY + 10);

    doc.save('logic_test_report.pdf');
};
