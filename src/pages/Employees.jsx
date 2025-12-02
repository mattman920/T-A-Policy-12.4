import React, { useState, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import Modal from '../components/Modal';
import { calculateCurrentPoints, determineTier, STARTING_POINTS, calculateDeductions } from '../utils/pointCalculator';
import { getCurrentQuarterDates } from '../utils/dateUtils';
import { Search, Upload, Archive, UserPlus, FileText, Filter, Trash2 } from 'lucide-react';
import Papa from 'papaparse';

const Employees = () => {
    const { data, loading, addEmployee, addViolation, updateEmployee, deleteEmployee } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const fileInputRef = useRef(null);

    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const [violationType, setViolationType] = useState('Tardy (1-5 min)');
    const [violationDate, setViolationDate] = useState(new Date().toISOString().split('T')[0]);
    const [violationShift, setViolationShift] = useState('AM');

    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        await addEmployee(newEmployeeName, startDate);
        setIsModalOpen(false);
        setNewEmployeeName('');
    };

    const openViolationModal = (employee) => {
        setSelectedEmployee(employee);
        setIsViolationModalOpen(true);
    };

    const handleAddViolation = async (e) => {
        e.preventDefault();
        if (selectedEmployee) {
            // Calculate marginal deduction
            const { startDate, endDate } = getCurrentQuarterDates();
            const empViolations = data.violations.filter(v => {
                const vDate = new Date(v.date);
                return v.employeeId === selectedEmployee.id && vDate >= startDate && vDate <= endDate;
            });
            const currentDeductions = calculateDeductions(empViolations, data.settings.violationPenalties);

            const newViolation = { type: violationType, date: violationDate };
            const newDeductions = calculateDeductions([...empViolations, newViolation], data.settings.violationPenalties);

            const pointsDeducted = newDeductions - currentDeductions;

            await addViolation(selectedEmployee.id, violationType, violationDate, pointsDeducted, violationShift);
            setIsViolationModalOpen(false);
            setSelectedEmployee(null);
            setViolationShift('AM'); // Reset shift
        }
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                let count = 0;
                for (const row of results.data) {
                    if (row.Name && row.StartDate) {
                        await addEmployee(row.Name, row.StartDate);
                        count++;
                    }
                }
                alert(`Successfully imported ${count} employees.`);
            },
            error: (error) => {
                alert('Error parsing CSV: ' + error.message);
            }
        });
        e.target.value = null;
    };

    const toggleArchive = async (employee) => {
        if (confirm(`Are you sure you want to ${employee.archived ? 'unarchive' : 'archive'} ${employee.name}?`)) {
            const updatedEmployee = {
                ...employee,
                archived: !employee.archived,
                archivedDate: !employee.archived ? new Date().toISOString() : null
            };
            const { error } = await updateEmployee(updatedEmployee);
            if (error) {
                alert(`Failed to update employee: ${error.message}`);
            }
        }
    };

    const handleDeleteEmployee = async (employee) => {
        if (confirm(`Are you sure you want to PERMANENTLY DELETE ${employee.name}? This action cannot be undone and will remove all their data.`)) {
            const { error } = await deleteEmployee(employee.id);
            if (error) {
                alert(`Failed to delete employee: ${error.message}`);
            }
        }
    };

    const filteredEmployees = data.employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesArchive = showArchived ? emp.archived : !emp.archived;
        return matchesSearch && matchesArchive;
    });

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Employees</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => fileInputRef.current.click()}
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer'
                        }}
                    >
                        <Upload size={18} /> Import CSV
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        accept=".csv"
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            boxShadow: 'var(--shadow-sm)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <UserPlus size={18} /> Add Employee
                    </button>
                </div>
            </div>

            <div style={{
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                backgroundColor: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem 0.75rem 3rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            fontSize: '1rem'
                        }}
                    />
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: showArchived ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                        color: showArchived ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500
                    }}
                >
                    <Archive size={18} /> {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {filteredEmployees.map(employee => {
                    const { startDate, endDate } = getCurrentQuarterDates();
                    const empViolations = data.violations.filter(v => {
                        const vDate = new Date(v.date);
                        return v.employeeId === employee.id && vDate >= startDate && vDate <= endDate;
                    });
                    const points = calculateCurrentPoints(data.settings.startingPoints, empViolations, data.settings.violationPenalties);
                    const tier = determineTier(points);

                    return (
                        <div key={employee.id} style={{
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-md)',
                            border: '1px solid var(--border-color)',
                            opacity: employee.archived ? 0.7 : 1
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{employee.name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Started: {new Date(employee.startDate).toLocaleDateString()}</p>
                                </div>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    backgroundColor: tier.color + '20',
                                    color: tier.color
                                }}>
                                    {points} pts
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                                    <span style={{ fontWeight: 500, color: tier.color }}>{tier.name}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => openViolationModal(employee)}
                                    disabled={employee.archived}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        cursor: employee.archived ? 'not-allowed' : 'pointer',
                                        opacity: employee.archived ? 0.5 : 1
                                    }}
                                >
                                    Log Violation
                                </button>
                                <button
                                    onClick={() => toggleArchive(employee)}
                                    title={employee.archived ? "Unarchive" : "Archive"}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Archive size={18} />
                                </button>
                                {employee.archived && (
                                    <button
                                        onClick={() => handleDeleteEmployee(employee)}
                                        title="Permanently Delete"
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--accent-danger)',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            color: 'var(--accent-danger)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Employee">
                <form onSubmit={handleAddEmployee}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Full Name</label>
                        <input
                            type="text"
                            value={newEmployeeName}
                            onChange={(e) => setNewEmployeeName(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--accent-primary)',
                                color: 'white',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Add Employee
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isViolationModalOpen} onClose={() => setIsViolationModalOpen(false)} title={`Log Violation for ${selectedEmployee?.name}`}>
                <form onSubmit={handleAddViolation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Violation Type</label>
                        <select
                            value={violationType}
                            onChange={(e) => setViolationType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="Tardy (1-5 min)">Tardy (1-5 min)</option>
                            <option value="Tardy (6-11 min)">Tardy (6-11 min)</option>
                            <option value="Tardy (12-29 min)">Tardy (12-29 min)</option>
                            <option value="Tardy (30+ min)">Tardy (30+ min)</option>
                            <option value="Callout">Callout</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date</label>
                        <input
                            type="date"
                            value={violationDate}
                            onChange={(e) => setViolationDate(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Shift</label>
                        <select
                            value={violationShift}
                            onChange={(e) => setViolationShift(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #cbd5e1',
                                fontSize: '1rem',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setIsViolationModalOpen(false)}
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--accent-danger)',
                                color: 'white',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Log Violation
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
};

export default Employees;
