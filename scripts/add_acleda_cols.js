const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.fatfgymyoiyemjtnotos:uX0HpBwSh24YUFoW@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();

        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='ledger_entries';
    `);

        const columns = res.rows.map(r => r.column_name);

        if (!columns.includes('paid_acleda_usd')) {
            console.log('Adding column paid_acleda_usd...');
            await client.query('ALTER TABLE ledger_entries ADD COLUMN paid_acleda_usd NUMERIC DEFAULT 0;');
            console.log('Successfully added paid_acleda_usd.');
        } else {
            console.log('Column paid_acleda_usd already exists.');
        }

        if (!columns.includes('paid_acleda_khr')) {
            console.log('Adding column paid_acleda_khr...');
            await client.query('ALTER TABLE ledger_entries ADD COLUMN paid_acleda_khr NUMERIC DEFAULT 0;');
            console.log('Successfully added paid_acleda_khr.');
        } else {
            console.log('Column paid_acleda_khr already exists.');
        }

        const resSett = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='daily_cash_logs';
    `);
        const columnsSett = resSett.rows.map(r => r.column_name);

        if (!columnsSett.includes('paid_acleda_usd')) {
            console.log('Adding column paid_acleda_usd to daily_cash_logs...');
            await client.query('ALTER TABLE daily_cash_logs ADD COLUMN paid_acleda_usd NUMERIC DEFAULT 0;');
        }
        if (!columnsSett.includes('paid_acleda_khr')) {
            console.log('Adding column paid_acleda_khr to daily_cash_logs...');
            await client.query('ALTER TABLE daily_cash_logs ADD COLUMN paid_acleda_khr NUMERIC DEFAULT 0;');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
