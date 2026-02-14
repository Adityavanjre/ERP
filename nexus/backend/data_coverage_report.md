# Data Coverage Analysis Report

An audit of the current database state shows that while the ERP has a functional "skeleton", it lacks the "meat" required for stress testing and realistic business simulation.

## Current State vs. Testing Requirements

| Module | Model | Current Count | Requirement for Full Testing | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CRM** | Customer | 4 | 20+ | ⚠️ Low |
| | Opportunity | 0 | 15+ (across all stages) | ❌ Zero |
| **Inventory** | Product | 12 | 30+ (incl. nested components) | ⚠️ Low |
| | StockMovement | 0 | 50+ (historical audit trail) | ❌ Zero |
| | Warehouse | 2 | 3+ | ✅ OK |
| **Purchases** | Supplier | 3 | 10+ | ⚠️ Low |
| | PurchaseOrder | 1 | 15+ (Draft, Received, Shipped) | ❌ Poor |
| **Manufacturing**| BillOfMaterial | 1 | 5+ (Multi-level) | ❌ Poor |
| | WorkOrder | 2 | 20+ (Planned to Completed) | ❌ Poor |
| | Machine | 0 | 5+ | ❌ Zero |
| **Accounting** | JournalEntry | 0 | 100+ (for P&L and Balance Sheet) | ❌ Zero |
| | Transaction | 0 | 200+ | ❌ Zero |
| | Payment | 0 | 20+ | ❌ Zero |
| **Sales** | Invoice | 1 | 30+ (Historical over 6 months) | ❌ Poor |

## Critical Gaps Impacting Features:
1. **Search & Pagination**: With only 4 customers or 12 products, pagination buttons and complex filters cannot be tested.
2. **CRM Pipeline**: The CRM dashboard will look empty and unusable without "Opportunities" in various stages.
3. **Financial Reports**: The Balance Sheet and P&L reports require historical Journal Entries across multiple months to show trends and correct totals.
4. **Inventory Valuation**: Lack of StockMovements means we cannot test FIFO/MAC valuation history ledgers.
5. **Manufacturing Scheduling**: Without Machine data and more WorkOrders, the production calendar/scheduler will be empty.

## Recommendation:
Implement a `MasterSeeder` script that generates a high-fidelity "living" company history.
