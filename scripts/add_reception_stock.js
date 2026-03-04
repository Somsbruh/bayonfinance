const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.fatfgymyoiyemjtnotos:uX0HpBwSh24YUFoW@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();

        // Check if column exists
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='inventory' AND column_name='reception_stock';
    `);

        if (res.rows.length === 0) {
            console.log('Adding column reception_stock...');
            await client.query('ALTER TABLE inventory ADD COLUMN reception_stock INTEGER DEFAULT 0;');
            console.log('Successfully added reception_stock column.');
        } else {
            console.log('Column reception_stock already exists.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
