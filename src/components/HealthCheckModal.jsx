import React, { useState } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { Download, User, Users, CheckCircle } from 'lucide-react';
import { generateHealthCheckPDFsFromData } from '../utils/pdfGeneratorHealthCheck';
import { generateEmployeeHealthData } from '../services/healthCheckDataService';
import { generateSummary } from '../services/summaryGenerator';

const HealthCheckModal = ({ isOpen, onClose }) => {
    const { data } = useData();
    const [selectionType, setSelectionType] = useState('specific'); // 'specific' or 'all'
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentName: '' });
    const [error, setError] = useState('');

    const employees = (data?.employees || []).filter(e => !e.archived);

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
            const settings = data.settings || {};
            const apiKey = settings.geminiApiKey;

            for (let i = 0; i < targetEmployees.length; i++) {
                const employee = targetEmployees[i];
                setProgress(prev => ({ ...prev, current: i + 1, currentName: employee.name }));

                // 1. Generate Data Payload
                const healthData = generateEmployeeHealthData(employee, violations, settings, new Date());

                // 2. Generate Smart Summary (Deterministic)
                const smartSummary = generateSummary(healthData);

                // Inject summary back into context
                healthData.aiContext.summary = smartSummary;

                results.push(healthData);

                // Small delay just to not freeze UI if list is huge
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
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

                {/* Header Info */}
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <CheckCircle size={20} color="var(--accent-success)" style={{ marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-success)' }}>Ready to Generate</h4>
                            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: 'var(--accent-success)', color: 'white', fontWeight: 600 }}>
                                Smart Summary Active
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Generates a professional attendance status report including stabilization metrics, violation history, and actionable feedback.
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                {/* Selection Type Group */}
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
                                color: selectionType === 'specific' ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
                                color: selectionType === 'all' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: selectionType === 'all' ? 600 : 400
                            }}
                        >
                            <Users size={16} /> All Active Employees
                        </button>
                    </div>

                    {/* Warning for Batch Mode */}
                    {selectionType === 'all' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>⚠️</span> Batch Generation Active
                            </p>
                            <p style={{ margin: '0.25rem 0 0 1.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                This will open {employees.length} separate tabs. <br />
                                <strong>Please allow popups</strong> and ensure you save each one.
                            </p>
                        </div>
                    )}
                </div>

                {/* Specific Employee Selector */}
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

                {/* Footer Buttons */}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="animate-spin">⌛</span>
                                    <span>{progress.currentName ? `Processing ${progress.currentName}...` : 'Initializing...'}</span>
                                </div>
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
