import React, { useState } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { Download, Calendar, User, Users } from 'lucide-react';
import { generateHealthCheckPDFsFromData } from '../utils/pdfGeneratorHealthCheck';
import { calculateCurrentPoints, determineTier, calculateQuarterlyStart, TIERS } from '../utils/pointCalculator';
import { getQuarterKey } from '../utils/dateUtils';
import { getHealthStage, prepareAiPayload } from '../services/healthCheckService';
import { generateHealthCheckFeedback } from '../services/aiService';

const HealthCheckModal = ({ isOpen, onClose }) => {
    const { data } = useData();
    const [selectionType, setSelectionType] = useState('specific'); // 'specific' or 'all'
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentName: '' });
    const [error, setError] = useState('');

    const employees = (data?.employees || []).filter(e => !e.archived);

    const getQuarterDateRange = (date) => {
        const d = new Date(date);
        const quarter = Math.floor((d.getMonth() + 3) / 3);
        const startMonth = (quarter - 1) * 3;
        const start = new Date(d.getFullYear(), startMonth, 1);
        const end = new Date(d.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
        return { start, end };
    };

    const handleGenerate = async () => {
        setProcessing(true);
        setError('');
        setProgress({ current: 0, total: 0, currentName: '' });

        try {
            let targetEmployees = [];
            if (selectionType === 'specific') {
                if (!selectedEmployeeId) {
                    setError('Please select an employee.');
                    setProcessing(false);
                    return;
                }
                const emp = employees.find(e => e.id === selectedEmployeeId);
                if (emp) targetEmployees.push(emp);
            } else {
                targetEmployees = employees;
            }

            if (targetEmployees.length === 0) {
                setError('No employees found to report on.');
                setProcessing(false);
                return;
            }

            setProgress({ current: 0, total: targetEmployees.length, currentName: '' });

            const results = [];
            const violations = data.violations || [];
            const penalties = data.settings?.violationPenalties || {};
            const daSettings = data.settings?.daSettings;
            const issuedDAs = data.issuedDAs || [];

            // Date logic
            const reportEnd = new Date(endDate);
            // Adjust end date to include the full day
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            const startDateTime = new Date(startDate);

            const { start: quarterStart, end: quarterEnd } = getQuarterDateRange(reportEnd);

            for (let i = 0; i < targetEmployees.length; i++) {
                const employee = targetEmployees[i];
                setProgress(prev => ({ ...prev, current: i + 1, currentName: employee.name }));

                // 1. Calculate Score
                const empViolationsAll = violations.filter(v => v.employeeId === employee.id);
                const empViolationsInQuarter = empViolationsAll.filter(v => {
                    const d = new Date(v.date);
                    return d >= quarterStart && d <= quarterEnd;
                });
                const qKey = getQuarterKey(quarterStart);
                const startPoints = calculateQuarterlyStart(qKey, violations, data.settings);
                const currentScore = calculateCurrentPoints(startPoints, empViolationsInQuarter, penalties);

                // Violations in range
                const empViolationsInRange = empViolationsAll.filter(v => {
                    const d = new Date(v.date);
                    return d >= startDateTime && d <= endDateTime;
                });

                // 2. Get Health Stage & AI Feedback
                const stage = getHealthStage(currentScore, daSettings);
                const tier = determineTier(currentScore, daSettings);
                const aiPayload = prepareAiPayload(employee, currentScore, empViolationsInRange, daSettings);

                // Call AI
                const aiFeedback = await generateHealthCheckFeedback(aiPayload, data.settings?.geminiApiKey);

                results.push({
                    employee,
                    currentScore,
                    stage,
                    tier,
                    empViolationsInRange,
                    empViolationsInQuarter,
                    aiFeedback,
                    startDate,
                    endDate,
                    daSettings,
                    issuedDAs
                });

                // Throttling: Wait 15 seconds if not the last one
                if (i < targetEmployees.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 15000));
                }
            }

            setProgress(prev => ({ ...prev, currentName: 'Generating PDFs...' }));

            // Generate PDFs
            await generateHealthCheckPDFsFromData(results);

            onClose();
        } catch (err) {
            console.error("Error generating report:", err);
            setError(err.message || 'Failed to generate report. See console for details.');
        } finally {
            setProcessing(false);
            setProgress({ current: 0, total: 0, currentName: '' });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Employee Health Check Report">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <Users size={20} color="var(--accent-success)" style={{ marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-success)' }}>Health Check Report</h4>
                            {data.settings?.geminiApiKey ? (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: 'var(--accent-success)', color: 'white', fontWeight: 600 }}>
                                    Gemini AI Active
                                </span>
                            ) : (
                                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: 'var(--accent-warning)', color: 'white', fontWeight: 600 }}>
                                    Using Mock Generator
                                </span>
                            )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Generates a gamified attendance report with AI-driven feedback. Select an employee and date range to analyze violations and generate a health score.
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                {/* Selection Type */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Report For</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => setSelectionType('specific')}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: selectionType === 'specific' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                backgroundColor: selectionType === 'specific' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontWeight: selectionType === 'specific' ? 600 : 400
                            }}
                        >
                            <User size={16} /> Specific Employee
                        </button>
                        <button
                            onClick={() => setSelectionType('all')}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: selectionType === 'all' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                backgroundColor: selectionType === 'all' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontWeight: selectionType === 'all' ? 600 : 400
                            }}
                        >
                            <Users size={16} /> All Active Employees
                        </button>
                    </div>
                    {selectionType === 'all' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>⏱️</span> Estimated Time: ~{Math.ceil((employees.length * 15) / 60)} minutes
                            </p>
                            <p style={{ margin: '0.25rem 0 0 1.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Processing {employees.length} employees (15s delay each). Please do not close this window.
                            </p>
                        </div>
                    )}
                </div>

                {/* Employee Selector (if specific) */}
                {selectionType === 'specific' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Select Employee</label>
                        <select
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                        >
                            <option value="">-- Select Employee --</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Date Range */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={processing}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: processing ? 'not-allowed' : 'pointer',
                            opacity: processing ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {processing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span className="animate-spin">⌛</span>
                                    <span>{progress.currentName ? `Processing ${progress.currentName}...` : 'Initializing...'}</span>
                                </div>
                                {progress.total > 0 && (
                                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${(progress.current / progress.total) * 100}%`,
                                                height: '100%',
                                                backgroundColor: 'var(--accent-primary)',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                )}
                                {progress.total > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {progress.current} of {progress.total}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <><Download size={18} /> Generate Report</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default HealthCheckModal;
