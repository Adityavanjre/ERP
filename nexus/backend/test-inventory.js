async function testInventory() {
    const baseURL = 'http://localhost:3001/api/v1';
    try {
        console.log('--- LOGIN ---');
        const loginRes = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test_user_pos@example.com', // Using a new user for clean test
                password: 'password123'
            })
        });

        let token;
        if (loginRes.status === 401) {
            console.log('User not found, registering...');
            const regRes = await fetch(`${baseURL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test_user_pos@example.com',
                    password: 'password123',
                    fullName: 'POS Tester',
                    tenantName: 'POS Store'
                })
            });
            const regData = await regRes.json();
            token = regData.accessToken;
        } else {
            const loginData = await loginRes.json();
            token = loginData.accessToken;
        }

        const authHeaders = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('--- CREATING PRODUCT WITH BARCODE ---');
        const prodRes = await fetch(`${baseURL}/inventory/products`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
                name: 'Barcode Widget',
                sku: 'WGT-BAR',
                barcode: '123456789',
                skuAlias: 'BW',
                price: 250,
                stock: 30,
                gstRate: 12
            })
        });
        const prodData = await prodRes.json();
        const productId = prodData.id;
        console.log('Product Created:', productId);

        console.log('--- SEARCHING BY BARCODE ---');
        const searchRes = await fetch(`${baseURL}/inventory/products/find-by-code?code=123456789`, { headers: authHeaders });
        const searchData = await searchRes.json();
        console.log('Found by Barcode:', searchData.name);

        console.log('--- SEARCHING BY SKU ALIAS ---');
        const aliasRes = await fetch(`${baseURL}/inventory/products/find-by-code?code=BW`, { headers: authHeaders });
        const aliasData = await aliasRes.json();
        console.log('Found by Alias:', aliasData.name);

        console.log('--- TESTING DELETE ---');
        const delRes = await fetch(`${baseURL}/inventory/products/${productId}`, {
            method: 'DELETE',
            headers: authHeaders
        });
        console.log('Delete status:', delRes.status);

        console.log('--- VERIFYING DELETE ---');
        const verifyRes = await fetch(`${baseURL}/inventory/products/find-by-code?code=123456789`, { headers: authHeaders });
        const verifyData = await verifyRes.json();
        console.log('Find after delete (should be null or not found):', verifyData);

        console.log('--- INVENTORY TEST COMPLETE ---');
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testInventory();
