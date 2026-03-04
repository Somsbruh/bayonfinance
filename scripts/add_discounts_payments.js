const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.fatfgymyoiyemjtnotos:uX0HpBwSh24YUFoW@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Check ledger_entries columns for discount fields
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='ledger_entries';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('Current ledger_entries columns:', columns);

        if (!columns.includes('discount_type')) {
            console.log('Adding column discount_type...');
            await client.query(`ALTER TABLE ledger_entries ADD COLUMN discount_type TEXT DEFAULT NULL CHECK (discount_type IN ('percentage', 'fixed'));`);
        }

        if (!columns.includes('discount_value')) {
            console.log('Adding column discount_value...');
            await client.query(`ALTER TABLE ledger_entries ADD COLUMN discount_value NUMERIC DEFAULT 0;`);
        }

        // 2. Create payment_transactions table
        const tableRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='payment_transactions';
        `);

        if (tableRes.rows.length === 0) {
            console.log('Creating payment_transactions table...');
            await client.query(`
                CREATE TABLE payment_transactions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE CASCADE,
                    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
                    branch_id UUID NOT NULL,
                    visit_date DATE NOT NULL,
                    amount_usd NUMERIC NOT NULL DEFAULT 0,
                    amount_raw NUMERIC NOT NULL DEFAULT 0,
                    method TEXT NOT NULL DEFAULT 'cash_usd',
                    notes TEXT,
                    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            `);
            console.log('payment_transactions table created.');
        } else {
            console.log('payment_transactions table already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Error during migration:', err);
    } finally {
        await client.end();
    }
}

run();
