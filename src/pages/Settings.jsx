import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { Save, Upload, Download, Moon, Sun, Building, AlertCircle, AlertTriangle, ChevronRight, RotateCcw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const { data, updateSettings, exportDatabase, importDatabase, reload } = useData();
    const { isDark, toggleTheme } = useTheme();
    const [importStatus, setImportStatus] = useState('');
    const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, mock, error
    const [errorMessage, setErrorMessage] = useState('');
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

    const handleResetDatabase = async () => {
        if (!confirm('WARNING: This will completely WIPE the local database and localStorage. Only do this if you are experiencing synchronization errors. Are you sure?')) {
            return;
        }

        try {
            // Clear IndexedDB
            const dbs = await window.indexedDB.databases();
            for (const db of dbs) {
                window.indexedDB.deleteDatabase(db.name);
            }

            // Clear LocalStorage (often holds Fireproof keys/identity)
            localStorage.clear();

            alert('Database and LocalStorage cleared. Reloading...');
            window.location.reload();
        } catch (error) {
            console.error('Error clearing database:', error);
            alert('Failed to clear database. Please try manually in DevTools.');
        }
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

            {/* Configuration Links */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} /> Configuration
                </h2>

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

            {/* Quarterly Management Section */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={20} /> Quarterly Management
                </h2>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h3 style={{ color: 'var(--accent-danger)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <AlertTriangle size={18} /> Danger Zone
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Actions here can override standard system logic. Use with caution.
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (confirm("WARNING: This will reset everyone to 150 points for the CURRENT quarter, overriding all rollover logic. This cannot be undone. Are you sure?")) {
                            const now = new Date();
                            const q = Math.floor(now.getMonth() / 3) + 1;
                            const key = `${now.getFullYear()}-Q${q}`;

                            const currentPurges = data.settings.quarterlyPurges || {};
                            const newPurges = { ...currentPurges, [key]: true };

                            updateSettings({ quarterlyPurges: newPurges });
                            alert(`Quarter ${key} purged. All employees reset to 150 points.`);
                        }
                    }}
                    style={{
                        ...navButtonStyle,
                        borderColor: 'var(--accent-danger)',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Quarter Purge</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Reset all employees to 150 points for the current quarter</p>
                        </div>
                    </div>
                    <ChevronRight size={20} color="var(--text-secondary)" />
                </button>

                {data.settings?.quarterlyPurges && Object.keys(data.settings.quarterlyPurges).length > 0 && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Active Purges
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {Object.keys(data.settings.quarterlyPurges).map(key => (
                                <div key={key} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-danger)' }}></div>
                                        {key}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to remove the purge for ${key}? This will restore normal rollover logic for this quarter.`)) {
                                                const newPurges = { ...data.settings.quarterlyPurges };
                                                delete newPurges[key];
                                                updateSettings({ quarterlyPurges: newPurges });
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            color: 'var(--text-secondary)',
                                            borderRadius: '4px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                            e.currentTarget.style.color = 'var(--accent-danger)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                        title="Remove Purge"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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

                    <button
                        onClick={handleResetDatabase}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--accent-danger)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            cursor: 'pointer',
                            color: 'var(--accent-danger)',
                            fontWeight: '500',
                            minWidth: '200px'
                        }}
                    >
                        <RotateCcw size={20} /> Reset Database
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                        accept=".json"
                        style={{ display: 'none' }}
                    />
                </div>
                {importStatus && (
                    <p style={{ marginTop: '1rem', textAlign: 'center', fontWeight: '500', color: importStatus.includes('Error') ? 'red' : 'green' }}>
                        {importStatus}
                    </p>
                )}
            </section>
        </div>
    );
};

export default Settings;
