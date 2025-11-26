import React, { useState, useRef } from 'react';
import { useData } from '../hooks/useData';
import { useTheme } from '../contexts/ThemeContext';
import { Save, Upload, Download, Moon, Sun, Building, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const { data, updateSettings, exportDatabase, importDatabase, reload } = useData();
    const { isDark, toggleTheme } = useTheme();
    const [importStatus, setImportStatus] = useState('');
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

                <div style={{ display: 'flex', gap: '1rem' }}>
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
                            fontWeight: '500'
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
                            fontWeight: '500'
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
