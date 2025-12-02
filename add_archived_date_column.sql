-- Add archived_date column to employees table if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS archived_date TIMESTAMPTZ;

-- Optional: Add a comment to the column
COMMENT ON COLUMN employees.archived_date IS 'Date when the employee was archived';
