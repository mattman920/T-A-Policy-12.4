import React, { useMemo } from 'react';
import { useData } from '../hooks/useData';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, VIOLATION_TYPES } from '../utils/pointCalculator';
import { Trophy, AlertCircle, Calendar } from 'lucide-react';

const Scorecard = () => {
    const { data, loading } = useData();

    const scorecardData = useMemo(() => {
        if (!data.employees) return [];

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11
        const currentQuarter = Math.floor(currentMonth / 3) + 1;

        const quarterStart = new Date(currentYear, (currentQuarter - 1) * 3, 1);
        const quarterEnd = new Date(currentYear, currentQuarter * 3, 0, 23, 59, 59);

        return data.employees
            .filter(emp => !emp.archived)
            .map(employee => {
                const empViolations = data.violations.filter(v => v.employeeId === employee.id);

                // Current Standing (All time / based on current logic)
                const currentPoints = calculateCurrentPoints(STARTING_POINTS, empViolations, data.settings.violationPenalties);
                const tier = determineTier(currentPoints);

                // Quarter specific stats
                const quarterViolations = empViolations.filter(v => {
                    const vDate = new Date(v.date);
                    return vDate >= quarterStart && vDate <= quarterEnd;
                });

                const counts = {
                    [VIOLATION_TYPES.TARDY_1_5]: 0,
                    [VIOLATION_TYPES.TARDY_6_11]: 0,
                    [VIOLATION_TYPES.TARDY_12_29]: 0,
                    [VIOLATION_TYPES.TARDY_30_PLUS]: 0,
                    [VIOLATION_TYPES.CALLOUT]: 0
                };

                quarterViolations.forEach(v => {
                    if (counts[v.type] !== undefined) {
                        counts[v.type]++;
                    }
                });

                return {
                    ...employee,
                    currentPoints,
                    tier,
                    counts
                };
            })
            .sort((a, b) => b.currentPoints - a.currentPoints);
    }, [data]);

    if (loading) return <div>Loading...</div>;

    const getQuarterLabel = () => {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `Q${q} ${now.getFullYear()}`;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Scorecard</h1>
                    <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} />
                        Performance Summary for {getQuarterLabel()}
                    </p>
                </div>
                <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <Trophy size={20} color="var(--accent-warning)" />
                    <span style={{ fontWeight: 600 }}>Top Performer: {scorecardData[0]?.name || 'N/A'}</span>
                </div>
            </div>

            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', width: '60px' }}>Rank</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Score</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Tier</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Tardy<br />(1-5)</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Tardy<br />(6-11)</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Tardy<br />(12-29)</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Tardy<br />(30+)</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Callout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scorecardData.map((emp, index) => (
                                <tr key={emp.id} style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    transition: 'background-color 0.2s'
                                }}>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                                        {emp.name}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            fontWeight: 700,
                                            color: emp.tier.color,
                                            fontSize: '1.1rem'
                                        }}>
                                            {emp.currentPoints}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            backgroundColor: emp.tier.color + '20',
                                            color: emp.tier.color
                                        }}>
                                            {emp.tier.name}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: emp.counts[VIOLATION_TYPES.TARDY_1_5] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {emp.counts[VIOLATION_TYPES.TARDY_1_5] || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: emp.counts[VIOLATION_TYPES.TARDY_6_11] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {emp.counts[VIOLATION_TYPES.TARDY_6_11] || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: emp.counts[VIOLATION_TYPES.TARDY_12_29] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {emp.counts[VIOLATION_TYPES.TARDY_12_29] || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: emp.counts[VIOLATION_TYPES.TARDY_30_PLUS] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {emp.counts[VIOLATION_TYPES.TARDY_30_PLUS] || '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', color: emp.counts[VIOLATION_TYPES.CALLOUT] > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {emp.counts[VIOLATION_TYPES.CALLOUT] || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Scorecard;
