import React from 'react';
import { useData } from '../contexts/DataContext';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, TIERS } from '../utils/pointCalculator';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const DAIssuance = () => {
    const { data, loading, issueDA } = useData();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterTier = searchParams.get('filter') || 'All';

    // State to track issued DAs is now in data context
    const issuedDAs = data?.issuedDAs || [];

    if (loading) return <div>Loading...</div>;

    const employees = data?.employees || [];
    const violations = data?.violations || [];

    // Identify pending DAs
    const pendingDAs = employees.map(emp => {
        const empViolations = violations.filter(v => v.employeeId === emp.id);
        const points = calculateCurrentPoints(data.settings.startingPoints, empViolations, data.settings.violationPenalties);
        const tier = determineTier(points);

        // Check if this specific DA instance (Employee + Tier) has been issued
        // A simple key: "EmpID-TierName"
        const daKey = `${emp.id}-${tier.name}`;
        const isIssued = issuedDAs.includes(daKey);

        if (tier.name !== 'Good Standing' && !isIssued) {
            return {
                ...emp,
                points,
                tier: tier.name,
                daKey
            };
        }
        return null;
    }).filter(Boolean);

    // Filter based on URL param
    const filteredDAs = filterTier === 'All'
        ? pendingDAs
        : pendingDAs.filter(da => da.tier.includes(filterTier));

    const handleIssueDA = async (daKey) => {
        if (window.confirm('Confirm that you have issued this Disciplinary Action?')) {
            await issueDA(daKey);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Disciplinary Action Issuance</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track and issue required disciplinary actions.</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                {['All', 'Coaching', 'Severe', 'Final', 'Termination'].map(t => (
                    <button
                        key={t}
                        onClick={() => {
                            setSearchParams({ filter: t });
                        }}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '99px',
                            backgroundColor: filterTier === t ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: filterTier === t ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {filteredDAs.length === 0 ? (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-secondary)'
                }}>
                    <CheckCircle size={48} color="var(--accent-success)" style={{ marginBottom: '1rem' }} />
                    <h3>All Caught Up!</h3>
                    <p>No pending disciplinary actions found for this category.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredDAs.map(da => (
                        <div key={da.daKey} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            borderLeft: `4px solid ${da.tier === 'Termination Review' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`
                        }}>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{da.name}</h3>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <span>Points: <strong>{da.points}</strong></span>
                                    <span>Action Required: <strong style={{ color: 'var(--accent-primary)' }}>{da.tier}</strong></span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleIssueDA(da.daKey)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                <AlertTriangle size={18} />
                                Mark Issued
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DAIssuance;
