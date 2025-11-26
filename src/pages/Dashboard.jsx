import React, { useMemo, useState } from 'react';
import { useData } from '../hooks/useData';
import { Users, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import StatCard from '../components/StatCard';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, TIERS } from '../utils/pointCalculator';
import { useNavigate } from 'react-router-dom';

import TierBreakdown from '../components/TierBreakdown';
import TerminationsReportModal from '../components/TerminationsReportModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
  const { data, loading } = useData();
  const navigate = useNavigate();
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [isTerminationsModalOpen, setIsTerminationsModalOpen] = useState(false);

  // Safe data access
  const employees = data?.employees || [];
  const violations = data?.violations || [];

  // --- Metrics Calculation ---
  const { totalEmployees, severeCount, finalCount, goodStandingCount, coachingCount, terminationCount } = useMemo(() => {
    let severe = 0;
    let final = 0;
    let good = 0;
    let coaching = 0;
    let terminations = 0;

    // Get issued DAs from data context
    const issuedDAs = data?.issuedDAs || [];

    employees.forEach(emp => {
      if (emp.archived) {
        terminations++;
        return;
      }

      const empViolations = violations.filter(v => v.employeeId === emp.id);
      const points = calculateCurrentPoints(STARTING_POINTS, empViolations);
      const tier = determineTier(points);

      // Check if DA is already issued
      const daKey = `${emp.id}-${tier.name}`;
      const isIssued = issuedDAs.includes(daKey);

      if (tier.min === TIERS.GOOD.min) {
        good++;
      } else if (tier.min === TIERS.COACHING.min) {
        if (!isIssued) coaching++;
      } else if (tier.min === TIERS.SEVERE.min) {
        if (!isIssued) severe++;
      } else if (tier.min === TIERS.FINAL.min) {
        if (!isIssued) final++;
      }
    });

    return {
      totalEmployees: employees.length,
      severeCount: severe,
      finalCount: final,
      goodStandingCount: good,
      coachingCount: coaching,
      terminationCount: terminations
    };
  }, [employees, violations, data?.issuedDAs]);

  // --- Chart Data ---
  const violationsByMonth = useMemo(() => {
    const counts = {};
    violations.forEach(v => {
      const d = new Date(v.date);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [violations]);

  const violationsByType = useMemo(() => {
    const counts = {};
    violations.forEach(v => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [violations]);

  // --- Problem Employees ---
  const problemEmployees = useMemo(() => {
    return employees.map(emp => {
      const empViolations = violations.filter(v => v.employeeId === emp.id);
      const points = calculateCurrentPoints(STARTING_POINTS, empViolations);
      return {
        ...emp,
        points,
        violationCount: empViolations.length
      };
    })
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 5);
  }, [employees, violations]);

  // --- Filters ---
  const uniqueTypes = useMemo(() => {
    return [...new Set(violations.map(v => v.type))];
  }, [violations]);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchesEmployee = filterEmployee === 'all' || v.employeeId === filterEmployee;
      const matchesType = filterType === 'all' || v.type === filterType;
      return matchesEmployee && matchesType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [violations, filterEmployee, filterType]);

  const getViolationColor = (type) => {
    switch (type) {
      case 'Tardy (1-5 min)': return '#22c55e'; // Good Green
      case 'Tardy (6-11 min)': return '#3b82f6'; // Blue
      case 'Tardy (12-29 min)': return '#f59e0b'; // Yellow
      case 'Tardy (30+ min)': return '#ec4899'; // Pink
      case 'Callout': return '#ef4444'; // Red
      default: return '#8884d8';
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Dashboard</h1>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          icon={Users}
          color="var(--accent-primary)"
          onClick={() => navigate('/employees')}
        />
        <StatCard
          title="Good Standing"
          value={goodStandingCount}
          icon={CheckCircle}
          color="var(--accent-success)"
          onClick={() => navigate('/da-issuance')}
        />
        <StatCard
          title="Action Required"
          value={coachingCount + severeCount + finalCount}
          icon={AlertTriangle}
          color="var(--accent-warning)"
          onClick={() => navigate('/da-issuance')}
        />
        <StatCard
          title="Terminations"
          value={terminationCount}
          icon={TrendingDown}
          color="var(--accent-danger)"
          onClick={() => setIsTerminationsModalOpen(true)}
        />
      </div>

      <TerminationsReportModal
        isOpen={isTerminationsModalOpen}
        onClose={() => setIsTerminationsModalOpen(false)}
        employees={employees}
      />

      {/* Tier Breakdown */}
      <div style={{ marginBottom: '2rem' }}>
        <TierBreakdown employees={employees} violations={violations} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Violations Trend</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={violationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Violations Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={violationsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {violationsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getViolationColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics & Detailed Log Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

        {/* Problem Employees */}
        <div style={cardStyle}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Problem Employees</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Top 5 employees with most violations.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {problemEmployees.map(e => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{e.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{e.points} Points</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-danger)' }}>{e.violationCount}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Violations</span>
                </div>
              </div>
            ))}
            {problemEmployees.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No employees found.</p>}
          </div>
        </div>

        {/* Detailed Log */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600 }}>Recent Violations Log</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} style={selectStyle}>
                <option value="all">All Employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
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
                  const emp = employees.find(e => e.id === v.employeeId);
                  return (
                    <tr key={v.id} style={{ borderTop: '1px solid var(--bg-primary)' }}>
                      <td style={tdStyle}>{v.date}</td>
                      <td style={tdStyle}>{emp?.name || 'Unknown'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          backgroundColor: v.type === 'Callout' ? 'var(--accent-danger-bg)' : 'var(--accent-warning-bg)',
                          color: v.type === 'Callout' ? 'var(--accent-danger)' : 'var(--accent-warning)',
                          fontWeight: 500
                        }}>
                          {v.type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--accent-danger)' }}>
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

const cardStyle = {
  backgroundColor: 'var(--bg-secondary)',
  padding: '1.5rem',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid rgba(0,0,0,0.05)'
};

const selectStyle = {
  padding: '0.5rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--text-sidebar-muted)',
  fontSize: '0.875rem',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)'
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
  fontSize: '0.9rem',
  color: 'var(--text-primary)'
};

export default Dashboard;
