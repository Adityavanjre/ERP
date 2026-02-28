# Zero-Downtime Migration Safety Guide (DEV-002)

To ensure the Nexus ERP remains active during schema updates, follow these strict rules.

## 1. The "Expand then Contract" Pattern
Never perform destructive changes (DROP COLUMN, RENAME) in a single deployment.

- **Step A (Release 1)**: Deploy the NEW schema (add column/table). Keep the old one.
- **Step B (Release 2)**: Update the CODE to write to both locations or the new location.
- **Step C (Release 3)**: Deploy the cleanup (remove the old field).

## 2. Safe Indexing
Always use `CONCURRENTLY` for production indices to avoid locking the table.

```sql
-- BAD: Locks the table
CREATE INDEX idx_tenant_id ON "FinancialRecord"(tenant_id);

-- GOOD: Does not lock
CREATE INDEX CONCURRENTLY idx_tenant_id ON "FinancialRecord"(tenant_id);
```

## 3. Avoid Default Values on Large Tables
Adding a column with a default value can cause a full table rewrite, causing downtime.

- **Bad**: `ALTER TABLE "Invoice" ADD COLUMN "is_verified" BOOLEAN DEFAULT false;`
- **Good**: Add the column, then run a background script to update existing rows in batches.

## 4. Prisma Specifics
- Always run `prisma migrate deploy` as a pre-boot step.
- Use `npx prisma migrate diff` to audit the SQL before execution.
