import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }) => (
    <div
        onClick={onClick}
        style={{
            background: 'var(--bg-secondary)',
            padding: '1.75rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid rgba(0,0,0,0.04)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: onClick ? 'pointer' : 'default'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
                    {subtext && <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{subtext}</span>}
                </div>
            </div>
            <div style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: `${color}15`,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} strokeWidth={2} />
            </div>
        </div>
    </div>
);

export default StatCard;
