import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_TARDY_PENALTIES, DEFAULT_CALLOUT_PENALTIES, DEFAULT_POSITIVE_ADJUSTMENTS } from '../utils/pointCalculator';

const STORAGE_KEY = 'attendance_tracker_local_data';

const DEFAULT_SETTINGS = {
    companyName: 'Attendance (Local)',
    startingPoints: 25,
    violationPenalties: {
        tardy: DEFAULT_TARDY_PENALTIES,
        callout: DEFAULT_CALLOUT_PENALTIES,
        positiveAdjustments: DEFAULT_POSITIVE_ADJUSTMENTS
    },
    reportUsage: {},
    geminiApiKey: '' // Added API Key
};

const INITIAL_DATA = {
    employees: [],
    violations: [],
    issuedDAs: [],
    settings: DEFAULT_SETTINGS
};

class LocalStorageService {
    constructor() {
        this.data = this._loadData();
    }

    _loadData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure structure
                return {
                    employees: parsed.employees || [],
                    violations: parsed.violations || [],
                    issuedDAs: parsed.issuedDAs || [],
                    settings: { ...DEFAULT_SETTINGS, ...parsed.settings }
                };
            } catch (e) {
                console.error("Failed to parse local storage data", e);
                return INITIAL_DATA;
            }
        }
        return INITIAL_DATA;
    }

    _saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    // --- Generic Helpers ---
    getData() {
        return JSON.parse(JSON.stringify(this.data));
    }

    // --- Employees ---
    getEmployees() {
        return [...this.data.employees];
    }

    async addEmployee(employee) {
        const newEmployee = {
            ...employee,
            id: employee.id || uuidv4(),
            active: true,
            archived: false,
            currentPoints: employee.currentPoints || this.data.settings.startingPoints,
            tier: employee.tier || 'Good Standing'
        };
        this.data.employees.push(newEmployee);
        this._saveData();
        return { data: newEmployee, error: null };
    }

    async updateEmployee(id, updates) {
        const index = this.data.employees.findIndex(e => e.id === id);
        if (index === -1) return { error: 'Employee not found' };

        this.data.employees[index] = { ...this.data.employees[index], ...updates };
        this._saveData();
        return { data: this.data.employees[index], error: null };
    }

    async deleteEmployee(id) {
        this.data.employees = this.data.employees.filter(e => e.id !== id);
        // Also clean up violations and DAs
        this.data.violations = this.data.violations.filter(v => v.employeeId !== id);
        this.data.issuedDAs = this.data.issuedDAs.filter(key => !key.startsWith(`${id}-`));

        this._saveData();
        return { error: null };
    }

    // --- Violations ---
    getViolations() {
        return [...this.data.violations];
    }

    async addViolation(violation) {
        const newViolation = {
            ...violation,
            id: violation.id || uuidv4(),
        };
        this.data.violations.push(newViolation);
        this._saveData();
        return { data: newViolation, error: null };
    }

    async updateViolation(id, updates) {
        const index = this.data.violations.findIndex(v => v.id === id);
        if (index === -1) return { error: 'Violation not found' };

        this.data.violations[index] = { ...this.data.violations[index], ...updates };
        this._saveData();
        return { data: this.data.violations[index], error: null };
    }

    async deleteViolation(id) {
        this.data.violations = this.data.violations.filter(v => v.id !== id);
        this._saveData();
        return { error: null };
    }

    // --- Settings ---
    getSettings() {
        return { ...this.data.settings };
    }

    async updateSettings(updates) {
        this.data.settings = { ...this.data.settings, ...updates };
        this._saveData();
        return { data: this.data.settings, error: null };
    }

    // --- Issued DAs ---
    getIssuedDAs() {
        return [...this.data.issuedDAs];
    }

    async issueDA(daKey) {
        if (!this.data.issuedDAs.includes(daKey)) {
            this.data.issuedDAs.push(daKey);
            this._saveData();
        }
        return { error: null };
    }
}

export const localStorageService = new LocalStorageService();
