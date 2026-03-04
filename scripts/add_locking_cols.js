const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.fatfgymyoiyemjtnotos:uX0HpBwSh24YUFoW@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Check daily_reports columns
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='daily_reports';
        `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Current daily_reports columns:', columns);

        if (!columns.includes('is_locked')) {
            console.log('Adding column is_locked...');
            await client.query('ALTER TABLE daily_reports ADD COLUMN is_locked BOOLEAN DEFAULT false;');
        }

        if (!columns.includes('locked_at')) {
            console.log('Adding column locked_at...');
            await client.query('ALTER TABLE daily_reports ADD COLUMN locked_at TIMESTAMPTZ;');
        }

        if (!columns.includes('locked_by')) {
            console.log('Adding column locked_by...');
            await client.query('ALTER TABLE daily_reports ADD COLUMN locked_by UUID;');
        }

        console.log('Database migration completed successfully.');

    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await client.end();
    }
}

run();
