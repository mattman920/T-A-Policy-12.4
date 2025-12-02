import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const Reports = () => {
    const { data, loading } = useData();
    const [filterEmployee, setFilterEmployee] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // Safe data access for hooks
    // Safe data access for hooks
    const allEmployees = data?.employees || [];
    const allViolations = data?.violations || [];

    // Filter out archived employees and their violations
    const employees = allEmployees.filter(e => !e.archived);
    const violations = allViolations.filter(v => {
        // Only include violations for active employees
        return employees.some(e => e.id === v.employeeId);
    });

    // --- Data Processing ---

    // 1. Summary Metrics
    const totalEmployees = employees.length;
    const totalViolations = violations.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const violationsThisMonth = violations.filter(v => {
        const d = new Date(v.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // 2. Chart Data: Violations by Month
    const violationsByMonth = useMemo(() => {
        const counts = {};
        violations.forEach(v => {
            const d = new Date(v.date);
            const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [violations]);

    // 3. Chart Data: Violations by Type
    const violationsByType = useMemo(() => {
        const counts = {};
        violations.forEach(v => {
            counts[v.type] = (counts[v.type] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [violations]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 4. Top Violators
    const topViolators = useMemo(() => {
        const counts = {};
        violations.forEach(v => {
            counts[v.employeeId] = (counts[v.employeeId] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([id, count]) => ({
                ...employees.find(e => e.id === id),
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [violations, employees]);


    // 5. Detailed Log Filtering
    const sortedViolations = [...violations].sort((a, b) => new Date(b.date) - new Date(a.date));
    const filteredViolations = sortedViolations.filter(v => {
        const matchEmp = filterEmployee === 'all' || v.employeeId === filterEmployee;
        const matchType = filterType === 'all' || v.type === filterType;
        return matchEmp && matchType;
    });

    // Get unique violation types for filter
    const uniqueTypes = [...new Set(violations.map(v => v.type))];

    if (loading) return <div>Loading...</div>;
    if (!data || !data.employees || !data.violations) return <div>No data available</div>;

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Reports Dashboard</h1>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <SummaryCard title="Total Employees" value={totalEmployees} color="var(--accent-primary)" />
                <SummaryCard title="Total Violations" value={totalViolations} color="var(--accent-danger)" />
                <SummaryCard title="Violations (This Month)" value={violationsThisMonth} color="var(--accent-warning)" />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={cardStyle}>
                    <h3 style={{ marginBottom: '1rem' }}>Violations Trend</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={violationsByMonth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="var(--accent-primary)" name="Violations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={cardStyle}>
                    <h3 style={{ marginBottom: '1rem' }}>Violations Distribution</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={violationsByType}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {violationsByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Violators & Detailed Log */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>

                {/* Top Violators */}
                <div style={cardStyle}>
                    <h3 style={{ marginBottom: '1rem' }}>Top Violators</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--bg-primary)' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Name</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topViolators.map(emp => (
                                <tr key={emp.id} style={{ borderBottom: '1px solid var(--bg-primary)' }}>
                                    <td style={{ padding: '0.75rem 0.5rem' }}>{emp.name}</td>
                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>{emp.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Detailed Log */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Detailed Log</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <select
                                value={filterEmployee}
                                onChange={e => setFilterEmployee(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="all">All Employees</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="all">All Types</option>
                                {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)' }}>
                                <tr>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Employee</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredViolations.map(v => {
                                    const emp = data.employees.find(e => e.id === v.employeeId);
                                    return (
                                        <tr key={v.id} style={{ borderTop: '1px solid var(--bg-primary)' }}>
                                            <td style={tdStyle}>{v.date}</td>
                                            <td style={tdStyle}>{emp?.name || 'Unknown'}</td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    backgroundColor: v.type === 'Callout' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: v.type === 'Callout' ? 'var(--accent-danger)' : 'var(--accent-warning)',
                                                }}>
                                                    {v.type}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                                -{v.pointsDeducted}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ title, value, color }) => (
    <div style={{
        backgroundColor: 'var(--bg-secondary)',
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        borderLeft: `4px solid ${color}`
    }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{title}</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{value}</div>
    </div>
);

const cardStyle = {
    backgroundColor: 'var(--bg-secondary)',
    padding: '1.5rem',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
};

const selectStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem'
};

const thStyle = {
    padding: '0.75rem',
    textAlign: 'left',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    fontSize: '0.875rem'
};

const tdStyle = {
    padding: '0.75rem',
    fontSize: '0.9rem'
};

export default Reports;
