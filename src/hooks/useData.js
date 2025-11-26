import { useState, useEffect, useCallback } from 'react';
import { Storage } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { STARTING_POINTS, calculateCurrentPoints, DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES } from '../utils/pointCalculator';

export function useData() {
    const [data, setData] = useState({ employees: [], violations: [], quarters: [] });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const loadedData = await Storage.loadData();
        // Ensure we have all required arrays even if the file is partial or empty object
        const defaultData = {
            employees: [],
            violations: [],
            quarters: [],
            issuedDAs: [],
            settings: {
                companyName: 'Attendance',
                startingPoints: 25,
                violationPenalties: {
                    tardy: DEFAULT_TARDY_PENALTIES,
                    callout: DEFAULT_CALLOUT_PENALTIES
                },
                reportUsage: {}, // { reportId: { timestamp: count } } or just list of timestamps? Let's do { reportId: [timestamps] }
                ...((loadedData && loadedData.settings) || {})
            }
        };
        // Merge loaded settings with default structure to ensure nested objects exist
        const mergedSettings = {
            ...defaultData.settings,
            ...((loadedData && loadedData.settings) || {}),
            violationPenalties: {
                ...defaultData.settings.violationPenalties,
                ...((loadedData && loadedData.settings && loadedData.settings.violationPenalties) || {})
            }
        };

        setData({ ...defaultData, ...(loadedData || {}), settings: mergedSettings });
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const saveData = async (newData) => {
        setData(newData);
        await Storage.saveData(newData);
    };

    const addEmployee = async (name, startDate) => {
        const newEmployee = {
            id: uuidv4(),
            name,
            startDate,
            active: true,
            currentPoints: data.settings.startingPoints,
            tier: 'Good Standing'
        };
        const newData = { ...data, employees: [...data.employees, newEmployee] };
        await saveData(newData);
    };

    const addViolation = async (employeeId, type, date, pointsDeducted, shift = 'AM') => {
        const newViolation = {
            id: uuidv4(),
            employeeId,
            type,
            date,
            shift,
            pointsDeducted
        };

        // Recalculate employee points
        const employee = data.employees.find(e => e.id === employeeId);
        if (employee) {
            const allViolationsForEmployee = [...data.violations.filter(v => v.employeeId === employeeId), newViolation];
            const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

            const updatedEmployees = data.employees.map(e =>
                e.id === employeeId ? { ...e, currentPoints } : e
            );

            const newData = {
                ...data,
                employees: updatedEmployees,
                violations: [...data.violations, newViolation]
            };
            await saveData(newData);
        }
    };

    const updateViolation = async (updatedViolation) => {
        const oldViolation = data.violations.find(v => v.id === updatedViolation.id);
        if (!oldViolation) return;

        const employeeId = updatedViolation.employeeId;

        // 1. Update the violation in the list
        const updatedViolations = data.violations.map(v =>
            v.id === updatedViolation.id ? updatedViolation : v
        );

        // 2. Recalculate points for the affected employee
        const allViolationsForEmployee = updatedViolations.filter(v => v.employeeId === employeeId);
        const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

        // 3. Update employee record
        const updatedEmployees = data.employees.map(e =>
            e.id === employeeId ? { ...e, currentPoints } : e
        );

        const newData = {
            ...data,
            employees: updatedEmployees,
            violations: updatedViolations
        };
        await saveData(newData);
    };

    const deleteViolation = async (violationId) => {
        const violationToDelete = data.violations.find(v => v.id === violationId);
        if (!violationToDelete) return;

        const employeeId = violationToDelete.employeeId;

        // 1. Remove violation
        const updatedViolations = data.violations.filter(v => v.id !== violationId);

        // 2. Recalculate points
        const allViolationsForEmployee = updatedViolations.filter(v => v.employeeId === employeeId);
        const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

        // 3. Update employee
        const updatedEmployees = data.employees.map(e =>
            e.id === employeeId ? { ...e, currentPoints } : e
        );

        const newData = {
            ...data,
            employees: updatedEmployees,
            violations: updatedViolations
        };
        await saveData(newData);
    };

    const issueDA = async (daKey) => {
        if (!data.issuedDAs.includes(daKey)) {
            const newData = { ...data, issuedDAs: [...data.issuedDAs, daKey] };
            await saveData(newData);
        }
    };

    const exportDatabase = () => {
        if (!data) return;
        import('../utils/backup').then(({ exportData }) => {
            exportData(data);
        });
    };

    const importDatabase = async (file) => {
        try {
            const { importData } = await import('../utils/backup');
            const importedData = await importData(file);

            const validData = {
                employees: importedData.employees || [],
                violations: importedData.violations || [],
                quarters: importedData.quarters || [],
                issuedDAs: importedData.issuedDAs || [],
                ...importedData
            };

            await saveData(validData);
            return { success: true };
        } catch (error) {
            console.error("Import failed:", error);
            return { success: false, error: error.message };
        }
    };

    const updateSettings = async (newSettings) => {
        let updatedEmployees = data.employees;

        // Check if starting points changed, requiring a recalculation
        if (newSettings.startingPoints !== data.settings.startingPoints) {
            updatedEmployees = data.employees.map(employee => {
                const allViolationsForEmployee = data.violations.filter(v => v.employeeId === employee.id);
                const currentPoints = calculateCurrentPoints(
                    newSettings.startingPoints,
                    allViolationsForEmployee,
                    newSettings.violationPenalties || data.settings.violationPenalties
                );
                return { ...employee, currentPoints };
            });
        }

        const newData = { ...data, employees: updatedEmployees, settings: { ...data.settings, ...newSettings } };
        await saveData(newData);
    };

    const updateEmployee = async (updatedEmployee) => {
        const newData = {
            ...data,
            employees: data.employees.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp)
        };
        await saveData(newData);
    };

    const logReportUsage = async (reportId) => {
        const now = new Date().toISOString();
        const currentUsage = data.settings.reportUsage || {};
        const reportLog = currentUsage[reportId] || [];

        // Clean up old logs (> 30 days) to save space, though user asked for 7 days sorting
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const newReportLog = [...reportLog, now].filter(dateStr => new Date(dateStr) > sevenDaysAgo);

        const newSettings = {
            ...data.settings,
            reportUsage: {
                ...currentUsage,
                [reportId]: newReportLog
            }
        };

        const newData = { ...data, settings: newSettings };
        await saveData(newData);
    };

    return {
        data,
        loading,
        addEmployee,
        addViolation,
        updateViolation,
        deleteViolation,
        reload: load,
        exportDatabase,
        importDatabase,
        issueDA,
        updateSettings,
        updateEmployee,
        logReportUsage
    };
}
