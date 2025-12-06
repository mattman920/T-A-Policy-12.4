import React, { useState } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { calculateCurrentPoints, determineTier, calculateQuarterlyStart, TIERS } from '../utils/pointCalculator';
import { getQuarterKey } from '../utils/dateUtils';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Upload, FileText, AlertCircle } from 'lucide-react';

const EMDReportModal = ({ isOpen, onClose }) => {
    const { data } = useData();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [csvFile, setCsvFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setCsvFile(e.target.files[0]);
            setError('');
        }
    };

    const generateReport = () => {
        if (!csvFile) {
            setError('Please upload a CSV file.');
            return;
        }

        setProcessing(true);
        setError('');

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    processData(results.data);
                } catch (err) {
                    console.error("Error processing data:", err);
                    setError('Error processing CSV data. Please check the file format.');
                    setProcessing(false);
                }
            },
            error: (err) => {
                console.error("CSV Parse Error:", err);
                setError('Failed to parse CSV file.');
                setProcessing(false);
            }
        });
    };


    const processData = (csvData) => {
        try {
            const doc = new jsPDF();
            const fileName = `EMD_Report_${selectedMonth + 1}_${selectedYear}.pdf`;

            // --- 1. Header & Styling Setup ---
            const companyName = data?.settings?.companyName || "Company Name";
            const reportTitle = "Employee Meal Dollars (EMD) Report";
            const periodText = `${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })} ${selectedYear}`;
            const generatedDate = new Date().toLocaleString();

            // Add Logo or Branding Line (Simple colored bar for now)
            doc.setFillColor(185, 28, 28); // Crimson Red (Brand Color)
            doc.rect(0, 0, 210, 5, 'F'); // Top bar

            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(40, 40, 40);
            doc.text(reportTitle, 14, 25);

            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text(companyName, 14, 32);
            doc.text(`Period: ${periodText}`, 14, 38);

            doc.setFontSize(10);
            doc.text(`Generated: ${generatedDate}`, 200, 38, { align: 'right' });

            // --- 2. Data Processing ---
            let totalScheduled = 0;
            let totalPotential = 0;
            let totalFinalEMD = 0;

            const processedRows = csvData.map(row => {
                const empName = row['Name'] || row['Employee Name'];
                if (!empName) return null;

                // Find internal employee
                const employee = data.employees.find(e => e.name.toLowerCase() === empName.toLowerCase());

                // Filter out unmatched employees
                if (!employee) return null;

                let currentPoints = 0;

                if (employee) {
                    const empViolations = data.violations.filter(v => v.employeeId === employee.id);
                    // Calculate points based on violations up to the end of the selected month
                    const reportDate = new Date(selectedYear, selectedMonth + 1, 0); // End of selected month
                    const relevantViolations = empViolations.filter(v => new Date(v.date) <= reportDate);
                    const qKey = getQuarterKey(reportDate);
                    const startPoints = calculateQuarterlyStart(qKey, data.violations, data.settings);
                    currentPoints = calculateCurrentPoints(startPoints, relevantViolations, data.settings.violationPenalties);
                }

                const scheduledShifts = parseInt(row['Scheduled'] || '0', 10);

                // Filter out employees with 0 shifts
                if (scheduledShifts === 0) return null;

                // --- Calculation Logic ---
                // A. Potential EMD
                const potentialEMD = scheduledShifts * 5;

                // B. Deduction
                // Use determineTier to get the tier effectively used in the Scorecard
                const tier = determineTier(currentPoints, data.settings.daSettings);

                let deductionPercent = 0;

                if (tier.name === TIERS.GOOD.name) {
                    deductionPercent = 0;
                } else if (tier.name === TIERS.EDUCATIONAL.name) {
                    deductionPercent = 0.25;
                } else if (tier.name === TIERS.COACHING.name) {
                    deductionPercent = 0.50;
                } else if (tier.name === TIERS.SEVERE.name) {
                    deductionPercent = 0.75;
                } else {
                    // Final, Termination, or fallback
                    deductionPercent = 1.00;
                }

                // C. Bonus (Reward Tiers)
                let bonusPercent = 0;
                if (currentPoints >= 145) bonusPercent = 0.20;      // Gold
                else if (currentPoints >= 138) bonusPercent = 0.10; // Silver
                else if (currentPoints >= 130) bonusPercent = 0.05; // Bronze

                // D. Final EMD
                const baseEMD = potentialEMD * (1 - deductionPercent);
                const bonusAmount = baseEMD * bonusPercent;
                const finalEMD = baseEMD + bonusAmount;

                // Update Totals
                totalScheduled += scheduledShifts;
                totalPotential += potentialEMD;
                totalFinalEMD += finalEMD;

                return {
                    name: empName,
                    scheduled: scheduledShifts,
                    potential: potentialEMD,
                    deduction: deductionPercent,
                    bonus: bonusPercent,
                    final: finalEMD
                };
            }).filter(Boolean);

            // Sort alphabetically
            processedRows.sort((a, b) => a.name.localeCompare(b.name));

            // Format for Table
            const tableBody = processedRows.map(row => [
                row.name,
                row.scheduled,
                `$${row.potential.toFixed(2)}`,
                `${(row.deduction * 100).toFixed(0)}%`,
                row.bonus > 0 ? `+${(row.bonus * 100).toFixed(0)}%` : '-',
                `$${row.final.toFixed(2)}`
            ]);

            // Add Totals Row
            tableBody.push([
                { content: 'TOTALS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: totalScheduled.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: `$${totalPotential.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
                { content: '', styles: { fillColor: [240, 240, 240] } }, // Blank Deduction
                { content: '', styles: { fillColor: [240, 240, 240] } }, // Blank Bonus
                { content: `$${totalFinalEMD.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
            ]);

            // --- 3. Generate Table ---
            autoTable(doc, {
                startY: 45,
                head: [['Employee Name', 'Scheduled Shifts', 'Potential Earned', 'Deduction', 'Bonus', 'Final EMD']],
                body: tableBody,
                theme: 'grid',
                headStyles: {
                    fillColor: [40, 40, 40], // Dark Gray/Black for professional look
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'left' },   // Name
                    1: { halign: 'center' }, // Shifts
                    2: { halign: 'right' },  // Potential
                    3: { halign: 'center' }, // Deduction
                    4: { halign: 'center' }, // Bonus
                    5: { halign: 'right' }   // Final
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 6,
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1,
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                },
                didParseCell: function (data) {
                    // Style the Totals row specifically if needed (handled via body content styles above)
                }
            });

            // Save PDF
            if (window.electron && window.electron.savePdf) {
                const pdfData = doc.output('datauristring').split(',')[1];
                window.electron.savePdf({
                    pdfData: pdfData,
                    defaultPath: fileName
                }).then(result => {
                    if (result.success) {
                        alert(`Report saved to ${result.filePath}`);
                        onClose();
                    }
                });
            } else {
                doc.save(fileName);
                onClose();
            }
        } catch (err) {
            console.error("Error generating report:", err);
            setError('Failed to generate PDF report.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generate EMD Report">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                    <FileText size={20} color="var(--accent-primary)" style={{ marginTop: '2px' }} />
                    <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)' }}>How this works</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Upload the 7Shifts Attendance CSV. The system will calculate EMD based on scheduled shifts and internal attendance scores for the selected period.
                        </p>
                    </div>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Month</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Year</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Upload CSV</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px dashed var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        />
                        <Upload size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    </div>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Required columns: <strong>Name</strong>, <strong>Scheduled</strong>
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={generateReport}
                        disabled={processing || !csvFile}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: (processing || !csvFile) ? 'not-allowed' : 'pointer',
                            opacity: (processing || !csvFile) ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {processing ? 'Processing...' : <><Download size={18} /> Generate Report</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EMDReportModal;
