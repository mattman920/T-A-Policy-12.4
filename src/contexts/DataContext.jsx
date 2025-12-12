import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { calculateCurrentPoints, calculateQuarterlyStart, calculateEmployeeState, DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTY, SURGE_CALLOUT_PENALTY, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';
import { getCurrentQuarterDates } from '../utils/dateUtils';
import { deepSanitize } from '../utils/dataUtils';
import { useAuth } from './AuthContext';
import { useDB } from '../hooks/useDB';
import { calculateNewProbationState } from '../services/daService';
import LoadingScreen from '../components/LoadingScreen';

const DataContext = createContext();

const DEFAULT_SETTINGS = {
    companyName: 'Attendance (Local)',
    startingPoints: 25,
    violationPenalties: {
        tardy: DEFAULT_TARDY_PENALTIES,
        calloutStandard: DEFAULT_CALLOUT_PENALTY,
        calloutSurge: SURGE_CALLOUT_PENALTY,
        positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
    },
    reportUsage: {},
    geminiApiKey: '',
    daSettings: {
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    },
    // Rolling Stabilization Defaults
    stabilizationDays: 30,
    calloutSurgeLookbackDays: 60,
    surgeDeductionPoints: 40,
    standardCalloutDeduction: 24,
    // Protected Absence Reasons Default
    protectedAbsenceReasons: [
        'Jury Duty',
        'Military Service',
        'Domestic Violence/Sexual Assault',
        'Voting',
        'ADA/Pregnancy'
    ]
};

export function DataProvider({ children }) {
    const { organizationId } = useAuth();
    const isOfflineMode = true;
    const { db, useLiveQuery, connected } = useDB();

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
            connected={connected}
            organizationId={organizationId}
            isOfflineMode={isOfflineMode}
            children={children}
        />
    );
}

// Define map function outside component for stable reference
const mapAllDocs = (doc) => {
    try {
        if (!doc) return 'unknown';
        return String(doc.docType || 'unknown');
    } catch (e) {
        console.error('Error mapping doc:', e, doc);
        return 'error';
    }
};

// Split into inner component to use hooks properly
function DataProviderContent({ db, useLiveQuery, connected, organizationId, isOfflineMode, children }) {
    // Index by docType for efficiency
    const allDocs = useLiveQuery(mapAllDocs);

    const [data, setData] = useState({
        employees: [],
        violations: [],
        quarters: [],
        issuedDAs: [],
        settings: DEFAULT_SETTINGS
    });

    const isPrintView = typeof window !== 'undefined' && window.location.hash.includes('print');

    const [loading, setLoading] = useState(!isPrintView);
    const [appMounted, setAppMounted] = useState(isPrintView); // Mount immediately if print view

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Initializing...');

    const getQuarterKey = (date = new Date()) => {
        const year = date.getFullYear();
        const q = Math.floor(date.getMonth() / 3) + 1;
        return `${year}-Q${q}`;
    };

    // Centralized State Derivation Logic
    const deriveState = useCallback((docs) => {
        const settingsDoc = docs.find(d => d.docType === 'settings') || {};
        const settings = { ...DEFAULT_SETTINGS, ...settingsDoc };

        // 1. FILTERING: Apply Reset Date Globally
        const resetDate = settings.resetEffectiveDate ? new Date(settings.resetEffectiveDate) : null;

        // Filter Violations
        let violations = docs.filter(d => d.docType === 'violation').map(v => ({ ...v, type: v.violationType || v.type }));
        if (resetDate) {
            violations = violations.filter(v => new Date(v.date) >= resetDate);
        }

        // Filter Employees (if needed? usually we keep employees but reset their stats)
        const employees = docs.filter(d => d.docType === 'employee');

        // Filter Issued DAs (Visual only?)
        // If we reset, we probably want to hide old issued DAs too
        let issuedDAs = docs.filter(d => d.docType === 'issuedDA');
        // Issued DAs don't strictly have a date in the root, but the key might? or we just clear them all if reset?
        // Actually, for now, let's assume we maintain them unless they are explicitly cleared?
        // PROPOSAL: If resetEffectiveDate is set, we ignore ALL previous DAs effectively.
        // But issuedDAs usually come from `calculateNewProbationState` or similar logic. 
        // If we want to hide them from the UI, we should filter them.
        // Ideally issuedDA docs would have a date. They currently just have `daKey`.
        // If we can't filter them by date, we might assume the "Reset" clears the view of them.
        // Let's defer filtering DAs strictly until we know their date, BUT `calculateEmployeeState` 
        // will return the *calculated* current DA stage.
        // The `issuedDAs` array in data context is mostly used for "Has this been printed/issued?".
        // Let's filter `issuedDAs` based on the collection only. 
        const issuedDAKeys = issuedDAs.map(d => d.daKey);

        // Calculate points
        const { startDate: qStart, endDate: qEnd } = getCurrentQuarterDates();

        const processedEmployees = employees.map(employee => {
            const employeeViolations = violations.filter(v => v.employeeId === employee._id);

            // Rolling Stabilization Logic
            // The calculator ALREADY filters by resetEffectiveDate if passed settings.
            // But since we already filtered `violations` above, we can pass the filtered list
            // OR pass the original list and let calculator filter. 
            // Passing filtered list is safer and more consistent.
            const state = calculateEmployeeState(employee, employeeViolations, settings);

            // Trigger Probation / DA Logic Update
            // We should ensure probation state matches the reset reality
            // calculateNewProbationState(employee, employeeViolations, settings) might need to be called here 
            // to ensure the stored employee probation state is in sync with the visual score?
            // For now, let's strictly trust the `calculateEmployeeState`.

            return {
                ...employee,
                currentPoints: state.score,
                tier: state.tier.name,
                currentTier: state.tier,
                lastTierChangeDate: state.lastTierChangeDate,
                historyLog: state.historyLog,
                id: employee._id
            };
        });

        return {
            employees: processedEmployees,
            violations: violations.map(v => ({ ...v, id: v._id })), // These are now FILTERED violations
            quarters: [],
            issuedDAs: issuedDAKeys,
            settings
        };

    }, []);

    const processDocs = useCallback((docs) => {
        lastUpdateRef.current = Date.now();
        const newState = deriveState(docs);
        setData(newState);
        // Do NOT set loading false here. It must go through checkCompletion.
    }, [deriveState]);

    // Ref to track if minimum time has passed (just cosmetic now)
    const minTimePassedRef = useRef(false);
    const completionTriggeredRef = useRef(false);
    const dataReadyRef = useRef(false);
    const lastUpdateRef = useRef(Date.now());

    // 1. Dynamic Loading Logic
    useEffect(() => {
        const startTime = Date.now();
        const failsafeDuration = 60000; // 60 seconds failsafe for empty DBs

        if (isPrintView) return; // Skip loading logic for print view


        // Progress bar interval (Visual only, targeting 60s roughly)
        const interval = setInterval(() => {
            // STOP updating if we are finishing/finished
            if (dataReadyRef.current) return;

            const elapsed = Date.now() - startTime;
            // Slower progress bar that asymptotes towards 90%
            setLoadingProgress(prev => {
                if (prev >= 95) return prev;
                return prev + 1; // Slow increment
            });

            // Failsafe: If no data after 60 seconds, assume empty DB and let in
            if (elapsed >= failsafeDuration) {
                console.warn('Loading failsafe triggered: No data found after 60s. Assuming empty DB.');
                dataReadyRef.current = true; // Force ready
                checkCompletion(); // Trigger the sequence
                clearInterval(interval);
            }
        }, 600); // Update every 600ms

        return () => clearInterval(interval);
    }, []);

    const checkCompletion = () => {
        // STRICT CHECK: Only load if we have data or if manual override (failsafe) occurred
        // AND ensuring we only trigger the completion sequence ONCE
        if (dataReadyRef.current && !completionTriggeredRef.current) {
            completionTriggeredRef.current = true;

            setLoadingMessage('Preparing Application...');
            setLoadingProgress(75); // Jump to 75%

            // PHASE 2: Mount the Application (behind the scenes)
            setAppMounted(true);

            // Animate from 75% to 100% over 8 seconds (to cover the 3s sync jump)
            // We need to cover 25% in 8000ms -> 1% every 320ms
            const finishInterval = setInterval(() => {
                setLoadingProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(finishInterval);
                        return 100;
                    }
                    return prev + 1;
                });
            }, 320);

            // PHASE 3: Wait 8 seconds for data to fill (and sync), then dismiss loading screen
            // PHASE 3: Wait for data to fill (and sync), then dismiss loading screen
            // Replaced fixed timeout with stabilization check
            const minWaitTime = 6000; // Minimum animation time
            const stabilityThreshold = 2500; // Data must be unchanged for 2.5s
            const sequenceStartTime = Date.now();

            const checkStability = () => {
                const now = Date.now();
                const totalElapsed = now - sequenceStartTime;
                const timeSinceLastUpdate = now - lastUpdateRef.current;

                // Allow finish if:
                // 1. Minimum animation time has passed
                // 2. Data hasn't changed for 2.5 seconds (Stabilized)
                if (totalElapsed >= minWaitTime && timeSinceLastUpdate >= stabilityThreshold) {
                    clearInterval(finishInterval);
                    setLoadingProgress(100);
                    // Small delay to show 100%
                    setTimeout(() => {
                        setLoading(false);
                    }, 200);
                } else {
                    // Keep checking
                    setTimeout(checkStability, 500);
                }
            };

            // Start checking
            setTimeout(checkStability, 1000);
        }
    };

    // 2. Live Query Update
    useEffect(() => {
        if (connected) {
            setLoadingMessage('Synchronizing with database...');
        }

        if (allDocs?.docs && allDocs.docs.length > 0) {
            // Data FOUND!
            // Process data immediately in background
            const violationsToFix = allDocs.docs.filter(d => d.docType === 'violation' && d.type === 'Callout');
            if (violationsToFix.length > 0) {
                violationsToFix.forEach(v => {
                    safePut({ ...v, type: 'Call Out', violationType: 'Call Out' });
                });
            }

            processDocs(allDocs.docs);

            // Mark data as ready and open the gates
            dataReadyRef.current = true;
            checkCompletion();

        } else if (allDocs?.docs && allDocs.docs.length === 0) {
            // Connected but NO data yet. Keep waiting.
            // Do NOT set dataReadyRef.current = true here.
            setLoadingMessage('Waiting for data...');

        } else if (allDocs?.error) {
            console.error("DataContext: Live query error:", allDocs.error);
            // If error, we might still want to let them in? 
            // For now, let the failsafe handle it.
        }
    }, [allDocs, processDocs, connected]);

    // 3. Manual Fetch Fallback (for initial load reliability)
    useEffect(() => {
        let attempts = 0;
        const fetchManual = async () => {
            if (!connected) return; // Wait for connection first

            try {
                const result = await db.allDocs();
                if (result.rows.length > 0) {
                    // Data FOUND via manual fetch!
                    if (!allDocs?.docs || allDocs.docs.length === 0) {
                        const docs = result.rows.map(r => r.value);
                        processDocs(docs);
                        dataReadyRef.current = true;
                        checkCompletion();
                    }
                } else {
                    // Empty result. 
                    // If live query is also empty, we just wait.
                    // Retry a few times just to be sure it's not a connection blip
                    if (attempts < 10) { // Keep retrying for longer
                        attempts++;
                        setTimeout(fetchManual, 2000);
                    }
                    // After 10 attempts, we stop spamming and just wait for the failsafe or live query
                }
            } catch (e) {
                console.error(`DataContext: Manual fetch failed (attempt ${attempts + 1}):`, e);
                // RETRY ON ERROR (CRDT not ready, missing indexes, etc)
                if (attempts < 10) {
                    attempts++;
                    const delay = 1500 + (attempts * 500); // Backoff: 1.5s, 2s, 2.5s...
                    setTimeout(fetchManual, delay);
                }
            }
        };

        // Start manual fetch loop only after connected
        if (connected) {
            fetchManual();
        } else {
            // Simulate connection progress
            setLoadingMessage('Connecting to global database...');
        }
    }, [db, allDocs, processDocs, connected]);

    // console.log('DataProvider: organizationId', organizationId);

    // Helper to recursively remove undefined values - Moved to utils/dataUtils.js
    // const deepSanitize = ...

    // Helper to safely put data to Fireproof
    const safePut = async (doc) => {
        try {
            const sanitized = deepSanitize(doc);
            return await db.put(sanitized);
        } catch (error) {
            console.error('Fireproof put failed:', error, doc);
            throw error;
        }
    };

    const addEmployee = async (name, startDate) => {
        try {
            const rawEmployee = {
                docType: 'employee',
                name: name || '',
                startDate: startDate || new Date().toISOString().split('T')[0],
                organizationId: organizationId || 'local-org',
                active: true,
                archived: false,
                tier: 'Good Standing',
                probation: { isOnProbation: false, highestLevel: 0, ncnsCount: 0 }
            };

            const newEmployee = deepSanitize(rawEmployee);
            // console.log('Adding employee (sanitized):', newEmployee);

            // Optimistic Update
            const tempId = 'temp-' + Date.now();
            setData(prev => ({
                ...prev,
                employees: [...prev.employees, { ...newEmployee, _id: tempId, id: tempId, currentPoints: data.settings.startingPoints }]
            }));



            const res = await safePut(newEmployee);
            // console.log('Employee added successfully, result:', res);
            return res; // Antigravity: Return result for ID tracking
        } catch (error) {
            console.error('Failed to add employee:', error);
            alert('Failed to add employee. See console for details.');
            // Optionally revert state here if needed, but next live query will fix it
        }
    };

    const addViolation = async (employeeId, type, date, pointsDeducted, shift = 'AM') => {
        try {
            const rawViolation = {
                docType: 'violation',
                employeeId,
                type, // Keep 'type' as is for UI compatibility
                violationType: type, // Redundant but safe
                date,
                shift,
                pointsDeducted,
                organizationId,
                // New Fields
                shiftCovered: false, // Default
                protectedAbsence: false,
                protectedAbsenceReason: '',
                documentationConfirmed: false
            };

            // Handle optional argumentsObject for backward compatibility or new signature
            if (typeof shift === 'object' && shift !== null) {
                Object.assign(rawViolation, shift); // shift is actually options
                if (!rawViolation.shift) rawViolation.shift = 'AM'; // fallback
            } else {
                if (arguments.length > 5) {
                    rawViolation.shiftCovered = arguments[5];
                }
            }
            const newViolation = deepSanitize(rawViolation);

            // Optimistic Update
            const tempId = 'temp-' + Date.now();
            const optimisticViolation = { ...newViolation, _id: tempId, id: tempId };

            setData(prev => {
                const updatedViolations = [...prev.violations, optimisticViolation];

                // Recalculate points for the specific employee
                const employeeIndex = prev.employees.findIndex(e => e.id === employeeId);
                let updatedEmployees = prev.employees;

                let updatedEmployee = null;

                if (employeeIndex !== -1) {
                    const employee = prev.employees[employeeIndex];
                    const employeeViolations = updatedViolations.filter(v => v.employeeId === employeeId);

                    const state = calculateEmployeeState(employee, employeeViolations, prev.settings);

                    // --- RELAPSE / PROBATION LOGIC TRIGGER ---
                    const probationState = calculateNewProbationState(employee, employeeViolations, prev.settings);
                    // ------------------------------------------

                    updatedEmployee = {
                        ...employee,
                        currentPoints: state.score,
                        tier: state.tier.name,
                        currentTier: state.tier,
                        lastTierChangeDate: state.lastTierChangeDate,
                        probation: probationState // Persist new state
                    };

                    updatedEmployees = [...prev.employees];
                    updatedEmployees[employeeIndex] = updatedEmployee;
                }

                // If we updated the employee, we should perform the DB update for the employee too!
                // We do this asynchronously below.
                if (updatedEmployee) {
                    safePut({ ...updatedEmployee, docType: 'employee' }); // Persist employee changes (Probation)
                }

                return {
                    ...prev,
                    violations: updatedViolations,
                    employees: updatedEmployees
                };
            });

            await safePut(newViolation);
        } catch (error) {
            console.error('Failed to add violation:', error);
            alert('Failed to add violation. See console for details.');
        }
    };

    const updateViolation = async (updatedViolation) => {
        // Ensure docType is preserved
        const sanitized = deepSanitize({ ...updatedViolation, docType: 'violation', _id: updatedViolation.id });

        // Optimistic Update
        setData(prev => {
            const updatedViolations = prev.violations.map(v => v.id === updatedViolation.id ? sanitized : v);

            // Recalculate points for the specific employee
            const employeeId = updatedViolation.employeeId;
            const employeeIndex = prev.employees.findIndex(e => e.id === employeeId);
            let updatedEmployees = prev.employees;

            if (employeeIndex !== -1) {
                const employee = prev.employees[employeeIndex];
                const employeeViolations = updatedViolations.filter(v => v.employeeId === employeeId);

                const state = calculateEmployeeState(employee, employeeViolations, prev.settings);

                updatedEmployees = [...prev.employees];
                updatedEmployees[employeeIndex] = {
                    ...employee,
                    currentPoints: state.score,
                    tier: state.tier.name,
                    currentTier: state.tier,
                    lastTierChangeDate: state.lastTierChangeDate
                };
            }

            return {
                ...prev,
                violations: updatedViolations,
                employees: updatedEmployees
            };
        });

        await safePut(sanitized);
    };

    const deleteViolation = async (violationId) => {
        // Optimistic Update
        setData(prev => {
            const violationToDelete = prev.violations.find(v => v.id === violationId);
            const updatedViolations = prev.violations.filter(v => v.id !== violationId);

            let updatedEmployees = prev.employees;
            if (violationToDelete) {
                const employeeId = violationToDelete.employeeId;
                const employeeIndex = prev.employees.findIndex(e => e.id === employeeId);

                if (employeeIndex !== -1) {
                    const employee = prev.employees[employeeIndex];
                    const employeeViolations = updatedViolations.filter(v => v.employeeId === employeeId);

                    const state = calculateEmployeeState(employee, employeeViolations, prev.settings);

                    updatedEmployees = [...prev.employees];
                    updatedEmployees[employeeIndex] = {
                        ...employee,
                        currentPoints: state.score,
                        tier: state.tier.name,
                        currentTier: state.tier,
                        lastTierChangeDate: state.lastTierChangeDate
                    };
                }
            }

            return {
                ...prev,
                violations: updatedViolations,
                employees: updatedEmployees
            };
        });
        await db.del(violationId);
    };

    const deleteViolations = async (violationIds) => {
        if (!violationIds || violationIds.length === 0) return;

        // Optimistic Update
        setData(prev => {
            const updatedViolations = prev.violations.filter(v => !violationIds.includes(v.id));
            const deletedViolations = prev.violations.filter(v => violationIds.includes(v.id));

            // Find all affected employees
            const affectedEmployeeIds = new Set(deletedViolations.map(v => v.employeeId));
            let updatedEmployees = [...prev.employees];

            affectedEmployeeIds.forEach(empId => {
                const index = updatedEmployees.findIndex(e => e.id === empId);
                if (index !== -1) {
                    const employee = updatedEmployees[index];
                    const employeeViolations = updatedViolations.filter(v => v.employeeId === empId);

                    const state = calculateEmployeeState(employee, employeeViolations, prev.settings);

                    updatedEmployees[index] = {
                        ...employee,
                        currentPoints: state.score,
                        tier: state.tier.name,
                        currentTier: state.tier,
                        lastTierChangeDate: state.lastTierChangeDate
                    };
                }
            });

            return {
                ...prev,
                violations: updatedViolations,
                employees: updatedEmployees
            };
        });

        // Delete from DB in parallel
        await Promise.all(violationIds.map(id => db.del(id)));
    };

    const issueDA = async (daKey) => {
        // Check if already exists
        const exists = data.issuedDAs.includes(daKey);
        if (!exists) {
            // Optimistic Update
            setData(prev => ({
                ...prev,
                issuedDAs: [...prev.issuedDAs, daKey]
            }));
            await safePut({ docType: 'issuedDA', daKey });
        }
    };

    const updateSettings = async (newSettings) => {
        const currentSettingsDoc = allDocs.docs.find(d => d.docType === 'settings') || { docType: 'settings' };
        const mergedSettings = { ...DEFAULT_SETTINGS, ...currentSettingsDoc, ...newSettings };
        const sanitized = deepSanitize({ ...mergedSettings, docType: 'settings' });

        // Optimistic Update
        setData(prev => {
            const updatedEmployees = prev.employees.map(employee => {
                const employeeViolations = prev.violations.filter(v => v.employeeId === employee.id);
                // Recalculate with NEW settings
                const state = calculateEmployeeState(employee, employeeViolations, mergedSettings);

                // Tricky: we need to preserve probation state if it's not being recalculated here?
                // actually calculateEmployeeState returns the main score/tier.
                // WE SHOULD probably re-run calculateNewProbationState too if we want to be 100% correct,
                // but for a "Reset", usually we just want scores reset. 
                // IF resetEffectiveDate is set, calculateEmployeeState handles the filtering.

                return {
                    ...employee,
                    currentPoints: state.score,
                    tier: state.tier.name,
                    currentTier: state.tier,
                    lastTierChangeDate: state.lastTierChangeDate,
                    // We might need to update probation state logic here too if reset affects it,
                    // but for now let's focus on the main score/tier reset.
                };
            });

            return {
                ...prev,
                settings: mergedSettings,
                employees: updatedEmployees
            };
        });

        await safePut(sanitized);
    };

    const updateEmployee = async (updatedEmployee) => {
        const sanitized = deepSanitize({ ...updatedEmployee, docType: 'employee', _id: updatedEmployee.id });

        // Optimistic Update
        setData(prev => ({
            ...prev,
            employees: prev.employees.map(e => e.id === updatedEmployee.id ? { ...e, ...sanitized } : e)
        }));

        await safePut(sanitized);
    };

    const deleteEmployee = async (employeeId) => {
        // Optimistic Update
        setData(prev => ({
            ...prev,
            employees: prev.employees.filter(e => e.id !== employeeId),
            violations: prev.violations.filter(v => v.employeeId !== employeeId),
            issuedDAs: prev.issuedDAs.filter(da => !da.startsWith(`${employeeId}-`))
        }));

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

    const clearAllData = async () => {
        // Optimistic Update
        setData(prev => ({
            ...prev,
            employees: [],
            violations: [],
            issuedDAs: []
        }));

        // Delete all employees
        const employees = allDocs.docs.filter(d => d.docType === 'employee');
        for (const doc of employees) {
            await db.del(doc._id);
        }

        // Delete all violations
        const violations = allDocs.docs.filter(d => d.docType === 'violation');
        for (const doc of violations) {
            await db.del(doc._id);
        }

        // Delete all issued DAs
        const das = allDocs.docs.filter(d => d.docType === 'issuedDA');
        for (const doc of das) {
            await db.del(doc._id);
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

    const importDatabase = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    // console.log('Starting import...');

                    // 1. Fetch Live Context from DB (Directly) to ensure Real IDs
                    const allDocsResult = await db.allDocs();
                    const dbDocs = allDocsResult.rows.map(r => r.value);
                    const dbEmployees = dbDocs.filter(d => d.docType === 'employee');

                    const liveContextMap = new Map();
                    dbEmployees.forEach(emp => {
                        if (emp.active && emp.name) {
                            liveContextMap.set(emp.name.trim().toLowerCase(), emp._id);
                        }
                    });

                    // console.log(`Loaded ${liveContextMap.size} active employees from DB for matching.`);

                    // 2. Build JSON Lookup: Map<Legacy_JSON_UUID, Name>
                    const legacyJsonMap = new Map();
                    if (imported.employees && Array.isArray(imported.employees)) {
                        imported.employees.forEach(emp => {
                            if (emp.name && emp.name.trim() !== '') {
                                legacyJsonMap.set(emp.id, emp.name.trim());
                            }
                        });
                    }

                    // 3. Process Violations with Batching
                    let addedCount = 0;
                    let skippedCount = 0;

                    if (imported.violations && Array.isArray(imported.violations)) {
                        // Pre-fetch existing violations to check for duplicates
                        const existingViolations = dbDocs.filter(d => d.docType === 'violation');
                        const existingSignatures = new Set();
                        existingViolations.forEach(v => {
                            // Signature: employeeId|date|type
                            existingSignatures.add(`${v.employeeId}|${v.date}|${v.type}`);
                        });

                        const violationsToImport = [];

                        // Filter and Prepare Data First
                        for (const v of imported.violations) {
                            const legacyId = v.employeeId;
                            const name = legacyJsonMap.get(legacyId);

                            if (name) {
                                const normalizedName = name.toLowerCase();
                                const liveAppUserId = liveContextMap.get(normalizedName);

                                if (liveAppUserId) {
                                    const dateStr = v.date;
                                    const signature = `${liveAppUserId}|${dateStr}|${v.type}`;

                                    if (!existingSignatures.has(signature)) {
                                        violationsToImport.push({
                                            docType: 'violation',
                                            employeeId: liveAppUserId,
                                            type: v.type,
                                            violationType: v.type,
                                            date: dateStr,
                                            shift: v.shift || 'AM',
                                            pointsDeducted: v.pointsDeducted,
                                            organizationId: organizationId || 'local-org'
                                        });
                                        existingSignatures.add(signature);
                                    } else {
                                        skippedCount++;
                                    }
                                } else {
                                    skippedCount++;
                                }
                            } else {
                                skippedCount++;
                            }
                        }

                        // Batch Insert - ULTRA-SAFE IMPORT MODE
                        // CHUNK_SIZE = 2 + 2000ms delay ensures Data Integrity & Sync
                        const BATCH_SIZE = 2;
                        const batches = [];
                        for (let i = 0; i < violationsToImport.length; i += BATCH_SIZE) {
                            batches.push(violationsToImport.slice(i, i + BATCH_SIZE));
                        }

                        // console.log(`Prepared ${violationsToImport.length} violations for import in ${batches.length} batches.`);

                        for (let i = 0; i < batches.length; i++) {
                            const batch = batches[i];

                            // Log progress to console
                            const percent = Math.round(((i + 1) / batches.length) * 100);
                            console.log(`Importing Database: ${percent}% complete`);

                            setLoadingMessage(`Importing safe batch ${i + 1} of ${batches.length}...`);

                            // 1. Insert batch in parallel
                            await Promise.all(batch.map(doc => safePut(doc)));

                            addedCount += batch.length;

                            // 2. CRITICAL: Artificial Delay for Compaction/Sync Handshake
                            // We yield 2000ms to allow Fireproof to compact blocks and Netlify Sync
                            // to pick them up before we generate more.
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    }

                    // console.log(`Import finished. Added: ${addedCount}, Skipped: ${skippedCount}. Waiting safely...`);
                    // Final Settling Delay
                    await new Promise(r => setTimeout(r, 2000));

                    resolve({ success: true, message: `Imported ${addedCount} violations. Skipped ${skippedCount}.` });

                } catch (err) {
                    console.error("Import failed", err);
                    resolve({ success: false, error: err.message });
                }
            };
            reader.onerror = () => resolve({ success: false, error: 'File reading failed' });
            reader.readAsText(file);
        });
    };

    const purgeOrphanedViolations = async () => {
        const validEmployeeIds = new Set(data.employees.map(e => e.id));
        const orphanedViolations = data.violations.filter(v => !validEmployeeIds.has(v.employeeId));

        if (orphanedViolations.length === 0) {
            alert('No orphaned violations found.');
            return;
        }

        if (confirm(`Found ${orphanedViolations.length} violations with unknown employees. Delete them?`)) {
            let count = 0;
            for (const v of orphanedViolations) {
                await db.del(v.id);
                count++;
            }
            alert(`Successfully deleted ${count} orphaned violations. Please run the import again.`);
            // Trigger a reload to ensure UI is fresh
            window.location.reload();
        }
    };

    const nuclearReset = async () => {
        try {
            const allDocs = await db.allDocs();
            const docs = allDocs.rows.map(r => r.value);

            if (docs.length === 0) {
                alert('Database is already empty.');
                return;
            }

            // console.log(`Nuclear Reset: Deleting ${docs.length} documents...`);

            // Delete all documents
            for (const doc of docs) {
                await db.del(doc._id);
            }

            // console.log('Nuclear Reset: Complete.');
            // Force reload to clear state
            window.location.reload();
        } catch (error) {
            console.error('Nuclear Reset failed:', error);
            alert('Nuclear Reset failed. Check console for details.');
        }
    };



    const value = {
        data,
        loading,
        addEmployee,
        addViolation,
        updateViolation,
        deleteViolation,
        deleteViolations,
        reload: () => { }, // No-op as it's live
        exportDatabase,
        importDatabase,
        purgeOrphanedViolations,
        clearAllData,

        issueDA,
        updateSettings,
        updateEmployee,
        deleteEmployee,
        logReportUsage,
        isOfflineMode,
        nuclearReset
    };

    return (
        <DataContext.Provider value={value}>
            {loading && (
                <LoadingScreen
                    message={loadingMessage}
                    progress={loadingProgress}
                />
            )}
            {appMounted && children}
        </DataContext.Provider>
    );
}

export function useData() {
    return useContext(DataContext);
}
