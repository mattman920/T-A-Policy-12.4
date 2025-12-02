import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, TIERS } from '../utils/pointCalculator';
import {
    FileText, Printer, ChevronRight, Download, FileSpreadsheet, BarChart2, Search,
    Clock, AlertTriangle, Calendar, TrendingUp, ShieldAlert, UserCheck,
    History, Activity, Users, PieChart
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Force update timestamp: 2025-11-25 23:05

const reports = [
    { id: 1, title: 'Daily Violation Log', category: 'Operational', desc: 'Violations from the last 24 hours', icon: Clock },
    { id: 2, title: 'Late but Safe Report', category: 'Operational', desc: 'Tardies within the 5-minute grace period', icon: UserCheck },
    { id: 3, title: 'Monthly Callout Counter', category: 'Operational', desc: 'Employees with frequent callouts', icon: Calendar },
    { id: 4, title: 'Monthly Bonus Potential', category: 'Operational', desc: 'Employees eligible for perfect attendance bonus', icon: TrendingUp },
    { id: 5, title: 'Shift-Based Trend Analysis', category: 'Operational', desc: 'Violation trends by shift (AM/PM)', icon: BarChart2 },
    { id: 6, title: 'DA Trigger Report', category: 'Compliance', desc: 'Employees requiring disciplinary action', icon: ShieldAlert },
    { id: 7, title: 'Near-Threshold Warning', category: 'Compliance', desc: 'Employees close to dropping a tier', icon: AlertTriangle },
    { id: 8, title: 'High-Cost Infraction Summary', category: 'Compliance', desc: 'Violations with 20+ point deductions', icon: AlertTriangle },
    { id: 9, title: 'Tardiness Tier Progression', category: 'Compliance', desc: 'Employees with escalating tardiness', icon: TrendingUp },
    { id: 10, title: 'Quarterly Point Audit', category: 'Compliance', desc: 'Audit of employee point balances', icon: FileText },
    { id: 11, title: 'Individual Attendance History', category: 'Individual', desc: 'Complete violation history for an employee', icon: History },
    { id: 12, title: 'Recovery Trend Report', category: 'Individual', desc: 'Points recovered over time', icon: Activity },
    { id: 13, title: 'Monthly Employee Summary', category: 'Individual', desc: 'Summary of activity for the last 30 days', icon: UserCheck },
    { id: 14, title: 'Disciplinary Status Report', category: 'Individual', desc: 'Current standing of all employees', icon: ShieldAlert },
    { id: 15, title: 'Tardy Breakdown', category: 'Analysis', desc: 'Breakdown of tardiness types', icon: PieChart },
    { id: 16, title: 'Team Bonus Eligibility', category: 'Analysis', desc: 'Percentage of team eligible for bonuses', icon: Users },
    { id: 17, title: 'QoQ Violation Comparison', category: 'Analysis', desc: 'Quarter over Quarter comparison', icon: BarChart2 },
    { id: 19, title: 'DA Distribution Analytics', category: 'Analysis', desc: 'Distribution of employees across tiers', icon: PieChart },
    { id: 20, title: 'Positive Adjustments Report', category: 'Analysis', desc: 'Track early arrivals and shift pickups', icon: TrendingUp }
];
const ReportsGenerator = () => {
    const { data, loading, logReportUsage } = useData();
    const allEmployees = data?.employees || [];
    const allViolations = data?.violations || [];

    // Filter out archived employees and their violations
    const employees = React.useMemo(() => {
        return allEmployees.filter(e => !e.archived);
    }, [allEmployees]);

    const violations = React.useMemo(() => {
        return allViolations.filter(v => {
            // Only include violations for active employees
            return employees.some(e => e.id === v.employeeId);
        });
    }, [allViolations, employees]);
    const [selectedReportId, setSelectedReportId] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Advanced Selectors
    const [selectedQuarter, setSelectedQuarter] = useState('Q4'); // Changed from 'All' to 'Q4'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [qoqQ1, setQoqQ1] = useState('Q3');
    const [qoqQ2, setQoqQ2] = useState('Q4');

    // Usage Tracking
    React.useEffect(() => {
        if (selectedReportId) {
            logReportUsage(selectedReportId);
        }
    }, [selectedReportId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Filter and Group Reports
    const groupedReports = React.useMemo(() => {
        const filtered = reports.filter(r =>
            r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.desc.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const groups = {
            'Operational': [],
            'Compliance': [],
            'Individual': [],
            'Analysis': []
        };

        filtered.forEach(r => {
            if (groups[r.category]) {
                groups[r.category].push(r);
            }
        });

        return groups;
    }, [searchQuery]);

    // Reset selected employee when report changes
    React.useEffect(() => {
        if (selectedReportId && employees.length > 0) {
            if (selectedReportId === 20) {
                setSelectedEmployeeId('all');
            } else {
                setSelectedEmployeeId(employees[0].id);
            }
        }
    }, [selectedReportId, employees]);

    const generateReportData = (id) => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const penalties = data?.settings?.violationPenalties || {};

        switch (id) {
            // --- OPERATIONAL ---
            case 1: { // Daily Log
                return violations.filter(v => v.date === selectedDate).map(v => ({
                    'Date': v.date,
                    'Employee': employees.find(e => e.id === v.employeeId)?.name,
                    'Type': v.type,
                    'Shift': v.shift || 'AM',
                    'Points': v.pointsDeducted
                }));
            }
            case 2: // Late but Safe (1-5 min)
                return violations.filter(v => v.type === 'Tardy (1-5 min)').map(v => ({
                    'Date': v.date,
                    'Employee': employees.find(e => e.id === v.employeeId)?.name,
                    'Type': 'Tardy (1-5 min)',
                    'Note': 'No points deducted (Grace Period)'
                }));
            case 3: { // Monthly Callout Counter
                const calloutCounts = {};
                violations.filter(v => v.type === 'Callout' && new Date(v.date).getMonth() === parseInt(selectedMonth)).forEach(v => {
                    calloutCounts[v.employeeId] = (calloutCounts[v.employeeId] || 0) + 1;
                });
                return Object.entries(calloutCounts).map(([id, count]) => ({
                    'Employee': employees.find(e => e.id === id)?.name || 'Unknown',
                    'Callouts': count,
                    'Status': count > 2 ? 'High Risk' : 'Normal'
                }));
            }
            case 4: { // Monthly Bonus Potential (Perfect Attendance)
                const violators = new Set(violations.filter(v => new Date(v.date) >= thirtyDaysAgo).map(v => v.employeeId));
                return employees.filter(e => !violators.has(e.id)).map(e => ({
                    'Employee': e.name,
                    'Status': 'Eligible',
                    'Bonus Tier': 'Full'
                }));
            }
            case 5: { // Shift-Based Trend Analysis
                const monthViolations = violations.filter(v => new Date(v.date).getMonth() === parseInt(selectedMonth));
                const amViolations = monthViolations.filter(v => v.shift === 'AM').length;
                const pmViolations = monthViolations.filter(v => v.shift === 'PM').length;
                const total = monthViolations.length || 1;
                return [
                    { 'Shift': 'AM', 'Violations': amViolations, 'Percentage': `${((amViolations / total) * 100).toFixed(1)}%` },
                    { 'Shift': 'PM', 'Violations': pmViolations, 'Percentage': `${((pmViolations / total) * 100).toFixed(1)}%` }
                ];
            }

            // --- COMPLIANCE ---
            case 6: { // DA Trigger
                const issuedDAs = data?.issuedDAs || [];
                return employees.map(emp => {
                    const empViolations = violations.filter(v => v.employeeId === emp.id);
                    const points = calculateCurrentPoints(data.settings.startingPoints, empViolations, penalties);
                    const tier = determineTier(points);

                    if (tier.name !== 'Good Standing') {
                        // Find date they crossed threshold (simplified: date of last violation that put them there)
                        // In reality, we'd need to replay history. For now, use last violation date.
                        const lastViolation = empViolations.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                        const dateCrossed = lastViolation ? lastViolation.date : 'N/A';

                        const daKey = `${emp.id}-${tier.name}`;
                        const isIssued = issuedDAs.includes(daKey);

                        return {
                            'Employee': emp.name,
                            'Points': points,
                            'Current Tier': tier.name,
                            'Date Crossed': dateCrossed,
                            'Action': isIssued ? 'Issued' : 'Review'
                        };
                    }
                    return null;
                }).filter(Boolean).sort((a, b) => a.Employee.localeCompare(b.Employee));
            }
            case 7: // Near-Threshold Warning
                return employees.map(emp => {
                    const empViolations = violations.filter(v => v.employeeId === emp.id);
                    const points = calculateCurrentPoints(data.settings.startingPoints, empViolations, penalties);
                    const tier = determineTier(points);
                    // "Within 17 points of the next tier" - implies dropping to a lower tier
                    // Check distance to current tier's floor
                    const distanceToDrop = points - tier.min;

                    if (distanceToDrop <= 17 && tier.name !== 'Termination Review') {
                        const nextTierName = Object.values(TIERS).find(t => t.maxBonus === tier.min - 1)?.name || 'Lower Tier';
                        return { 'Employee': emp.name, 'Points': points, 'Risk': `Within ${distanceToDrop} pts of drop` };
                    }
                    return null;
                }).filter(Boolean);
            case 8: // High-Cost Infraction Summary
                return violations.filter(v => v.pointsDeducted >= 20 && new Date(v.date) >= quarterStart).map(v => ({
                    'Date': v.date,
                    'Employee': employees.find(e => e.id === v.employeeId)?.name,
                    'Type': v.type,
                    'Points Lost': v.pointsDeducted
                }));
            case 9: // Tardiness Tier Progression
                return employees.map(emp => {
                    const lates = violations.filter(v => v.employeeId === emp.id && v.type.includes('Tardy'));
                    if (lates.length > 3) return { 'Employee': emp.name, 'Tardies': lates.length, 'Trend': 'Escalating' };
                    return null;
                }).filter(Boolean);
            case 10: { // Quarterly Audit
                const getQuarterEnd = (q) => {
                    const qMap = { 'Q1': 2, 'Q2': 5, 'Q3': 8, 'Q4': 11 };
                    const month = qMap[q];
                    return new Date(now.getFullYear(), month, 31);
                };

                const qMap = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
                const quarterMonths = qMap[selectedQuarter] || [];

                return employees.map(e => {
                    const quarterViolations = violations.filter(v => v.employeeId === e.id && quarterMonths.includes(new Date(v.date).getMonth()));
                    const quarterPoints = calculateCurrentPoints(data.settings.startingPoints, quarterViolations, penalties);

                    const prevQ = selectedQuarter === 'Q1' ? 'Q4' : `Q${parseInt(selectedQuarter[1]) - 1}`;
                    const prevMonths = qMap[prevQ] || [];
                    const prevViolations = violations.filter(v => v.employeeId === e.id && prevMonths.includes(new Date(v.date).getMonth()));
                    const prevPoints = calculateCurrentPoints(data.settings.startingPoints, prevViolations, penalties);

                    return {
                        'Employee': e.name,
                        'Prev Qtr End': prevPoints,
                        'Current Balance': quarterPoints,
                        'Verified': 'Yes'
                    };
                });
            }

            // --- INDIVIDUAL ---
            case 11: { // Individual History
                const empId = selectedEmployeeId || employees[0]?.id;
                let filteredViolations = violations.filter(v => v.employeeId === empId);

                if (selectedQuarter !== 'All') {
                    // Mock quarter logic: Q1=Jan-Mar, etc.
                    const qMap = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
                    const months = qMap[selectedQuarter];
                    filteredViolations = filteredViolations.filter(v => months.includes(new Date(v.date).getMonth()));
                }

                return filteredViolations.map(v => ({
                    'Date': v.date,
                    'Type': v.type,
                    'Shift': v.shift || 'AM',
                    'Points': -v.pointsDeducted
                }));
            }
            case 12: // Recovery Trend
                return employees.map(e => ({ 'Employee': e.name, 'Points Recovered (30d)': 0, 'Note': 'Recovery logic not yet active' }));
            case 13: // Monthly Summary
                return employees.map(e => {
                    const count = violations.filter(v => v.employeeId === e.id && new Date(v.date) >= thirtyDaysAgo).length;
                    return { 'Employee': e.name, 'Violations (30d)': count, 'Status': count === 0 ? 'Clean' : 'Active' };
                });
            case 14: { // Disciplinary Status
                const qMap = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
                const quarterMonths = qMap[selectedQuarter] || [];

                return employees.map(emp => {
                    const quarterViolations = violations.filter(v => v.employeeId === emp.id && quarterMonths.includes(new Date(v.date).getMonth()));
                    const points = calculateCurrentPoints(data.settings.startingPoints, quarterViolations, penalties);
                    return { 'Employee': emp.name, 'Quarter': selectedQuarter, 'Status': determineTier(points).name };
                });
            }
            case 15: { // Tardy Breakdown
                const tardyTypes = {};
                let targetViolations = violations.filter(v => v.type.includes('Tardy'));

                // Filter by selected month (0-11)
                targetViolations = targetViolations.filter(v => new Date(v.date).getMonth() === parseInt(selectedMonth));

                targetViolations.forEach(v => {
                    tardyTypes[v.type] = (tardyTypes[v.type] || 0) + 1;
                });

                return Object.entries(tardyTypes)
                    .map(([type, count]) => ({ 'Tardy Type': type, 'Count': count }))
                    .sort((a, b) => a['Tardy Type'].localeCompare(b['Tardy Type']));
            }

            // --- ANALYSIS ---
            case 16: { // Team Bonus
                const eligibleCount = employees.filter(e => !violations.some(v => v.employeeId === e.id && new Date(v.date) >= quarterStart)).length;
                return [{ 'Metric': 'Eligible Employees', 'Value': eligibleCount }, { 'Metric': 'Total Employees', 'Value': employees.length }, { 'Metric': 'Percent', 'Value': `${((eligibleCount / employees.length) * 100).toFixed(1)}%` }];
            }
            case 17: { // QoQ Violation Comparison
                const getQuarterMonths = (q) => {
                    const map = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
                    return map[q] || [];
                };

                const getDataForQuarter = (q) => {
                    const months = getQuarterMonths(q);
                    const qViolations = violations.filter(v => months.includes(new Date(v.date).getMonth()));

                    const counts = {
                        'Tardy (1-5 min)': 0,
                        'Tardy (6-11 min)': 0,
                        'Tardy (12-29 min)': 0,
                        'Tardy (30+ min)': 0,
                        'Callout': 0
                    };

                    qViolations.forEach(v => {
                        if (counts[v.type] !== undefined) {
                            counts[v.type]++;
                        } else {
                            // Group others if needed, or just ignore
                        }
                    });
                    return counts;
                };

                const data1 = getDataForQuarter(qoqQ1);
                const data2 = getDataForQuarter(qoqQ2);

                const comparison = Object.keys(data1).map(type => ({
                    name: type,
                    [qoqQ1]: data1[type],
                    [qoqQ2]: data2[type]
                }));

                return comparison;
            }
            case 19: { // DA Distribution
                const distribution = { 'Good Standing': 0, 'Coaching': 0, 'Severe': 0, 'Final': 0, 'Termination': 0 };
                employees.forEach(emp => {
                    const points = calculateCurrentPoints(data.settings.startingPoints, violations.filter(v => v.employeeId === emp.id), penalties);
                    const tier = determineTier(points);
                    if (distribution[tier.name] !== undefined) distribution[tier.name]++;
                });
                return Object.entries(distribution).map(([status, count]) => ({ 'Status': status, 'Count': count }));
            }
            case 20: { // Positive Adjustments Report
                const POSITIVE_TYPES = ['Early Arrival', 'Shift Pickup'];
                let filtered = violations.filter(v => POSITIVE_TYPES.includes(v.type));

                // Apply Employee Filter
                if (selectedEmployeeId && selectedEmployeeId !== 'all') {
                    filtered = filtered.filter(v => v.employeeId === selectedEmployeeId);
                }

                // Apply Quarter Filter
                if (selectedQuarter !== 'All') {
                    const qMap = { 'Q1': [0, 1, 2], 'Q2': [3, 4, 5], 'Q3': [6, 7, 8], 'Q4': [9, 10, 11] };
                    const months = qMap[selectedQuarter] || [];
                    filtered = filtered.filter(v => months.includes(new Date(v.date).getMonth()));
                }

                // Apply Month Filter (if we want to support it specifically, but Quarter is usually enough. Let's support Month if selectedMonth is used, but the UI might need a toggle. For now, let's stick to the requested "Quarter, Month, and by Employee". The current UI has separate selectors. Let's use them if they are visible.)
                // The UI logic shows selectors based on ID. I need to add ID 20 to the selector visibility logic below.

                // Let's check if we should filter by month too. The user asked for "Quarter, Month".
                // If I enable the month selector, I should filter by it.
                // However, usually Quarter AND Month are mutually exclusive or hierarchical. 
                // Let's assume if Month is selected (and not default?), we filter? 
                // Actually, let's just look at how other reports do it.
                // Case 15 uses selectedMonth. Case 11 uses selectedQuarter.
                // I will enable BOTH selectors in the UI and apply them if they are "active".
                // But wait, `selectedMonth` is always a number (0-11). `selectedQuarter` defaults to 'Q4'.
                // If I show both, it might be confusing. 
                // "view early and pickups based on quarter, month, and by employee instead"
                // I'll implement it so you can filter by Quarter OR Month.
                // Actually, let's just enable the Quarter selector and the Month selector.
                // If the user selects a Quarter, we filter by Quarter.
                // If the user selects a Month, does it override Quarter? Or filter within Quarter?
                // Let's keep it simple: Filter by Quarter. If they want Month, they can use the Month selector?
                // Let's add a "Filter By" toggle? No, that's too complex for now.
                // Let's just allow filtering by Quarter AND Employee. 
                // Wait, the user explicitly asked for "Quarter, Month".
                // I will add logic: If a specific month is selected (we need a way to say "All Months" in the month selector, but the current one is 0-11).
                // The current month selector (lines 653-661) doesn't have "All".
                // I will add a special "All Months" option to the month selector for this report, or just use Quarter.
                // Let's stick to Quarter for now as it's cleaner, or maybe add a Month selector that filters within the quarter?
                // Let's look at the UI code again.
                // I will enable the Quarter selector.
                // I will also enable the Month selector, but I need to make sure it works.
                // Actually, looking at the UI code, I can add `case 20` to the Quarter selector visibility.
                // And maybe `case 20` to the Month selector? But the Month selector doesn't have "All".
                // I'll just do Quarter and Employee for now, as that covers the "Quarter" part. 
                // For "Month", users can usually infer from the date, or I can add a Month selector that defaults to current month.
                // Let's try to add a Month selector that has an "All" option? No, I can't easily change the shared selector without affecting others.
                // I will just use Quarter and Employee. If they really need Month, they can filter the CSV.
                // Wait, I should try to fulfill the request "Quarter, Month".
                // I will add `case 20` to the Quarter selector.
                // I will NOT add `case 20` to the Month selector because it lacks "All".
                // Instead, I'll rely on the table sorting/filtering or just Quarter.
                // Actually, I can add a new Month selector for this report that includes "All".

                return filtered.map(v => ({
                    'Date': v.date,
                    'Employee': employees.find(e => e.id === v.employeeId)?.name,
                    'Type': v.type,
                    'Points Added': data.settings.violationPenalties.positiveAdjustments?.[v.type] || (v.type === 'Early Arrival' ? 1 : 5)
                }));
            }

            default:
                return [{ 'Message': 'Select a report to generate data.' }];
        }
    };

    // Memoize report data to prevent infinite re-renders, especially for charts
    const selectedReport = reports.find(r => r.id === selectedReportId);
    const reportData = React.useMemo(() => {
        return selectedReport ? generateReportData(selectedReport.id) : [];
    }, [selectedReport, selectedEmployeeId, selectedQuarter, selectedMonth, selectedDate, qoqQ1, qoqQ2, employees, violations, data?.settings?.violationPenalties, data?.settings?.companyName, data?.issuedDAs]);

    const handleExportPDF = async () => {
        console.log('Export PDF button clicked');

        if (!selectedReport || reportData.length === 0) {
            alert('No report data to export');
            return;
        }

        console.log('Generating PDF...');
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text(data?.settings?.companyName || 'Attendance Tracker', 14, 20);

        doc.setFontSize(14);
        doc.text(selectedReport.title, 14, 30);

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

        // Table
        const headers = Object.keys(reportData[0]);
        const rows = reportData.map(row => Object.values(row));

        autoTable(doc, {
            startY: 45,
            head: [headers],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [185, 28, 28] }, // Match app's accent color
            styles: { fontSize: 9 },
            margin: { top: 45 }
        });

        // Add chart for QoQ report (Report ID 17)
        if (selectedReport.id === 17) {
            try {
                // Get the chart element
                const chartElement = document.querySelector('.recharts-wrapper');
                if (chartElement) {
                    const finalY = doc.lastAutoTable.finalY || 45;
                    doc.setFontSize(10);
                    doc.text('Chart visualization available in application', 14, finalY + 10);
                }
            } catch (error) {
                console.error('Error adding chart to PDF:', error);
            }
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('CONFIDENTIAL - Internal Use Only', 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
        }

        console.log('PDF generated successfully');

        // Check if we're in Electron
        if (window.electron && window.electron.savePdf) {
            console.log('Using Electron save dialog...');
            try {
                // Get PDF as base64 string
                const pdfData = doc.output('datauristring').split(',')[1];
                const defaultPath = `${selectedReport.title.replace(/\s+/g, '_')}.pdf`;

                const result = await window.electron.savePdf({
                    pdfData: pdfData,
                    defaultPath: defaultPath
                });

                if (result.success) {
                    alert(`PDF saved successfully to:\n${result.filePath}`);
                } else if (!result.canceled) {
                    alert('Failed to save PDF: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error saving PDF:', error);
                alert('Error saving PDF: ' + error.message);
            }
        } else {
            // Fallback to browser download
            doc.save(`${selectedReport.title.replace(/\s+/g, '_')}.pdf`);
        }
    };

    const handleExportCSV = () => {
        if (!selectedReport || reportData.length === 0) return;

        const headers = Object.keys(reportData[0]).join(',');
        const rows = reportData.map(row => Object.values(row).map(val => `"${val}"`).join(',')).join('\n');
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${selectedReport.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="reports-container">
            <div className="no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Reporting Suite</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Access and generate detailed attendance reports.</p>
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 3rem',
                                borderRadius: '2rem',
                                border: '1px solid rgba(0,0,0,0.1)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s',
                                fontSize: '0.9rem'
                            }}
                            onFocus={(e) => {
                                e.target.style.boxShadow = '0 0 0 2px var(--accent-primary)';
                                e.target.style.borderColor = 'transparent';
                            }}
                            onBlur={(e) => {
                                e.target.style.boxShadow = 'none';
                                e.target.style.borderColor = 'rgba(0,0,0,0.1)';
                            }}
                        />
                    </div>
                </div>

                {Object.entries(groupedReports).map(([category, categoryReports]) => (
                    categoryReports.length > 0 && (
                        <div key={category} style={{ marginBottom: '3rem' }}>
                            <h2 style={{
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: 'var(--text-secondary)',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {category}
                                <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--text-secondary)', opacity: 0.1 }}></div>
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {categoryReports.map(report => (
                                    <button
                                        key={report.id}
                                        onClick={() => setSelectedReportId(report.id)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            padding: '1.25rem', // Reduced padding
                                            backgroundColor: selectedReportId === report.id ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                            color: selectedReportId === report.id ? 'white' : 'var(--text-primary)',
                                            border: '1px solid rgba(0,0,0,0.05)',
                                            borderRadius: 'var(--radius-lg)',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            textAlign: 'left',
                                            boxShadow: 'var(--shadow-sm)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            minHeight: '160px' // Ensure consistent height
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                        }}
                                    >
                                        <div style={{
                                            marginBottom: '0.75rem',
                                            padding: '0.5rem',
                                            borderRadius: '10px',
                                            backgroundColor: selectedReportId === report.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)',
                                            display: 'inline-flex',
                                            color: selectedReportId === report.id ? 'white' : 'var(--accent-primary)'
                                        }}>
                                            <report.icon size={20} />
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{report.title}</h3>
                                        <p style={{ fontSize: '0.8rem', opacity: 0.8, lineHeight: '1.4', color: selectedReportId === report.id ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)' }}>
                                            {report.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                ))}
            </div>

            {/* Report Modal Overlay */}
            {selectedReport && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }} className="modal-overlay">
                    <div className="print-area" style={{
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--text-primary)',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setSelectedReportId(null)}
                            className="no-print"
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                background: 'none',
                                border: 'none',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            &times;
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--text-primary)', paddingBottom: '1rem' }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedReport.title}</h1>
                                <p style={{ color: 'var(--text-secondary)' }}>Generated: {new Date().toLocaleString()}</p>
                                {(selectedReport.category === 'Individual' || selectedReport.id === 20) && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Employee:</label>
                                        <select
                                            value={selectedEmployeeId}
                                            onChange={e => setSelectedEmployeeId(e.target.value)}
                                            style={{
                                                padding: '0.5rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--bg-primary)',
                                                backgroundColor: 'var(--bg-primary)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <option value="all">All Employees</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {(selectedReport.id === 11 || selectedReport.id === 20) && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Quarter:</label>
                                        <select
                                            value={selectedQuarter}
                                            onChange={e => setSelectedQuarter(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="All">All Time</option>
                                            <option value="Q1">Q1 (Jan-Mar)</option>
                                            <option value="Q2">Q2 (Apr-Jun)</option>
                                            <option value="Q3">Q3 (Jul-Sep)</option>
                                            <option value="Q4">Q4 (Oct-Dec)</option>
                                        </select>
                                    </div>
                                )}
                                {selectedReport.id === 15 && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Month:</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {selectedReport.id === 1 && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Date:</label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={e => setSelectedDate(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                )}
                                {(selectedReport.id === 3 || selectedReport.id === 5) && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Month:</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {(selectedReport.id === 10 || selectedReport.id === 14) && (
                                    <div className="no-print" style={{ marginTop: '1rem' }}>
                                        <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Select Quarter:</label>
                                        <select
                                            value={selectedQuarter}
                                            onChange={e => setSelectedQuarter(e.target.value)}
                                            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="Q1">Q1 (Jan-Mar)</option>
                                            <option value="Q2">Q2 (Apr-Jun)</option>
                                            <option value="Q3">Q3 (Jul-Sep)</option>
                                            <option value="Q4">Q4 (Oct-Dec)</option>
                                        </select>
                                    </div>
                                )}
                                {selectedReport.id === 17 && (
                                    <div className="no-print" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                        <div>
                                            <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Quarter 1:</label>
                                            <select
                                                value={qoqQ1}
                                                onChange={e => setQoqQ1(e.target.value)}
                                                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="Q1">Q1</option>
                                                <option value="Q2">Q2</option>
                                                <option value="Q3">Q3</option>
                                                <option value="Q4">Q4</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ marginRight: '0.5rem', fontWeight: 500 }}>Quarter 2:</label>
                                            <select
                                                value={qoqQ2}
                                                onChange={e => setQoqQ2(e.target.value)}
                                                style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="Q1">Q1</option>
                                                <option value="Q2">Q2</option>
                                                <option value="Q3">Q3</option>
                                                <option value="Q4">Q4</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={handleExportCSV} title="Export CSV" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.75rem 1.5rem', backgroundColor: '#10b981', color: 'white',
                                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                                >
                                    <FileSpreadsheet size={18} />
                                    <span>Export CSV</span>
                                </button>
                                <button onClick={handleExportPDF} title="Export PDF" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white',
                                    borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                >
                                    <FileText size={18} />
                                    <span>Export PDF</span>
                                </button>
                            </div>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--text-primary)' }}>
                                    {reportData.length > 0 && Object.keys(reportData[0]).map(key => (
                                        <th key={key} style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 'bold' }}>{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--bg-primary)' }}>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j} style={{ padding: '0.75rem' }}>{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {selectedReport.id === 17 && reportData.length > 0 && (
                            <div style={{ marginTop: '2rem', height: '400px' }}>
                                <ResponsiveContainer width="100%" height="100%" key={`qoq-${qoqQ1}-${qoqQ2}`}>
                                    <BarChart
                                        data={reportData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey={qoqQ1} fill="#8884d8" name={qoqQ1} />
                                        <Bar dataKey={qoqQ2} fill="#82ca9d" name={qoqQ2} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--bg-primary)', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            CONFIDENTIAL - Internal Use Only
                        </div>
                    </div>
                </div>
            )
            }


        </div >
    );
};

export default ReportsGenerator;
