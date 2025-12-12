import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Users, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';
import StatCard from '../components/StatCard';
import { determineTier, STARTING_POINTS, TIERS, VIOLATION_TYPES } from '../utils/pointCalculator';
import { getRequiredDAs } from '../services/daService';
import { getQuarterKey } from '../utils/dateUtils';
import { useNavigate } from 'react-router-dom';

import SimpleTierBreakdown from '../components/SimpleTierBreakdown';
import DABreakdown from '../components/DABreakdown';
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
  const allEmployees = data?.employees || [];
  const allViolations = data?.violations || [];

  // Filter out archived employees and their violations
  const employees = allEmployees.filter(e => !e.archived);

  // Define positive adjustment types to exclude from "violations" visuals
  const POSITIVE_TYPES = ['Early Arrival', 'Shift Pickup'];

  // Current Quarter Logic
  const currentQuarterStart = useMemo(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  }, []);

  // All violations for active employees IN CURRENT QUARTER (used for point calculation)
  const allActiveViolations = allViolations.filter(v => {
    const isActive = employees.some(e => e.id === v.employeeId);

    // Fix: Ensure consistent date parsing to avoid timezone issues
    // v.date is YYYY-MM-DD. Appending T00:00:00 forces local time interpretation
    // matching how currentQuarterStart (new Date(...)) is created.
    const violationDate = new Date(`${v.date}T00:00:00`);
    const isInQuarter = violationDate >= currentQuarterStart;

    return isActive && isInQuarter;
  });

  // "Negative" violations only (for charts, trends, and problem lists)
  const violations = allActiveViolations.filter(v => !POSITIVE_TYPES.includes(v.type));

  const { totalEmployees, severeCount, finalCount, goodStandingCount, coachingCount, educationalCount, terminationCount } = useMemo(() => {
    let severe = 0;
    let final = 0;
    let good = 0;
    let coaching = 0;
    let educational = 0;
    let terminations = 0;

    // Get issued DAs from data context
    const issuedDAs = data?.issuedDAs || [];

    // Calculate required DAs for all employees
    // We can do this more efficiently by iterating once
    allEmployees.forEach(emp => {
      if (emp.archived) {
        terminations++;
        return;
      }

      // Use the new service to find ALL unissued DAs across history
      // This returns an array of required DAs for this employee
      const required = getRequiredDAs(emp, allViolations, data.settings, issuedDAs);

      required.forEach(da => {
        if (da.status === 'issued') return; // FIX: Skip issued DAs

        if (da.tier === TIERS.EDUCATIONAL.name) educational++;
        else if (da.tier === TIERS.COACHING.name) coaching++;
        else if (da.tier === TIERS.SEVERE.name) severe++;
        else if (da.tier === TIERS.FINAL.name) final++;
        // We don't typically count "Termination" in "Action Required" stats if it's already in "Terminations" count,
        // but if they are active and have < 0 points, they might need a "Termination DA" processed.
        // The original code didn't seem to count termination candidates in "Action Required", 
        // but let's stick to the requested logic: "everytime an employee hits... termination... it needs to appear".
        // However, the StatCard for Terminations (line 210) counts archived employees.
        // If an active employee hits termination threshold, they should probably be in Action Required.
        else if (da.tier === TIERS.TERMINATION.name) final++; // Group with Final or separate? 
        // Let's group Termination triggers with Final for the "Action Required" badge, or just add them up.
        // The StatCard shows "coachingCount + severeCount + finalCount". 
        // I will add termination triggers to 'finalCount' for visibility, or just ensure they are counted.
      });

      // Also calculate current standing for "Good Standing" count
      // This is separate from "Action Required" history
      // Use pre-calculated tier from Context
      if (emp.tier === TIERS.GOOD.name) {
        good++;
      }
    });

    return {
      totalEmployees: employees.length,
      severeCount: severe,
      finalCount: final,
      goodStandingCount: good,
      coachingCount: coaching,
      educationalCount: educational,
      terminationCount: terminations
    };
  }, [employees, violations, data?.issuedDAs, allEmployees, allActiveViolations, data.settings]);

  // --- Chart Data ---
  const violationsByMonth = useMemo(() => {
    const counts = {};
    violations.forEach(v => {
      const d = new Date(v.date + 'T00:00:00');
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [violations]);

  const violationsByType = useMemo(() => {
    // Initialize counts for all negative violation types
    const counts = {};
    const negativeTypes = Object.values(VIOLATION_TYPES).filter(t => !POSITIVE_TYPES.includes(t));

    negativeTypes.forEach(type => {
      counts[type] = 0;
    });

    violations.forEach(v => {
      if (counts.hasOwnProperty(v.type)) {
        counts[v.type] = (counts[v.type] || 0) + 1;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [violations]);

  // --- Problem Employees ---
  const problemEmployees = useMemo(() => {
    return employees.map(emp => {
      const empViolations = violations.filter(v => v.employeeId === emp.id);
      return {
        ...emp,
        points: emp.currentPoints || 0,
        violationCount: empViolations.length
      };
    })
      .sort((a, b) => b.violationCount - a.violationCount)
      .slice(0, 5);
  }, [employees, violations]);

  // --- Filters ---
  const uniqueTypes = useMemo(() => {
    // Use all defined violation types instead of just what's in the current list
    // Filter out positive types if we only want "violations"
    return Object.values(VIOLATION_TYPES).filter(t => !POSITIVE_TYPES.includes(t));
  }, []);

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      const matchesEmployee = filterEmployee === 'all' || v.employeeId === filterEmployee;
      const matchesType = filterType === 'all' || v.type === filterType;
      return matchesEmployee && matchesType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [violations, filterEmployee, filterType]);

  const VIOLATION_STYLES = {
    [VIOLATION_TYPES.TARDY_1_5]: { bg: '#dcfce7', color: '#059669', label: 'Tardy (1-5 min)' }, // Emerald 600
    [VIOLATION_TYPES.TARDY_6_11]: { bg: '#dbeafe', color: '#2563EB', label: 'Tardy (6-11 min)' }, // Blue 600
    [VIOLATION_TYPES.TARDY_12_29]: { bg: '#fef9c3', color: '#D97706', label: 'Tardy (12-29 min)' }, // Amber 600
    [VIOLATION_TYPES.TARDY_30_PLUS]: { bg: '#fce7f3', color: '#DB2777', label: 'Tardy (30+ min)' }, // Pink 600
    [VIOLATION_TYPES.CALLOUT]: { bg: '#fee2e2', color: '#DC2626', label: 'Call Out' }, // Red 600
    [VIOLATION_TYPES.EARLY_ARRIVAL]: { bg: '#f3e8ff', color: '#6b21a8', label: 'Early Arrival' }, // Purple
    [VIOLATION_TYPES.SHIFT_PICKUP]: { bg: '#ffedd5', color: '#9a3412', label: 'Shift Pickup' }, // Orange
  };

  const getViolationColor = (type) => {
    return VIOLATION_STYLES[type]?.color || '#6B7280';
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
          value={educationalCount + coachingCount + severeCount + finalCount}
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
        employees={allEmployees}
      />

      {/* Tier Breakdown (Simple) */}
      <div style={{ marginBottom: '2rem' }}>
        <SimpleTierBreakdown employees={employees} violations={violations} />
      </div>

      {/* Employee DA Breakdown (Complex/Sticky) */}
      <div style={{ marginBottom: '2rem' }}>
        <DABreakdown employees={employees} violations={violations} />
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
                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
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
                          backgroundColor: VIOLATION_STYLES[v.type]?.bg || '#f3f4f6',
                          color: VIOLATION_STYLES[v.type]?.color || '#374151',
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
