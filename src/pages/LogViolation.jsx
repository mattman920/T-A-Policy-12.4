import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { calculateDeductions, calculateCurrentPoints, STARTING_POINTS } from '../utils/pointCalculator';
import { AlertTriangle, CheckCircle, User, Calendar, Clock, Edit2, ArrowLeft, Save, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

const LogViolation = () => {
    const { data, addViolation, updateViolation, deleteViolation } = useData();
    const navigate = useNavigate();

    // Mode: 'log' or 'edit'
    const [mode, setMode] = useState('log');

    // Log Mode State
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [violationType, setViolationType] = useState('Tardy (1-5 min)');
    const [violationDate, setViolationDate] = useState(new Date().toISOString().split('T')[0]);
    const [violationShift, setViolationShift] = useState('AM');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Mode State
    const [sortOption, setSortOption] = useState('month'); // 'month' or 'week'
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingViolation, setEditingViolation] = useState(null);

    const employees = data?.employees || [];
    const violations = data?.violations || [];

    // --- Log Mode Logic ---
    const getPointsToDeduct = () => {
        if (!selectedEmployeeId) return 0;

        const empViolations = violations.filter(v => v.employeeId === selectedEmployeeId);
        const currentDeductions = calculateDeductions(empViolations, data.settings.violationPenalties);

        const newViolation = { type: violationType, date: violationDate };
        const newDeductions = calculateDeductions([...empViolations, newViolation], data.settings.violationPenalties);

        return newDeductions - currentDeductions;
    };

    const getCurrentPoints = () => {
        if (!selectedEmployeeId) return 0;
        const empViolations = violations.filter(v => v.employeeId === selectedEmployeeId);
        return calculateCurrentPoints(STARTING_POINTS, empViolations, data.settings.violationPenalties);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedEmployeeId) {
            alert('Please select an employee');
            return;
        }

        setIsSubmitting(true);
        const pointsDeducted = getPointsToDeduct();

        try {
            await addViolation(selectedEmployeeId, violationType, violationDate, pointsDeducted, violationShift);

            // Reset form
            setSelectedEmployeeId('');
            setViolationType('Tardy (1-5 min)');
            setViolationDate(new Date().toISOString().split('T')[0]);
            setViolationShift('AM');

            alert('Violation logged successfully!');
        } catch (error) {
            alert('Error logging violation: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
    const pointsToDeduct = getPointsToDeduct();
    const currentPoints = getCurrentPoints();
    const newPoints = currentPoints - pointsToDeduct;

    // --- Edit Mode Logic ---
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'quarter', 'week'
    const [filterValue, setFilterValue] = useState('');

    // Helper Functions
    const getQuarter = (dateStr) => {
        const d = new Date(dateStr);
        const month = d.getMonth();
        const year = d.getFullYear();
        const q = Math.floor(month / 3) + 1;
        return `Q${q} ${year}`;
    };

    const getWeek = (dateStr) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        return `Week of ${monday.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    // Derived Data for Dropdowns
    const availableQuarters = useMemo(() => {
        const quarters = new Set(violations.map(v => getQuarter(v.date)));
        return Array.from(quarters).sort().reverse(); // Sort descending
    }, [violations]);

    const availableWeeks = useMemo(() => {
        const weeks = new Set(violations.map(v => getWeek(v.date)));
        // Sort by date logic (parsing string back to date for sort)
        return Array.from(weeks).sort((a, b) => {
            const dateA = new Date(a.replace('Week of ', ''));
            const dateB = new Date(b.replace('Week of ', ''));
            return dateB - dateA;
        });
    }, [violations]);

    // Filtered & Sorted Violations
    const sortedViolations = useMemo(() => {
        let filtered = [...violations];

        if (filterMode === 'quarter' && filterValue) {
            filtered = filtered.filter(v => getQuarter(v.date) === filterValue);
        } else if (filterMode === 'week' && filterValue) {
            filtered = filtered.filter(v => getWeek(v.date) === filterValue);
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [violations, filterMode, filterValue]);

    // Reset filter value when mode changes
    const handleModeChange = (newMode) => {
        setFilterMode(newMode);
        setFilterValue('');
        if (newMode === 'quarter' && availableQuarters.length > 0) {
            setFilterValue(availableQuarters[0]);
        } else if (newMode === 'week' && availableWeeks.length > 0) {
            setFilterValue(availableWeeks[0]);
        }
    };

    const handleEditClick = (violation) => {
        setEditingViolation({ ...violation });
        setEditModalOpen(true);
    };

    const handleUpdateViolation = async (e) => {
        e.preventDefault();
        try {
            await updateViolation(editingViolation);
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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <AlertTriangle size={32} color="var(--accent-primary)" />
                        {mode === 'log' ? 'Log Violation' : 'Edit Violations'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {mode === 'log' ? 'Record attendance violations and automatically calculate point deductions.' : 'View and edit past violations.'}
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
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {mode === 'log' ? <><Edit2 size={18} /> Edit Violations</> : <><ArrowLeft size={18} /> Back to Log</>}
                </button>
            </div>

            {mode === 'log' ? (
                <form onSubmit={handleSubmit}>
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
                            {/* Employee Selection */}
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

                            {/* Violation Type */}
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
                                    <option value="Tardy (1-5 min)">Tardy (1-5 min)</option>
                                    <option value="Tardy (6-11 min)">Tardy (6-11 min)</option>
                                    <option value="Tardy (12-29 min)">Tardy (12-29 min)</option>
                                    <option value="Tardy (30+ min)">Tardy (30+ min)</option>
                                    <option value="Callout">Callout</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {/* Date */}
                                <div style={{
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
                                    <input
                                        type="date"
                                        value={violationDate}
                                        onChange={(e) => setViolationDate(e.target.value)}
                                        required
                                        className="date-input-white-icon"
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
                                    />
                                </div>

                                {/* Shift */}
                                <div style={{
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
                        </div>

                        {/* Summary Card */}
                        {selectedEmployee && (
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-md)',
                                border: '1px solid var(--border-color)',
                                marginBottom: '1.5rem'
                            }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={20} />
                                    Impact Summary
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                    <div style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Current Points</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-primary)' }}>{currentPoints}</p>
                                    </div>

                                    <div style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Deduction</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-danger)' }}>-{pointsToDeduct}</p>
                                    </div>

                                    <div style={{
                                        backgroundColor: 'var(--bg-primary)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>New Balance</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '700', color: newPoints < 85 ? 'var(--accent-danger)' : 'var(--accent-success)' }}>{newPoints}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                style={{
                                    padding: '0.875rem 1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontWeight: '600',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                Cancel
                            </button>
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
                                    boxShadow: 'var(--shadow-md)',
                                    opacity: isSubmitting || !selectedEmployeeId ? 0.6 : 1
                                }}
                            >
                                {isSubmitting ? 'Logging...' : 'Log Violation'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                // --- Edit Mode View ---
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>History</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={filterMode}
                                onChange={(e) => handleModeChange(e.target.value)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.9rem'
                                }}
                            >
                                <option value="all">Show All</option>
                                <option value="quarter">By Quarter</option>
                                <option value="week">By Week</option>
                            </select>

                            {filterMode === 'quarter' && (
                                <select
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {availableQuarters.map(q => (
                                        <option key={q} value={q}>{q}</option>
                                    ))}
                                </select>
                            )}

                            {filterMode === 'week' && (
                                <select
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {availableWeeks.map(w => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1 }}>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>Date</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>Employee</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)' }}>Type</th>
                                    <th style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Points</th>
                                    <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedViolations.map(v => {
                                    const emp = employees.find(e => e.id === v.employeeId);
                                    return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem' }}>{v.date}</td>
                                            <td style={{ padding: '1rem', fontWeight: 500 }}>{emp?.name || 'Unknown'}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    backgroundColor: v.type === 'Callout' ? 'var(--accent-danger-bg)' : 'var(--accent-warning-bg)',
                                                    color: v.type === 'Callout' ? 'var(--accent-danger)' : 'var(--accent-warning)',
                                                    fontWeight: 500
                                                }}>
                                                    {v.type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-danger)' }}>
                                                -{v.pointsDeducted}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEditClick(v)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'transparent',
                                                        cursor: 'pointer',
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(v.id)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'transparent',
                                                        cursor: 'pointer',
                                                        color: 'var(--accent-danger)'
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Violation">
                {editingViolation && (
                    <form onSubmit={handleUpdateViolation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Violation Type</label>
                            <select
                                value={editingViolation.type}
                                onChange={(e) => setEditingViolation({ ...editingViolation, type: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '1rem',
                                    backgroundColor: '#343434',
                                    color: '#ffffff'
                                }}
                            >
                                <option value="Tardy (1-5 min)">Tardy (1-5 min)</option>
                                <option value="Tardy (6-11 min)">Tardy (6-11 min)</option>
                                <option value="Tardy (12-29 min)">Tardy (12-29 min)</option>
                                <option value="Tardy (30+ min)">Tardy (30+ min)</option>
                                <option value="Callout">Callout</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date</label>
                            <input
                                type="date"
                                value={editingViolation.date}
                                onChange={(e) => setEditingViolation({ ...editingViolation, date: e.target.value })}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '1rem',
                                    backgroundColor: '#343434',
                                    color: '#ffffff'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Shift</label>
                            <select
                                value={editingViolation.shift || 'AM'}
                                onChange={(e) => setEditingViolation({ ...editingViolation, shift: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '1rem',
                                    backgroundColor: '#343434',
                                    color: '#ffffff'
                                }}
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default LogViolation;
