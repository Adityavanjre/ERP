const axios = require('axios');

async function testAuthFlow() {
    const baseUrl = 'http://127.0.0.1:3001/api/v1';
    try {
        console.log('--- 🛡️ TESTING AUTH FLOW LOCAL ---');

        console.log('1. Logging in...');
        const loginRes = await axios.post(`${baseUrl}/auth/login/web`, {
            email: 'test_debug@klypso.in',
            password: 'Password@123'
        });

        const { accessToken, user } = loginRes.data;
        console.log('✅ Login successful. Access Token obtained.');
        console.log('User:', user.email);

        const authHeaders = { Authorization: `Bearer ${accessToken}` };

        console.log('\n2. Fetching Tenants (Verifying Global Model access)...');
        try {
            const tenantsRes = await axios.get(`${baseUrl}/auth/tenants`, { headers: authHeaders });
            console.log('✅ Tenants fetched successfully:', tenantsRes.data.length, 'tenants found.');
        } catch (e) {
            console.error('❌ Failed to fetch tenants:', e.response?.data || e.message);
        }

        console.log('\n3. Fetching Pulse (Verifying Tenant Scoped access)...');
        try {
            // Need to select tenant first to populate tenantId in token
            const selectRes = await axios.post(`${baseUrl}/auth/select-tenant`, {
                tenantId: (await axios.get(`${baseUrl}/auth/tenants`, { headers: authHeaders })).data[0].id
            }, { headers: authHeaders });

            const sessionToken = selectRes.data.accessToken;
            const sessionHeaders = { Authorization: `Bearer ${sessionToken}` };

            const pulseRes = await axios.get(`${baseUrl}/health/pulse`, { headers: sessionHeaders });
            console.log('✅ Pulse check successful. Health Score:', pulseRes.data);
        } catch (e) {
            console.error('❌ Failed Pulse check:', e.response?.data || e.message);
        }

        console.log('\n4. Revoking Token (Logout)...');
        try {
            const logoutRes = await axios.post(`${baseUrl}/auth/logout`, {}, { headers: authHeaders });
            console.log('✅ Logout successful:', logoutRes.data.message);
        } catch (e) {
            console.error('❌ Logout failed:', e.response?.data || e.message);
        }

        console.log('\n5. Verifying Revoked Token usage...');
        try {
            await axios.get(`${baseUrl}/auth/profile`, { headers: authHeaders });
            console.log('❌ Error: Re-used revoked token but request succeeded!');
        } catch (e) {
            console.log('✅ Success: Revoked token usage blocked as expected.');
            console.log('Response:', e.response?.data.message);
        }

    } catch (error) {
        console.error('CRITICAL ERROR in test script:', error.response?.data || error.message);
    }
}

testAuthFlow().catch(err => {
    console.error('SCRIPT_FATAL:', err);
    process.exit(1);
});

