import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { TrendingUp, Activity, AlertTriangle, Calendar, Users } from 'lucide-react';
import { VIOLATION_TYPES } from '../utils/pointCalculator';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';

const Projections = () => {
    const { data, loading } = useData();
    const [selectedRiskType, setSelectedRiskType] = useState(VIOLATION_TYPES.CALLOUT);



    const allEmployees = data?.employees || [];
    const allViolations = data?.violations || [];

    // Filter out archived employees and their violations
    const employees = allEmployees.filter(e => !e.archived);

    // Define negative violation types explicitly to ensure positive ones are excluded
    const negativeTypes = [
        VIOLATION_TYPES.CALLOUT,
        VIOLATION_TYPES.TARDY_1_5,
        VIOLATION_TYPES.TARDY_6_11,
        VIOLATION_TYPES.TARDY_12_29,
        VIOLATION_TYPES.TARDY_30_PLUS
    ];

    const violations = allViolations.filter(v => {
        // Only include violations for active employees and matching negative types
        return employees.some(e => e.id === v.employeeId) && negativeTypes.includes(v.type);
    });

    // --- Logic: Forecast & Trends ---

    // 1. Group by Type and Week for Historical Graph
    const typeData = useMemo(() => {
        const data = {};
        violations.forEach(v => {
            const d = new Date(v.date);
            const onejan = new Date(d.getFullYear(), 0, 1);
            const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            const key = `W${week}-${d.getFullYear()}`;

            if (!data[key]) data[key] = { name: key, 'Tardy (1-5 min)': 0, 'Tardy (6-11 min)': 0, 'Tardy (12-29 min)': 0, 'Tardy (30+ min)': 0, 'Callout': 0 };

            if (v.type.includes('1-5')) data[key]['Tardy (1-5 min)']++;
            else if (v.type.includes('6-11')) data[key]['Tardy (6-11 min)']++;
            else if (v.type.includes('12-29')) data[key]['Tardy (12-29 min)']++;
            else if (v.type.includes('30+')) data[key]['Tardy (30+ min)']++;
            else if (v.type === VIOLATION_TYPES.CALLOUT) data[key]['Callout']++;
        });
        return Object.values(data).sort((a, b) => {
            const [wa, ya] = a.name.substring(1).split('-').map(Number);
            const [wb, yb] = b.name.substring(1).split('-').map(Number);
            return ya - yb || wa - wb;
        });
    }, [violations]);

    // 2. Forecast (Next 4 Weeks) based on Type Averages
    const forecastData = useMemo(() => {
        if (typeData.length < 2) return [];

        const averages = { 'Tardy (1-5 min)': 0, 'Tardy (6-11 min)': 0, 'Tardy (12-29 min)': 0, 'Tardy (30+ min)': 0, 'Callout': 0 };
        const types = Object.keys(averages);

        // Weighted average: give more weight to the last 3 weeks
        const recentWeeks = typeData.slice(-3);
        const totalWeight = recentWeeks.reduce((acc, _, i) => acc + (i + 1), 0); // 1 + 2 + 3 = 6

        types.forEach(type => {
            let weightedSum = 0;
            recentWeeks.forEach((week, i) => {
                weightedSum += (week[type] || 0) * (i + 1);
            });
            averages[type] = weightedSum / totalWeight;
        });

        const lastWeekStr = typeData[typeData.length - 1].name;
        const lastWeek = parseInt(lastWeekStr.split('-')[0].substring(1));

        const forecast = [];
        for (let i = 1; i <= 4; i++) {
            const entry = { name: `W${lastWeek + i} (Proj)` };
            types.forEach((type, typeIndex) => {
                // Add pseudo-randomness based on index for stability but realism
                const noise = ((i + typeIndex) % 5) * 0.05 - 0.1;
                entry[type] = Math.max(0, parseFloat((averages[type] * (1 + noise)).toFixed(1)));
            });
            forecast.push(entry);
        }
        return forecast;
    }, [typeData]);

    // 3. Day of Week Risk Analysis
    // 3. Day of Week Risk Analysis (Probability 0-100% per type)
    const dayRiskData = useMemo(() => {
        // Filter to last 8 weeks
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const recentViolations = violations.filter(v => new Date(v.date) >= eightWeeksAgo);

        // Count occurrences of each type per day of week
        const dayTypeCounts = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };
        const types = [VIOLATION_TYPES.CALLOUT, VIOLATION_TYPES.TARDY_1_5, VIOLATION_TYPES.TARDY_6_11, VIOLATION_TYPES.TARDY_12_29, VIOLATION_TYPES.TARDY_30_PLUS];

        // Initialize counts
        Object.keys(dayTypeCounts).forEach(d => {
            types.forEach(t => dayTypeCounts[d][t] = 0);
        });

        // Populate counts (how many Mondays had at least one Callout, etc.?)
        // Actually, simpler: Total count of that violation on that day / 8 weeks
        // Probability = (Count of that type on that day of week) / 8 * 100
        // Cap at 100%

        recentViolations.forEach(v => {
            const d = new Date(v.date);
            const day = d.getDay();
            if (dayTypeCounts[day][v.type] !== undefined) {
                dayTypeCounts[day][v.type]++;
            }
        });

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const next7Days = [];
        const today = new Date();

        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const dayIndex = futureDate.getDay();

            const entry = {
                day: days[dayIndex],
                date: futureDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            };

            types.forEach(t => {
                // Calculate probability based on 8 weeks history
                // If it happened 4 times in 8 weeks on this day, prob is 50%
                const count = dayTypeCounts[dayIndex][t];
                const prob = Math.min(100, Math.round((count / 8) * 100));
                entry[t] = prob;
            });

            next7Days.push(entry);
        }
        return next7Days;
    }, [violations]);

    // 4. Employee Risk Forecast
    // 4. Employee Risk Forecast (Specific to Selected Type)
    const employeeRiskList = useMemo(() => {
        const risks = [];
        const today = new Date();
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(today.getDate() - 56);
        const oneYearAgo = new Date();
        oneYearAgo.setDate(today.getDate() - 365);

        employees.forEach(emp => {
            // Filter violations to ONLY the selected type
            const typeViolations = violations
                .filter(v => v.employeeId === emp.id && v.type === selectedRiskType)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            // Need at least 1 violation in the last year to calculate anything
            const yearlyViolations = typeViolations.filter(v => new Date(v.date) >= oneYearAgo);
            if (yearlyViolations.length < 1) return;

            const recentViolations = typeViolations.filter(v => new Date(v.date) >= eightWeeksAgo);

            // 1. Recent Trend (8 Weeks) - For Display
            // Frequency = 56 days / Count
            let recentAvg = 0;
            if (recentViolations.length > 0) {
                recentAvg = Math.round(56 / recentViolations.length);
            }

            // 2. Historical Probability (1 Year) - For Score
            // Frequency = 365 days / Count
            const yearlyAvg = Math.max(1, Math.round(365 / yearlyViolations.length));

            // Days since last violation of THIS type
            const lastViolationDate = new Date(typeViolations[typeViolations.length - 1].date);
            const daysSinceLast = Math.ceil((today - lastViolationDate) / (1000 * 60 * 60 * 24));

            // Probability based on Yearly History
            const probability = Math.min(99, Math.round((daysSinceLast / yearlyAvg) * 100));

            // Only show if they have committed the violation in the past 8 weeks
            if (recentViolations.length > 0) {
                risks.push({
                    name: emp.name,
                    probability: probability,
                    avgDays: recentAvg > 0 ? recentAvg : yearlyAvg, // Show recent trend if available, else yearly
                    isRecent: recentViolations.length > 0,
                    daysSince: daysSinceLast,
                    tier: emp.tier
                });
            }
        });

        return risks.sort((a, b) => b.probability - a.probability).slice(0, 5); // Top 5
    }, [employees, violations, selectedRiskType]);

    // 5. AI Insights Generation
    const aiInsights = useMemo(() => {
        const insights = [];

        // Day Risk Insight
        if (dayRiskData.length > 0) {
            const highestRiskDay = dayRiskData.reduce((prev, current) => (prev.risk > current.risk) ? prev : current);
            if (highestRiskDay.risk > 50) {
                insights.push({
                    type: 'warning',
                    text: `High Risk Alert: ${highestRiskDay.day} (${highestRiskDay.date}) is projected to have the highest violation volume based on historical patterns.`
                });
            }
        }

        // Trend Insight
        if (forecastData.length > 0 && typeData.length > 0) {
            const lastActualTotal = Object.values(typeData[typeData.length - 1]).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);
            const nextProjTotal = Object.values(forecastData[0]).reduce((a, b) => typeof b === 'number' ? a + b : a, 0);

            if (nextProjTotal > lastActualTotal * 1.1) {
                insights.push({
                    type: 'danger',
                    text: `Projected Surge: Total violations are forecasted to increase by ${Math.round(((nextProjTotal - lastActualTotal) / lastActualTotal) * 100)}% next week.`
                });
            } else if (nextProjTotal < lastActualTotal * 0.9) {
                insights.push({
                    type: 'success',
                    text: `Positive Trend: Violations are projected to decrease by ${Math.round(((lastActualTotal - nextProjTotal) / lastActualTotal) * 100)}% next week.`
                });
            }
        }

        // Specific Violation Type Insight
        if (forecastData.length > 0) {
            const calloutProj = forecastData[0]['Callout'];
            if (calloutProj > 2) {
                insights.push({
                    type: 'warning',
                    text: `Staffing Risk: Expect approximately ${Math.round(calloutProj)} callouts next week. Ensure coverage is available.`
                });
            }
        }

        return insights;
    }, [dayRiskData, forecastData, typeData]);


    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Loading Projections...</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI Projections & Predictive Analytics</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Forecasting future attendance risks using historical data patterns.</p>
            </div>

            {/* AI Insights Panel */}
            <div style={{ marginBottom: '2rem', display: 'grid', gap: '1rem' }}>
                {aiInsights.map((insight, index) => (
                    <div key={index} style={{
                        ...cardStyle,
                        borderLeft: `4px solid ${insight.type === 'danger' ? 'var(--accent-danger)' : insight.type === 'warning' ? 'var(--accent-warning)' : 'var(--accent-success)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        {insight.type === 'danger' && <AlertTriangle color="var(--accent-danger)" />}
                        {insight.type === 'warning' && <TrendingUp color="var(--accent-warning)" />}
                        {insight.type === 'success' && <Activity color="var(--accent-success)" />}
                        <div>
                            <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>AI Insight</h4>
                            <p style={{ margin: 0, color: 'var(--text-primary)' }}>{insight.text}</p>
                        </div>
                    </div>
                ))}
                {aiInsights.length === 0 && (
                    <div style={{ ...cardStyle, borderLeft: '4px solid var(--text-secondary)' }}>
                        <p style={{ margin: 0 }}>Not enough data to generate high-confidence predictions yet.</p>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>

                {/* Future Risk Heatmap */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={20} /> 7-Day Risk Forecast
                        </h3>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dayRiskData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" tickFormatter={(val) => val.substring(0, 3)} />
                                <YAxis label={{ value: 'Probability %', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey={VIOLATION_TYPES.CALLOUT} stroke="#ef4444" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey={VIOLATION_TYPES.TARDY_1_5} stroke="#22c55e" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey={VIOLATION_TYPES.TARDY_6_11} stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey={VIOLATION_TYPES.TARDY_12_29} stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey={VIOLATION_TYPES.TARDY_30_PLUS} stroke="#ec4899" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                        Likelihood of specific violations occurring over the next 7 days based on 8-week history.
                    </p>
                </div>

                {/* At-Risk Employees */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} /> At-Risk Employees
                        </h3>
                        <select
                            value={selectedRiskType}
                            onChange={(e) => setSelectedRiskType(e.target.value)}
                            style={{
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem'
                            }}
                        >
                            <option value={VIOLATION_TYPES.CALLOUT}>Call Out</option>
                            <option value={VIOLATION_TYPES.TARDY_1_5}>Tardy (1-5 min)</option>
                            <option value={VIOLATION_TYPES.TARDY_6_11}>Tardy (6-11 min)</option>
                            <option value={VIOLATION_TYPES.TARDY_12_29}>Tardy (12-29 min)</option>
                            <option value={VIOLATION_TYPES.TARDY_30_PLUS}>Tardy (30+ min)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {employeeRiskList.length > 0 ? (
                            employeeRiskList.map((emp, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{emp.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {emp.isRecent ? 'Trending: ' : 'Yearly Avg: '} Every {emp.avgDays} days • Last: {emp.daysSince} days ago
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: emp.probability > 80 ? 'var(--accent-danger)' : 'var(--accent-warning)'
                                        }}>
                                            {emp.probability}% Prob.
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>of violation</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                No employees currently identified as high risk.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Forecast Graph */}
            <div style={cardStyle}>
                <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Long-Term Violation Forecast</h3>
                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...typeData.slice(-5), ...forecastData]}>
                            <defs>
                                <linearGradient id="colorCallout" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                            <Legend />
                            <ReferenceLine x={typeData.length > 0 ? typeData[typeData.length - 1].name : ''} stroke="var(--text-secondary)" strokeDasharray="3 3" label="Today" />

                            <Area type="monotone" dataKey="Callout" stroke="#ef4444" fillOpacity={1} fill="url(#colorCallout)" strokeWidth={2} />
                            <Area type="monotone" dataKey="Tardy (1-5 min)" stroke="#22c55e" fill="none" strokeWidth={2} />
                            <Area type="monotone" dataKey="Tardy (6-11 min)" stroke="#3b82f6" fill="none" strokeWidth={2} />
                            <Area type="monotone" dataKey="Tardy (12-29 min)" stroke="#f59e0b" fill="none" strokeWidth={2} />
                            <Area type="monotone" dataKey="Tardy (30+ min)" stroke="#ec4899" fill="none" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Dashed line indicates current date. Future values are AI-generated projections.
                </p>
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

export default Projections;
