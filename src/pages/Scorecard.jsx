import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, VIOLATION_TYPES, groupConsecutiveCallouts, calculateQuarterlyStart } from '../utils/pointCalculator';
import { Trophy, AlertCircle, Calendar } from 'lucide-react';

const Scorecard = () => {
    const { data, loading } = useData();

    // State for selected quarter
    const [selectedQuarter, setSelectedQuarter] = React.useState(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const q = Math.floor(currentMonth / 3) + 1;
        return `${currentYear}-Q${q}`;
    });

    // Generate available quarters (current year and previous year)
    const availableQuarters = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentQ = Math.floor(currentMonth / 3) + 1;

        const quarters = [];

        // Add quarters for current year up to current quarter
        for (let q = currentQ; q >= 1; q--) {
            quarters.push({
                id: `${currentYear}-Q${q}`,
                label: `Q${q} ${currentYear}`,
                year: currentYear,
                quarter: q
            });
        }

        // Add all quarters for previous year
        const prevYear = currentYear - 1;
        for (let q = 4; q >= 1; q--) {
            quarters.push({
                id: `${prevYear}-Q${q}`,
                label: `Q${q} ${prevYear}`,
                year: prevYear,
                quarter: q
            });
        }

        return quarters;
    }, []);

    const scorecardData = useMemo(() => {
        if (!data.employees) return [];

        // Parse selected quarter
        const [yearStr, qStr] = selectedQuarter.split('-');
        const year = parseInt(yearStr);
        const quarter = parseInt(qStr.replace('Q', ''));

        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0, 23, 59, 59);

        return data.employees
            .filter(emp => !emp.archived)
            .map(employee => {
                const empViolations = data.violations.filter(v => v.employeeId === employee.id);

                // Quarter specific stats
                const quarterViolations = empViolations.filter(v => {
                    const vDate = new Date(v.date + 'T00:00:00');
                    return vDate >= quarterStart && vDate <= quarterEnd;
                });

                // Calculate dynamic starting points for the SELECTED quarter
                const startingPoints = calculateQuarterlyStart(selectedQuarter, empViolations, data.settings);

                // Current Standing (Based on selected quarter)
                const currentPoints = calculateCurrentPoints(startingPoints, quarterViolations, data.settings.violationPenalties);
                const tier = determineTier(currentPoints, data.settings.daSettings);

                const counts = {
                    [VIOLATION_TYPES.TARDY_1_5]: 0,
                    [VIOLATION_TYPES.TARDY_6_11]: 0,
                    [VIOLATION_TYPES.TARDY_12_29]: 0,
                    [VIOLATION_TYPES.TARDY_30_PLUS]: 0,
                    [VIOLATION_TYPES.CALLOUT]: 0
                };

                const groupedQuarterViolations = groupConsecutiveCallouts(quarterViolations);

                groupedQuarterViolations.forEach(v => {
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
    }, [data, selectedQuarter]);

    if (loading) return <div>Loading...</div>;

    const getQuarterLabel = () => {
        const q = availableQuarters.find(q => q.id === selectedQuarter);
        return q ? q.label : selectedQuarter;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Scorecard</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Calendar size={16} />
                            Performance Summary for
                        </p>
                        <select
                            value={selectedQuarter}
                            onChange={(e) => setSelectedQuarter(e.target.value)}
                            style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {availableQuarters.map(q => (
                                <option key={q.id} value={q.id}>{q.label}</option>
                            ))}
                        </select>
                    </div>
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
                                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '60px' }}>Rank</th>
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
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center' }}>
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
