# Codebase Analysis & Bug Hunting Plan

## 1. Project Overview
The **Klypso Ecosystem** (ERP) is a multi-tenant enterprise resource planning system. It follows a monorepo structure with two main service groups:
- **Nexus**: The core ERP system (Backend: NestJS + Prisma, Frontend: Likely Next.js/React).
- **Agency**: A separate service/client for agency-specific features.

### Tech Stack (Nexus Backend)
- **Framework**: NestJS
- **ORM**: Prisma (PostgreSQL)
- **Security**: JWT, MFA, RBAC (Role-Based Access Control), Tenant Isolation.
- **Observability**: Sentry, OpenTelemetry, Audit Trails (HMAC-based).
- **Infrastructure**: Docker, Render (deployment).

---

## 2. Core Architecture & Security Patterns
Based on the `app.module.ts` and `main.ts`, the system enforces a strict security chain:
1. **JWT Authentication**: Identity verification.
2. **Tenant Isolation**: `TenantMembershipGuard` and `TenantInterceptor` ensure users only access their own data.
3. **RBAC**: `RolesGuard` enforces role-specific permissions on all mutations.
4. **Subscription Management**: `PlanGuard` and `ModuleGuard` restrict access based on active modules and subscription tier.
5. **Data Integrity**: 
   - `IdempotencyInterceptor` prevents duplicate submissions.
   - Financial transactions are wrapped in Prisma `$transaction` blocks.
   - Hard deletes are generally avoided in favor of soft deletes or reversal entries (to be verified).

---

## 3. Preliminary Codebase Findings
- **Fail-Fast Boot**: `main.ts` includes extensive environment validation, ensuring all critical secrets are present before startup.
- **Robust Error Handling**: Global exception filters and Sentry integration are in place.
- **Audit Maturity**: A comprehensive system audit (`nexus_full_system_audit.md`) indicates a high level of scrutiny on financial and security aspects.
- **Recent Focus**: 
    - Authentication hardening (registration/onboarding atomicity).
    - RBAC decorator coverage (59 endpoints recently audited and fixed).
    - Financial period locks on Credit/Debit notes.

---

## 4. Bug Hunting Areas (High Priority)
Following the "Master Test Checklist", I will focus on the following domains:

### A. Financial Integrity & Concurrency
- **Race conditions** in stock updates and invoice payments.
- **Float precision errors** in large-scale ledger aggregations.
- **Bypassing financial locks** (e.g., posting to a locked period via less common endpoints).

### B. Multi-Tenancy & IDOR
- **Tenant Bleed**: Checking if any new or obscure endpoints missing `tenant_id` filters in Prisma queries.
- **Dynamic Models**: Ensuring the No-Code Studio models strictly follow tenant isolation.

### C. Module-Specific Logic
- **Healthcare Module**: Verify industry settings during registration (per user's recent request).
- **Manufacturing (BOM)**: Check for circular dependencies and atomicity during production logs.
- **Inventory**: Verify "Allow negative stock" enforcement across all entry points.

### D. Security & Auth Edge Cases
- **Token Revocation**: Validating that logged-out tokens or suspended tenant tokens are instantly rejected.
- **MFA Bypass**: Checking if any auth path skips MFA checks incorrectly.
- **Input Sanitization**: XSS in tenant names or GSTIN fields.

---

## 5. Execution Plan
- [x] **Step 1: Deep Dive into Healthcare Registration**: Investigate why "Healthcare" industry might be null for new users.
- [x] **Step 2: Concurrency Stress Test**: Review `inventory.service.ts` for row-level locking on stock updates.
- [x] **Step 3: Financial Period Audit**: Verify `checkPeriodLock` implementation across all financial modules.
- [x] **Step 4: IDOR Scan**: Automated or manual scan of controller endpoints to ensure `@UseInterceptors(TenantInterceptor)` or manual tenant filtering is ubiquitous.
- [x] **Step 5: Mobile Safety Check**: Verify `PermissionsGuard` logic for refined permission handling.

---

## 6. Ongoing Findings Log
| ID | Area | Severity | Description | Status |
|----|------|----------|-------------|--------|
| BUG-001 | Inventory/Concurrency | Critical | `inventory.service.ts` `deductStock` uses Prisma `update({decrement})` after `findUnique` check without a database row-level lock (e.g., `SELECT FOR UPDATE`), leading to a race condition that can bypass the non-negative stock constraint. | Resolved |
| BUG-002 | Manufacturing/Financial | High | `manufacturing.service.ts` `completeWorkOrder` calls `this.accounting.checkPeriodLock` outside of the Prisma transaction `tx`, creating a race condition window where a period can be locked right after the check, but the transaction still processes in the locked period. | Resolved |
| BUG-003 | Healthcare/IDOR | Critical | `healthcare.service.ts` `createMedicalRecord` and `scheduleAppointment` endpoints accept `patientId`/`employeeId` without validating if they belong to the current `tenantId`, resulting in a cross-tenant Data Bleed. | Resolved |
| BUG-004 | Purchases/Inventory | High | `purchases.service.ts` `updatePOStatus` (PO cancellation) uses `stockLocation.updateMany` without filtering by `notes: ''`. It decrements the item quantity from *every* stock location variant (e.g. WIP_BIN and normal bin) for that `productId`/`warehouseId` combination. | Resolved |
| BUG-005 | NBFC/Financial | Critical | `nbfc.service.ts` `runDailyInterestAccrual` lacks an idempotency check for the current date. Calling this batch process multiple times a day will inadvertently duplicate the daily interest accruals for all active loans. | Resolved |
| BUG-006 | Purchases/Ledger | High | `purchases.service.ts` `importSuppliers` algorithm commits each supplier opening balance in isolated transactions, but posts the unified Journal Entry outside all transactions at the very end. If the journal entry fails, double-entry integrity is permanently breached. | Resolved |
| BUG-007 | Sales/Financial | Medium | `sales.service.ts` `updateOrderStatus` calls `checkPeriodLock` with `new Date()` rather than the creation date of the order, allowing modification of historical orders from locked financial periods. | Resolved |
| BUG-008 | Admin/Security | Critical | `auth.service.ts` `adminLogin` bypasses `this.checkBruteForce()` before validating the password, allowing an attacker to brute-force the admin route relentlessly. | Resolved |
| BUG-009 | Authentication/MFA | High | `roles.guard.ts` blocks identities without a tenant role unless `user.type === 'identity'`. `googleLogin` issues an `'mfa_setup_pending'` token which gets hard-blocked by `RolesGuard`, making it impossible for Google users to configure mandatory MFA. | Resolved |
| BUG-010 | Session/Security | High | `auth.controller.ts` `logout` blacklists the `jti` of the Access Token but fails to invalidate the long-lived Refresh Token (which lacks a jti). A hijacked Refresh Token can freely orchestrate new sessions even after formal logout. | Resolved |
| BUG-011 | Provisioning/COA | Low | `auth.service.ts` `onboarding` method redundantly calls `accountingService.initializeTenantAccounts`. Because `register` already created the default Chart of Accounts, calling this again dirties the ledger with overlapping vertical-specific accounts. | Resolved |
| BUG-012 | Transaction Scoping | Critical | Global models like `RevokedToken` threw error inside Prisma Middleware interceptor blocking subsequent login actions because the query missed global scoping bypass. | Resolved |
| BUG-FIN-013 | Financial Period Locks | Critical | `checkPeriodLock` was invoked outside Prisma `$transaction` blocks in NBFC, Sales, Invoices, and Payments, creating a concurrency race condition where transactions could execute on locked financial periods. | Resolved |
| BUG-QUEUE-01 | Background Jobs / IDOR | Critical | `bulk-import.processor.ts` executed Prisma mutations without wrapping them in `TenantContextService.run()`, violating the core interceptor and crashing jobs with SECURITY_LEVEL_CRITICAL. | Resolved |
| BUG-QUEUE-02 | Background Jobs | High | `bulk-import.processor.ts` supplier upsert used `id: rowData.id || ''`, causing crashes on every row lacking a UUID. Replaced with email-based UPSERT. | Resolved |
| BUG-QUEUE-03 | Background Jobs / IDOR | Critical | Customer and product creations inside `bulk-import.processor.ts` missed `tenantId` assignment in the data payload. | Resolved |
| BUG-DTO-01 | Validation | Low | `ResetPasswordDto.token` allowed `MaxLength(1000)` which could be exploited for massive payload parsing overhead; reduced to 64. | Resolved |
| BUG-AUTH-01 | Financial Ledger | High | Cancelling a payment with TDS zeroed out the original TDS journal entry values instead of creating a formalized, immutable reversal entry. | Resolved |
| BUG-MFG-01 | Manufacturing / IDOR | High | `approveWorkOrder` and `rejectWorkOrder` mutated records using Prisma `update` with only the `id`, allowing cross-tenant state mutations for known UUIDs. Upgraded to `updateMany`. | Resolved |
| BUG-PURCH-01 | Purchases / Financial | Medium | `updatePOStatus` invoked a redundant `checkPeriodLock` outside of the atomic database transaction, producing a TOCTOU race condition. | Resolved |
| BUG-INV-01 | Inventory / Concurrency | Critical | Atomic multi-step stock deductions (`product.updateMany`, `stockLocation.updateMany`) omitted `tenantId` in their `where` conditions, exposing a severe cross-tenant isolation bypass. | Resolved |
| BUG-NBFC-01 | NBFC / IDOR | High | Loan disbursement and interest recalculation updates bypassed strict structural scoping, making cross-tenant modifications possible via raw endpoint access. | Resolved |
| BUG-RBAC-01 | Auth / RBAC | Critical | `RolesGuard` permitted global identity tokens (`admin`, `mfa_setup_pending`) to fall through to standard generic endpoints unless explicitly intercepted, rather than defaulting to hard-reject. | Resolved |
