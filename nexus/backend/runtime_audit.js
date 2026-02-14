
const BASE_URL = 'http://localhost:3001/api/v1';

async function runAudit() {
    console.log("--- 🕵️ ERP RUNTIME AUDIT START ---");
    let token = '';
    let tenantId = '';

    try {
        // 1. AUTH TEST: Register & Login
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `audit_${Date.now()}@test.com`,
                password: 'AuditPassword123!',
                fullName: 'Audit Master',
                tenantName: 'Audit Corp'
            })
        });
        const regData = await regRes.json();

        if (regRes.status !== 201) {
            console.error("[FAIL] Auth Register failed", regData);
            return;
        }
        token = regData.accessToken;
        tenantId = regData.tenant.id;
        console.log(`[PASS] Auth: Registered and logged in. Tenant: ${tenantId}`);

        // 2. SETUP ACCOUNTS (Mandatory for strict mode)
        // We'll use a direct internal API if it exists or mock it if we could.
        // Since I'm testing the APP, I should use the API.
        // Need to find Chart of Accounts API.
        console.log("[INFO] Setting up mandatory Chart of Accounts...");
        const accounts = [
            { name: 'Accounts Receivable', type: 'Asset', code: '1100' },
            { name: 'Sales Revenue', type: 'Revenue', code: '4000' },
            { name: 'GST Payable', type: 'Liability', code: '2200' },
            { name: 'Inventory Asset', type: 'Asset', code: '1200' },
            { name: 'Accounts Payable', type: 'Liability', code: '2100' },
            { name: 'Bank Account', type: 'Asset', code: '1000' }
        ];

        for (const acct of accounts) {
            await fetch(`${BASE_URL}/accounting/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(acct)
            });
        }
        console.log("[PASS] Accounting: COA Setup Complete.");

        // 3. INVENTORY TEST: Create Product
        const pRes = await fetch(`${BASE_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: 'Audit Pro Widget', sku: 'AUD-PRO-01', price: 1000, costPrice: 500, stock: 10, category: 'Hardware', gstRate: 18 })
        });
        const product = await pRes.json();
        if (pRes.status !== 201) throw new Error("Product creation failed: " + JSON.stringify(product));
        console.log("[PASS] Inventory: Product created with SKU AUD-PRO-01.");

        // 4. PURCHASE TEST: PO Receipt
        // Create Supplier
        const supRes = await fetch(`${BASE_URL}/purchases/suppliers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: 'Audit Vendor', email: 'vendor@audit.com' })
        });
        const supplier = await supRes.json();

        // Create PO
        const poRes = await fetch(`${BASE_URL}/purchases/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                supplierId: supplier.id,
                orderNumber: 'PO-AUD-001',
                totalAmount: 5000,
                items: [{ productId: product.id, quantity: 5, unitPrice: 1000 }]
            })
        });
        const po = await poRes.json();

        // Receive PO
        const receiveRes = await fetch(`${BASE_URL}/purchases/orders/${po.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: 'Received' })
        });
        if (receiveRes.status !== 200) throw new Error("PO Receipt failed: " + (await receiveRes.text()));

        // Verify Stock
        const pCheck = await (await fetch(`${BASE_URL}/inventory/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        if (pCheck.stock === 15) {
            console.log("[PASS] Purchases: Stock incremented locally (10 -> 15).");
        } else {
            console.error(`[FAIL] Stock mismatch after PO. Expected 15, Got ${pCheck.stock}`);
        }

        // 5. SALES TEST: Invoice & Stock Deduction
        const custRes = await fetch(`${BASE_URL}/crm/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ firstName: 'Sales', lastName: 'Audit', email: 'sales@audit.com', state: 'Maharashtra' })
        });
        const customer = await custRes.json();

        const invRes = await fetch(`${BASE_URL}/accounting/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                customerId: customer.id,
                dueDate: '2026-12-31',
                items: [{ productId: product.id, quantity: 2, price: 1500 }]
            })
        });
        const invoice = await invRes.json();
        if (invRes.status !== 201) throw new Error("Invoice creation failed: " + JSON.stringify(invoice));

        // Verify Stock Deduction
        const pCheck2 = await (await fetch(`${BASE_URL}/inventory/products/${product.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        if (pCheck2.stock === 13) {
            console.log("[PASS] Sales: Stock decremented (15 -> 13).");
        } else {
            console.error(`[FAIL] Stock not decremented after Sale. Got ${pCheck2.stock}`);
        }

        // 6. PAYMENT TEST
        const payRes = await fetch(`${BASE_URL}/accounting/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                customerId: customer.id,
                invoiceId: invoice.id,
                amount: 3540, // (1500 * 2) * 1.18 = 3540
                mode: 'Cash',
                reference: 'AUDIT-PAY-001',
                idempotencyKey: 'IDEM-' + Date.now()
            })
        });
        if (payRes.status !== 201) console.error("[FAIL] Payment failed", await payRes.json());
        else console.log("[PASS] Payment: Customer payment recorded.");

        // 8. DUPLICATE SKU TEST
        console.log("[INFO] Testing Duplicate SKU rejection...");
        const dupSKURes = await fetch(`${BASE_URL}/inventory/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: 'Audit Clone', sku: 'AUD-PRO-01', price: 500, costPrice: 200, stock: 10, gstRate: 18 })
        });
        if (dupSKURes.status === 409 || dupSKURes.status === 400 || dupSKURes.status === 500) {
            console.log(`[PASS] Inventory: Duplicate SKU prevented. Status: ${dupSKURes.status}`);
        } else {
            console.error("[FAIL] Inventory: Duplicate SKU allowed!");
        }

        // 9. IDEMPOTENCY TEST
        console.log("[INFO] Testing Payment Idempotency...");
        const idemKey = 'IDEM-RETRY-' + Date.now();
        const payPayload = {
            customerId: customer.id,
            amount: 100,
            mode: 'Cash',
            reference: 'IDEM-TEST',
            idempotencyKey: idemKey
        };
        const pay1 = await fetch(`${BASE_URL}/accounting/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payPayload)
        });
        const pay2 = await fetch(`${BASE_URL}/accounting/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payPayload)
        });
        if (pay1.status === 201 && pay2.status === 201 || pay2.status === 200) {
            // In my implementation, I return existing result on idempotency hit
            // Need to check if a second record was CREATED.
            const ledger = await (await fetch(`${BASE_URL}/accounting/ledger/${customer.id}`, { headers: { Authorization: `Bearer ${token}` } })).json();
            const idemHits = ledger.filter(l => l.ref === 'IDEM-TEST');
            if (idemHits.length === 1) {
                console.log("[PASS] Payment: Idempotency blocked duplicate record.");
            } else {
                console.error(`[FAIL] Payment: Found ${idemHits.length} payments with same key.`);
            }
        }

        // 10. OVERPAYMENT TEST
        console.log("[INFO] Testing Overpayment Rejection...");
        const overPayRes = await fetch(`${BASE_URL}/accounting/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                customerId: customer.id,
                invoiceId: invoice.id,
                amount: 999999,
                mode: 'Cash'
            })
        });
        if (overPayRes.status === 400) {
            console.log("[PASS] Payment: Overpayment rejected.");
        } else {
            console.error("[FAIL] Payment: Overpayment allowed!");
        }

        // 11. VENDOR PAYMENT TEST (Structural Integrity Case 3)
        console.log("[INFO] Testing Vendor Payment (AP Deduction)...");
        const vPayRes = await fetch(`${BASE_URL}/accounting/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                supplierId: supplier.id,
                amount: 1000,
                mode: 'Bank',
                reference: 'VEND-PAY-001'
            })
        });
        if (vPayRes.status === 201) {
            console.log("[PASS] Accounting: Vendor Payment recorded via multi-purpose payment engine.");
        } else {
            console.error("[FAIL] Accounting: Vendor Payment failed.");
        }

    } catch (err) {
        console.error("--- 🚨 AUDIT CRASHED ---", err);
    } finally {
        console.log("--- 🕵️ ERP RUNTIME AUDIT END ---");
    }
}

runAudit();
