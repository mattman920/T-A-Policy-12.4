import React, { useMemo } from 'react';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, TIERS } from '../utils/pointCalculator';

const TierBreakdown = ({ employees, violations, startingPoints }) => {
    const tierCounts = useMemo(() => {
        const counts = {
            [TIERS.GOOD.name]: 0,
            [TIERS.COACHING.name]: 0,
            [TIERS.SEVERE.name]: 0,
            [TIERS.FINAL.name]: 0
        };

        employees.forEach(emp => {
            if (emp.archived) return;

            const empViolations = violations.filter(v => v.employeeId === emp.id);
            const points = calculateCurrentPoints(startingPoints, empViolations);
            const tier = determineTier(points);

            if (counts[tier.name] !== undefined) {
                counts[tier.name]++;
            }
        });

        return counts;
    }, [employees, violations]);

    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(0,0,0,0.05)'
        }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Employee Tier Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {Object.entries(TIERS).map(([key, tier]) => (
                    <div key={key} style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-primary)',
                        borderLeft: `4px solid ${tier.color}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {tier.name}
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {tierCounts[tier.name] || 0}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TierBreakdown;
