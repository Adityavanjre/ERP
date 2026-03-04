# Nexus ERP - Full System Audit Checklist

## 1. MASTER TEST CHECKLIST

### Table of Contents
1. [Architecture](#architecture)
2. [Backend](#backend)
3. [Database](#database)
4. [Frontend](#frontend)
5. [Mobile](#mobile)
6. [Auth](#auth)
7. [Financial Logic](#financial-logic)
8. [Inventory](#inventory)
9. [Security](#security)
10. [Infrastructure](#infrastructure)
11. [Observability](#observability)
12. [Performance](#performance)
13. [Concurrency](#concurrency)
14. [Edge Cases](#edge-cases)

---

### Architecture

**Task ID:** TEN-001
**Role:** Security Pentester
**Area:** Architecture (Multi-tenant)
**Action:** As Tenant A, get a valid invoice ID from Tenant B (e.g., ID: 5001). Request `GET /api/invoices/5001`.
**Expected:** 404 Not Found or 403 Forbidden. Backend queries must ALWAYS include `WHERE tenant_id = req.user.tenantId`.
**What could go wrong:** IDOR (Insecure Direct Object Reference) allows Tenant A to read Tenant B's financial data.
**Severity:** Critical

**Task ID:** KER-001
**Role:** SaaS Operator
**Area:** Architecture (Kernel & No-Code Studio)
**Action:** Hibernate a specific module (e.g., "CRM"). Try to access a custom field created within that module.
**Expected:** API returns 404 or "Module Inactive". Data is preserved but non-accessible until reactivated.
**What could go wrong:** Dynamic fields are deleted on hibernation, causing permanent data loss.
**Severity:** Critical

**Task ID:** SUB-001
**Role:** SaaS Operator
**Area:** Architecture (Subscription & Billing)
**Action:** Let a tenant's free trial expire. They attempt to log in and create a new invoice.
**Expected:** Login successful. System is in Read-Only mode. Interceptor blocks `POST /api/invoices` with Payment Required.
**What could go wrong:** Tenant can still create data. Or worse, tenant data is wiped upon trial expiry.
**Severity:** High

---

### Backend

### Backend Structural Integrity

**Task ID:** STR-001
**Role:** Backend Developer / Architect
**Area:** Backend Structural Integrity (Dependencies)
**Action:** Run a static analysis tool (e.g., Madge or ESLint) to check for circular dependencies.
**Expected:** Zero circular dependencies detected.
**What could go wrong:** Interlocked modules causing memory leaks, initialization failures, or stack limit crashes on boot.
**Severity:** Critical

**Task ID:** STR-002
**Role:** Backend Developer
**Area:** Backend Structural Integrity (Leakage)
**Action:** Audit module exports and imports to ensure no Feature A internals leak directly into Feature B bypassing public interfaces.
**Expected:** Strict domain isolation enforced (e.g., using explicit exported Services vs raw repositories).
**What could go wrong:** Tight coupling leading to regressions where changing a billing model breaks manufacturing.
**Severity:** High

**Task ID:** STR-003
**Role:** DevOps / Core Engineer
**Area:** Backend Structural Integrity (Providers)
**Action:** Check all `*.module.ts` files for missing provider registrations, duplicate provider imports, and improper DI scoping.
**Expected:** All providers explicitly scoped correctly (Singleton, Request, Transient) and only injected via necessary feature modules.
**What could go wrong:** Massive memory waste or orphaned DI instances causing incorrect data states per tenant.
**Severity:** Critical

**Task ID:** STR-004
**Role:** Security Pentester
**Area:** Backend Structural Integrity (Pipes & Filters)
**Action:** Pass malformed DTO payloads to endpoints. Evaluate global exception filter responses.
**Expected:** Global ValidationPipes strictly drop unknown properties, and Error Filters intercept 500s into sanitized standard formats without stack traces.
**What could go wrong:** Validation bypasses allowing unexpected database payloads, or verbose unhandled exceptions exposing internal paths.
**Severity:** High

**Task ID:** STR-005
**Role:** QA / Security
**Area:** Backend Structural Integrity (Middleware & Guards)
**Action:** Map the order of execution for global Middlewares vs route Guards. Check interceptors.
**Expected:** Order must strictly follow: IP Whitelist Middleware -> Tenant Mapping Middleware -> Auth Guard -> Roles Guard -> Validation Pipe -> Controller.
**What could go wrong:** A validation error happens before authentication, allowing an unauthenticated user to DOS the database via complex validations.
**Severity:** Critical

---

**Task ID:** TEN-002
**Role:** Careless User
**Area:** Backend (Idempotency)
**Action:** Create a new tenant workspace rapidly, double-click "Create", or submit the exact same GST number as an existing tenant.
**Expected:** Backend idempotency prevents duplicate tenant creation. Appropriate error if GST already registered.
**What could go wrong:** Two nested or duplicated tenants are created, breaking billings and route mappings.
**Severity:** High

**Task ID:** REP-001
**Role:** QA Tester
**Area:** Backend (Reports & Exports)
**Action:** Export the general ledger as a CSV.
**Expected:** CSV downloads cleanly. Numbers are formatted properly.
**What could go wrong:** Node process blocks main thread during heavy serialization.
**Severity:** High

**Task ID:** REP-003
**Role:** CA / Accountant
**Area:** Backend (Tally Bridge)
**Action:** Export a month of Vouchers to Tally XML. Ensure one Ledger Name contains an ampersand (`R&D Dept`).
**Expected:** XML correctly escapes to `R&amp;D Dept`. Tally accepts the file without "Error in Tally.imp".
**What could go wrong:** Raw `&` breaks XML parsing in Tally, failing the entire import.
**Severity:** High

**Task ID:** REP-004
**Role:** CA / Accountant
**Area:** Backend (Tally Bridge)
**Action:** Export an invoice with State set to "Telangana".
**Expected:** XML maps the state name to Tally's exact recognized list (e.g., "TELANGANA" or "Telangana" as per Tally's schema).
**What could go wrong:** "Invalid State Name" error in Tally import log.
**Severity:** Medium

---

### Database

**Task ID:** ACC-002
**Role:** Malicious User
**Area:** Database (Data Integrity)
**Action:** After posting an invoice that affects accounts receivable, send an API request to DELETE the generated ledger entry directly (`DELETE /api/ledgers/999`).
**Expected:** 405 Method Not Allowed or 403. Soft deletes only (if applicable) or complete rejection. Accounting entries must ONLY be reversed via offset entries.
**What could go wrong:** Backend deletes the entry. Trial balance breaks. Audit trail destroyed.
**Severity:** Critical

**Task ID:** ACC-006
**Role:** CA / Accountant
**Area:** Database (Bulk Imports)
**Action:** Import opening balances for 500 ledgers using a CSV. Intentionally provide a trial balance that doesn't sum to zero in the CSV.
**Expected:** System rejects the entire import batch. No partial ledger creation. Database rolls back entirely.
**What could go wrong:** 499 ledgers created, one failed, leaving the system in a permanently imbalanced state.
**Severity:** Critical

**Task ID:** DEV-002
**Role:** SRE
**Area:** Database (Migrations)
**Action:** Trigger a DB migration that adds a non-nullable column without a default value to a table with 1M rows.
**Expected:** CI/CD pipeline flags the migration as unsafe/blocking, or handles it with a multi-step migration to prevent table locks.
**What could go wrong:** Migration locks the `ledgers` table for 10 minutes in production, causing 100% downtime.
**Severity:** Critical

---

### Frontend

**Task ID:** UI-001
**Role:** QA Tester
**Area:** Frontend (UI / UX)
**Action:** Click the "Submit" button on the Journal Entry form 5 times rapidly.
**Expected:** Button disables on first click. Only one network request is sent. Form submits successfully Once.
**What could go wrong:** 5 duplicate journal entries are created.
**Severity:** High

**Task ID:** UI-002
**Role:** Careless User
**Area:** Frontend (UI / UX)
**Action:** Leave mandatory inputs blank in the Product Creation form, but click random checkboxes and hit 'Save'.
**Expected:** Form highlights missing fields with clear red text. Focus jumps to the first missing field.
**What could go wrong:** Request is sent to backend, returns a cryptic 400 error, or worse, saves a corrupted product.
**Severity:** Medium

**Task ID:** UI-003
**Role:** QA Tester
**Area:** Frontend (UI / UX)
**Action:** Open a large data table (e.g., Trial Balance with 10k rows) on a 13-inch laptop screen. Resize window to mobile width.
**Expected:** Table becomes horizontally scrollable without breaking the sidebar. Fixed header remains visible. Text does not overflow out of cells.
**What could go wrong:** Table breaks page layout, overlaps with navigation, or becomes completely unreadable.
**Severity:** Medium

**Task ID:** UI-004
**Role:** Careless User
**Area:** Frontend (UI / UX)
**Action:** Navigate to an invoice details page with a very long item name (e.g., 200 characters without spaces).
**Expected:** Text wraps to next line or gets truncated with ellipsis `...` and tooltip. Layout remains intact.
**What could go wrong:** Long text pushes action buttons off-screen making it impossible to approve/edit the invoice.
**Severity:** Medium

**Task ID:** UI-005
**Role:** QA Tester
**Area:** Frontend (UI / UX)
**Action:** Search for a non-existent invoice ID, apply date filters that conflict, sort by an empty column.
**Expected:** Displays a friendly "No results found" empty state with a "Clear Filters" button.
**What could go wrong:** Infinite loading spinner, or worse, crashes the app with a frontend exception showing a traceback.
**Severity:** Low

**Task ID:** UI-006
**Role:** Impatient User
**Area:** Frontend (UI / UX)
**Action:** Mash the 'Tab' key to navigate through a complex form (e.g., Manufacturing BOM).
**Expected:** Focus indicator is always visible. Focus follows a logical order (left-to-right, top-to-bottom). Focus does NOT escape modals.
**What could go wrong:** Focus jumps to hidden background elements or gets stuck in a loop.
**Severity:** Medium

**Task ID:** UI-007
**Role:** Manual QA Tester
**Area:** Frontend (UI / UX)
**Action:** Open a Modal (e.g., "Add New Ledger"). Click outside the modal, press 'ESC', and then try to click the background navbar.
**Expected:** 'ESC' closes modal. Click outside behavior (close/stay) is consistent across app. Background is non-interactive while modal is open.
**What could go wrong:** Multiple overlapping modals or background interaction leading to orphaned states.
**Severity:** Medium

**Task ID:** PERF-002
**Role:** Careless User
**Area:** Frontend (State Management)
**Action:** Click the browser "Back" button while midway through a 3-step wizard for Month-End Closing.
**Expected:** State is preserved or safely discarded. User can resume or restart safely.
**What could go wrong:** App state is corrupted, sending malformed payloads on the next step.
**Severity:** Medium

---

### Mobile

**Task ID:** PERF-001
**Role:** Performance Engineer
**Area:** Mobile (Offline Resiliency)
**Action:** Simulate a mobile offline scenario (turn off WiFi). Try to save an order.
**Expected:** Mobile app clearly indicates "Offline mode", caches the request safely (if offline mode supported), or displays a graceful error without white-screening.
**What could go wrong:** App crashes with unhandled promise rejection (`Network request failed`).
**Severity:** Medium

**Task ID:** MOB-001
**Role:** Mobile Tester
**Area:** Mobile (API Version Matching)
**Action:** Open an older cached version of the mobile app and connect to the upgraded backend.
**Expected:** App prompts for a mandatory update if breaking changes exist.
**What could go wrong:** App sends malformed legacy payloads causing 500 errors and user confusion.
**Severity:** High

**Task ID:** MOB-002
**Role:** Mobile Tester
**Area:** Mobile (Lifecycle State)
**Action:** Background the app for 12 hours while logged in. Return to the app.
**Expected:** Token refreshes silently in the background or kicks the user gracefully to the login screen.
**What could go wrong:** Stale token causes all screens to loop infinitely or present raw 401 JSON.
**Severity:** High

---

### Auth

**Task ID:** AUTH-001
**Role:** Security Pentester
**Area:** Auth (JWT Security)
**Action:** Intercept the login JWT. Change the user ID in the payload to a Super Admin ID, resign with a random key or 'none' algorithm, and make a request to `/api/admin/users`.
**Expected:** 401 Unauthorized. Server strictly validates the signature using the private secret.
**What could go wrong:** Algorithm 'none' is accepted or the fake signature is bypassed, leading to full system compromise.
**Severity:** Critical

**Task ID:** AUTH-002
**Role:** Bug Hunter
**Area:** Auth (Session Integrity)
**Action:** Log in on Tab 1. Log in as a DIFFERENT user on Tab 2. Go back to Tab 1 and try to create an invoice.
**Expected:** Tab 1 detects session mismatch and forces a refresh/re-login, or the backend rejects the old token if CSRF/session cookies are overwritten.
**What could go wrong:** Invoice is created under the wrong tenant or wrong user ID because the frontend used stale state.
**Severity:** Critical

**Task ID:** AUTH-003
**Role:** QA Tester
**Area:** Auth (Token Expiration)
**Action:** Wait for the JWT to expire (or manually expire it). Try to navigate the app and save a draft ledger.
**Expected:** Silent token refresh succeeds (if refresh token valid) OR user is cleanly redirected to the login page with a "Session Expired" notification. Draft is saved in local storage.
**What could go wrong:** App freezes, shows 500 API errors, or throws raw JSON on screen, losing the user's unsaved work.
**Severity:** High

**Task ID:** AUTH-004
**Role:** CA / Accountant
**Area:** Auth (RBAC)
**Action:** Log in as a user with "Read-Only" CA access. Attempt to edit a finalized journal entry by issuing a direct API PUT request (`/api/journals/123`).
**Expected:** 403 Forbidden. Backend enforces Role-Based Access Control (RBAC) strictly.
**What could go wrong:** Only the UI was hidden; the API allows the CA to modify data.
**Severity:** Critical

**Task ID:** AUTH-005
**Role:** Malicious User
**Area:** Auth (Session Management)
**Action:** Log in on a browser. Log in on a mobile app. On the browser, trigger "Log out of all sessions". Go to mobile app and try to refresh stock.
**Expected:** Mobile app session is instantly revoked. User is kicked to login screen.
**What could go wrong:** Mobile session remains active for hours/days until JWT expires naturally.
**Severity:** High

**Task ID:** AUTH-006
**Role:** Support Engineer
**Area:** Auth (Account Recovery)
**Action:** Help a user who forgot their email address but remembers their GSTIN/Business Name. Try to trigger password reset via API with missing email field.
**Expected:** API returns 400 Bad Request. Recovery process is strictly email-bound or requires CA verification offline.
**What could go wrong:** Information leakage where API confirms if a business exists/user exists via brute force.
**Severity:** Medium

**Task ID:** TEN-003
**Role:** SaaS Operator
**Area:** Auth (Tenant Suspension)
**Action:** Suspend Tenant A from the admin dashboard. Tenant A tries to login or use an existing valid token.
**Expected:** Existing tokens are invalidated or rejected via a middleware check. User is blocked.
**What could go wrong:** Suspended tenant keeps using the system until their JWT naturally expires.
**Severity:** High

---

### Financial Logic

**Task ID:** ACC-001
**Role:** CA / Accountant
**Area:** Financial Logic (Core Accounting)
**Action:** Submit a manual journal entry where Total Debits = ₹10,000 and Total Credits = ₹9,999.
**Expected:** API strictly rejects the payload (HTTP 400 or 422) with "Unbalanced Journal: Debits must equal Credits".
**What could go wrong:** The entry is saved, corrupting the Ledger and Trial Balance permanently.
**Severity:** Critical

**Task ID:** ACC-003
**Role:** QA Tester
**Area:** Financial Logic (Period Controls)
**Action:** Attempt to post an entry dated "15-March-2023" when the current active financial year is set to "2024-2025" and previous years are locked.
**Expected:** System rejects the entry: "Cannot post to a locked financial period."
**What could go wrong:** Entry is posted. Prior year financials are stealthily altered after auditing.
**Severity:** Critical

**Task ID:** ACC-004
**Role:** CA / Accountant
**Area:** Financial Logic (Reporting Engine)
**Action:** Generate the Trial Balance report. Sum all Debits and sum all Credits.
**Expected:** Total Debits == Total Credits down to the last decimal (paise).
**What could go wrong:** Float precision errors cause a mismatch like 1000.0000001 != 1000.0.
**Severity:** Critical

**Task ID:** ACC-005
**Role:** Careless User
**Area:** Financial Logic (Boundary Overflows)
**Action:** Input extremely large values in the quantity and rate fields (e.g., 999,999,999 * 999,999,999).
**Expected:** System handles big int/decimal safely or throws a validation error for maximum limits.
**What could go wrong:** Integer overflow results in a negative value stored in Postgres.
**Severity:** Critical

**Task ID:** ACC-007
**Role:** CA / Accountant
**Area:** Financial Logic (Automated Ledgers)
**Action:** Create an invoice for ₹99.99. Record a payment for ₹100.00. Check the "Round-off Ledger".
**Expected:** System automatically maps the ₹0.01 difference to a predefined "Round-off" expense/income account.
**What could go wrong:** Infinite "Partial Payment" status or unbalanced ledger entry.
**Severity:** High

**Task ID:** ACC-008
**Role:** CA / Accountant
**Area:** Financial Logic (Multi-currency)
**Action:** Attempt to record a transaction in USD while the Base Currency is INR. Check the Trial Balance.
**Expected:** System applies the correct exchange rate. Base currency totals remain mathematically sound.
**What could go wrong:** Foreign currency amount is added directly to local currency ledger without conversion.
**Severity:** Medium

**Task ID:** GST-001
**Role:** CA / Accountant
**Area:** Financial Logic (Tax Engine)
**Action:** Create an interstate invoice (e.g., Maharashtra to Karnataka).
**Expected:** Tax engine automatically applies IGST instead of CGST/SGST based on the supply place.
**What could go wrong:** System applies CGST/SGST incorrectly resulting in wrong tax filings.
**Severity:** High

**Task ID:** GST-002
**Role:** QA Tester
**Area:** Financial Logic (Govt Compliance)
**Action:** Generate a GSTR-1 export JSON/Excel for a month containing zero-rated invoices, nil-rated invoices, and standard B2B invoices.
**Expected:** Export format strictly matches the official GSTN offline utility schema.
**What could go wrong:** Export fails validation in the GST portal, frustrating the user and delaying filing.
**Severity:** High

**Task ID:** GST-004
**Role:** CA / Accountant
**Area:** Financial Logic (Reverse Charge)
**Action:** Create a Purchase Invoice from an Unregistered Dealer (URD) for a service that falls under Reverse Charge Mechanism (RCM).
**Expected:** System calculates tax but doesn't add it to the invoice total; it flags it for RCM liability in GST reports.
**What could go wrong:** Tax is added to vendor payable, or liability is missed in GSTR-3B.
**Severity:** High

**Task ID:** GST-005
**Role:** CA / Accountant
**Area:** Financial Logic (Tax Summaries)
**Action:** Create an invoice with mixed tax rates (e.g., 5%, 12%, and 18% GST items).
**Expected:** Invoice PDF and API payload correctly break down CGST/SGST/IGST per item and in total summary.
**What could go wrong:** System applies a single tax rate to the entire subtotal incorrectly.
**Severity:** High

**Task ID:** GST-006
**Role:** CA / Accountant
**Area:** Financial Logic (E-Way Bills)
**Action:** Generate an E-Way Bill JSON for an invoice exceeding ₹50,000.
**Expected:** JSON contains all mandatory fields (HSN, Transporter ID, Distance, Vehicle No) in correct data types.
**What could go wrong:** NIC portal rejects the JSON due to "Distance" being a string instead of an integer.
**Severity:** High

**Task ID:** GST-007
**Role:** CA / Accountant
**Area:** Financial Logic (Composition Framework)
**Action:** Switch tenant to "Composition Scheme". Try to create a B2B invoice with Tax collecting enabled.
**Expected:** System blocks tax collection: "Composition dealers cannot collect GST from customers."
**What could go wrong:** User continues to collect tax illegally under a composition registration.
**Severity:** Critical

**Task ID:** BNK-001
**Role:** Careless User
**Area:** Financial Logic (Ledger Matching)
**Action:** Select an existing invoice for ₹5,000. Try to record a payment of ₹6,000 against it.
**Expected:** System warns about overpayment and asks if the ₹1,000 excess should be mapped as an "Advance Payment" or rejects it.
**What could go wrong:** Invoice status goes weird, accounts receivable shows -₹1,000 without proper ledger categorization.
**Severity:** High

**Task ID:** BNK-002
**Role:** Automation Tester
**Area:** Financial Logic (Banking)
**Action:** Upload a bank statement CSV with 1,000 rows. Click "Auto-Match" reconcile.
**Expected:** System matches exact amounts/dates and suggests reconciliation.
**What could go wrong:** Auto-match makes false positives causing severe accounting errors.
**Severity:** High

---

### Inventory

**Task ID:** INV-001
**Role:** QA Tester
**Area:** Inventory (Stock Controls)
**Action:** Create an outbound delivery for 50 units of "Item X". Current stock is 10 units. "Allow negative stock" setting is OFF.
**Expected:** System blocks the transaction: "Insufficient stock. Current stock: 10".
**What could go wrong:** Stock drops to -40. Valuation and Cost of Goods Sold calculations break.
**Severity:** Critical

**Task ID:** INV-003
**Role:** Bug Hunter
**Area:** Inventory (Manufacturing Engine)
**Action:** Start a manufacturing Bill of Materials (BOM) process that consumes raw materials but the API crashes mid-process.
**Expected:** Full database transaction rollback. Raw materials are back in stock, no finished goods are created.
**What could go wrong:** Partial commit. Raw materials deducted, but no finished goods produced (data leakage).
**Severity:** Critical

**Task ID:** INV-004
**Role:** Automation Tester
**Area:** Inventory (BOM Validations)
**Action:** Create a BOM where "Product A" requires "Product B", and "Product B" requires "Product A" (Circular Dependency).
**Expected:** UI/API validation blocks the cycle: "Circular Dependency Detected".
**What could go wrong:** Infinite recursion on the backend causing an OOM or stack overflow during BOM cost calculation.
**Severity:** High

**Task ID:** INV-005
**Role:** CA / Accountant
**Area:** Inventory (Valuations)
**Action:** Receive 10 units at ₹100, then 10 units at ₹120. Sell 5 units. Check Stock Valuation.
**Expected:** Valuation matches selected method (FIFO = ₹1700 remaining, Weighted Average = ₹1650 remaining).
**What could go wrong:** Float precision loss leads to incorrect inventory assets on the Balance Sheet.
**Severity:** Critical

**Task ID:** INV-006
**Role:** Production Engineer
**Area:** Inventory (Wastage Tracking)
**Action:** Execute a Work Order for 100 units. Record a "Wastage" of 5% in the production log.
**Expected:** Finished goods = 95 units, Raw materials consumed = 100 units worth. Valuation accounts for the 5% loss in COGS.
**What could go wrong:** System adds 100 units to stock but ignores the wastage value, inflating asset book value.
**Severity:** High

---

### Security

**Task ID:** TEN-004
**Role:** Malicious User
**Area:** Security (XSS / Sanitization)
**Action:** Register a new tenant with the name `<script>alert('xss')</script>` or a very long slug (1000 chars).
**Expected:** Backend validates tenant name/slug against XSS and length limits. UI handles long names without breaking sidebar.
**What could go wrong:** XSS payload executes when a Super Admin views the tenant list.
**Severity:** High

**Task ID:** GST-003
**Role:** Bug Hunter
**Area:** Security (Input Validation)
**Action:** Manipulate the API payload to submit a B2B invoice with a 15-character GSTIN that has an invalid checksum.
**Expected:** Backend validates the GSTIN format and checksum, rejecting the payload.
**What could go wrong:** Invalid GSTIN is saved. E-invoicing or GSTR filing fails silently later.
**Severity:** Medium

**Task ID:** SEC-001
**Role:** Security Pentester
**Area:** Security (SQL Injection)
**Action:** Input `' OR 1=1; DROP TABLE users; --` into the Global Search bar and user login fields.
**Expected:** Input is parameterized by Prisma. Search returns no results. No SQL execution.
**What could go wrong:** Raw query execution drops tables.
**Severity:** Critical

**Task ID:** SEC-002
**Role:** Security Pentester
**Area:** Security (File Uploads)
**Action:** Upload an avatar/logo named `shell.php` with `image/jpeg` MIME type, containing malicious PHP/Node code.
**Expected:** File upload strictly validates extensions/magic bytes. File is saved securely. Execution is blocked on the CDN.
**What could go wrong:** RCE (Remote Code Execution) on the server.
**Severity:** Critical

**Task ID:** SEC-003
**Role:** Bug Hunter
**Area:** Security (Rate Limiting)
**Action:** Call `POST /api/auth/reset-password` 10,000 times for a target user's email within 1 minute.
**Expected:** IP or Endpoint rate-limiting triggers HTTP 429 Too Many Requests after 5-10 attempts.
**What could go wrong:** SendGrid/AWS SES quota exhausted. Bill skyrockets. Target user spammed.
**Severity:** High

**Task ID:** SEC-004
**Role:** Security Pentester
**Area:** Security (CORS / CSRF)
**Action:** Send a request with a spoofed `Origin` header (e.g., `http://evil-attacker.com`) to a sensitive API.
**Expected:** CORS policy rejects the request. Access-Control-Allow-Origin only permits production domains.
**What could go wrong:** Attacker executes CSRF / Data Theft via a malicious site.
**Severity:** Critical

**Task ID:** SEC-005
**Role:** Security Pentester
**Area:** Security (JWT Replay)
**Action:** Capture a valid JWT. Wait for user to logout. Replay the same JWT to a secure endpoint.
**Expected:** If JTI (JWT ID) or server-side session tracking is implemented, request is rejected.
**What could go wrong:** Logged-out tokens remain valid for their entire TTL, allowing session hijacking.
**Severity:** High

**Task ID:** KER-002
**Role:** Security Pentester
**Area:** Security (Dynamic Model RBAC)
**Action:** Create a "Dynamic Model" (e.g., `Custom_Asset`). Set RBAC to "Admin Only". Attempt to read via a "User" token.
**Expected:** 403 Forbidden. Kernel must enforce security even on dynamically generated objects.
**What could go wrong:** Studio models bypass standard RBAC logic as they aren't hardcoded in NestJS controllers.
**Severity:** Critical

---

### Infrastructure

**Task ID:** DEV-001
**Role:** DevOps / Production Engineer
**Area:** Infrastructure (Configuration)
**Action:** Manually delete the `DATABASE_URL` environment variable from the target environment and restart the app.
**Expected:** App fails to boot immediately (`Fast-Fail` policy) and logs a clear configuration error.
**What could go wrong:** App boots but throws 500s on every route, masking the configuration issue.
**Severity:** High

**Task ID:** DEV-003
**Role:** DevOps / Production Engineer
**Area:** Infrastructure (Deployments)
**Action:** Perform a "Blue/Green" or "Rolling" deployment. Check for "Stale State" errors where a user on the old frontend calls a new (incompatible) API.
**Expected:** API is backward compatible or frontend detects version mismatch and suggests a soft refresh.
**What could go wrong:** App crashes for 50% of users during the 5-minute deployment window.
**Severity:** High

---

### Observability

**Task ID:** LOG-001
**Role:** DevOps / Production Engineer
**Area:** Observability (Log Security)
**Action:** Force an API error (e.g., send bad JSON). Check the server logs (Datadog/CloudWatch/Log file).
**Expected:** Error is logged with a trace ID. Stack trace is visible. NO SENSITIVE DATA (passwords, JWTs, credit cards) in the payload log.
**What could go wrong:** User passwords or auth tokens are bleeding into plain text logging systems.
**Severity:** Critical

**Task ID:** LOG-002
**Role:** QA Tester
**Area:** Observability (Audit Trails)
**Action:** Create a voucher. Verify the Audit Trail specifically.
**Expected:** Audit log shows: User ID, IP Address, Action ("CREATE"), Entity ("VOUCHER"), Timestamp. Log row cannot be updated.
**What could go wrong:** Audit logs are mutable or missing crucial context.
**Severity:** High

**Task ID:** DEV-004
**Role:** SRE
**Area:** Observability (Error Grouping)
**Action:** Trigger 10 identical "500 Internal Server Errors" from different users.
**Expected:** Sentry / Observability tool groups these into a single "Issue" with a frequency count.
**What could go wrong:** Support receives 100 individual alerts, causing "alert fatigue" and missing the root cause.
**Severity:** Low

**Task ID:** SUP-001
**Role:** Support Engineer
**Area:** Observability (Error Codes)
**Action:** A user tries to upload an invalid Tally XML format and gets an error. Ask them to convey the error to support.
**Expected:** UI shows: "Invalid Tally XML. Error Code: ERR-TALLY-4022. Please contact support with this code."
**What could go wrong:** UI shows: "Unexpected token < in JSON at position 0". Support has no idea what failed.
**Severity:** Medium

**Task ID:** SUP-002
**Role:** Support Engineer
**Area:** Observability (Traceability)
**Action:** Look up a transaction by a "Trace ID" provided by a user after a failed payment.
**Expected:** Admin dashboard/Logs allow instant narrowing down of the exact failure via Trace ID.
**What could go wrong:** Support has to grep through 10GB of logs manually to find the user's attempt.
**Severity:** High

---

### Performance

**Task ID:** REP-002
**Role:** QA Tester
**Area:** Performance (Heavy Queries)
**Action:** Select "All Time" date range for a tenant with 5 years of heavy transaction history and click "Generate P&L".
**Expected:** System processes via background job, streams the response, or handles the query without memory overflow. Shows a loader.
**What could go wrong:** 504 Gateway Timeout or Out of Memory (OOM) crash on the backend.
**Severity:** High

**Task ID:** PERF-003
**Role:** Performance Engineer
**Area:** Performance (Latency SLA)
**Action:** Run a load test with 500 concurrent users performing typical read queries (e.g., listing invoices).
**Expected:** P99 response time remains under 300ms. No database connection limits are hit.
**What could go wrong:** Connection pool exhaustion leading to gateway timeouts and complete API lockup.
**Severity:** High

---

### Concurrency

**Task ID:** INV-002
**Role:** Automation Tester
**Area:** Concurrency (Race Conditions)
**Action:** Execute two API requests exactly at the same millisecond to consume the last 1 widget in stock.
**Expected:** Database transaction isolation (Select FOR UPDATE) locks the row. One request succeeds, the other fails with "Insufficient stock".
**What could go wrong:** Race condition allows both API calls to succeed, leaving stock at -1. (Phantom Stock).
**Severity:** Critical

**Task ID:** SUB-002
**Role:** Bug Hunter
**Area:** Concurrency (Rate Limits)
**Action:** Tenant is on a "Free Plan" (limit: 50 invoices/month). They reach 50, then write a script to rapidly `POST` 100 invoices concurrently.
**Expected:** Rate limting / concurrency locks enforce the quota strictly at 50 requests. 51st request is blocked.
**What could go wrong:** Concurrency race condition bypasses the quota check, allowing 150 invoices.
**Severity:** High

**Task ID:** CON-001
**Role:** Automation Tester
**Area:** Concurrency (Parallel Transactions)
**Action:** Submit two simultaneous payments against a single invoice that only has a small remaining balance.
**Expected:** The first payment clears the balance; the second requests fails or prompts for "Advance Payment" allocation, preventing negative receivable state.
**What could go wrong:** The system processes both payments independently without locking the core invoice state, leaving a negative pending amount.
**Severity:** Critical

---

### Edge Cases

**Task ID:** EDG-001
**Role:** QA Tester
**Area:** Edge Cases (Date Boundaries)
**Action:** Create an invoice on Feb 29th (Leap Year) or Mar 31st 23:59.
**Expected:** The invoice maps correctly to the Indian Financial Year (Apr-Mar) bounds seamlessly.
**What could go wrong:** Financial year association breaks, causing missing data in annual reports.
**Severity:** High

**Task ID:** EDG-002
**Role:** Data Analyst
**Area:** Edge Cases (Floating Point Precision)
**Action:** Process 1 million transactions with fractional values (e.g., ₹100.00 / 3 = 33.3333333).
**Expected:** System handles decimals using fixed precision engines (like Big.js or Postgres Numeric Types). Trial Balance correctly sums to zero.
**What could go wrong:** Minute float rounding errors accumulate, causing a permanent ₹0.04 imbalance across the ledger.
**Severity:** Critical

**Task ID:** EDG-003
**Role:** Automation Tester
**Area:** Edge Cases (Empty States)
**Action:** A user searches for a term or accesses a tenant that has completely purged/empty history logs.
**Expected:** System returns a clean 200 OK with an empty array `[]` and the UI shows a friendly illustration.
**What could go wrong:** The API returns a 500 error because of an unhandled null check on the backend when mapping nonexistent records.
**Severity:** Medium

**Task ID:** EDG-004
**Role:** Chaos Engineer
**Area:** Edge Cases (Network Flaps)
**Action:** User clicks "Generate GSTR-1". Hard-throttle the browser connection halfway through the upload/download transmission.
**Expected:** Client times out gracefully. The backend worker successfully logs the abandoned job or resumes seamlessly.
**What could go wrong:** Process creates a rogue zombie job consuming RAM infinitely.
**Severity:** Medium

---

## 2. ROLE-WISE TEST TASKS

### QA Tester
- UI-001, UI-003, UI-005: Form submissions and layout checks.
- AUTH-003, UI-007: Expiration flows and UI traps.
- ACC-003, REP-001: Financial period locks and exports strings.
- LOG-002: Audit trail validation.
- EDG-001: Run date boundary validations.

### Bug Hunter / Security Pentester
- AUTH-001, AUTH-002: JWT bypass, algorithm manipulation, session collisions.
- TEN-001, KER-002: IDOR and dynamic model permission bypassing.
- SEC-001, SEC-002, SEC-004, SEC-005: Injection testing, file magic byte checks, and Replay attacks.
- INV-003, SEC-003: Process termination tests and rate limit starvation.

### CA / Accountant
- ACC-001, ACC-004, ACC-006: Imbalanced data testing, bulk imports.
- ACC-007, ACC-008: Round-off handling and multi-currency exchange stability.
- GST-001, GST-004, GST-005, GST-007: Extensive tax scenario variations (RCM, Mix-Tax, Comp).
- INV-005: Stock valuation mathematical proofs.
- REP-003: Tally Bridge XML hygiene checks.

### Careless / Impatient User
- UI-002, UI-004, UI-006: Spamming buttons, inserting extreme character counts.
- BNK-001: Overpayment triggers.
- PERF-002: Browser history manipulation.
- TEN-002: Immediate double submission of critical uniqueness vectors.

### DevOps / SRE / Mobile & Performance
- DEV-001, DEV-002: Env failure scenarios, massive DB locking mechanisms.
- DEV-003, MOB-001: API versions mismatch flows and graceful degradation.
- LOG-001, DEV-004: Ensure PII scrubbing in observability platforms.
- PERF-003, CON-001: Throttle loads to verify P99 SLA under race conditions.

---

## 3. CRITICAL LAUNCH BLOCKERS 🛑
*Do NOT certify for production release if ANY of these fail.*

1. **Accounting Integrity Failure:** Trial balances do not match, or imbalanced journals (CSV or UI) can be saved.
2. **Hard Deletes Allowed:** Any financial record (Invoice, Payment, Journal, BOM) can be hard-deleted instead of soft-deleted/reversed.
3. **Tenant Bleed (IDOR):** Tenant A can see, modify, or list Tenant B’s data via any API route.
4. **Auth Bypass:** APIs are exposed without Auth Guards, or JWT signature validation can be bypassed (e.g., 'none' algorithm or brute force).
5. **Race Conditions:** Rapid parallel requests allow bypassing stock constraints, credit limits, or creating duplicate vouchers.
6. **SQLi / XSS / RCE:** Database can be manipulated, or scripts executed, through ANY text or file upload input.
7. **Infrastructure Leaks:** PII, user passwords, or production secrets (JWT keys, DB strings) visible in any log level (Error/Info/Debug).
8. **Tally Integrity:** XML exports that fail basic validation or contain raw unescaped characters.

---

## 4. HIGH-RISK NON-BLOCKING TASKS ⚠️
*Can fix shortly post-launch, but poses operational risk.*

1. **Rate Limiting Gaps:** Someone could spam password resets (costs us API usage, but data is safe).
2. **Missing CSV/Excel limits:** Exporting 1M rows causes a 504 timeout (bad UX, but data is safe).
3. **UI breaks on weird devices:** The mobile UI overlaps on specific Android screens (bad UX).
4. **Cryptic Error Messages:** Validation errors like "Schema validation failed" instead of "Invoice amount is required".

---

## 5. FINAL PRE-LAUNCH YES/NO CHECKLIST

- [ ] Are all API routes protected by an AuthGuard?
- [ ] Does every single API query include `tenant_id`?
- [ ] Is Prisma preventing hard deletes natively via middlewares/extensions?
- [ ] Are we using transactions for ALL multi-step Database writes (Header + Lines + Ledger)?
- [ ] Have we removed `console.log` and raw errors from production responses?
- [ ] Are we checking CSRF / CORS against the exact production UI domains?
- [ ] Is the Financial Year locking strict and unbreakable?
- [ ] Is the production database backing up daily with Point-in-Time Recovery?

----------------------------------------------------------------
This Audit Document serves as the source of truth for QA sign-off.
Signed,
Enterprise QA Organization

---

## 6. DISCOVERY & VALIDATION FINDINGS (Phase 1) 🔍

### Resolved (Launch Blockers)
- [x] **SEC-001:** Tenant Bleed Risk on Prisma `$transaction` operations. Manual queries within transactions bypassed RLS isolate proxy. (Patched in `prisma.service.ts` via nested proxy).
- [x] **MEM-001:** Tally XML Exporter Out-of-Memory (OOM) Crash Risk. High volume data sets generate massive string payloads in memory. (Patched via NodeJS Async Generators and StreamableFile responses).
- [x] **PERF-001:** Depreciation Engine N+1 Query Cascade. Loop-level queries on accounts overheads connections during scaling. (Patched by batching logic and aggregating into a single transactional journal).
- [x] **ARCH-001:** Manufacturing BOM Dependency Cycle risk. Recursive stack limits are now removed and replaced with explicit `Set` Cycle Tracing to prevent DB explosions.
- [x] **UX-001:** Silent Authentication Logouts. Lack of sliding sessions or dedicated refresh token flow over JWT timeouts. (Patched via `/auth/refresh` endpoints and background refresh token generation tied to DB tokenVersions).
- [x] **SYS-001:** Missing Database Rollback on Billing Webhook Failures causing incomplete downgrade provisioning. (Patched via native Prisma atomic row-level locks on webhook intercepts).
- [x] **AUTH-007:** Security Fallback Validation. Eliminated generic `||` fallbacks masking `0` or `false` in `auth.service.ts` using null-safe `??`. Verified `tokenVersion` schema strictness (`Int @default(1)`) and non-nullability of core security properties.

---

## 7. SESSION AUDIT LOG — 2026-03-03 (Authentication Hardening & Financial Integrity)

### AUTH — Authentication Service Hardening (`auth.service.ts`)

- [x] **AUTH-008 — COA Init Silent Failure Eliminated (Registration):**
  `initializeTenantAccounts()` was wrapped in a `try/catch` that swallowed failures during `register()`, allowing tenants to be created with no Chart of Accounts. The catch block was removed entirely. The call now runs bare inside the `$transaction` block — any failure throws, rolling back the user, tenant, and membership atomically. No partial tenant creation is possible.

- [x] **AUTH-009 — COA Init Silent Failure Eliminated (Onboarding):**
  In `onboarding()`, the tenant update, warehouse creation, and `initializeTenantAccounts()` were three sequential non-transactional writes. If COA init failed, the tenant would be left `isOnboarded: true` with a warehouse but no accounts — a permanently broken state. All three operations are now wrapped in a single `$transaction(async (tx: any) => {...})`, making onboarding fully atomic.

- [x] **AUTH-010 — MFA isMfaVerified Operator Fix:**
  In `generateAuthResponse()`, the `type` field used `isMfaVerifiedOverride || !!userAny.isMfaVerified` to determine admin token type. A `false` override would evaluate `false || true = true`, completely nullifying forced-unverified login configurations. Replaced with `isMfaVerifiedOverride ?? !!userAny.isMfaVerified` to correctly treat `false` as an intentional value.

- [x] **AUTH-011 — Anomaly Alert Catch Surfaced:**
  `.catch(() => { /* never block login flow */ })` on `checkAuthFailureBurst()` silently swallowed anomaly service errors with no observability. Replaced with a named `(anomalyErr)` parameter and `console.error('[AUTH_ANOMALY_WARN] ...')` so anomaly service failures are visible in operations logs.

- [x] **AUTH-012 — MFA Catch Broadened to Preserve Stack:**
  `catch (e)` in `verifyMfa()` narrowly checked `e.message === 'Invalid MFA token'` before rethrowing — any other `UnauthorizedException` was re-wrapped with `new UnauthorizedException(e.message)`, losing the original stack. Broadened to `instanceof UnauthorizedException` → rethrow as-is; unknown errors still wrapped for safety.

### RBAC — Guard Registration & Order (`app.module.ts`)

- [x] **RBAC-001 — Global Guard Execution Order Corrected:**
  Guards in `app.module.ts` were registered in incorrect dependency order — `PlanGuard` was last (after CSRF and throttle), meaning suspended tenants could exhaust rate limits and fail CSRF before being rejected on subscription status. The correct order is now enforced:
  1. `JwtAuthGuard` — Authentication (populates `req.user`)
  2. `OnboardingGuard` — Tenant state check
  3. `ModuleGuard` — Module enable/disable
  4. `PermissionsGuard` — Mobile Safety Contract
  5. `MobileWhitelistGuard` — Channel whitelist
  6. `PlanGuard` — Subscription enforcement
  7. `CsrfGuard` — CSRF token validation
  8. `RoleThrottlerGuard` — Rate limiting (always last)

- [x] **RBAC-002 — Billing Upgrade Endpoint Locked to Owner:**
  `POST /system/billing/upgrade` had no `@Roles()` decorator. With `RolesGuard` enforcing strict fail-closed on mutations (any mutation without `@Roles()` is blocked and logged), this endpoint would have been inaccessible to all users. Added `@Roles(Role.Owner)` — billing authority is exclusively `Owner`-level. Manager, CA, Biller roles cannot upgrade plans.

- [x] **RBAC-003 — 59 Endpoint Audit Completed:**
  A full automated scan of all `POST/PUT/PATCH/DELETE` handlers across all controllers was run. 59 endpoints were identified as missing `@Roles()`, `@Public()`, or `@AllowIdentity()` decorators. These are catalogued for sequential remediation. `RolesGuard` is NOT yet registered globally — registration is blocked until all 59 endpoints are decorated.

### SEC — Frontend Security (`login/page.tsx`, `api.ts`)

- [x] **SEC-REDIRECT-01 — Open Redirect Hardening on `return_to`:**
  The existing origin check in `login/page.tsx` did not block protocol injection (`javascript:alert(1)` would parse with matching origin on some runtimes) or path escalation (any same-origin path like `/admin` was allowed). Replaced with a layered `safeRedirect()` function that:
  1. Blocks any URL containing a scheme (regex `/^[a-zA-Z][a-zA-Z\d+\-.]*:/`)
  2. Blocks scheme-relative URLs (`//evil.com`)
  3. Enforces `/portal` path prefix — only internal app routes accepted
  4. Performs a final `new URL()` same-origin paranoia check
  5. Falls back to `/portal/dashboard` on any failure

- [x] **SEC-INTERCEPT-01 — Axios Interceptor: `api.defaults` Token Cache Removed:**
  After a successful token refresh, `api.defaults.headers.common['Authorization']` was being mutated to persist the new token as a module-level default. This caches the token at instance level — if a user logs out and another logs in within the same JS context, the stale token from the previous session remains attached. Removed; the request interceptor already reads `localStorage` fresh on every request.

- [x] **SEC-INTERCEPT-02 — Concurrent Refresh Storm: Queued Requests Now Marked `_retry`:**
  Requests queued during an in-flight refresh had no `_retry` flag set on them. When the queue drained and they replayed with the new token, any subsequent `401` on those replayed requests would re-enter the refresh cycle, potentially triggering a second refresh. Queued requests now receive `_retry = true` before replay.

- [x] **SEC-INTERCEPT-03 — `isRefreshing` Reset Timing Fixed:**
  `isRefreshing = false` was placed in `.finally()`, which runs after `processQueue()` returns. Queued retries resolving in the queue could find `isRefreshing = false` and initiate a second concurrent refresh. `isRefreshing` is now reset synchronously before `processQueue()` is called in both the success and failure branches.

- [x] **SEC-INTERCEPT-04 — `session-expired` Single-Fire Guaranteed:**
  Combined with the `_retry` flag fix on queued requests, the `session-expired` CustomEvent can now only be dispatched once per actual refresh failure cycle. Previously, all queued rejections could independently enter the 401 branch and each fire the event.

### ACC — Financial Integrity (`payment.service.ts`, `credit-note.service.ts`)

- [x] **ACC-INTEGRITY-01 — Direct Balance Mutation Eliminated in Payment Cancellation:**
  `cancelPayment()` had a fallback `else` branch (reached when no original journal is found for a legacy payment) that directly mutated `account.balance` via `tx.account.updateMany({ data: { balance: { decrement/increment: ... } } })`. This is a direct balance mutation that bypasses double-entry enforcement and leaves no audit trail journal entry. Replaced with reconstructed `createJournalEntry()` calls using the payment data to produce proper Dr/Cr entries with references prefixed `CAN-LEGACY-`.

- [x] **ACC-PERIOD-01 — Period Lock Not Enforced on Credit Notes:**
  `credit-note.service.ts` `create()` had no call to `checkPeriodLock()` before posting. A credit note issued against a locked period (e.g., during audit) would silently create ledger entries and GST reversals in a locked accounting month, corrupting the audit-frozen figures. Added `await this.ledger.checkPeriodLock(tenantId, date || new Date(), tx)` immediately after the idempotency guard, before any financial writes.

### Resolved — Global `RolesGuard` Now Active

- [x] **RBAC-PENDING-001 — `accounting.controller.ts` (18 endpoints):** All POST handlers decorated. Financial writes → `Owner/Manager/CA`; period/year locking + COA import → `Owner/CA`; invoice/payment/credit-debit notes → `Owner/Manager/CA/Biller`.
- [x] **RBAC-PENDING-002 — `crm.controller.ts` (4 endpoints):** `createCustomer`, `uploadFile`, `createOpp`, `updateOpp` → `Owner/Manager/Biller`. `update (PATCH)` → `Owner/Manager/Biller`.
- [x] **RBAC-PENDING-003 — `hr.controller.ts` (6 endpoints):** `createDept`, `createEmployee`, `importEmployees` → `Owner/Manager`. `requestLeave` → `Owner/Manager/Biller/CA`. `updateLeaveStatus` → `Owner/Manager`. `generatePayroll` → `Owner/CA`.
- [x] **RBAC-PENDING-004 — `manufacturing.controller.ts` (9 endpoints):** `createBOM`, `importBoms`, `createMachine`, `approveWO`, `rejectWO` → `Owner/Manager`. `createWO`, `updateWOStatus`, `completeWO` → `Owner/Manager/Biller`.
- [x] **RBAC-PENDING-005 — `projects.controller.ts` (4 endpoints):** `create`, `update` → `Owner/Manager`. `createTask`, `updateTaskStatus` → `Owner/Manager/Biller`.
- [x] **RBAC-PENDING-006 — `purchases.controller.ts` (6 endpoints):** `createSupplier`, `updateSupplier`, `importSuppliers` → `Owner/Manager/CA`. `createPO`, `updateStatus` → `Owner/Manager`. `addOpeningBalance` → `Owner/CA`.
- [x] **RBAC-PENDING-007 — `sales.controller.ts` (5 endpoints):** `quickCheckout`, `createOrder`, `updateStatus` → `Owner/Manager/Biller`. `approveOrder`, `rejectOrder` → `Owner/Manager`.
- [x] **RBAC-PENDING-008 — `api-key.controller.ts` (2 endpoints):** `generateKey (POST)`, `revokeKey (DELETE)` → `Owner`. `RolesGuard` added to controller-level `@UseGuards`.
- [x] **RBAC-PENDING-009 — `billing.controller.ts` admin endpoints:** Already gated behind `AdminGuard`. `RolesGuard` passes through when no `@Roles()` metadata is present and `AdminGuard` has already run. Verified not broken.
- [x] **RBAC-PENDING-010 — `studio.controller.ts`:** Already had `@Roles(Role.Owner, Role.Manager)` at controller level. No change needed.
- [x] **RBAC-PENDING-011 — `webhook.controller.ts`:** `@Public()` added to `handleRazorpay`. Auth is HMAC-based, not session-based. Comment added explaining the intentional exemption.

**`RolesGuard` is now registered globally in `app.module.ts` as position 4 in the guard chain (after ModuleGuard, before PermissionsGuard).** All 59 endpoints are covered.

---

### Resolved — Financial Layer Gaps

- [x] **ACC-PENDING-001 — `debit-note.service.ts` Period Lock Added:**
  Same fix as `ACC-PERIOD-01` on `credit-note.service.ts`. Added `await this.ledger.checkPeriodLock(tenantId, date || new Date(), tx)` immediately after the idempotency guard, before any financial writes or GST/ITC reversal entries.

- [x] **ACC-PENDING-002 — `fixed-asset.service.ts` Depreciation Path Verified Clean:**
  Full file reviewed. `create()` already calls `checkPeriodLock()` on line 26. `runMonthlyDepreciation()` routes all depreciation through `createJournalEntry()` (Dr Depreciation Expense / Cr Accumulated Depreciation). The `accumulatedDepreciation` field update on the `fixedAsset` record is a register field, not a ledger balance mutation. No direct `account.balance` writes anywhere in the file. **No changes required.**


---

### Resolved — Prisma Client Enum Regeneration (Infrastructure)

- [x] **INFRA-PENDING-001 — `prisma generate` Not Run in Local Dev Environment:**
  `npx prisma generate` was failing due to a corrupted `@prisma/config` dependency (`effect` missing `Utils.js`). This was fixed by deleting `node_modules` and running a clean `npm install`, followed by a successful `npx prisma generate`. The Prisma client has been generated and TypeScript enum errors (`Role`, `PaymentMode`, etc.) are now resolved.



