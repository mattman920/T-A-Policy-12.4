import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { calculateCurrentPoints, calculateQuarterlyStart, DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';
import { getCurrentQuarterDates } from '../utils/dateUtils';
import { useAuth } from './AuthContext';
import { useDB } from '../hooks/useDB';

const DataContext = createContext();

const DEFAULT_SETTINGS = {
    companyName: 'Attendance (Local)',
    startingPoints: 25,
    violationPenalties: {
        tardy: DEFAULT_TARDY_PENALTIES,
        callout: DEFAULT_CALLOUT_PENALTIES,
        positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
    },
    reportUsage: {},
    geminiApiKey: '',
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    }
};

export function DataProvider({ children }) {
    const { organizationId } = useAuth();
    const isOfflineMode = true;
    const { db, useLiveQuery } = useDB();

    // Live queries for different data types
    // Live queries for different data types
    // const employeesQuery = useLiveQuery('type', 'employee');
    // const violationsQuery = useLiveQuery('type', 'violation');
    // const settingsQuery = useLiveQuery('type', 'settings');
    // const issuedDAsQuery = useLiveQuery('type', 'issuedDA');

    const [data, setData] = useState({
        employees: [],
        violations: [],
        quarters: [],
        issuedDAs: [],
        settings: DEFAULT_SETTINGS
    });

    const [loading, setLoading] = useState(true);

    const getQuarterKey = (date = new Date()) => {
        const year = date.getFullYear();
        const q = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${q}`;
    };

    // Process live query results
    // useEffect(() => {
    //     if (employeesQuery.docs && violationsQuery.docs && settingsQuery.docs && issuedDAsQuery.docs) {
    //         // ... logic moved to DataProviderContent
    //     }
    // }, [employeesQuery.docs, violationsQuery.docs, settingsQuery.docs, issuedDAsQuery.docs]);


    const addEmployee = async (name, startDate) => {
        const newEmployee = {
            type: 'employee',
            name,
            startDate,
            organizationId,
            active: true,
            archived: false,
            tier: 'Good Standing'
        };
        await db.put(newEmployee);
    };

    const addViolation = async (employeeId, type, date, pointsDeducted, shift = 'AM') => {
        const newViolation = {
            type: 'violation',
            employeeId,
            violationType: type, // Renamed to avoid conflict with doc type
            date,
            shift,
            pointsDeducted,
            organizationId
        };
        // Handle legacy 'type' field if needed or just use 'violationType'
        // The original code used 'type' for violation type. 
        // Fireproof uses 'type' for indexing usually, but we can use a different field for index.
        // I used 'type'='violation' for the doc type. So I'll store the violation type as 'violationType' 
        // BUT the rest of the app expects 'type'. 
        // So I will store it as 'type' but also add 'docType': 'violation'.
        // Wait, useLiveQuery(db, 'type', 'violation') implies an index on 'type'.
        // If I use 'type' for violation type (e.g. 'Tardy'), I can't use it for doc type easily.
        // I will use 'docType' for the document type.

        // RE-EVALUATING:
        // I will change the index to use 'docType'.
        // And keep 'type' for violation type.
    };

    // Correcting the approach above:
    // I need to ensure I don't break existing UI which expects 'type' for violation type.
    // So I will use 'docType' for my internal Fireproof organization.

    // Let's rewrite the queries and add functions.

    return (
        <DataProviderContent
            db={db}
            useLiveQuery={useLiveQuery}
            organizationId={organizationId}
            isOfflineMode={isOfflineMode}
            children={children}
        />
    );
}

// Split into inner component to use hooks properly
function DataProviderContent({ db, useLiveQuery, organizationId, isOfflineMode, children }) {
    // We need to define indexes if we use 'useLiveQuery(db, index, value)'
    // Or we can just load all and filter if dataset is small.
    // For simplicity and robustness given "Refactor", I will load all docs and filter in memory.
    // This avoids index creation complexity if not strictly needed yet.

    // Index by docType for efficiency and to avoid encoding errors with full docs
    const allDocs = useLiveQuery(doc => doc.docType);

    const [data, setData] = useState({
        employees: [],
        violations: [],
        quarters: [],
        issuedDAs: [],
        settings: DEFAULT_SETTINGS
    });

    const [loading, setLoading] = useState(true);

    const getQuarterKey = (date = new Date()) => {
        const year = date.getFullYear();
        const q = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${q}`;
    };

    useEffect(() => {
        if (allDocs.docs) {
            const docs = allDocs.docs;

            const employees = docs.filter(d => d.docType === 'employee');
            const violations = docs.filter(d => d.docType === 'violation').map(v => ({ ...v, type: v.violationType || v.type })); // Handle migration/naming
            const settingsDoc = docs.find(d => d.docType === 'settings') || {};
            const settings = { ...DEFAULT_SETTINGS, ...settingsDoc };
            const issuedDAs = docs.filter(d => d.docType === 'issuedDA').map(d => d.daKey);

            // Calculate points
            const currentQuarterKey = getQuarterKey();
            const { startDate: qStart, endDate: qEnd } = getCurrentQuarterDates();

            const processedEmployees = employees.map(employee => {
                const employeeViolations = violations.filter(v => v.employeeId === employee._id);

                const startingPoints = calculateQuarterlyStart(currentQuarterKey, employeeViolations, settings);

                const currentQuarterViolations = employeeViolations.filter(v => {
                    const vDate = new Date(v.date);
                    return vDate >= qStart && vDate <= qEnd;
                });

                const currentPoints = calculateCurrentPoints(
                    startingPoints,
                    currentQuarterViolations,
                    settings.violationPenalties
                );

                return { ...employee, currentPoints, id: employee._id };
            });

            setData({
                employees: processedEmployees,
                violations: violations.map(v => ({ ...v, id: v._id })),
                quarters: [],
                issuedDAs,
                settings
            });
            setLoading(false);
        }
    }, [allDocs.docs]);

    const addEmployee = async (name, startDate) => {
        const newEmployee = {
            docType: 'employee',
            name,
            startDate,
            organizationId,
            active: true,
            archived: false,
            tier: 'Good Standing'
        };
        await db.put(newEmployee);
    };

    const addViolation = async (employeeId, type, date, pointsDeducted, shift = 'AM') => {
        const newViolation = {
            docType: 'violation',
            employeeId,
            type, // Keep 'type' as is for UI compatibility
            violationType: type, // Redundant but safe
            date,
            shift,
            pointsDeducted,
            organizationId
        };
        await db.put(newViolation);
    };

    const updateViolation = async (updatedViolation) => {
        // Ensure docType is preserved
        await db.put({ ...updatedViolation, docType: 'violation', _id: updatedViolation.id });
    };

    const deleteViolation = async (violationId) => {
        await db.del(violationId);
    };

    const issueDA = async (daKey) => {
        // Check if already exists
        const exists = data.issuedDAs.includes(daKey);
        if (!exists) {
            await db.put({ docType: 'issuedDA', daKey });
        }
    };

    const updateSettings = async (newSettings) => {
        const currentSettingsDoc = allDocs.docs.find(d => d.docType === 'settings') || { docType: 'settings' };
        await db.put({ ...currentSettingsDoc, ...newSettings, docType: 'settings' });
    };

    const updateEmployee = async (updatedEmployee) => {
        await db.put({ ...updatedEmployee, docType: 'employee', _id: updatedEmployee.id });
    };

    const deleteEmployee = async (employeeId) => {
        await db.del(employeeId);
        // Also delete violations? 
        // Original code: this.data.violations = this.data.violations.filter(v => v.employeeId !== id);
        // We should probably delete related docs too.
        const relatedViolations = allDocs.docs.filter(d => d.docType === 'violation' && d.employeeId === employeeId);
        for (const v of relatedViolations) {
            await db.del(v._id);
        }
        // And issued DAs
        const relatedDAs = allDocs.docs.filter(d => d.docType === 'issuedDA' && d.daKey.startsWith(`${employeeId}-`));
        for (const da of relatedDAs) {
            await db.del(da._id);
        }
    };

    const logReportUsage = async (reportId) => {
        const now = new Date().toISOString();
        const currentUsage = data.settings.reportUsage || {};
        const reportLog = currentUsage[reportId] || [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const newReportLog = [...reportLog, now].filter(dateStr => new Date(dateStr) > sevenDaysAgo);

        const newSettings = {
            reportUsage: {
                ...currentUsage,
                [reportId]: newReportLog
            }
        };
        await updateSettings(newSettings);
    };

    const exportDatabase = async () => {
        // Fireproof export logic or just JSON dump of allDocs
        const exportData = {
            employees: data.employees,
            violations: data.violations,
            issuedDAs: data.issuedDAs,
            settings: data.settings
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const importDatabase = async (file) => {
        // Parse file and bulk put
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                // Clear existing? Or merge?
                // Original code: localStorage.setItem(..., JSON.stringify(mergedData));
                // We should probably merge.

                if (imported.employees) {
                    for (const emp of imported.employees) {
                        await db.put({ ...emp, docType: 'employee' });
                    }
                }
                if (imported.violations) {
                    for (const v of imported.violations) {
                        await db.put({ ...v, docType: 'violation' });
                    }
                }
                if (imported.settings) {
                    await updateSettings(imported.settings);
                }
                // ... handle DAs
                window.location.reload();
            } catch (err) {
                console.error("Import failed", err);
            }
        };
        reader.readAsText(file);
    };

    const value = {
        data,
        loading,
        addEmployee,
        addViolation,
        updateViolation,
        deleteViolation,
        reload: () => { }, // No-op as it's live
        exportDatabase,
        importDatabase,
        issueDA,
        updateSettings,
        updateEmployee,
        deleteEmployee,
        logReportUsage,
        isOfflineMode
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
