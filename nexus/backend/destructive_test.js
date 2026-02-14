
const BASE_URL = 'http://localhost:3001/api/v1';

async function testDoubleDeduction() {
    console.log("--- 🕵️ DESTRUCTIVE TEST: DOUBLE DEDUCTION CHECK ---");

    // 1. Auth & Setup
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `tester_${Date.now()}@test.com`, password: 'Password123!', fullName: 'Test Master', tenantName: 'Test Corp' })
    });
    const regData = await regRes.json();
    const token = regData.accessToken;

    // Setup accounts
    const accounts = [
        { name: 'Accounts Receivable', type: 'Asset', code: '1100' },
        { name: 'Sales Revenue', type: 'Revenue', code: '4000' },
        { name: 'GST Payable', type: 'Liability', code: '2200' },
        { name: 'Inventory Asset', type: 'Asset', code: '1200' },
        { name: 'Bank Account', type: 'Asset', code: '1000' }
    ];
    for (const a of accounts) {
        await fetch(`${BASE_URL}/accounting/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(a)
        });
    }

    // 2. Create Product with Stock 10
    const pRes = await fetch(`${BASE_URL}/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Integrity Widget', sku: 'INT-001', price: 100, costPrice: 50, stock: 10, category: 'Audit', gstRate: 18 })
    });
    const product = await pRes.json();

    // Create Customer
    const custRes = await fetch(`${BASE_URL}/crm/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName: 'Audit', lastName: 'Customer', email: 'audit@test.com' })
    });
    const customer = await custRes.json();

    // 3. Create a Sales Order for Quantity 2
    console.log("[ACTION] Creating Sales Order for 2 units...");
    const orderRes = await fetch(`${BASE_URL}/sales/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            customerId: customer.id,
            items: [{ productId: product.id, quantity: 2, price: 100 }]
        })
    });
    const orderData = await orderRes.json();
    console.log("Order Status:", orderRes.status);

    // 4. Verify Stock
    const checkRes = await fetch(`${BASE_URL}/inventory/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const finalProduct = await checkRes.json();

    console.log(`Initial Stock: 10`);
    console.log(`Sold Quantity: 2`);
    console.log(`Final Stock: ${finalProduct.stock}`);

    if (finalProduct.stock === 8) {
        console.log("[PASS] Stock logic correct (10 - 2 = 8)");
    } else if (finalProduct.stock === 6) {
        console.error("[CRITICAL FAIL] Double Deduction detected! (10 - 2 - 2 = 6)");
    } else {
        console.error(`[FAIL] Stock mismatch. Got ${finalProduct.stock}`);
    }

    console.log("--- 🕵️ DESTRUCTIVE TEST END ---");
}

testDoubleDeduction();
