import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateEmployeeState, TIERS } from '../utils/pointCalculator';

const SimpleTierBreakdown = ({ employees, violations }) => {
    const { data } = useData();

    const tierMapping = {
        [TIERS.GOOD.name]: 'Tier 1',
        [TIERS.EDUCATIONAL.name]: 'Tier 2',
        [TIERS.COACHING.name]: 'Tier 3',
        [TIERS.SEVERE.name]: 'Tier 4',
        [TIERS.FINAL.name]: 'Tier 5'
    };

    const tierCounts = useMemo(() => {
        const counts = {
            'Tier 1': 0,
            'Tier 2': 0,
            'Tier 3': 0,
            'Tier 4': 0,
            'Tier 5': 0
        };

        employees.forEach(emp => {
            if (emp.archived) return;

            const empViolations = violations.filter(v => v.employeeId === emp.id);
            const state = calculateEmployeeState(emp, empViolations, data?.settings);

            const label = tierMapping[state.tier.name];
            if (label) {
                counts[label]++;
            } else if (state.tier.name === TIERS.TERMINATION.name) {
                // Optional: Handle termination or ignore for 1-5 count
            }
        });

        return counts;
    }, [employees, violations, data?.settings]);

    const tierColors = {
        'Tier 1': TIERS.GOOD.color,
        'Tier 2': TIERS.EDUCATIONAL.color,
        'Tier 3': TIERS.COACHING.color,
        'Tier 4': TIERS.SEVERE.color,
        'Tier 5': TIERS.FINAL.color
    };

    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(0,0,0,0.05)'
        }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Tier Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }}>
                {Object.keys(tierCounts).map((key) => (
                    <div key={key} style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-primary)',
                        borderLeft: `4px solid ${tierColors[key]}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {key}
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {tierCounts[key]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SimpleTierBreakdown;
