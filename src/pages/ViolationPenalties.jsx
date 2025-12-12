import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { AlertTriangle, Save, ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    DEFAULT_TARDY_PENALTIES,
    DEFAULT_CALLOUT_PENALTY,
    SURGE_CALLOUT_PENALTY,
    SURGE_LOOKBACK_DAYS,
    DEFAULT_POSITIVE_ADJUSTMENTS,
    VIOLATION_TYPES
} from '../utils/pointCalculator';

const ViolationPenalties = () => {
    const { data, updateSettings } = useData();
    const navigate = useNavigate();

    // Initial State Setup
    // Initial State Setup
    const [violationPenalties, setViolationPenalties] = useState(() => {
        // Create a fresh deep copy of defaults to avoid reference issues
        const defaults = {
            tardy: JSON.parse(JSON.stringify(DEFAULT_TARDY_PENALTIES)),
            calloutStandard: DEFAULT_CALLOUT_PENALTY,
            calloutSurge: SURGE_CALLOUT_PENALTY,
            surgeLookback: SURGE_LOOKBACK_DAYS,
            positiveAdjustments: { ...DEFAULT_POSITIVE_ADJUSTMENTS }
        };

        // If we have saved data, merge it on top of defaults
        if (data?.settings?.violationPenalties) {
            return {
                ...defaults,
                ...data.settings.violationPenalties,
                // Ensure nested objects are also merged if they exist in saved data, 
                // but fall back to defaults if they don't (though top-level merge covers most cases)
                tardy: {
                    ...defaults.tardy,
                    ...(data.settings.violationPenalties.tardy || {})
                },
                positiveAdjustments: {
                    ...defaults.positiveAdjustments,
                    ...(data.settings.violationPenalties.positiveAdjustments || {})
                }
            };
        }

        return defaults;
    });

    // We only want to update state from 'data' if 'data' effectively changes 
    // AND it has content that might be newer/different than what we initialized with (e.g. async load).
    // However, repeatedly overwriting local state with 'data' can block user edits if 'data' re-fetches frequently.
    // A common pattern is to sync only once or strictly when data.settings.violationPenalties is definitely populated.
    useEffect(() => {
        if (data?.settings?.violationPenalties) {
            setViolationPenalties(prev => {
                // simple comparison to avoid unnecessary renders or overwrites could be added here
                // but for now, we just ensure we merge effectively.
                return {
                    ...prev,
                    ...data.settings.violationPenalties,
                    tardy: {
                        ...prev.tardy,
                        ...(data.settings.violationPenalties.tardy || {})
                    },
                    positiveAdjustments: {
                        ...prev.positiveAdjustments,
                        ...(data.settings.violationPenalties.positiveAdjustments || {})
                    }
                };
            });
        }
    }, [data?.settings?.violationPenalties]);

    const handleSave = async () => {
        await updateSettings({
            ...data.settings,
            violationPenalties
        });
        alert('Violation penalties saved successfully!');
    };

    const handleReset = async () => {
        // Debugging verification
        const firstTardy = DEFAULT_TARDY_PENALTIES[VIOLATION_TYPES.TARDY_1_5];
        if (confirm(`Reset all penalties to system defaults? \n\nStandard Callout: ${DEFAULT_CALLOUT_PENALTY} pts\nSurge Callout: ${SURGE_CALLOUT_PENALTY} pts\nTardy 1-5min: [${firstTardy.join(', ')}] pts\n\nThis will overwrite your current configurations.`)) {
            // Fresh defaults
            const defaults = {
                tardy: JSON.parse(JSON.stringify(DEFAULT_TARDY_PENALTIES)),
                calloutStandard: DEFAULT_CALLOUT_PENALTY,
                calloutSurge: SURGE_CALLOUT_PENALTY,
                surgeLookback: SURGE_LOOKBACK_DAYS,
                positiveAdjustments: { ...DEFAULT_POSITIVE_ADJUSTMENTS }
            };

            setViolationPenalties(defaults);
            // Optional: Auto-save reset
            await updateSettings({
                ...data.settings,
                violationPenalties: defaults
            });
        }
    };

    const handleTardyChange = (type, index, value) => {
        const newTardy = { ...violationPenalties.tardy };
        const newValues = [...newTardy[type]];
        newValues[index] = parseInt(value) || 0;
        newTardy[type] = newValues;
        setViolationPenalties({ ...violationPenalties, tardy: newTardy });
    };

    const handleCalloutConfigChange = (field, value) => {
        setViolationPenalties(prev => ({
            ...prev,
            [field]: parseInt(value) || 0
        }));
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
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleReset}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-danger)',
                            border: '1px solid var(--accent-danger)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RotateCcw size={18} /> Reset Defaults
                    </button>
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
            </div>

            <section style={sectionStyle}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} /> Penalty Configuration
                </h2>

                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Tardiness (Points Deducted)</h3>
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {[
                                VIOLATION_TYPES.TARDY_1_5,
                                VIOLATION_TYPES.TARDY_6_11,
                                VIOLATION_TYPES.TARDY_12_29,
                                VIOLATION_TYPES.TARDY_30_PLUS
                            ].map(type => {
                                const values = violationPenalties.tardy?.[type] || [0, 0, 0, 0];
                                return (
                                    <div key={type}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>{type}</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                            {Array.isArray(values) && values.map((val, idx) => (
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
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Callout Logic</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                                Standard Penalty
                            </label>
                            <input
                                type="number"
                                value={violationPenalties.calloutStandard}
                                onChange={(e) => handleCalloutConfigChange('calloutStandard', e.target.value)}
                                style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center' }}
                            />
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                                Surge Penalty (Within 60d)
                            </label>
                            <input
                                type="number"
                                value={violationPenalties.calloutSurge}
                                onChange={(e) => handleCalloutConfigChange('calloutSurge', e.target.value)}
                                style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center', borderColor: 'var(--accent-warning)' }}
                            />
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                                Surge Lookback (Days)
                            </label>
                            <input
                                type="number"
                                value={violationPenalties.surgeLookback}
                                onChange={(e) => handleCalloutConfigChange('surgeLookback', e.target.value)}
                                style={{ ...inputStyle, padding: '0.5rem', textAlign: 'center' }}
                            />
                        </div>
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
