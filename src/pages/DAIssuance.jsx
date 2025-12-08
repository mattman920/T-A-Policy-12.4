import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { getRequiredDAs, getFreezeStatus } from '../services/daService'; // Updated import
import { CheckCircle, AlertTriangle, Shield, Clock, Archive } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const DAIssuance = () => {
    const { data, loading, issueDA } = useData();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterTier = searchParams.get('filter') || 'All';
    const [viewMode, setViewMode] = useState('pending'); // 'pending' | 'issued'

    const issuedDAs = data?.issuedDAs || [];
    const employees = data?.employees || [];
    const violations = data?.violations || [];
    const settings = data?.settings || {};

    // 1. Calculate All DAs (Pending & Issued)
    const allDAs = useMemo(() => {
        if (!data) return [];
        const required = [];
        employees.forEach(emp => {
            if (emp.archived) return;
            const empDAs = getRequiredDAs(emp, violations, settings, issuedDAs);
            required.push(...empDAs);
        });
        return required.map(da => ({
            ...da,
            name: da.employeeName,
            daKey: da.key
        }));
    }, [employees, violations, settings, issuedDAs, data]);

    // 2. Filter DAs based on View Mode and Filter Tier
    const displayedDAs = useMemo(() => {
        return allDAs.filter(da => {
            const matchesMode = da.status === viewMode;
            const matchesTier = filterTier === 'All' || da.tier.includes(filterTier);
            return matchesMode && matchesTier;
        }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
    }, [allDAs, viewMode, filterTier]);


    // 3. Calculate Freeze Status for all employees
    const frozenEmployees = useMemo(() => {
        if (!data) return [];
        return employees
            .filter(e => !e.archived)
            .map(emp => {
                const status = getFreezeStatus(emp, violations, settings);
                return { ...emp, ...status };
            })
            // Filter to show interesting ones: Frozen OR has drops (at risk)
            .filter(e => e.isFrozen || e.dropCountFromTier1 > 0)
            .sort((a, b) => {
                if (a.isFrozen && !b.isFrozen) return -1;
                if (!a.isFrozen && b.isFrozen) return 1;
                return b.dropCountFromTier1 - a.dropCountFromTier1;
            });
    }, [employees, violations, settings, data]);


    const handleIssueDA = async (daKey) => {
        if (window.confirm('Confirm that you have issued this Disciplinary Action?')) {
            await issueDA(daKey);
        }
    };

    if (loading) return <div>Loading...</div>;

    const tierColors = {
        'Educational Stage': '#3b82f6', // Blue
        'Coaching': '#eab308',         // Yellow
        'Severe': '#f97316',           // Orange
        'Final': '#ef4444',            // Red
        'Termination': '#a855f7',      // Purple
        'Termination Review': '#a855f7' // Purple
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Disciplinary Action Issuance</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track and issue required disciplinary actions.</p>
            </div>

            {/* Freeze Watch Section */}
            {frozenEmployees.length > 0 && (
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Shield color="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Freeze Watch & Logic Tracker</h2>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        {frozenEmployees.map(emp => {
                            // Highlight red if 2/3 drops (at risk)
                            const atRisk = emp.dropCountFromTier1 >= 2;
                            return (
                                <div key={emp.id} style={{
                                    backgroundColor: emp.isFrozen ? '#eff6ff' : 'var(--bg-secondary)',
                                    border: emp.isFrozen ? '1px solid #bfdbfe' : (atRisk ? '2px solid #3b82f6' : '1px solid var(--border-color)'),
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontWeight: 600, fontSize: '1.1rem', color: atRisk && !emp.isFrozen ? '#1e40af' : 'inherit' }}>{emp.name}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                {emp.isFrozen && (
                                                    <span style={{
                                                        backgroundColor: '#2563eb', color: 'white',
                                                        fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold'
                                                    }}>
                                                        FROZEN
                                                    </span>
                                                )}
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    Tier 1 Drops (12mo): <strong style={{ color: atRisk ? '#2563eb' : 'inherit' }}>{emp.dropCountFromTier1} / 3</strong>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                        {/* Active Freeze Timer */}
                                        {emp.isFrozen ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af', fontWeight: 600 }}>
                                                    <Clock size={16} />
                                                    {emp.daysRemaining} Days Left in Freeze
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#60a5fa' }}>
                                                    Until {new Date(emp.freezeUntil).toLocaleDateString()}
                                                </div>
                                            </>
                                        ) : (
                                            /* Drop Count Reset Timer */
                                            emp.daysUntilDropReset > 0 && (
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Clock size={14} />
                                                        <span>{emp.daysUntilDropReset} Days until oldest drop expires</span>
                                                    </div>
                                                    {emp.dropResetDate && (
                                                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                                                            (Resets count on {new Date(emp.dropResetDate).toLocaleDateString()})
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                        {!emp.isFrozen && !emp.daysUntilDropReset && (
                                            <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>
                                                Use Caution
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabs for View Mode */}
            <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
                <button
                    onClick={() => setViewMode('pending')}
                    style={{
                        padding: '0.75rem 0',
                        borderBottom: viewMode === 'pending' ? '2px solid var(--accent-primary)' : 'none',
                        color: viewMode === 'pending' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        background: 'none',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Action Required ({allDAs.filter(d => d.status === 'pending').length})
                </button>
                <button
                    onClick={() => setViewMode('issued')}
                    style={{
                        padding: '0.75rem 0',
                        borderBottom: viewMode === 'issued' ? '2px solid var(--text-primary)' : 'none',
                        color: viewMode === 'issued' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        background: 'none',
                        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Archive size={16} />
                    Previously Issued
                </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {['All', 'Coaching', 'Severe', 'Final', 'Termination'].map(t => (
                    <button
                        key={t}
                        onClick={() => setSearchParams({ filter: t })}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '99px',
                            backgroundColor: filterTier === t ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: filterTier === t ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Main List */}
            {displayedDAs.length === 0 ? (
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-secondary)'
                }}>
                    <CheckCircle size={48} color="var(--accent-success)" style={{ marginBottom: '1rem' }} />
                    <h3>{viewMode === 'pending' ? 'All Caught Up!' : 'No History Found'}</h3>
                    <p>No {viewMode} disciplinary actions found for this category.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {displayedDAs.map(da => (
                        <div key={da.daKey} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-sm)',
                            borderLeft: `4px solid ${tierColors[da.tier] || 'var(--border-color)'}`,
                            opacity: viewMode === 'issued' ? 0.7 : 1
                        }}>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{da.name}</h3>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <span>Trigger Date: <strong>{da.date}</strong></span>
                                    <span>Action: <strong style={{ color: tierColors[da.tier] || 'inherit' }}>{da.tier}</strong></span>
                                </div>
                                <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                    Reason: {da.reason}
                                </div>
                            </div>

                            {viewMode === 'pending' ? (
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
                                        boxShadow: 'var(--shadow-sm)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <AlertTriangle size={18} />
                                    Mark Issued
                                </button>
                            ) : (
                                <div style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#e5e7eb',
                                    color: '#374151',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>
                                    Issued
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DAIssuance;
