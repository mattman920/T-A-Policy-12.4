import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateUserState, TIERS } from '../utils/pointCalculator';
import { X, Calendar, User, Activity, AlertTriangle, ArrowRight, Shield, Download, CheckCircle, Clock } from 'lucide-react';
import { generateFiveTierPDF } from '../utils/pdfGeneratorFiveTier';

const FiveTierReportModal = ({ isOpen, onClose, preSelectedEmployeeId }) => {
    const { data } = useData();
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const employees = useMemo(() => {
        return (data?.employees || []).filter(e => !e.archived).sort((a, b) => a.name.localeCompare(b.name));
    }, [data?.employees]);

    // Handle Employee Selection Default or Pre-select
    React.useEffect(() => {
        if (isOpen) {
            if (preSelectedEmployeeId) {
                setSelectedEmployeeId(preSelectedEmployeeId);
            } else if (employees.length > 0 && !selectedEmployeeId) {
                setSelectedEmployeeId(employees[0].id);
            }
        }
    }, [isOpen, employees, preSelectedEmployeeId]);

    const reportData = useMemo(() => {
        if (!selectedEmployeeId || !data) return null;

        const emp = employees.find(e => e.id === selectedEmployeeId);
        const violations = (data.violations || []).filter(v => v.employeeId === selectedEmployeeId);

        // This runs the full replay engine including the new Event Log
        const state = calculateUserState(violations, data.settings);

        return {
            employee: emp,
            state: state,
            events: (state.eventLog || []).sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA.getTime() !== dateB.getTime()) {
                    return dateA - dateB; // Chronological (Oldest First)
                }

                // Tie-breaker: Priority Order (Initial < Info < Violation < Demotion/Promotion)
                const priority = {
                    'initial': 0,
                    'info': 1,
                    'violation': 2,
                    'demotion': 3,
                    'promotion': 4,
                    'promotion_points': 4,
                    'freeze_skip': 5
                };

                const pA = priority[a.type] !== undefined ? priority[a.type] : 99;
                const pB = priority[b.type] !== undefined ? priority[b.type] : 99;

                return pA - pB;
            })
        };
    }, [selectedEmployeeId, data, employees]);

    // PDF Download Handler
    const handleDownloadPDF = () => {
        if (!reportData) return;
        generateFiveTierPDF(reportData);
    };

    if (!isOpen) return null;

    const getTierNumber = (tier) => {
        if (!tier || tier.level === undefined) return '-';
        return Math.max(1, 6 - tier.level); // Maps 5->1, 4->2, 3->3, 2->4, 1->5
    };

    const getDAStatusStyle = (status) => {
        if (!status) return {};
        const s = status.toLowerCase();
        if (s.includes('good')) return { color: '#10B981', fontWeight: 'bold' }; // Green
        if (s.includes('educational')) return { color: '#3B82F6', fontWeight: 'bold' }; // Blue
        if (s.includes('coaching')) return { color: '#EAB308', fontWeight: 'bold' }; // Yellow
        if (s.includes('severe')) return { color: '#F97316', fontWeight: 'bold' }; // Orange
        if (s.includes('final')) return { color: '#EF4444', fontWeight: 'bold' }; // Red
        if (s.includes('termination')) return { color: '#A855F7', fontWeight: 'bold' }; // Purple
        return { color: 'var(--text-secondary)' };
    };

    const getEventColor = (type, violationType) => {
        if (violationType === 'Early Arrival') return 'rgba(59, 130, 246, 0.1)'; // Blue
        if (violationType === 'Shift Pickup') return 'rgba(59, 130, 246, 0.1)'; // Blue
        if (type.includes('promotion')) return 'rgba(16, 185, 129, 0.1)'; // Green
        if (type.includes('reset')) return 'rgba(16, 185, 129, 0.05)'; // Evaluation/Reset Light Green
        if (type.includes('demotion')) return 'rgba(239, 68, 68, 0.1)'; // Red
        if (type.includes('violation')) return 'rgba(249, 115, 22, 0.1)'; // Orange
        if (type.includes('freeze')) return 'rgba(59, 130, 246, 0.1)'; // Blue
        return 'transparent';
    };

    const getEventIcon = (type, violationType) => {
        if (violationType === 'Early Arrival') return <Clock size={16} color="#3b82f6" />; // Blue Clock
        if (violationType === 'Shift Pickup') return <Calendar size={16} color="#3b82f6" />; // Blue Calendar
        if (type.includes('promotion')) return <Activity size={16} color="var(--accent-success)" />;
        if (type.includes('reset')) return <CheckCircle size={16} color="var(--accent-success)" />;
        if (type.includes('demotion')) return <AlertTriangle size={16} color="var(--accent-danger)" />;
        if (type.includes('violation')) return <AlertTriangle size={16} color="var(--accent-warning)" />;
        if (type.includes('freeze')) return <Shield size={16} color="#3b82f6" />;
        return <Activity size={16} color="var(--text-secondary)" />;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '2rem'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                width: '100%', maxWidth: '1000px', maxHeight: '90vh',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column',
                boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity color="var(--accent-primary)" />
                            5-Tier Policy Analysis
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>Detailed timeline of tier progressions, violations, and resets.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={!reportData}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: reportData ? 'pointer' : 'not-allowed',
                                opacity: reportData ? 1 : 0.5,
                                fontSize: '0.9rem',
                                fontWeight: 500
                            }}
                        >
                            <Download size={16} />
                            Download PDF
                        </button>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

                    {/* Controls */}
                    <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Employee</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Maybe filtering by date range later? */}
                    </div>

                    {reportData && (
                        <>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Tier</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: reportData.state.tier.color }}>
                                        {reportData.state.tier.name}
                                    </p>
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Points</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                        {reportData.state.points}
                                    </p>
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lateness Level</p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                        {reportData.state.latenessCount} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>steps</span>
                                    </p>
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Next Reset</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                        {/* Simple calculation for display: Start + 30 days */}
                                        {(() => {
                                            const next = new Date(reportData.state.tierStartDate);
                                            next.setDate(next.getDate() + 30);
                                            return next.toLocaleDateString();
                                        })()}
                                    </p>
                                </div>
                            </div>

                            {/* Timeline Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem' }}>Cycle Progress</th>
                                        <th style={{ padding: '0.75rem' }}>Event</th>
                                        <th style={{ padding: '0.75rem' }}>Escalation</th>
                                        <th style={{ padding: '0.75rem' }}>Details</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Start Pts</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Change</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>End Pts</th>
                                        <th style={{ padding: '0.75rem' }}>Tier</th>
                                        <th style={{ padding: '0.75rem' }}>DA Status</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    {reportData.events.map((ev, idx) => (
                                        <tr key={idx} style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            backgroundColor: getEventColor(ev.type, ev.violation)
                                        }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                {ev.date instanceof Date ? ev.date.toLocaleDateString() : new Date(ev.date).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                                                {ev.cycleStart && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 600 }}>Day {ev.daysInCycle}</span>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                                            Target: {ev.cycleTarget instanceof Date ? ev.cycleTarget.toLocaleDateString() : new Date(ev.cycleTarget).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {getEventIcon(ev.type, ev.violation)}
                                                    <span style={{ textTransform: 'capitalize' }}>
                                                        {ev.type === 'violation' ? (ev.violation || ev.type) : ev.type.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                {ev.escalation || '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {ev.details}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                {ev.startPoints !== undefined ? ev.startPoints : '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: ev.change > 0 ? 'var(--accent-success)' : (ev.change < 0 ? 'var(--accent-danger)' : 'inherit') }}>
                                                {ev.change ? (ev.change > 0 ? `+${ev.change}` : ev.change) : '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                                                {ev.points}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    backgroundColor: ev.tier?.color || '#ccc',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600
                                                }}>
                                                    {getTierNumber(ev.tier)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', ...getDAStatusStyle(ev.daStatus) }}>
                                                {ev.daStatus || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {reportData.events.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No history events found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FiveTierReportModal;
