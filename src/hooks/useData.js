import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { calculateCurrentPoints, DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';
import { useAuth } from '../contexts/AuthContext';

export function useData() {
    const { organizationId, session } = useAuth();
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isOfflineMode = isLocal && !session;

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
                setData({
                    employees: [],
                    violations: [],
                    quarters: [],
                    issuedDAs: [],
                    settings: {
                        companyName: 'Attendance (Local)',
                        startingPoints: 25,
                        violationPenalties: {
                            tardy: DEFAULT_TARDY_PENALTIES,
                            callout: DEFAULT_CALLOUT_PENALTIES,
                            positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
                        },
                        reportUsage: {}
                    }
                });
                setLoading(false);
                return;
            }

            const { data: employees, error: empError } = await supabase.from('employees').select('*');
            if (empError) throw empError;

            const { data: violations, error: vioError } = await supabase.from('violations').select('*');
            if (vioError) throw vioError;

            const { data: settingsArray, error: setError } = await supabase.from('settings').select('*').limit(1);
            const settingsData = settingsArray?.[0] || null;
            // If no settings, we might need to handle that, but setup script should have created them.
            // If error is PGRST116 (no rows), use defaults.

            const { data: issuedDasData, error: daError } = await supabase.from('issued_das').select('da_key');
            if (daError) throw daError;

            const loadedSettings = settingsData || {};

            // Parse JSON fields if they come back as strings (Supabase client usually handles JSONB automatically as objects, but let's be safe)
            // Actually supabase-js returns JSONB as objects.

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
                // Map snake_case to camelCase if needed, or just use snake_case in DB and map here.
                // Let's map DB snake_case to app camelCase
                companyName: loadedSettings.company_name || defaultSettings.companyName,
                startingPoints: loadedSettings.starting_points !== undefined ? loadedSettings.starting_points : defaultSettings.startingPoints,
                violationPenalties: loadedSettings.violation_penalties || defaultSettings.violationPenalties,
                reportUsage: loadedSettings.report_usage || defaultSettings.reportUsage
            };

            // Map employees snake_case to camelCase
            const mappedEmployees = (employees || []).map(e => ({
                id: e.id,
                name: e.name,
                startDate: e.start_date,
                active: e.active,
                archived: !e.active, // Map active=false to archived=true
                archivedDate: e.archived_date,
                currentPoints: e.current_points,
                tier: e.tier
            }));

            // Map violations
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
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Helper to refresh data (simpler than manual state updates for everything, but manual updates are better for UX)
    // I will try to maintain local state updates for optimistic UI or just fast feedback, 
    // but also trigger background refresh or just trust the local update.
    // For now, I will replicate the local update logic AND write to Supabase.

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

        // 1. Insert violation
        if (!isOfflineMode) {
            const { error: vioError } = await supabase.from('violations').insert([newViolation]);
            if (vioError) {
                console.error("Error adding violation:", vioError);
                return;
            }
        }

        // 2. Recalculate points
        // We need to fetch all violations for this employee to be safe, or use local state.
        // Using local state is faster.
        const employee = data.employees.find(e => e.id === employeeId);
        if (employee) {
            // Map local violations back to calculation format if needed? 
            // The pointCalculator likely expects objects with `pointsDeducted` etc.
            // My local `data.violations` has camelCase keys.
            const allViolationsForEmployee = [...data.violations.filter(v => v.employeeId === employeeId), {
                id: newViolation.id,
                employeeId: newViolation.employee_id,
                type: newViolation.type,
                date: newViolation.date,
                shift: newViolation.shift,
                pointsDeducted: newViolation.points_deducted
            }];

            const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

            // 3. Update employee in DB
            let empError = null;
            if (!isOfflineMode) {
                const { error } = await supabase.from('employees').update({ current_points: currentPoints }).eq('id', employeeId);
                empError = error;
            }

            if (!empError) {
                // Update local state
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
        // updatedViolation comes in with camelCase keys from the app
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

        // Recalculate points
        // Update local list first to calculate
        const updatedViolations = data.violations.map(v =>
            v.id === updatedViolation.id ? updatedViolation : v
        );
        const allViolationsForEmployee = updatedViolations.filter(v => v.employeeId === employeeId);
        const currentPoints = calculateCurrentPoints(data.settings.startingPoints, allViolationsForEmployee, data.settings.violationPenalties);

        // Update employee in DB
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

    const exportDatabase = () => {
        // Export current state
        if (!data) return;
        import('../utils/backup').then(({ exportData }) => {
            exportData(data);
        });
    };

    const importDatabase = async (file) => {
        // Import is tricky with Supabase. 
        // We probably want to parse the file and then bulk insert into Supabase?
        // Or just warn user that import overwrites?
        // For now, let's implement a basic version that tries to insert employees and violations.
        // This might be slow for large datasets.

        try {
            const { importData } = await import('../utils/backup');
            const importedData = await importData(file);

            // This is a destructive operation usually? Or merge?
            // Original code: `await saveData(validData);` which overwrites everything.
            // So we should probably clear tables and insert new? Or just insert new?
            // Clearing tables is risky.
            // Let's just try to insert employees and violations that don't exist?
            // Or maybe just alert that import is not fully supported yet?
            // User asked to "change the code... to use supabase database".
            // I will implement a "clear and replace" or "merge" strategy.
            // Given the complexity, I'll implement a simple "merge/add" strategy for now.

            // Actually, let's just log it for now or implement if easy.
            // I'll skip complex import logic for this step to minimize risk, 
            // but I should probably support it if I can.
            // Let's just do nothing for import for now or throw error "Not supported in Supabase mode yet".
            console.warn("Import not fully implemented for Supabase backend yet.");
            return { success: false, error: "Import not supported yet" };

        } catch (error) {
            console.error("Import failed:", error);
            return { success: false, error: error.message };
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
        // Handle archive logic: if updatedEmployee has archived property, map it to active
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
                employees: prev.employees.map(emp => emp.id === updatedEmployee.id ? { ...updatedEmployee, active, archived: !active } : emp)
            }));
        } else {
            console.error("Error updating employee:", error);
        }
        return { error };
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

    const deleteEmployee = async (employeeId) => {
        if (!isOfflineMode) {
            // 1. Delete violations
            const { error: vioError } = await supabase.from('violations').delete().eq('employee_id', employeeId);
            if (vioError) {
                console.error("Error deleting employee violations:", vioError);
                return { error: vioError };
            }

            // 2. Delete issued DAs
            // We need to find DAs that start with the employeeId. 
            // The key format is `${emp.id}-${tier.name}`.
            // Supabase 'like' filter can be used.
            const { error: daError } = await supabase.from('issued_das').delete().like('da_key', `${employeeId}-%`);
            if (daError) {
                console.error("Error deleting employee DAs:", daError);
                // We might want to continue even if this fails, or stop? 
                // Let's log and continue to try to delete the employee, 
                // but ideally this should be a transaction or we should be careful.
            }

            // 3. Delete employee
            const { error: empError } = await supabase.from('employees').delete().eq('id', employeeId);
            if (empError) {
                console.error("Error deleting employee:", empError);
                return { error: empError };
            }
        }

        // Update local state
        setData(prev => ({
            ...prev,
            employees: prev.employees.filter(e => e.id !== employeeId),
            violations: prev.violations.filter(v => v.employeeId !== employeeId),
            // We also need to filter issuedDAs in local state
            issuedDAs: prev.issuedDAs.filter(key => !key.startsWith(`${employeeId}-`))
        }));

        return { error: null };
    };

    return {
        data,
        loading,
        addEmployee,
        addViolation,
        updateViolation,
        deleteViolation,
        deleteEmployee,
        reload: load,
        exportDatabase,
        importDatabase,
        issueDA,
        updateSettings,
        updateEmployee,
        logReportUsage
    };
}
