import React, { useState } from 'react';
import Modal from './Modal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download } from 'lucide-react';

const TerminationsReportModal = ({ isOpen, onClose, employees }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const archivedEmployees = employees.filter(e => e.archived);

    const filteredEmployees = archivedEmployees.filter(e => {
        if (!startDate && !endDate) return true;
        const archiveDate = new Date(e.archivedDate);
        const start = startDate ? new Date(startDate) : new Date('1970-01-01');
        const end = endDate ? new Date(endDate) : new Date('2100-01-01');
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        return archiveDate >= start && archiveDate <= end;
    }).sort((a, b) => new Date(b.archivedDate) - new Date(a.archivedDate));

    const exportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Terminations Report', 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
        if (startDate || endDate) {
            doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'Present'}`, 14, 36);
        }

        const tableColumn = ["Employee Name", "Termination Date", "Points at Termination"];
        const tableRows = filteredEmployees.map(emp => [
            emp.name,
            emp.archivedDate ? new Date(emp.archivedDate).toLocaleDateString() : 'Unknown',
            emp.currentPoints || 'N/A'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [220, 38, 38] }, // Red header
        });

        doc.save('terminations_report.pdf');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Terminations Report">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Employee</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600 }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map(emp => (
                                    <tr key={emp.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{emp.name}</td>
                                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{emp.archivedDate ? new Date(emp.archivedDate).toLocaleDateString() : 'Unknown'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        No terminations found in this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={filteredEmployees.length === 0}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--accent-danger)',
                            color: 'white',
                            fontWeight: 600,
                            border: 'none',
                            cursor: filteredEmployees.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: filteredEmployees.length === 0 ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TerminationsReportModal;
