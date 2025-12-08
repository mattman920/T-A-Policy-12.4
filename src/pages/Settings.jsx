import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { Save, Upload, Download, Moon, Sun, Building, AlertCircle, AlertTriangle, ChevronRight, RotateCcw, X, Trash2, PlusCircle, CheckCircle, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import ModernDatePicker from '../components/ModernDatePicker';

const Settings = () => {
    const { data, updateSettings, exportDatabase, importDatabase, reload, purgeOrphanedViolations } = useData();
    const { isDark, toggleTheme } = useTheme();
    const [importStatus, setImportStatus] = useState('');
    const [newReason, setNewReason] = useState('');
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, mock, error
    const [errorMessage, setErrorMessage] = useState('');
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [restoreDate, setRestoreDate] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('WARNING: This will overwrite all current data. Are you sure?')) {
            e.target.value = null;
            return;
        }

        setImportStatus('Importing...');
        const result = await importDatabase(file);
        if (result.success) {
            setImportStatus('Import successful! Reloading...');
            setTimeout(() => {
                reload();
                setImportStatus('');
            }, 1000);
        } else {
            setImportStatus(`Error: ${result.error}`);
        }
        e.target.value = null;
    };

    const sectionStyle = {
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)'
    };

    const navButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '1rem',
        textAlign: 'left'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Settings</h1>
            </div>

            {/* Appearance Section */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sun size={20} /> Appearance
                </h2>
                <button
                    onClick={toggleTheme}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: 'var(--text-primary)'
                        }}>
                            {isDark ? <Moon size={24} /> : <Sun size={24} />}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Theme Mode</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {isDark ? 'Currently in Dark Mode' : 'Currently in Light Mode'}
                            </p>
                        </div>
                    </div>
                    <div style={{
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: 'var(--text-primary)'
                    }}>
                        {isDark ? 'Switch to Light' : 'Switch to Dark'}
                    </div>
                </button>
            </section>

            {/* Protected Absence Configuration */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} /> Protected Absence Reasons
                </h2>
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <button
                            onClick={() => setIsReasonModalOpen(true)}
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <PlusCircle size={18} /> Add Reason
                        </button>
                    </div>

                    <Modal isOpen={isReasonModalOpen} onClose={() => setIsReasonModalOpen(false)} title="Add Protected Reason">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Reason Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Covid-19"
                                    value={newReason}
                                    onChange={(e) => setNewReason(e.target.value)}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setIsReasonModalOpen(false)}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-secondary)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const val = newReason.trim();
                                        if (val) {
                                            const current = data.settings.protectedAbsenceReasons || [];
                                            if (!current.includes(val)) {
                                                updateSettings({ protectedAbsenceReasons: [...current, val] });
                                                setNewReason('');
                                                setIsReasonModalOpen(false);
                                            } else {
                                                alert('Reason already exists.');
                                            }
                                        }
                                    }}
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
                                    Save
                                </button>
                            </div>
                        </div>
                    </Modal>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(data.settings.protectedAbsenceReasons || []).map(reason => (
                            <div key={reason} style={{
                                display: 'flex',
                                justifyContent: 'space-between', // Changed to space-between
                                alignItems: 'center',
                                padding: '0.75rem',
                                backgroundColor: 'var(--bg-primary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{reason}</span>
                                <button
                                    onClick={() => {
                                        if (confirm(`Remove "${reason}"?`)) {
                                            const current = data.settings.protectedAbsenceReasons || [];
                                            updateSettings({ protectedAbsenceReasons: current.filter(r => r !== reason) });
                                        }
                                    }}
                                    style={{
                                        color: 'var(--text-secondary)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                    title="Remove Reason"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {(!data.settings.protectedAbsenceReasons || data.settings.protectedAbsenceReasons.length === 0) && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No reasons configured.</p>
                        )}
                    </div>
                </div>
            </section>

            {/* Configuration Links */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} /> Configuration
                </h2>

                <button
                    onClick={() => navigate('/settings/databases')}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: 'var(--accent-primary)'
                        }}>
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Database Configuration</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Manage and switch between databases</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>

                <button
                    onClick={() => navigate('/settings/general')}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: 'var(--accent-primary)'
                        }}>
                            <Building size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>General Configuration</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Company details and starting points balance</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>

                <button
                    onClick={() => navigate('/settings/violations')}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: 'var(--accent-warning)'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Violation Penalties</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Configure point deductions for tardies and callouts</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>

                <button
                    onClick={() => navigate('/settings/da')}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: '#10B981'
                        }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>DA Configuration</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Configure DA thresholds and stages</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>
            </section>

            {/* Policy Configuration Section */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} /> Policy Configuration
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            Stabilization Period (Days)
                        </label>
                        <input
                            type="number"
                            defaultValue={data.settings?.stabilizationDays || 30}
                            onBlur={(e) => updateSettings({ stabilizationDays: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Days required to climb a tier.
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            Surge Lookback (Days)
                        </label>
                        <input
                            type="number"
                            defaultValue={data.settings?.calloutSurgeLookbackDays || 60}
                            onBlur={(e) => updateSettings({ calloutSurgeLookbackDays: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Rolling window for counting callouts.
                        </p>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            Standard Callout Deduction
                        </label>
                        <input
                            type="number"
                            defaultValue={data.settings?.standardCalloutDeduction || 24}
                            onBlur={(e) => updateSettings({ standardCalloutDeduction: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                            Surge Deduction Points
                        </label>
                        <input
                            type="number"
                            defaultValue={data.settings?.surgeDeductionPoints || 40}
                            onBlur={(e) => updateSettings({ surgeDeductionPoints: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Applied if callouts {'>'} 0 in lookback.
                        </p>
                    </div>
                </div>
            </section>

            {/* AI Configuration */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} /> AI Configuration
                </h2>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                        Google Gemini API Key
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="password"
                                defaultValue={data.settings?.geminiApiKey || ''}
                                onBlur={(e) => {
                                    if (e.target.value !== data.settings?.geminiApiKey) {
                                        updateSettings({ geminiApiKey: e.target.value });
                                    }
                                }}
                                placeholder="Enter your API Key"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                                name="geminiApiKey"
                                id="geminiApiKey"
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                Required for generating AI-powered Health Check reports.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                setTestStatus('testing');
                                setErrorMessage('');
                                try {
                                    const { generateHealthCheckFeedback } = await import('../services/aiService');
                                    const dummyPayload = {
                                        score: 150,
                                        stage: 'Green',
                                        stageLabel: 'Green',
                                        recentViolations: 'None'
                                    };
                                    const result = await generateHealthCheckFeedback(dummyPayload, data.settings?.geminiApiKey);
                                    if (result.source === 'Gemini AI') {
                                        setTestStatus('success');
                                    } else {
                                        setTestStatus('mock');
                                        if (result.error) {
                                            setErrorMessage(result.error);
                                        }
                                    }
                                } catch (err) {
                                    console.error(err);
                                    setTestStatus('error');
                                    setErrorMessage(err.message);
                                }
                            }}
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                height: '42px'
                            }}
                        >
                            {testStatus === 'testing' ? 'Testing...' : 'Test Key'}
                        </button>
                    </div>

                    {testStatus === 'success' && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>✓</span> API Key Verified & Working
                        </div>
                    )}
                    {testStatus === 'mock' && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={16} />
                            <span>
                                Key Invalid or Missing - Using Mock Generator
                                {errorMessage && <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>Error: {errorMessage}</span>}
                            </span>
                        </div>
                    )}
                    {testStatus === 'error' && (
                        <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} />
                            <span>
                                Connection Failed
                                {errorMessage && <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.9 }}>Error: {errorMessage}</span>}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* Diagnostics Section */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} /> System Diagnostics
                </h2>
                <button
                    onClick={() => import('../utils/testLogic').then(module => module.runTestsAndDownloadReport())}
                    style={navButtonStyle}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '50%',
                            color: '#8b5cf6'
                        }}>
                            <Download size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Test Logic & Generate Report</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Run comprehensive logic tests and download detailed PDF report</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>
            </section>

            {/* Data Management Section */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                    <Save size={20} /> Data Management
                </h2>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <h3 style={{ color: '#d97706', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertCircle size={18} /> Backup & Restore
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Regularly backup your data to prevent loss. Restoring will overwrite all current data.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={exportDatabase}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontWeight: '500',
                            minWidth: '200px'
                        }}
                    >
                        <Download size={20} /> Export Backup
                    </button>

                    <button
                        onClick={() => fileInputRef.current.click()}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontWeight: '500',
                            minWidth: '200px'
                        }}
                    >
                        <Upload size={20} /> Restore Backup
                    </button>


                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".json"
                        style={{ display: 'none' }}
                    />

                    <button
                        onClick={purgeOrphanedViolations}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--accent-warning)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            cursor: 'pointer',
                            color: 'var(--accent-warning)',
                            fontWeight: '500',
                            minWidth: '200px'
                        }}
                    >
                        <AlertTriangle size={20} /> Fix Import Issues
                    </button>
                </div>
                {
                    importStatus && (
                        <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: '500', color: importStatus.includes('Error') ? 'red' : 'green' }}>
                            {importStatus}
                        </p>
                    )
                }
            </section>

            {/* Data Reset Section */}
            <section style={{ ...sectionStyle, borderColor: 'var(--accent-danger)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-danger)' }}>
                    <RotateCcw size={20} /> Data Reset & Restore
                </h2>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(185, 28, 28, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(185, 28, 28, 0.2)' }}>
                    <h3 style={{ color: 'var(--accent-danger)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertCircle size={18} /> Manage Historical Data
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        You can effectively "reset" the application state by ignoring all violations prior to a specific date. This does not delete data, so it can be restored at any time.
                    </p>
                    {data.settings?.resetEffectiveDate && (
                        <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                Current Status: Data Reset Active (Effective {new Date(data.settings.resetEffectiveDate).toLocaleDateString()})
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    {!data.settings?.resetEffectiveDate ? (
                        <button
                            onClick={() => {
                                if (confirm("Are you sure you want to perform a Data Reset?\n\nThis will ignore all previous violations for points and tier calculations starting NOW.\n\nNo data will be deleted, and you can undo this action.")) {
                                    updateSettings({ resetEffectiveDate: new Date().toISOString() });
                                }
                            }}
                            style={{
                                ...navButtonStyle,
                                borderColor: 'var(--accent-danger)',
                                backgroundColor: 'rgba(185, 28, 28, 0.05)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = 'rgba(185, 28, 28, 0.05)';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '50%',
                                    color: 'var(--accent-danger)'
                                }}>
                                    <RotateCcw size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-danger)', marginBottom: '0.25rem' }}>Perform Data Reset</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ignore all current history and start fresh from today</p>
                                </div>
                            </div>
                            <ChevronRight size={20} color="var(--text-secondary)" />
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsRestoreModalOpen(true)}
                            style={{
                                ...navButtonStyle,
                                borderColor: '#10B981',
                                backgroundColor: 'rgba(16, 185, 129, 0.05)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '50%',
                                    color: '#10B981'
                                }}>
                                    <RotateCcw size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#10B981', marginBottom: '0.25rem' }}>Restore Historical Data</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Modify reset date or restore all history</p>
                                </div>
                            </div>
                            <ChevronRight size={20} color="var(--text-secondary)" />
                        </button>
                    )}
                </div>
            </section>

            <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="Restore Data Options">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Choose how much data you want to restore. You can restore everything, or only data after a specific date.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Option A: Partial Restore (From Date)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <ModernDatePicker
                                value={restoreDate}
                                onChange={setRestoreDate}
                            />
                            <button
                                onClick={() => {
                                    if (restoreDate) {
                                        if (confirm(`Confirm Partial Restore?\n\nOnly violations ON or AFTER ${new Date(restoreDate).toLocaleDateString()} will be counted.\nPrior history remains hidden.`)) {
                                            // Set effective date to midnight of selected date
                                            // Note: inputs return YYYY-MM-DD.
                                            // We usually want to ensure we capture the whole day, so maybe set to that date at 00:00:00
                                            const d = new Date(restoreDate);
                                            // Handle timezone offset if needed, but usually simple string is enough if parsed correctly
                                            // Let's store as full ISO string for consistency
                                            // Ideally, use local time midnight
                                            const localDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
                                            updateSettings({ resetEffectiveDate: localDate.toISOString() });
                                            setIsRestoreModalOpen(false);
                                        }
                                    } else {
                                        alert('Please select a date first.');
                                    }
                                }}
                                disabled={!restoreDate}
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: 600,
                                    cursor: restoreDate ? 'pointer' : 'not-allowed',
                                    opacity: restoreDate ? 1 : 0.6
                                }}
                            >
                                Restore From Date
                            </button>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            This effectively changes the "Reset Date" to the date you select.
                        </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <label style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>Option B: Full Restore</label>
                        <button
                            onClick={() => {
                                if (confirm("Confirm FULL Restore?\n\nALL historical data from the beginning of time will be reinstated.\nThe reset will be completely removed.")) {
                                    updateSettings({ resetEffectiveDate: null });
                                    setIsRestoreModalOpen(false);
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'transparent',
                                border: '2px solid #10B981',
                                color: '#10B981',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <RotateCcw size={18} /> Restore Everything (Remove Reset)
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
