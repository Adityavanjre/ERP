const { Client } = require('pg');
const connectionString = "postgresql://postgres.nyakpylctpygnlrxvhxn:UvgtMof7AgAsubaQ@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

async function fixSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Cloud Database...');
    await client.query('ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "gstMandatory" BOOLEAN NOT NULL DEFAULT false;');
    console.log('✅ Schema update successful! Column "gstMandatory" added.');
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
  } finally {
    await client.end();
  }
}

fixSchema();
