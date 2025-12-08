import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from 'lucide-react';
import { format, parse } from 'date-fns';

const ModernDatePicker = ({
    value,
    onChange,
    label,
    placeholder = "Select date...",
    required = false,
    minDate,
    maxDate,
    className,
    style,
    showInputIcon = true
}) => {
    // Convert YYYY-MM-DD string to Date object (Local Midnight)
    const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;

    // Handle change: Date object -> YYYY-MM-DD string
    const handleChange = (date) => {
        if (!date) {
            onChange('');
            return;
        }
        onChange(format(date, 'yyyy-MM-dd'));
    };

    // Parse min/max strings if provided
    const min = typeof minDate === 'string' ? parse(minDate, 'yyyy-MM-dd', new Date()) : minDate;
    const max = typeof maxDate === 'string' ? parse(maxDate, 'yyyy-MM-dd', new Date()) : maxDate;

    // Custom Input Component
    const CustomInput = forwardRef(({ value: displayValue, onClick }, ref) => (
        <div
            className="modern-datepicker-input-wrapper"
            onClick={onClick}
            ref={ref}
            style={style}
        >
            {showInputIcon && <Calendar size={18} className="modern-datepicker-icon" />}
            <input
                value={displayValue}
                readOnly
                placeholder={placeholder}
                className={`modern-datepicker-input ${className || ''}`}
                required={required}
            />
        </div>
    ));

    return (
        <div className="modern-datepicker-container">
            {label && <label className="modern-datepicker-label">{label}</label>}
            <DatePicker
                selected={selectedDate}
                onChange={handleChange}
                dateFormat="MMM d, yyyy"
                customInput={<CustomInput />}
                minDate={min}
                maxDate={max}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                popperClassName="modern-datepicker-popper"
            />
        </div>
    );
};

export default ModernDatePicker;
