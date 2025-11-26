const { Client } = require('pg');

const connectionString = "postgres://postgres.wcndkhrkqwocpflcuygr:5uFfSkxQaJbue4yq@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupDatabase() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Create Employees Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        start_date TEXT,
        active BOOLEAN DEFAULT true,
        current_points INTEGER,
        tier TEXT
      );
    `);
        console.log('Created employees table');

        // Create Violations Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS violations (
        id UUID PRIMARY KEY,
        employee_id UUID REFERENCES employees(id),
        type TEXT,
        date TEXT,
        shift TEXT,
        points_deducted INTEGER
      );
    `);
        console.log('Created violations table');

        // Create Settings Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        company_name TEXT,
        starting_points INTEGER,
        violation_penalties JSONB,
        report_usage JSONB
      );
    `);
        console.log('Created settings table');

        // Create Issued DAs Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS issued_das (
        id SERIAL PRIMARY KEY,
        da_key TEXT UNIQUE
      );
    `);
        console.log('Created issued_das table');

        // Insert default settings if not exists
        const res = await client.query('SELECT * FROM settings LIMIT 1');
        if (res.rows.length === 0) {
            await client.query(`
            INSERT INTO settings (company_name, starting_points, violation_penalties, report_usage)
            VALUES ($1, $2, $3, $4)
        `, [
                'Attendance',
                25,
                JSON.stringify({
                    tardy: {
                        "1-5": 0.25,
                        "6-11": 0.5,
                        "12-29": 1,
                        "30+": 2
                    },
                    callout: {
                        "Callout": 2
                    }
                }),
                JSON.stringify({})
            ]);
            console.log('Inserted default settings');
        }

    } catch (err) {
        console.error('Error setting up database:', err);
    } finally {
        await client.end();
    }
}

setupDatabase();
