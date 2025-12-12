import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, TrendingUp, Moon, Sun, Settings, AlertCircle, ClipboardList, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

import ExitAppModal from './ExitAppModal';

const Sidebar = () => {
    const { isDark, toggleTheme } = useTheme();
    const { data } = useData();
    const { logout } = useAuth();
    const [isExitModalOpen, setIsExitModalOpen] = React.useState(false);

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: AlertCircle, label: 'Log Violation', path: '/log-violation' },
        { icon: Users, label: 'Employees', path: '/employees' },
        { icon: FileText, label: 'Reports', path: '/reports' },
        { icon: ClipboardList, label: 'Scorecard', path: '/scorecard' },
        { icon: TrendingUp, label: 'Projections', path: '/projections' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div style={{
            width: '260px',
            backgroundColor: 'var(--bg-sidebar)',
            color: 'var(--text-sidebar)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
            zIndex: 10
        }}>
            <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '0.5rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                }} />
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
                        {data?.settings?.companyName || 'Attendance'}
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sidebar-muted)' }}>Manager Portal</p>
                </div>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.875rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            color: isActive ? '#fff' : 'var(--text-sidebar-muted)',
                            backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                            transition: 'all 0.2s ease',
                            fontWeight: isActive ? 600 : 500,
                            boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                        })}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-sidebar-muted)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        transition: 'all 0.2s',
                        marginBottom: '1rem',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.color = 'var(--text-sidebar-muted)';
                    }}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    <span style={{ fontWeight: 500 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                    onClick={() => setIsExitModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent-danger)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                >
                    <LogOut size={20} />
                    <span style={{ fontWeight: 500 }}>Exit App</span>
                </button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-sidebar-muted)', textAlign: 'center', opacity: 0.6, marginTop: '1rem' }}>
                    v1.1.2 • Build 2023
                </div>
            </div>

            <ExitAppModal isOpen={isExitModalOpen} onClose={() => setIsExitModalOpen(false)} />
        </div>
    );
};

export default Sidebar;
