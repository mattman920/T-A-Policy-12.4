import React, { useState, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { Building, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GeneralConfiguration = () => {
    const { data, updateSettings } = useData();
    const navigate = useNavigate();
    const [companyName, setCompanyName] = useState(data?.settings?.companyName || 'Attendance');
    const [startingPoints, setStartingPoints] = useState(data?.settings?.startingPoints || 25);

    useEffect(() => {
        if (data?.settings) {
            setCompanyName(data.settings.companyName);
            setStartingPoints(data.settings.startingPoints);
        }
    }, [data]);

    const handleSave = async () => {
        await updateSettings({
            ...data.settings,
            companyName,
            startingPoints: parseInt(startingPoints)
        });
        alert('General configuration saved successfully!');
    };

    const sectionStyle = {
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)'
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        transition: 'border-color 0.2s',
        fontWeight: '500',
        fontSize: '1rem'
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate('/settings')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>General Configuration</h1>
                </div>
                <button
                    onClick={handleSave}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--accent-primary)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: 'var(--shadow-md)'
                    }}
                >
                    <Save size={18} /> Save Changes
                </button>
            </div>

            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={20} /> Company Details
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Company Name</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Displayed in sidebar and reports.</p>
                    </div>

                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Starting Points Balance</label>
                        <input
                            type="number"
                            value={startingPoints}
                            onChange={(e) => setStartingPoints(e.target.value)}
                            style={{ ...inputStyle, textAlign: 'center' }}
                        />
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Default points for new employees.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default GeneralConfiguration;
