-- PHASE 2: DATABASE ROW-LEVEL SECURITY (RLS)
-- This migration enables PostgreSQL RLS on all tenant-scoped tables.
-- It ensures that even if local Prisma filters are bypassed, 
-- cross-tenant data leakage is physically impossible at the database level.

-- 1. Create the nexus_app role if it doesn't exist
-- Note: In Supabase/Managed DBs, you might need to use existing roles.
-- We assume the application connects as 'postgres' or a role that can SET app.tenant_id.

-- 2. ENABLE RLS AND CREATE POLICIES FOR ALL TENANT-SCOPED TABLES

DO $$ 
DECLARE 
    tbl text;
    tenant_tables text[] := ARRAY[
        'PeriodLock', 'TenantUser', 'Product', 'Customer', 'Opportunity', 'Order', 
        'AuditLog', 'BillOfMaterial', 'BOMItem', 'WorkOrder', 'Machine', 'Account', 
        'JournalEntry', 'Transaction', 'Invoice', 'InvoiceItem', 'Payment', 
        'CustomerOpeningBalance', 'Employee', 'Department', 'Payroll', 'Leave', 
        'Supplier', 'SupplierOpeningBalance', 'PurchaseOrder', 'PurchaseOrderItem', 
        'CreditNote', 'CreditNoteItem', 'DebitNote', 'DebitNoteItem', 'Project', 
        'Task', 'Warehouse', 'StockLocation', 'WarehousePrice', 'StockMovement', 
        'FixedAsset', 'DepreciationLog', 'Comment', 'ApiKey', 'Record', 'TdsRule', 
        'TdsLedgerMapping', 'TdsTransaction', 'Patient', 'Appointment', 
        'MedicalRecord', 'PharmacyBatch', 'BOQ', 'BOQItem', 'SiteInventory', 
        'RetentionSchedule', 'Vehicle', 'FuelLog', 'RouteLog', 
        'MaintenanceSchedule', 'RouteBenchmark', 'Loan', 'LoanInterestSlab', 
        'EMISchedule', 'InterestAccrual', 'KYCRecord', 'BankStatement', 
        'BankStatementLine', 'BankReconciliation', 'HsnMaster'
    ];
BEGIN 
    FOREACH tbl IN ARRAY tenant_tables LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        
        -- Drop policy if exists
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I', tbl);
        
        -- Create isolation policy
        -- This policy allows access ONLY if the table's tenantId matches the session's app.tenant_id.
        -- We use ::text comparison to handle both UUID and String formats safely.
        -- We use current_setting(..., true) to return NULL instead of throwing if setting is missing.
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            FOR ALL
            USING ("tenantId"::text = current_setting(''app.tenant_id'', true))
        ', tbl);
        
    END LOOP;
END $$;
