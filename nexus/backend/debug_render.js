const { Client } = require('pg');
const dns = require('dns');
const util = require('util');

const project = 'syldigwdydzcrhuscagl';
const password = 'CtCkRjnn8wP9uaBd';

const directHost = `db.${project}.supabase.co`;

const poolers = [
    { region: 'ap-south-1 (Mumbai)', host: 'aws-0-ap-south-1.pooler.supabase.com' },
    { region: 'ap-southeast-1 (Singapore)', host: 'aws-0-ap-southeast-1.pooler.supabase.com' },
    { region: 'ap-northeast-1 (Tokyo)', host: 'aws-0-ap-northeast-1.pooler.supabase.com' },
    { region: 'ap-northeast-2 (Seoul)', host: 'aws-0-ap-northeast-2.pooler.supabase.com' },
    { region: 'ap-southeast-2 (Sydney)', host: 'aws-0-ap-southeast-2.pooler.supabase.com' },
    { region: 'us-east-1 (Virginia)', host: 'aws-0-us-east-1.pooler.supabase.com' },
    { region: 'us-west-1 (N. California)', host: 'aws-0-us-west-1.pooler.supabase.com' },
    { region: 'us-west-2 (Oregon)', host: 'aws-0-us-west-2.pooler.supabase.com' },
    { region: 'eu-central-1 (Frankfurt)', host: 'aws-0-eu-central-1.pooler.supabase.com' },
    { region: 'eu-west-1 (Ireland)', host: 'aws-0-eu-west-1.pooler.supabase.com' },
    { region: 'eu-west-2 (London)', host: 'aws-0-eu-west-2.pooler.supabase.com' },
    { region: 'eu-west-3 (Paris)', host: 'aws-0-eu-west-3.pooler.supabase.com' },
    { region: 'ca-central-1 (Canada)', host: 'aws-0-ca-central-1.pooler.supabase.com' },
    { region: 'sa-east-1 (Sao Paulo)', host: 'aws-0-sa-east-1.pooler.supabase.com' },
];

async function resolveDNS(hostname) {
    console.log(`\n🔍 DNS Lookup for: ${hostname}`);
    try {
        const resolve4 = util.promisify(dns.resolve4);
        const resolve6 = util.promisify(dns.resolve6);

        try {
            const ipv4 = await resolve4(hostname);
            console.log(`   IPv4: ${ipv4.join(', ')}`);
        } catch (e) {
            console.log(`   IPv4: FAILED (${e.code})`);
        }

        try {
            const ipv6 = await resolve6(hostname);
            console.log(`   IPv6: ${ipv6.join(', ')}`);
        } catch (e) {
            console.log(`   IPv6: FAILED (${e.code})`);
        }
    } catch (e) {
        console.error(`   DNS Error: ${e.message}`);
    }
}

async function testConnection(name, host, port, usePoolerAuth) {
    console.log(`\n🔌 Testing Connection: ${name} (${host}:${port})`);

    // Construct user: 'postgres' for direct, 'postgres.project' for pooler
    const user = usePoolerAuth ? `postgres.${project}` : 'postgres';
    const connectionString = `postgresql://${user}:${password}@${host}:${port}/postgres?connection_limit=1&connect_timeout=3`;

    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log(`   ✅ SUCCESS! Connected to ${name}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`   ❌ FAILED: ${err.message}`);
        if (err.message.includes('Tenant or user not found')) {
            console.log(`      (Tenant not in this region)`);
        }
        try { await client.end(); } catch (e) { }
        return false;
    }
}

async function run() {
    console.log('--- STARTING RENDER CONNECTIVITY DEBUG ---');

    // 1. Check Direct DNS (Is it IPv4 accessible?)
    await resolveDNS(directHost);

    // 2. Test Direct Connection (Port 5432)
    await testConnection('Direct DB', directHost, 5432, false);

    // 3. Test Direct Connection (Port 6543 - Old Pooler)
    await testConnection('Direct Pooler', directHost, 6543, false);

    // 4. Test Regional Poolers (Correct Auth)
    for (const p of poolers) {
        // Try Port 5432 (Session)
        await testConnection(`${p.region} [Session]`, p.host, 5432, true);
        // Try Port 6543 (Transaction)
        await testConnection(`${p.region} [Transaction]`, p.host, 6543, true);
    }

    console.log('\n--- DEBUG COMPLETE ---');
    // Keep alive for a bit so logs flush
    setTimeout(() => process.exit(0), 1000);
}

run();
