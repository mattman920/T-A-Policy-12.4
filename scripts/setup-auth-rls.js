const { Client } = require('pg');

const connectionString = "postgres://postgres.wcndkhrkqwocpflcuygr:5uFfSkxQaJbue4yq@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x";

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupAuthRLS() {
    try {
        await client.connect();
        console.log('Connected to database');

        const tables = ['employees', 'violations', 'settings', 'issued_das'];

        for (const table of tables) {
            // Add user_id column
            await client.query(`
            ALTER TABLE ${table} 
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
        `);
            console.log(`Added user_id to ${table}`);

            // Enable RLS
            await client.query(`
            ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
        `);
            console.log(`Enabled RLS on ${table}`);

            // Create Policies
            // Drop existing policies to avoid errors if re-running
            await client.query(`DROP POLICY IF EXISTS "Users can see their own data" ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS "Users can insert their own data" ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS "Users can update their own data" ON ${table}`);
            await client.query(`DROP POLICY IF EXISTS "Users can delete their own data" ON ${table}`);

            // SELECT
            await client.query(`
            CREATE POLICY "Users can see their own data" ON ${table}
            FOR SELECT
            USING (auth.uid() = user_id);
        `);

            // INSERT
            await client.query(`
            CREATE POLICY "Users can insert their own data" ON ${table}
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        `);

            // UPDATE
            await client.query(`
            CREATE POLICY "Users can update their own data" ON ${table}
            FOR UPDATE
            USING (auth.uid() = user_id);
        `);

            // DELETE
            await client.query(`
            CREATE POLICY "Users can delete their own data" ON ${table}
            FOR DELETE
            USING (auth.uid() = user_id);
        `);

            console.log(`Created policies for ${table}`);
        }

    } catch (err) {
        console.error('Error setting up Auth & RLS:', err);
    } finally {
        await client.end();
    }
}

setupAuthRLS();
