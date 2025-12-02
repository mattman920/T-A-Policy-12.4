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
