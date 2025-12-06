
const VIOLATION_TYPES = {
    CALLOUT: 'Call Out',
    TARDY_1_5: 'Tardy (1-5 min)',
    TARDY_6_11: 'Tardy (6-11 min)',
    TARDY_12_29: 'Tardy (12-29 min)',
    TARDY_30_PLUS: 'Tardy (30+ min)',
    EARLY_ARRIVAL: 'Early Arrival',
    SHIFT_PICKUP: 'Shift Pickup'
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(`${dateStr}T00:00:00`);
};

const violations = [
    { _id: '1', date: '2025-07-01', type: VIOLATION_TYPES.TARDY_1_5 },
    { _id: '2', date: '2025-07-01', type: VIOLATION_TYPES.TARDY_1_5 },
    { _id: '3', date: '2025-07-09', type: VIOLATION_TYPES.TARDY_1_5 },
    { _id: '4', date: '2025-08-05', type: VIOLATION_TYPES.TARDY_1_5 }, // Should be 4th offense (5 pts)
    { _id: '5', date: '2025-09-10', type: VIOLATION_TYPES.TARDY_1_5 }  // Should be 5th offense (5 pts)
];

const tardyPenalties = {
    [VIOLATION_TYPES.TARDY_1_5]: [2, 3, 5, 5]
};

const tardyCountsByMonth = {};
let totalDeduction = 0;

violations.forEach(v => {
    const type = v.type;
    const date = parseDate(v.date);

    // NEW LOGIC (Quarterly)
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const quarterKey = `${date.getFullYear()}-Q${quarter}`;

    if (!tardyCountsByMonth[quarterKey]) tardyCountsByMonth[quarterKey] = {};
    if (!tardyCountsByMonth[quarterKey][type]) tardyCountsByMonth[quarterKey][type] = 0;

    const count = tardyCountsByMonth[quarterKey][type];
    const penaltyList = tardyPenalties[type];
    const penalty = penaltyList[Math.min(count, penaltyList.length - 1)];

    console.log(`Date: ${v.date}, Type: ${type}, Penalty: ${penalty}`);
    totalDeduction += penalty;
    tardyCountsByMonth[quarterKey][type]++;
});

console.log('Total Deduction (Quarterly Logic):', totalDeduction);

if (totalDeduction === 20) {
    console.log('SUCCESS: Quarterly logic verified.');
} else {
    console.log('FAILURE: Unexpected total deduction.');
}
