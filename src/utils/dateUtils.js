export const getCurrentQuarterDates = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQ = Math.floor(currentMonth / 3) + 1;

    const startMonth = (currentQ - 1) * 3;
    const endMonth = currentQ * 3; // Month is 0-indexed, so this is the first month of NEXT quarter

    const startDate = new Date(currentYear, startMonth, 1);
    // Day 0 of next month is the last day of the target month
    const endDate = new Date(currentYear, endMonth, 0, 23, 59, 59);

    return { startDate, endDate };
};

export const getQuarterKey = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${year}-Q${q}`;
};

export const getQuarterDates = (quarterKey) => {
    if (!quarterKey) return getCurrentQuarterDates();

    const [yearStr, qStr] = quarterKey.split('-');
    const year = parseInt(yearStr);
    const q = parseInt(qStr.replace('Q', ''));

    const startMonth = (q - 1) * 3;
    const endMonth = q * 3;

    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth, 0, 23, 59, 59);

    return { startDate, endDate };
};
