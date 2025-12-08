import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateUserState, calculateViolationPenalty, VIOLATION_TYPES, parseDate } from '../utils/pointCalculator';
import { AlertTriangle, CheckCircle, User, Clock, Edit2, ArrowLeft, Save, X, Trash2, PlusCircle, Search, Filter, Calendar } from 'lucide-react';
import ModernDatePicker from '../components/ModernDatePicker';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const LogViolation = () => {
    const { data, addViolation, updateViolation, deleteViolation, deleteViolations } = useData();
    const navigate = useNavigate();

    // Mode: 'log' or 'edit'
    const [mode, setMode] = useState('log');

    // Log Mode State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [violationType, setViolationType] = useState(VIOLATION_TYPES.TARDY_1_5);
    const [violationDate, setViolationDate] = useState(new Date().toISOString().split('T')[0]);
    const [violationShift, setViolationShift] = useState('AM');
    const [shiftCovered, setShiftCovered] = useState(false);

    // Protected Absence State
    const [isProtected, setIsProtected] = useState(false);
    const [protectedReason, setProtectedReason] = useState('');
    const [docConfirmed, setDocConfirmed] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Mode State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingViolation, setEditingViolation] = useState(null);

    // Advanced Filters
    const [filterEmployeeId, setFilterEmployeeId] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const employees = data?.employees || [];
    const violations = data?.violations || [];

    // --- Log Mode Logic ---
    const calculateImpact = () => {
        if (!selectedEmployeeId || !data?.settings) return { deduction: 0, newPoints: 0 };

        // Immediate return for protected or covered
        const tempViolation = {
            id: 'temp',
            employeeId: selectedEmployeeId,
            type: violationType,
            date: violationDate,
            shiftCovered,
            protectedAbsence: isProtected
        };

        const empViolations = violations.filter(v => v.employeeId === selectedEmployeeId);

        // 1. Calculate Deduction Amount exactly as the system would
        const deduction = calculateViolationPenalty(tempViolation, empViolations, data.settings);

        // 2. Calculate New Total Score
        // We still run calculateUserState to get the final score which includes tier resets etc.
        const newState = calculateUserState([...empViolations, tempViolation], data.settings);

        return {
            deduction,
            newPoints: newState.points
        };
    };

    const impactData = useMemo(() => calculateImpact(), [
        selectedEmployeeId, violationDate, violationType, isProtected, shiftCovered, violations, data.settings
    ]);

    const getCurrentPoints = () => {
        if (!selectedEmployeeId) return 0;
        const empViolations = violations.filter(v => v.employeeId === selectedEmployeeId);
        const state = calculateUserState(empViolations, data.settings);
        return state.points;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedEmployeeId) {
            alert('Please select an employee');
            return;
        }

        if (isProtected) {
            if (!protectedReason) {
                alert('Please select a reason for the protected absence.');
                return;
            }
            if (!docConfirmed) {
                alert('You must verify that documentation is on file.');
                return;
            }
        }


        setIsSubmitting(true);
        // Use the calculated deduction directly for accuracy
        const pointsToLog = impactData.deduction;

        try {
            await addViolation(selectedEmployeeId, violationType, violationDate, pointsToLog, {
                shift: violationShift,
                shiftCovered,
                protectedAbsence: isProtected,
                protectedAbsenceReason: isProtected ? protectedReason : '',
                documentationConfirmed: isProtected ? docConfirmed : false
            });

            // Reset form
            setSelectedEmployeeId('');
            setViolationType(VIOLATION_TYPES.TARDY_1_5);
            setViolationDate(new Date().toISOString().split('T')[0]);
            setViolationShift('AM');
            setShiftCovered(false);
            setIsProtected(false);
            setProtectedReason('');
            setDocConfirmed(false);

            alert('Violation logged successfully!');
        } catch (error) {
            alert('Error logging violation: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const currentPoints = useMemo(() => getCurrentPoints(), [selectedEmployeeId, violations, data.settings]);
    const newPoints = impactData.newPoints;

    // --- Edit Mode Logic ---
    const sortedViolations = useMemo(() => {
        let filtered = [...violations];

        if (filterEmployeeId) {
            filtered = filtered.filter(v => v.employeeId === filterEmployeeId);
        }
        if (filterStartDate) {
            filtered = filtered.filter(v => v.date >= filterStartDate);
        }
        if (filterEndDate) {
            filtered = filtered.filter(v => v.date <= filterEndDate);
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [violations, filterEmployeeId, filterStartDate, filterEndDate]);

    const handleEditClick = (violation) => {
        setEditingViolation({ ...violation });
        setEditModalOpen(true);
    };

    const handleUpdateViolation = async (e) => {
        e.preventDefault();
        try {
            // Calculate penalty logic
            let pointsToLog = 0;

            // Immediate short-circuit for protected or covered (matching log mode logic)
            if (editingViolation.protectedAbsence) {
                pointsToLog = 0;
            } else if (editingViolation.shiftCovered && editingViolation.type === VIOLATION_TYPES.CALLOUT) {
                pointsToLog = 0;
            } else {
                const otherViolations = violations.filter(v => v.id !== editingViolation.id && v.employeeId === editingViolation.employeeId);
                const beforeState = calculateUserState(otherViolations, data.settings);
                // We must ensure the editingViolation passed to calculator has the correct flags if calculator respects them,
                // but since we are handling pointsToLog manually for the record, we mainly care about the hypothetical state diff
                // IF the calculator handles it.
                // However, simpler approach:
                // The 'pointsDeducted' field is what we are saving. 
                // If it's not protected/covered, we calculate the impact.

                const afterState = calculateUserState([...otherViolations, editingViolation], data.settings);
                pointsToLog = Math.abs(afterState.points - beforeState.points);
            }

            await updateViolation({ ...editingViolation, pointsDeducted: pointsToLog });
            setEditModalOpen(false);
            setEditingViolation(null);
            alert('Violation updated successfully!');
        } catch (error) {
            alert('Error updating violation: ' + error.message);
        }
    };

    const handleDeleteClick = async (violationId) => {
        if (window.confirm('Are you sure you want to delete this violation? This action cannot be undone.')) {
            try {
                await deleteViolation(violationId);
                alert('Violation deleted successfully!');
            } catch (error) {
                alert('Error deleting violation: ' + error.message);
            }
        }
    };

    // --- Styles from Dashboard ---
    const VIOLATION_STYLES = {
        [VIOLATION_TYPES.TARDY_1_5]: { bg: '#dcfce7', color: '#059669', label: 'Tardy (1-5 min)' }, // Emerald 600
        [VIOLATION_TYPES.TARDY_6_11]: { bg: '#dbeafe', color: '#2563EB', label: 'Tardy (6-11 min)' }, // Blue 600
        [VIOLATION_TYPES.TARDY_12_29]: { bg: '#fef9c3', color: '#D97706', label: 'Tardy (12-29 min)' }, // Amber 600
        [VIOLATION_TYPES.TARDY_30_PLUS]: { bg: '#fce7f3', color: '#DB2777', label: 'Tardy (30+ min)' }, // Pink 600
        [VIOLATION_TYPES.CALLOUT]: { bg: '#fee2e2', color: '#DC2626', label: 'Call Out' }, // Red 600
        [VIOLATION_TYPES.EARLY_ARRIVAL]: { bg: '#f3e8ff', color: '#6b21a8', label: 'Early Arrival' }, // Purple
        [VIOLATION_TYPES.SHIFT_PICKUP]: { bg: '#ffedd5', color: '#9a3412', label: 'Shift Pickup' }, // Orange
    };

    const clearFilters = () => {
        setFilterEmployeeId('');
        setFilterStartDate('');
        setFilterEndDate('');
    };

    // Helper for table row styling
    const getViolationStyle = (type, isProtected, covered) => {
        // User Rule: "If they are protected you can keep the same white text"
        // User Rule: "callouts hwere the shift is covered that text can remain the same" (presumably default/white/grey)

        if (isProtected) return { color: 'var(--text-primary)' }; // White/Default
        if (covered) return { color: 'var(--text-primary)' }; // White/Default

        // User Rule: "Update the colors for the violations based on the dashboard color schema per violation type."
        return {
            color: VIOLATION_STYLES[type]?.color || 'var(--text-primary)'
            // We can also add bg if desired, but user specifically said "change the color of this text"
            // Dashboard uses chips with BG, here we might just want text color or chip.
            // "where it says violation type, I want the color of this text to match..." -> Implies text color.
        };
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={32} color="var(--accent-primary)" />
                        {mode === 'log' ? 'Log Violation' : 'Manage Violations'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {mode === 'log' ? 'Record attendance violations and automatically calculate point deductions.' : 'View, edit, or delete past violation records.'}
                    </p>
                </div>
                <button
                    onClick={() => setMode(mode === 'log' ? 'edit' : 'log')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all 0.2s'
                    }}
                >
                    {mode === 'log' ? <><Edit2 size={18} /> Edit / View History</> : <><ArrowLeft size={18} /> Back to Log</>}
                </button>
            </div>

            {mode === 'log' ? (
                <form onSubmit={handleSubmit}>
                    {/* ... Log Mode UI ... Kept mostly same but cleaner structure */}
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-md)',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1.5rem'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Violation Details</h2>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{
                                backgroundColor: 'var(--bg-primary)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                                    <User size={18} color="var(--text-secondary)" />
                                    Employee
                                </label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: '#343434',
                                        color: '#ffffff',
                                        fontSize: '1rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <option value="">Select an employee...</option>
                                    {employees
                                        .filter(emp => !emp.archived)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div style={{
                                backgroundColor: 'var(--bg-primary)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                                    <AlertTriangle size={18} color="var(--text-secondary)" />
                                    Violation Type
                                </label>
                                <select
                                    value={violationType}
                                    onChange={(e) => setViolationType(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: '#343434',
                                        color: '#ffffff',
                                        fontSize: '1rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <option value={VIOLATION_TYPES.TARDY_1_5}>{VIOLATION_TYPES.TARDY_1_5}</option>
                                    <option value={VIOLATION_TYPES.TARDY_6_11}>{VIOLATION_TYPES.TARDY_6_11}</option>
                                    <option value={VIOLATION_TYPES.TARDY_12_29}>{VIOLATION_TYPES.TARDY_12_29}</option>
                                    <option value={VIOLATION_TYPES.TARDY_30_PLUS}>{VIOLATION_TYPES.TARDY_30_PLUS}</option>
                                    <option value={VIOLATION_TYPES.CALLOUT}>{VIOLATION_TYPES.CALLOUT}</option>
                                    <option value={VIOLATION_TYPES.EARLY_ARRIVAL}>{VIOLATION_TYPES.EARLY_ARRIVAL}</option>
                                    <option value={VIOLATION_TYPES.SHIFT_PICKUP}>{VIOLATION_TYPES.SHIFT_PICKUP}</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{
                                    flex: 1,
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                                        <Calendar size={18} color="var(--text-secondary)" />
                                        Date
                                    </label>
                                    <ModernDatePicker
                                        label={null}
                                        showInputIcon={false}
                                        value={violationDate}
                                        onChange={setViolationDate}
                                        required
                                        className="text-center-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: '#343434',
                                            color: '#ffffff',
                                            fontSize: '1rem',
                                            fontWeight: '500',
                                            textAlign: 'center'
                                        }}
                                    />
                                </div>

                                <div style={{
                                    flex: 1,
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.95rem' }}>
                                        <Clock size={18} color="var(--text-secondary)" />
                                        Shift
                                    </label>
                                    <select
                                        value={violationShift}
                                        onChange={(e) => setViolationShift(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: '#343434',
                                            color: '#ffffff',
                                            fontSize: '1rem',
                                            fontWeight: '500',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <option value="AM">AM</option>
                                        <option value="PM">PM</option>
                                    </select>
                                </div>
                            </div>

                            {/* Logic for specific types (Callout/Protected) */}
                            {violationType === VIOLATION_TYPES.CALLOUT && (
                                <>
                                    <div style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gridColumn: 'span 2'
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="shiftCovered"
                                            checked={shiftCovered}
                                            onChange={(e) => setShiftCovered(e.target.checked)}
                                            style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                        />
                                        <label htmlFor="shiftCovered" style={{ cursor: 'pointer', fontWeight: '500', fontSize: '0.95rem' }}>
                                            Shift Covered? (No points deducted)
                                        </label>
                                    </div>

                                    <div style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: 'var(--shadow-sm)',
                                        gridColumn: 'span 2',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="checkbox"
                                                id="isProtected"
                                                checked={isProtected}
                                                onChange={(e) => {
                                                    setIsProtected(e.target.checked);
                                                    if (!e.target.checked) {
                                                        setProtectedReason('');
                                                        setDocConfirmed(false);
                                                    }
                                                }}
                                                style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                            />
                                            <label htmlFor="isProtected" style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                                Protected Absence (No Points Deducted)
                                            </label>
                                        </div>

                                        {isProtected && (
                                            <div style={{ marginLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', borderLeft: '4px solid var(--accent-warning)' }}>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        <strong>Note:</strong> Standard doctor's notes for cold/flu do NOT excuse points.
                                                    </p>
                                                </div>
                                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500' }}>Reason:</label>
                                                <select
                                                    value={protectedReason}
                                                    onChange={(e) => setProtectedReason(e.target.value)}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#343434', color: '#ffffff' }}
                                                >
                                                    <option value="">Select Reason...</option>
                                                    {data.settings.protectedAbsenceReasons?.map(reason => (
                                                        <option key={reason} value={reason}>{reason}</option>
                                                    )) || ['Jury Duty', 'Military Service', 'Domestic Violence/Sexual Assault', 'Voting', 'ADA/Pregnancy'].map(reason => (
                                                        <option key={reason} value={reason}>{reason}</option>
                                                    ))}
                                                </select>
                                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        id="docConfirmed"
                                                        checked={docConfirmed}
                                                        onChange={(e) => setDocConfirmed(e.target.checked)}
                                                        style={{ width: '1.1rem', height: '1.1rem', marginRight: '0.5rem', cursor: 'pointer', accentColor: 'var(--accent-success)' }}
                                                    />
                                                    <label htmlFor="docConfirmed" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', color: docConfirmed ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                                        I confirm documentation is on file.
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>


                        {/* Points Preview */}
                        {selectedEmployeeId && (
                            (() => {
                                // Calculate days difference
                                const today = new Date();
                                // Reset time to midnight for accurate day calculation
                                today.setHours(0, 0, 0, 0);
                                const vDate = parseDate(violationDate);
                                // Use simpler math: (today - vDate) / (1000 * 60 * 60 * 24)
                                const diffTime = today - vDate;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                // Note: dates in future will have negative diffDays, which satisfies <= 7. 
                                // We strictly want to hide if it is MORE than 7 days in the PAST.

                                if (diffDays > 7) {
                                    return (
                                        <div style={{
                                            marginTop: '1.5rem',
                                            padding: '1.25rem',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red/Danger bg
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            color: '#ef4444', // Red 500
                                            textAlign: 'center',
                                            fontWeight: '500'
                                        }}>
                                            Logging violation further than 7 days back, projected impact not available.
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '1.25rem',
                                        backgroundColor: 'var(--bg-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Projected Impact</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
                                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Current Points</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                    {currentPoints}
                                                </div>
                                            </div>
                                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Deduction</div>
                                                <div style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: 'bold',
                                                    color: impactData.deduction === 0 ? 'var(--text-secondary)' : 'var(--accent-danger)'
                                                }}>
                                                    {impactData.deduction === 0 ? '-' : `-${impactData.deduction}`}
                                                </div>
                                            </div>
                                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>New Points</div>
                                                <div style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: 'bold',
                                                    color: impactData.newPoints < currentPoints ? 'var(--accent-danger)' : 'var(--text-primary)'
                                                }}>
                                                    {impactData.newPoints}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button
                                type="submit"
                                disabled={isSubmitting || !selectedEmployeeId}
                                style={{
                                    padding: '0.875rem 2rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: isSubmitting || !selectedEmployeeId ? 'not-allowed' : 'pointer',
                                    fontSize: '1rem',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                            >
                                {isSubmitting ? 'Logging...' : 'Log Violation'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                // --- CUSTOM EDIT MODE UI ---
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                }}>
                    {/* Filter Bar */}
                    <div style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Filter size={20} color="var(--text-secondary)" />
                                Filter Violations
                            </h2>
                            {(filterEmployeeId || filterStartDate || filterEndDate) && (
                                <button onClick={clearFilters} style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        {/* Bulk Actions */}
                        <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            {sortedViolations.length > 0 && (
                                <button
                                    onClick={async () => {
                                        const count = sortedViolations.length;
                                        if (window.confirm(`Are you sure you want to delete ${count} violation${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
                                            const ids = sortedViolations.map(v => v.id);
                                            try {
                                                await deleteViolations(ids);
                                                alert(`Successfully deleted ${count} violations.`);
                                            } catch (error) {
                                                alert('Error deleting violations: ' + error.message);
                                            }
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                        color: '#dc2626',
                                        border: '1px solid rgba(220, 38, 38, 0.3)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <Trash2 size={16} />
                                    Delete Listed ({sortedViolations.length})
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            <div style={{ flexGrow: 1, minWidth: '250px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Employee</label>
                                <select
                                    value={filterEmployeeId}
                                    onChange={(e) => setFilterEmployeeId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: '#343434',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">All Employees</option>
                                    {employees.sort((a, b) => a.name.localeCompare(b.name)).map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ width: '150px' }}>
                                    <ModernDatePicker
                                        label="Start Date"
                                        value={filterStartDate}
                                        onChange={setFilterStartDate}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: '#343434',
                                            color: 'white',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                                <div style={{ width: '150px' }}>
                                    <ModernDatePicker
                                        label="End Date"
                                        value={filterEndDate}
                                        onChange={setFilterEndDate}
                                        style={{
                                            width: '100%',
                                            padding: '0.6rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: '#343434',
                                            color: 'white',
                                            fontSize: '0.9rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Styled Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                            <thead style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Date</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Employee</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Violation Type</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)' }}>Impact</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: 'var(--text-secondary)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedViolations.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            No violations found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedViolations.map((v) => {
                                        const emp = employees.find(e => e.id === v.employeeId);
                                        return (
                                            <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent', transition: 'background-color 0.15s' }}>
                                                <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{parseDate(v.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>{emp?.name || 'Unknown User'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        ...getViolationStyle(v.type, v.protectedAbsence, v.shiftCovered),
                                                        fontWeight: '500',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem'
                                                    }}>
                                                        {v.protectedAbsence && <CheckCircle size={14} />} {v.type}
                                                    </span>
                                                    {v.protectedAbsence && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Protected: {v.protectedAbsenceReason}</span>}
                                                    {v.shiftCovered && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Shift Covered</span>}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    {v.pointsDeducted > 0 ? (
                                                        <span style={{ color: 'var(--accent-danger)', fontWeight: '600', padding: '0.25rem 0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>-{v.pointsDeducted}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--accent-success)', fontWeight: '600', padding: '0.25rem 0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px' }}>0</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleEditClick(v)}
                                                            title="Edit"
                                                            style={{
                                                                padding: '0.4rem',
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--border-color)',
                                                                backgroundColor: 'var(--bg-primary)',
                                                                color: 'var(--accent-primary)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(v.id)}
                                                            title="Delete"
                                                            style={{
                                                                padding: '0.4rem',
                                                                borderRadius: '4px',
                                                                border: '1px solid var(--border-color)',
                                                                backgroundColor: 'var(--bg-primary)',
                                                                color: 'var(--accent-danger)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Violation">
                {editingViolation && (
                    <form onSubmit={handleUpdateViolation}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Violation Type</label>
                            <select
                                value={editingViolation.type}
                                onChange={(e) => setEditingViolation({ ...editingViolation, type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: '#343434',
                                    color: 'white'
                                }}
                            >
                                <option value={VIOLATION_TYPES.TARDY_1_5}>{VIOLATION_TYPES.TARDY_1_5}</option>
                                <option value={VIOLATION_TYPES.TARDY_6_11}>{VIOLATION_TYPES.TARDY_6_11}</option>
                                <option value={VIOLATION_TYPES.TARDY_12_29}>{VIOLATION_TYPES.TARDY_12_29}</option>
                                <option value={VIOLATION_TYPES.TARDY_30_PLUS}>{VIOLATION_TYPES.TARDY_30_PLUS}</option>
                                <option value={VIOLATION_TYPES.CALLOUT}>{VIOLATION_TYPES.CALLOUT}</option>
                                <option value={VIOLATION_TYPES.EARLY_ARRIVAL}>{VIOLATION_TYPES.EARLY_ARRIVAL}</option>
                                <option value={VIOLATION_TYPES.SHIFT_PICKUP}>{VIOLATION_TYPES.SHIFT_PICKUP}</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Date</label>
                            <input
                                type="date"
                                value={editingViolation.date}
                                onChange={(e) => setEditingViolation({ ...editingViolation, date: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: '#343434',
                                    color: 'white'
                                }}
                            />
                        </div>

                        {/* Shift Covered & Protected Absence Logic for Callouts */}
                        {editingViolation.type === VIOLATION_TYPES.CALLOUT && (
                            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Shift Covered */}
                                <div style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <input
                                        type="checkbox"
                                        id="editShiftCovered"
                                        checked={editingViolation.shiftCovered || false}
                                        onChange={(e) => setEditingViolation({ ...editingViolation, shiftCovered: e.target.checked })}
                                        style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                    />
                                    <label htmlFor="editShiftCovered" style={{ cursor: 'pointer', fontWeight: '500', fontSize: '0.95rem' }}>
                                        Shift Covered? (No points deducted)
                                    </label>
                                </div>

                                {/* Protected Absence */}
                                <div style={{
                                    backgroundColor: 'var(--bg-primary)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: editingViolation.protectedAbsence ? '1rem' : '0' }}>
                                        <input
                                            type="checkbox"
                                            id="editIsProtected"
                                            checked={editingViolation.protectedAbsence || false}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setEditingViolation({
                                                    ...editingViolation,
                                                    protectedAbsence: isChecked,
                                                    // Clear related fields if unchecked
                                                    protectedAbsenceReason: isChecked ? editingViolation.protectedAbsenceReason : '',
                                                    documentationConfirmed: isChecked ? editingViolation.documentationConfirmed : false
                                                });
                                            }}
                                            style={{ width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                        />
                                        <label htmlFor="editIsProtected" style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>
                                            Protected Absence
                                        </label>
                                    </div>

                                    {editingViolation.protectedAbsence && (
                                        <div style={{ marginLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500' }}>Reason:</label>
                                            <select
                                                value={editingViolation.protectedAbsenceReason || ''}
                                                onChange={(e) => setEditingViolation({ ...editingViolation, protectedAbsenceReason: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: '#343434', color: '#ffffff' }}
                                            >
                                                <option value="">Select Reason...</option>
                                                {data.settings.protectedAbsenceReasons?.map(reason => (
                                                    <option key={reason} value={reason}>{reason}</option>
                                                )) || ['Jury Duty', 'Military Service', 'Domestic Violence/Sexual Assault', 'Voting', 'ADA/Pregnancy'].map(reason => (
                                                    <option key={reason} value={reason}>{reason}</option>
                                                ))}
                                            </select>

                                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    id="editDocConfirmed"
                                                    checked={editingViolation.documentationConfirmed || false}
                                                    onChange={(e) => setEditingViolation({ ...editingViolation, documentationConfirmed: e.target.checked })}
                                                    style={{ width: '1.1rem', height: '1.1rem', marginRight: '0.5rem', cursor: 'pointer', accentColor: 'var(--accent-success)' }}
                                                />
                                                <label htmlFor="editDocConfirmed" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', color: editingViolation.documentationConfirmed ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                                    I confirm documentation is on file.
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div >
    );
};

export default LogViolation;
