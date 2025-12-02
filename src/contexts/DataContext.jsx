import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { calculateCurrentPoints, DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function DataProvider({ children }) {
    const { organizationId, session } = useAuth();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isOfflineMode = isLocal && !session;

    useEffect(() => {
        // DataProvider mounted
    }, []);

    const [data, setData] = useState({
        employees: [],
        violations: [],
        quarters: [],
        issuedDAs: [],
        settings: {
            companyName: 'Attendance',
            startingPoints: 25,
            violationPenalties: {
                tardy: DEFAULT_TARDY_PENALTIES,
                callout: DEFAULT_CALLOUT_PENALTIES,
                positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
            },
            reportUsage: {}
        }
    });
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (isOfflineMode) {
                let loadedData = null;

                if (window.electron) {
                    try {
                        loadedData = await window.electron.readData();
                    } catch (e) {
                        console.error("Failed to read data from Electron:", e);
                    }
                } else {
                    const localData = localStorage.getItem('attendance_tracker_local_data');
                    if (localData) {
                        try {
                            loadedData = JSON.parse(localData);
                        } catch (e) {
                            console.error("Failed to parse local data", e);
                        }
                    }
                }

                if (loadedData) {
                    // Merge with default structure to ensure new fields are present
                    const mergedData = {
                        employees: loadedData.employees || [],
                        violations: loadedData.violations || [],
                        quarters: loadedData.quarters || [],
                        issuedDAs: loadedData.issuedDAs || [],
                        settings: {
                            ...data.settings, // Start with defaults
                            ...loadedData.settings, // Override with saved
                            violationPenalties: {
                                ...data.settings.violationPenalties,
                                ...(loadedData.settings?.violationPenalties || {})
                            }
                        }
                    };
                    setData(mergedData);
                } else if (data.employees.length === 0 && data.settings.companyName === 'Attendance') {
                    // Only set default name if no data found
                    setData(prev => ({
                        ...prev,
                        settings: {
                            ...prev.settings,
                            companyName: 'Attendance (Local)',
                        }
                    }));
                }
                setLoading(false);
                return;
            }

            const { data: employees, error: empError } = await supabase.from('employees').select('*');
            if (empError) throw empError;

            const { data: violations, error: vioError } = await supabase.from('violations').select('*');
            if (vioError) throw vioError;

            const { data: settingsData, error: setError } = await supabase.from('settings').select('*').single();
            const { data: issuedDasData, error: daError } = await supabase.from('issued_das').select('da_key');
            if (daError) throw daError;

            const loadedSettings = settingsData || {};

            const defaultSettings = {
                companyName: 'Attendance',
                startingPoints: 25,
                violationPenalties: {
                    tardy: DEFAULT_TARDY_PENALTIES,
                    callout: DEFAULT_CALLOUT_PENALTIES,
                    positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
                },
                reportUsage: {}
            };

            const mergedSettings = {
                ...defaultSettings,
                ...loadedSettings,
                companyName: loadedSettings.company_name || defaultSettings.companyName,
                startingPoints: loadedSettings.starting_points !== undefined ? loadedSettings.starting_points : defaultSettings.startingPoints,
                violationPenalties: loadedSettings.violation_penalties || defaultSettings.violationPenalties,
                reportUsage: loadedSettings.report_usage || defaultSettings.reportUsage
            };

            const mappedEmployees = (employees || []).map(e => ({
                id: e.id,
                name: e.name,
                startDate: e.start_date,
                active: e.active,
                archived: !e.active,
                archivedDate: e.archived_date,
                currentPoints: e.current_points,
                tier: e.tier
            }));

            const mappedViolations = (violations || []).map(v => ({
                id: v.id,
                employeeId: v.employee_id,
                type: v.type,
                date: v.date,
                shift: v.shift,
                pointsDeducted: v.points_deducted
            }));

            const issuedDAs = (issuedDasData || []).map(d => d.da_key);

            setData({
                employees: mappedEmployees,
                violations: mappedViolations,
                quarters: [],
                issuedDAs,
                settings: mergedSettings
            });

        } catch (error) {
            console.error("Error loading data from Supabase:", error);
        } finally {
            setLoading(false);
        }
    }, [isOfflineMode]); // Removed 'data' dependency to avoid infinite loop if we checked data inside

    useEffect(() => {
        load();
    }, [load]);

    // Save to persistence (Electron file or localStorage) whenever data changes in offline mode
    useEffect(() => {
        if (isOfflineMode && !loading) {
            if (window.electron) {
                window.electron.writeData(data).catch(err => console.error("Failed to write data to Electron:", err));
            } else {
                localStorage.setItem('attendance_tracker_local_data', JSON.stringify(data));
            }
        }
    }, [data, isOfflineMode, loading]);

    const addEmployee = async (name, startDate) => {
        let userId = 'local-user';
        if (!isOfflineMode) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("No user logged in");
                return;
            }
            userId = user.id;
        }

        const newEmployee = {
            id: uuidv4(),
            user_id: userId,
            organization_id: organizationId || 'local-org',
            name,
            start_date: startDate,
            active: true,
            current_points: data.settings.startingPoints,
            tier: 'Good Standing'
        };

        let error = null;
        if (!isOfflineMode) {
            const { error: dbError } = await supabase.from('employees').insert([newEmployee]);
            error = dbError;
        }

        if (!error) {
            const appEmployee = {
                id: newEmployee.id,
                name: newEmployee.name,
                startDate: newEmployee.start_date,
                active: newEmployee.active,
                archived: !newEmployee.active,
                currentPoints: newEmployee.current_points,
                tier: newEmployee.tier
            };
            setData(prev => ({ ...prev, employees: [...prev.employees, appEmployee] }));
        } else {
            console.error("Error adding employee:", error);
        }
    };

    const addViolation = async (employeeId, type, date, pointsDeducted, shift = 'AM') => {
        let userId = 'local-user';
        if (!isOfflineMode) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;
        }

        const newViolation = {
            id: uuidv4(),
            user_id: userId,
            organization_id: organizationId || 'local-org',
            employee_id: employeeId,
            type,
            date,
            shift,
            points_deducted: pointsDeducted
        };

        if (!isOfflineMode) {
            const { error: vioError } = await supabase.from('violations').insert([newViolation]);
            if (vioError) {
                console.error("Error adding violation:", vioError);
                return;
            }
        }

        const employee = data.employees.find(e => e.id === employeeId);
        if (employee) {
            const allViolationsForEmployee = [...data.violations.filter(v => v.employeeId === employeeId), {
                id: newViolation.id,
                employeeId: newViolation.employee_id,
                type: newViolation.type,
                date: newViolation.date,
                shift: newViolation.shift,
                pointsDeducted: newViolation.points_deducted
            }];

            const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

            let empError = null;
            if (!isOfflineMode) {
                const { error } = await supabase.from('employees').update({ current_points: currentPoints }).eq('id', employeeId);
                empError = error;
            }

            if (!empError) {
                const updatedEmployees = data.employees.map(e =>
                    e.id === employeeId ? { ...e, currentPoints } : e
                );
                setData(prev => ({
                    ...prev,
                    employees: updatedEmployees,
                    violations: [...prev.violations, {
                        id: newViolation.id,
                        employeeId: newViolation.employee_id,
                        type: newViolation.type,
                        date: newViolation.date,
                        shift: newViolation.shift,
                        pointsDeducted: newViolation.points_deducted
                    }]
                }));
            } else {
                console.error("Error updating employee points:", empError);
            }
        }
    };

    const updateViolation = async (updatedViolation) => {
        const dbViolation = {
            id: updatedViolation.id,
            employee_id: updatedViolation.employeeId,
            type: updatedViolation.type,
            date: updatedViolation.date,
            shift: updatedViolation.shift,
            points_deducted: updatedViolation.pointsDeducted
        };

        if (!isOfflineMode) {
            const { error: vioError } = await supabase.from('violations').update(dbViolation).eq('id', updatedViolation.id);
            if (vioError) {
                console.error("Error updating violation:", vioError);
                return;
            }
        }

        const employeeId = updatedViolation.employeeId;
        const updatedViolations = data.violations.map(v =>
            v.id === updatedViolation.id ? updatedViolation : v
        );
        const allViolationsForEmployee = updatedViolations.filter(v => v.employeeId === employeeId);
        const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

        let empError = null;
        if (!isOfflineMode) {
            const { error } = await supabase.from('employees').update({ current_points: currentPoints }).eq('id', employeeId);
            empError = error;
        }

        if (!empError) {
            const updatedEmployees = data.employees.map(e =>
                e.id === employeeId ? { ...e, currentPoints } : e
            );
            setData(prev => ({
                ...prev,
                employees: updatedEmployees,
                violations: updatedViolations
            }));
        }
    };

    const deleteViolation = async (violationId) => {
        const violationToDelete = data.violations.find(v => v.id === violationId);
        if (!violationToDelete) return;

        if (!isOfflineMode) {
            const { error: vioError } = await supabase.from('violations').delete().eq('id', violationId);
            if (vioError) {
                console.error("Error deleting violation:", vioError);
                return;
            }
        }

        const employeeId = violationToDelete.employeeId;
        const updatedViolations = data.violations.filter(v => v.id !== violationId);
        const allViolationsForEmployee = updatedViolations.filter(v => v.employeeId === employeeId);
        const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

        let empError = null;
        if (!isOfflineMode) {
            const { error } = await supabase.from('employees').update({ current_points: currentPoints }).eq('id', employeeId);
            empError = error;
        }

        if (!empError) {
            const updatedEmployees = data.employees.map(e =>
                e.id === employeeId ? { ...e, currentPoints } : e
            );
            setData(prev => ({
                ...prev,
                employees: updatedEmployees,
                violations: updatedViolations
            }));
        }
    };

    const issueDA = async (daKey) => {
        if (!data.issuedDAs.includes(daKey)) {
            let error = null;
            if (!isOfflineMode) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { error: dbError } = await supabase.from('issued_das').insert([{ da_key: daKey, user_id: user.id, organization_id: organizationId }]);
                error = dbError;
            }

            if (!error) {
                setData(prev => ({ ...prev, issuedDAs: [...prev.issuedDAs, daKey] }));
            }
        }
    };

    const updateSettings = async (newSettings) => {
        const mergedSettings = { ...data.settings, ...newSettings };

        const dbSettings = {
            company_name: mergedSettings.companyName,
            starting_points: mergedSettings.startingPoints,
            violation_penalties: mergedSettings.violationPenalties,
            report_usage: mergedSettings.reportUsage
        };

        let updatedEmployees = data.employees;
        if (newSettings.startingPoints !== undefined && newSettings.startingPoints !== data.settings.startingPoints) {
            updatedEmployees = data.employees.map(employee => {
                const allViolationsForEmployee = data.violations.filter(v => v.employeeId === employee.id);
                const currentPoints = calculateCurrentPoints(
                    newSettings.startingPoints,
                    allViolationsForEmployee,
                    newSettings.violationPenalties || data.settings.violationPenalties
                );
                return { ...employee, currentPoints };
            });

            const dbEmployees = updatedEmployees.map(e => ({
                id: e.id,
                name: e.name,
                start_date: e.startDate,
                active: e.active,
                current_points: e.currentPoints,
                tier: e.tier
            }));

            if (!isOfflineMode) {
                await supabase.from('employees').upsert(dbEmployees);
            }
        }

        if (isOfflineMode) {
            setData(prev => ({ ...prev, employees: updatedEmployees, settings: mergedSettings }));
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: existingArray } = await supabase.from('settings').select('id').eq('organization_id', organizationId).limit(1);
            const existing = existingArray?.[0];

            let error;
            if (existing) {
                const { error: updateError } = await supabase.from('settings').update(dbSettings).eq('id', existing.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('settings').insert([{ ...dbSettings, user_id: user.id, organization_id: organizationId }]);
                error = insertError;
            }

            if (!error) {
                setData(prev => ({ ...prev, employees: updatedEmployees, settings: mergedSettings }));
            }
        }
    };

    const updateEmployee = async (updatedEmployee) => {
        let active = updatedEmployee.active;
        if (updatedEmployee.archived !== undefined) {
            active = !updatedEmployee.archived;
        }

        const dbEmployee = {
            id: updatedEmployee.id,
            name: updatedEmployee.name,
            start_date: updatedEmployee.startDate,
            active: active,
            archived_date: updatedEmployee.archivedDate,
            current_points: updatedEmployee.currentPoints,
            tier: updatedEmployee.tier
        };

        let error = null;
        if (!isOfflineMode) {
            const { error: dbError } = await supabase.from('employees').update(dbEmployee).eq('id', updatedEmployee.id);
            error = dbError;
        }

        if (!error) {
            setData(prev => ({
                ...prev,
                employees: prev.employees.map(emp => emp.id === updatedEmployee.id ? { ...updatedEmployee, active } : emp)
            }));
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
            ...data.settings,
            reportUsage: {
                ...currentUsage,
                [reportId]: newReportLog
            }
        };
        await updateSettings(newSettings);
    };

    const exportDatabase = () => {
        if (!data) return;
        import('../utils/backup').then(({ exportData }) => {
            exportData(data);
        });
    };

    const importDatabase = async (file) => {
        console.warn("Import not fully implemented for Supabase backend yet.");
        return { success: false, error: "Import not supported yet" };
    };

    const value = {
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
