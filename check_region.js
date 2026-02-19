const { Client } = require('pg');

const regions = [
    'aws-0-ap-southeast-1.pooler.supabase.com',
    'aws-0-ap-south-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com',
    'aws-0-eu-central-1.pooler.supabase.com',
    'aws-0-ap-northeast-1.pooler.supabase.com',
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-ap-northeast-2.pooler.supabase.com', // Seoul
    'aws-0-ap-southeast-2.pooler.supabase.com', // Sydney
    'aws-0-ca-central-1.pooler.supabase.com', // Canada
    'aws-0-eu-west-1.pooler.supabase.com', // Ireland
    'aws-0-eu-west-2.pooler.supabase.com', // London
    'aws-0-eu-west-3.pooler.supabase.com', // Paris
    'aws-0-us-west-1.pooler.supabase.com', // N. California
    'aws-0-us-west-2.pooler.supabase.com', // Oregon
    'aws-0-ap-southeast-3.pooler.supabase.com', // Jakarta
    'aws-0-ap-east-1.pooler.supabase.com', // Hong Kong
    'aws-0-me-south-1.pooler.supabase.com', // Bahrain
    'aws-0-me-central-1.pooler.supabase.com', // UAE
];

const password = 'CtCkRjnn8wP9uaBd';
const project = 'syldigwdydzcrhuscagl';

async function checkRegion(host) {
    const connectionString = `postgresql://postgres.${project}:${password}@${host}:5432/postgres`;
    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });

    try {
        console.log(`Checking ${host}...`);
        await client.connect();
        console.log(`✅ SUCCESS! Found tenant in: ${host}`);
        await client.end();
        process.exit(0);
    } catch (err) {
        if (err.message.includes('Tenant or user not found')) {
            console.log(`❌ Tenant not found in ${host}`);
        } else if (err.message.includes('password authentication failed')) {
            console.log(`✅ FOUND (Auth Error means tenant exists): ${host}`);
            process.exit(0);
        } else {
            console.log(`⚠️ Error in ${host}: ${err.message}`);
            // Likely network timeout or other issue, but if it's not "Tenant not found", it might be the one.
            if (!err.message.includes('getaddrinfo')) {
                // potentially the right one if just a timeout
            }
        }
    } finally {
        try { await client.end(); } catch (e) { }
    }
}

async function run() {
    for (const region of regions) {
        await checkRegion(region);
    }
    console.log('Done checking.');
}

run();
