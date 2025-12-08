import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateEmployeeState, TIERS } from '../utils/pointCalculator';

const DABreakdown = ({ employees, violations }) => {
    const { data } = useData();

    // Helper to determine Sticky DA Tier
    const getStickyTier = (state) => {
        // If currently in Good Standing (Level 5), no DA count active (reset)
        if (state.tier.level === TIERS.GOOD.level) {
            return TIERS.GOOD;
        }

        let minLevel = state.tier.level;

        // Walk history backwards to find the lowest point since last Good Standing
        // eventLog is chronological (oldest to newest), so we iterate backwards
        for (let i = state.eventLog.length - 1; i >= 0; i--) {
            const event = state.eventLog[i];

            // If we hit Good Standing, we stop looking further back (clean slate)
            if (event.tier.level === TIERS.GOOD.level) {
                break;
            }

            // Track the lowest level (highest severity) seen in this "bad" cycle
            if (event.tier.level < minLevel) {
                minLevel = event.tier.level;
            }
        }

        // Return the tier object matching the lowest level found
        return Object.values(TIERS).find(t => t.level === minLevel) || state.tier;
    };

    const stickyCounts = useMemo(() => {
        const counts = {
            [TIERS.GOOD.name]: 0,
            [TIERS.EDUCATIONAL.name]: 0,
            [TIERS.COACHING.name]: 0,
            [TIERS.SEVERE.name]: 0,
            [TIERS.FINAL.name]: 0
        };

        employees.forEach(emp => {
            if (emp.archived) return;

            const empViolations = violations.filter(v => v.employeeId === emp.id);
            const state = calculateEmployeeState(emp, empViolations, data?.settings);

            const stickyTier = getStickyTier(state);

            // We only count them in specific buckets if they are NOT Good Standing
            // The user said: "if drop to tier 2 [Edu], educational is 1. Move to tier 3 [Coach], coaching is 1, edu is 0."
            // "If back to tier 2, coaching is 1." -> This implies the 'Sticky Tier' is what we count.
            // "Once hits tier 1 [Good], counters reset to 0".

            if (stickyTier.name !== TIERS.GOOD.name && counts[stickyTier.name] !== undefined) {
                counts[stickyTier.name]++;
            }
        });

        return counts;
    }, [employees, violations, data?.settings]);

    // We skip Good Standing in the display since user said "counters reset to 0" implies not showing them?
    // Or maybe we show the categories but they are 0.
    // The user listed "Educational", "Coaching" in the example.
    // I will show Educational, Coaching, Severe, Final.
    const displayTiers = [TIERS.EDUCATIONAL, TIERS.COACHING, TIERS.SEVERE, TIERS.FINAL];

    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid rgba(0,0,0,0.05)'
        }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Employee DA Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {displayTiers.map((tier) => (
                    <div key={tier.name} style={{
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
                            {stickyCounts[tier.name] || 0}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DABreakdown;
