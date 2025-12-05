import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, Info } from 'lucide-react';

const DASettings = () => {
    const { data, updateSettings } = useData();
    const navigate = useNavigate();
    const [settings, setSettings] = useState({
        educational: 125,
        coaching: 100,
        severe: 75,
        final: 50
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (data.settings?.daSettings) {
            setSettings(data.settings.daSettings);
        }
    }, [data.settings]);

    const handleChange = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: parseInt(value) || 0
        }));
        setError('');
        setMessage('');
    };

    const handleSave = async () => {
        // Validation
        if (settings.educational <= settings.coaching) {
            setError('Educational threshold must be higher than Coaching threshold.');
            return;
        }
        if (settings.coaching <= settings.severe) {
            setError('Coaching threshold must be higher than Severe threshold.');
            return;
        }
        if (settings.severe <= settings.final) {
            setError('Severe threshold must be higher than Final threshold.');
            return;
        }

        // Validation: Educational threshold cannot be equal to or greater than max points (Starting Points)
        const maxPoints = data.settings.startingPoints || 150;
        if (settings.educational >= maxPoints) {
            setError(`Educational threshold must be lower than the maximum starting points (${maxPoints}).`);
            return;
        }

        await updateSettings({ daSettings: settings });
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        marginTop: '0.5rem'
    };

    const sectionStyle = {
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/settings')}
                    style={{
                        padding: '0.5rem',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>DA Configuration</h1>
            </div>

            <section style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-warning)' }}>
                    <AlertTriangle size={24} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>Threshold Settings</h2>
                </div>

                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Configure the point thresholds for each Disciplinary Action (DA) stage.
                    When an employee's score drops to or below these values, they will enter the respective stage.
                </p>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                        <label style={{ fontWeight: '600', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Educational Stage (Green)
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Current: {settings.educational}
                            </span>
                        </label>
                        <input
                            type="number"
                            value={settings.educational}
                            onChange={(e) => handleChange('educational', e.target.value)}
                            style={inputStyle}
                        />

                    </div>

                    <div>
                        <label style={{ fontWeight: '600', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Coaching DA (Yellow)
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Current: {settings.coaching}
                            </span>
                        </label>
                        <input
                            type="number"
                            value={settings.coaching}
                            onChange={(e) => handleChange('coaching', e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ fontWeight: '600', color: '#F97316', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Severe DA (Orange)
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Current: {settings.severe}
                            </span>
                        </label>
                        <input
                            type="number"
                            value={settings.severe}
                            onChange={(e) => handleChange('severe', e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ fontWeight: '600', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Final DA (Red)
                            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Current: {settings.final}
                            </span>
                        </label>
                        <input
                            type="number"
                            value={settings.final}
                            onChange={(e) => handleChange('final', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>

                {error && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={20} />
                        {error}
                    </div>
                )}

                {message && (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Info size={20} />
                        {message}
                    </div>
                )}

                <button
                    onClick={handleSave}
                    style={{
                        marginTop: '2rem',
                        width: '100%',
                        padding: '1rem',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Save size={20} />
                    Save Configuration
                </button>
            </section>
        </div>
    );
};

export default DASettings;
