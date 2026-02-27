const axios = require('axios');

async function testAuthFlow() {
    const baseURL = 'http://127.0.0.1:3001/api/v1';
    console.log('--- STARTING AUTH FLOW TEST ---');

    try {
        // 1. Restore Admin System
        console.log('Restoring admin account to ensure consistent state...');
        await axios.get(`${baseURL}/../system/setup/restore-admin`);

        // 2. Login
        console.log('\nLogging in...');
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            email: 'admin@klypso.agency',
            password: 'password123'
        });

        console.log('Login Response Status:', loginRes.status);
        const setCookie = loginRes.headers['set-cookie'];
        console.log('Set-Cookie Payload:', setCookie ? setCookie.join('; ') : 'NONE - Using Response Body?');

        const identityToken = loginRes.data.accessToken || (setCookie && setCookie[0].split(';')[0].split('=')[1]);
        console.log('Identity Token Extract:', identityToken ? identityToken.substring(0, 30) + '...' : 'NONE FOUND');

        // 3. Select Tenant
        console.log('\nSelecting Tenant...');
        const tenantSelectRes = await axios.post(`${baseURL}/auth/tenant-select`,
            { tenantId: 'premium-woodcraft' },
            { headers: { Authorization: `Bearer ${identityToken}` } }
        );

        console.log('Tenant Select Response Status:', tenantSelectRes.status);
        const tenantToken = tenantSelectRes.data.accessToken;
        console.log('Tenant Token Extract:', tenantToken ? tenantToken.substring(0, 30) + '...' : 'NONE FOUND');

        // 4. Access Protected Route
        console.log('\nAccessing Protected Route...');
        const protectedRes = await axios.get(`${baseURL}/users/me`, {
            headers: { Authorization: `Bearer ${tenantToken}` }
        });
        console.log('Protected Route Status:', protectedRes.status);
        console.log('Protected User:', protectedRes.data.email);

        console.log('\n--- FLOW SUCCESSFUL ---');
    } catch (err) {
        console.error('\n--- FLOW FAILED ---');
        console.error(err.response?.data || err.message);
    }
}

testAuthFlow();
