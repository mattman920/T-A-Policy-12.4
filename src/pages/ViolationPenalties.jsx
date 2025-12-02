import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { AlertTriangle, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';

const ViolationPenalties = () => {
    const { data, updateSettings } = useData();
    const navigate = useNavigate();
    const [violationPenalties, setViolationPenalties] = useState(data?.settings?.violationPenalties || {
        tardy: DEFAULT_TARDY_PENALTIES,
        callout: DEFAULT_CALLOUT_PENALTIES,
        positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
    });

    useEffect(() => {
        if (data?.settings?.violationPenalties) {
            setViolationPenalties(data.settings.violationPenalties);
        }
    }, [data]);

    const handleSave = async () => {
        await updateSettings({
            ...data.settings,
            violationPenalties
        });
        alert('Violation penalties saved successfully!');
    };

    const handleTardyChange = (type, index, value) => {
        const newTardy = { ...violationPenalties.tardy };
        const newValues = [...newTardy[type]];
        newValues[index] = parseInt(value) || 0;
        newTardy[type] = newValues;
        setViolationPenalties({ ...violationPenalties, tardy: newTardy });
    };

    const handleCalloutChange = (index, value) => {
        const newCallout = [...violationPenalties.callout];
        newCallout[index] = parseInt(value) || 0;
        setViolationPenalties({ ...violationPenalties, callout: newCallout });
    };

    const handlePositiveAdjustmentChange = (type, value) => {
        const newAdjustments = { ...violationPenalties.positiveAdjustments };
        newAdjustments[type] = parseInt(value) || 0;
        setViolationPenalties({ ...violationPenalties, positiveAdjustments: newAdjustments });
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
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Violation Penalties</h1>
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
                    <AlertTriangle size={20} /> Penalty Configuration
                </h2>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Tardiness (Points Deducted)</h3>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {Object.entries(violationPenalties.tardy || {}).map(([type, values]) => (
                            <div key={type}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>{type}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                    {values.map((val, idx) => (
                                        <div key={idx} style={{
                                            backgroundColor: 'var(--bg-primary)',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                                {idx === 3 ? '4th+' : `${idx + 1}${['st', 'nd', 'rd'][idx] || 'th'}`}
                                            </label>
                                            <input
                                                type="number"
                                                value={val}
                                                onChange={(e) => handleTardyChange(type, idx, e.target.value)}
                                                style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Callouts (Points Deducted)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
                        {(violationPenalties.callout || []).map((val, idx) => (
                            <div key={idx} style={{
                                backgroundColor: 'var(--bg-primary)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                    {idx === 5 ? '6th+' : `${idx + 1}${['st', 'nd', 'rd'][idx] || 'th'}`}
                                </label>
                                <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => handleCalloutChange(idx, e.target.value)}
                                    style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Positive Adjustments (Points Added)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                        {Object.entries(violationPenalties.positiveAdjustments || {}).map(([type, val]) => (
                            <div key={type} style={{
                                backgroundColor: 'var(--bg-primary)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    {type}
                                </label>
                                <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => handlePositiveAdjustmentChange(type, e.target.value)}
                                    style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center', color: 'var(--accent-success)' }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ViolationPenalties;
