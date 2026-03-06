const axios = require('axios');

async function testAdityaAuth() {
    const baseUrl = 'http://127.0.0.1:3001/api/v1';
    try {
        console.log('--- 🛡️ TESTING ADITYA SUPER ADMIN FLOW ---');

        console.log('1. Logging in as adityavanjre111@gmail.com ...');
        const loginRes = await axios.post(`${baseUrl}/auth/login/admin`, {
            email: 'adityavanjre111@gmail.com',
            password: 'Adityavanjre@123'
        });

        const { accessToken, user } = loginRes.data;
        console.log('✅ Admin Login successful.');
        console.log('User:', user.email);

        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(accessToken);
        console.log('Token Payload:', JSON.stringify(decoded, null, 2));

        const authHeaders = { Authorization: `Bearer ${accessToken}` };

        /*
        console.log('\n2. Fetching Pulse (Verifying Admin access)...');
        const pulseRes = await axios.get(`${baseUrl}/health/pulse`, { headers: authHeaders });
        console.log('✅ Admin Pulse check (Global):', pulseRes.data);
        */

        console.log('\n3. Fetching Monitoring Stats (Founder Dashboard)...');
        const monitorRes = await axios.get(`${baseUrl}/system/founder-dashboard`, { headers: authHeaders });
        console.log('✅ Founder stats fetched:', Object.keys(monitorRes.data).length, 'keys found.');
        console.log('Total Tenants:', monitorRes.data.totalTenants);

        console.log('\n--- ALL ADMIN TESTS PASSED ---');

    } catch (error) {
        console.error('❌ FAIL:', error.response?.data || error.message);
        process.exit(1);
    }
}

testAdityaAuth();
