import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateEmployeeState, VIOLATION_TYPES, groupConsecutiveCallouts, DA_STAGES } from '../utils/pointCalculator';
import { Trophy, Calendar, Filter, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import FiveTierReportModal from '../components/FiveTierReportModal';
import ModernDatePicker from '../components/ModernDatePicker';
import './Scorecard.css';

const Scorecard = () => {
    const { data, loading } = useData();

    // --- State ---
    const [viewMode, setViewMode] = useState('quarter'); // 'quarter' | 'range'
    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `${now.getFullYear()}-Q${q}`;
    });
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [selectedReportEmpId, setSelectedReportEmpId] = useState(null);

    const handleEmployeeClick = (empId) => {
        setSelectedReportEmpId(empId);
        setReportModalOpen(true);
    };

    // --- Helpers ---
    const availableQuarters = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentQ = Math.floor(currentMonth / 3) + 1;
        const quarters = [];
        for (let q = currentQ; q >= 1; q--) {
            quarters.push({ id: `${currentYear}-Q${q}`, label: `Q${q} ${currentYear}`, year: currentYear, quarter: q });
        }
        const prevYear = currentYear - 1;
        for (let q = 4; q >= 1; q--) {
            quarters.push({ id: `${prevYear}-Q${q}`, label: `Q${q} ${prevYear}`, year: prevYear, quarter: q });
        }
        return quarters;
    }, []);

    // --- Data Processing ---
    const processedData = useMemo(() => {
        if (!data.employees) return [];
        let periodStart, periodEnd;

        if (viewMode === 'quarter') {
            const [yearStr, qStr] = selectedQuarter.split('-');
            const year = parseInt(yearStr);
            const quarter = parseInt(qStr.replace('Q', ''));
            periodStart = new Date(year, (quarter - 1) * 3, 1);
            periodEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
        } else {
            periodStart = new Date(dateRange.start);
            periodEnd = new Date(dateRange.end + 'T23:59:59');
        }

        const now = new Date();

        return data.employees
            .filter(emp => !emp.archived)
            .map(employee => {
                const empViolations = data.violations.filter(v => v.employeeId === employee.id);

                const periodViolations = empViolations.filter(v => {
                    const vDate = new Date(v.date + 'T00:00:00');
                    return vDate >= periodStart && vDate <= periodEnd;
                });

                const groupedViolations = groupConsecutiveCallouts(periodViolations);
                const counts = {
                    [VIOLATION_TYPES.TARDY_1_5]: 0,
                    [VIOLATION_TYPES.TARDY_6_11]: 0,
                    [VIOLATION_TYPES.TARDY_12_29]: 0,
                    [VIOLATION_TYPES.TARDY_30_PLUS]: 0,
                    [VIOLATION_TYPES.CALLOUT]: 0
                };
                groupedViolations.forEach(v => {
                    if (counts[v.type] !== undefined) counts[v.type]++;
                });

                let startState, endState;

                if (viewMode === 'range') {
                    const startViolations = empViolations.filter(v => new Date(v.date + 'T00:00:00') < periodStart);
                    startState = calculateEmployeeState(employee, startViolations, { ...data.settings, targetDate: periodStart });

                    const endViolations = empViolations.filter(v => new Date(v.date + 'T00:00:00') <= periodEnd);
                    endState = calculateEmployeeState(employee, endViolations, { ...data.settings, targetDate: periodEnd });
                } else {
                    const currentViolations = empViolations.filter(v => new Date(v.date + 'T00:00:00') <= now);
                    const current = calculateEmployeeState(employee, currentViolations, { ...data.settings, targetDate: now });
                    startState = current;
                    endState = current;
                }

                return { ...employee, counts, startState, endState };
            })
            .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.endState.score - a.endState.score);

    }, [data, selectedQuarter, dateRange, viewMode, searchTerm]);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    return (
        <div className="scorecard-container">
            {/* Header Area */}
            <div className="scorecard-header-panel">
                <div>
                    <h1 className="scorecard-title">Scorecard</h1>
                    <p className="scorecard-subtitle">
                        <Activity size={16} color="var(--accent-primary)" />
                        Track employee performance, health metrics, and attendance trends.
                    </p>
                </div>

                <div className="scorecard-controls">
                    {/* Mode Toggle */}
                    <div className="mode-toggle">
                        <button
                            onClick={() => setViewMode('quarter')}
                            className={`mode-btn ${viewMode === 'quarter' ? 'active' : ''}`}
                        >
                            Quarter View
                        </button>
                        <button
                            onClick={() => setViewMode('range')}
                            className={`mode-btn ${viewMode === 'range' ? 'active' : ''}`}
                        >
                            Date Range
                        </button>
                    </div>

                    {/* Controls */}
                    {viewMode === 'quarter' ? (
                        <div className="control-input-group">
                            <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                            <select
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                                className="control-select"
                            >
                                {availableQuarters.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div className="control-input-group">
                            <div style={{ width: '160px' }}>
                                <ModernDatePicker
                                    value={dateRange.start}
                                    onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))}
                                    className="control-date"
                                    style={{ padding: '0.4rem' }}
                                />
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>TO</span>
                            <div style={{ width: '160px' }}>
                                <ModernDatePicker
                                    value={dateRange.end}
                                    onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))}
                                    className="control-date"
                                    style={{ padding: '0.4rem' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Table Card */}
            <div className="scorecard-card">

                {/* Search & Stats */}
                <div className="scorecard-toolbar">
                    <div className="search-wrapper">
                        <Filter size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>

                    {processedData.length > 0 && (
                        <div className="top-performer-badge">
                            <div className="top-icon-circle">
                                <Trophy size={16} color="var(--accent-warning)" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Top Performer</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{processedData[0]?.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table className="scorecard-table">
                        <thead>
                            <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                <th style={{ minWidth: '220px' }}>Employee</th>
                                <th style={{ textAlign: 'center', minWidth: '160px' }}>DA Health</th>
                                <th style={{ textAlign: 'center', minWidth: '160px' }}>Tier Health</th>
                                <th style={{ textAlign: 'center', width: '100px' }}>Score</th>
                                <th style={{ textAlign: 'center', borderLeft: '1px solid rgba(0,0,0,0.05)' }}>Tardy <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>(1-5)</span></th>
                                <th style={{ textAlign: 'center' }}>Tardy <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>(6-11)</span></th>
                                <th style={{ textAlign: 'center' }}>Tardy <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>(12-29)</span></th>
                                <th style={{ textAlign: 'center' }}>Tardy <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>(30+)</span></th>
                                <th style={{ textAlign: 'center' }}>Callout</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((emp, index) => (
                                <tr key={emp.id}>
                                    <td className="rank-cell">{index + 1}</td>

                                    <td>
                                        <div className="emp-info">
                                            <div className="emp-avatar">
                                                {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="emp-details">
                                                <span
                                                    className="emp-name"
                                                    onClick={() => handleEmployeeClick(emp.id)}
                                                    style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'var(--text-muted)' }}
                                                    title="View 5-Tier Analysis"
                                                >
                                                    {emp.name}
                                                </span>
                                                {viewMode === 'range' ? (
                                                    <div className="emp-meta">
                                                        <span>Start: {emp.startState.score}</span>
                                                        <ArrowRight size={10} />
                                                        <span style={{ color: emp.endState.score < emp.startState.score ? 'var(--accent-danger)' : 'inherit' }}>
                                                            End: {emp.endState.score}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="emp-meta">
                                                        <span style={{
                                                            display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                                                            backgroundColor: emp.endState.tier?.color, marginRight: '4px'
                                                        }}></span>
                                                        {emp.endState.tier?.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* DA Health Bar */}
                                    <td>
                                        <HealthBarGroup
                                            mode={viewMode}
                                            startVal={5 - (emp.startState.daStageIndex ?? 0)}
                                            endVal={5 - (emp.endState.daStageIndex ?? 0)}
                                            max={5}
                                            label={emp.endState.daStage}
                                        />
                                    </td>

                                    {/* Tier Health Bar */}
                                    <td>
                                        <HealthBarGroup
                                            mode={viewMode}
                                            startVal={emp.startState.tier?.level ?? 0}
                                            endVal={emp.endState.tier?.level ?? 0}
                                            max={5}
                                            label={(() => {
                                                const lvl = emp.endState.tier?.level;
                                                if (lvl === 5) return "Tier 1";
                                                if (lvl === 4) return "Tier 2";
                                                if (lvl === 3) return "Tier 3";
                                                if (lvl === 2) return "Tier 4";
                                                if (lvl === 1) return "Tier 5";
                                                return "Termination";
                                            })()}
                                        />
                                    </td>

                                    {/* Score Display */}
                                    <td>
                                        <div className="score-display">
                                            {viewMode === 'range' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <span className="score-big">{emp.endState.score}</span>
                                                    {emp.endState.score - emp.startState.score !== 0 && (
                                                        <span className={`score-change ${emp.endState.score - emp.startState.score > 0 ? 'change-positive' : 'change-negative'}`}>
                                                            {emp.endState.score - emp.startState.score > 0 ? '+' : ''}
                                                            {emp.endState.score - emp.startState.score}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="score-big" style={{ color: emp.endState.tier?.color }}>{emp.endState.score}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Violations */}
                                    <td className="violation-cell" style={{ borderLeft: '1px solid rgba(0,0,0,0.05)' }}>
                                        <span className={`violation-badge ${emp.counts[VIOLATION_TYPES.TARDY_1_5] > 0 ? 'has-violation' : ''}`}>
                                            {emp.counts[VIOLATION_TYPES.TARDY_1_5] || '-'}
                                        </span>
                                    </td>
                                    <td className="violation-cell">
                                        <span className={`violation-badge ${emp.counts[VIOLATION_TYPES.TARDY_6_11] > 0 ? 'has-violation' : ''}`}>
                                            {emp.counts[VIOLATION_TYPES.TARDY_6_11] || '-'}
                                        </span>
                                    </td>
                                    <td className="violation-cell">
                                        <span className={`violation-badge ${emp.counts[VIOLATION_TYPES.TARDY_12_29] > 0 ? 'has-violation' : ''}`}>
                                            {emp.counts[VIOLATION_TYPES.TARDY_12_29] || '-'}
                                        </span>
                                    </td>
                                    <td className="violation-cell">
                                        <span className={`violation-badge ${emp.counts[VIOLATION_TYPES.TARDY_30_PLUS] > 0 ? 'severe-violation' : ''}`}>
                                            {emp.counts[VIOLATION_TYPES.TARDY_30_PLUS] || '-'}
                                        </span>
                                    </td>
                                    <td className="violation-cell">
                                        <span className={`violation-badge ${emp.counts[VIOLATION_TYPES.CALLOUT] > 0 ? 'severe-violation' : ''}`}>
                                            {emp.counts[VIOLATION_TYPES.CALLOUT] || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Reports Modal */}
            <FiveTierReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                preSelectedEmployeeId={selectedReportEmpId}
            />
        </div >
    );
};

// --- Sub-components ---

const HealthBarGroup = ({ mode, startVal, endVal, max, label }) => {
    return (
        <div className="health-bar-container">
            <HealthBar value={endVal} max={max} previousValue={mode === 'range' ? startVal : undefined} />
            <div className="health-label">
                <span>{label}</span>
                {mode === 'range' && startVal !== endVal && (
                    <span style={{ color: endVal > startVal ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {endVal > startVal ? '▲' : '▼'} {Math.abs(endVal - startVal)}
                    </span>
                )}
            </div>
        </div>
    );
};

const HealthBar = ({ value, max, previousValue }) => {
    const segments = Array.from({ length: max }, (_, i) => i + 1);

    // Color Logic
    const getColor = (v) => {
        if (v >= 5) return '#10B981';
        if (v === 4) return '#34D399';
        if (v === 3) return '#FBBF24';
        if (v === 2) return '#F97316';
        if (v <= 1) return '#EF4444';
        return '#EF4444';
    };

    const activeColor = getColor(value);

    return (
        <div className="health-bar-track">
            {segments.map(seg => {
                const filled = seg <= value;
                const wasFilled = previousValue !== undefined && seg <= previousValue;
                const isGhost = !filled && wasFilled;

                return (
                    <div
                        key={seg}
                        className={`health-segment ${filled ? 'active' : 'inactive'}`}
                        style={{
                            backgroundColor: filled ? activeColor : (isGhost ? activeColor : '#e5e5e5'),
                            opacity: filled ? 1 : (isGhost ? 0.3 : 0.2)
                        }}
                    />
                );
            })}
        </div>
    );
};

export default Scorecard;
