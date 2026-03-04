# Database Migration Safety Guide (DEV-002)

## Problem: Large Table DB Locks During Prisma Migrations

When `prisma migrate deploy` runs `ALTER TABLE` statements on tables with millions of rows
(e.g. Invoice, Transaction, JournalEntry), PostgreSQL can acquire **ACCESS EXCLUSIVE locks**
that block ALL reads and writes for the entire duration of the migration.

---

## Safe Migration Strategies

### 1. Adding nullable columns (safe)

Adding a column with a `DEFAULT NULL` is instantaneous — PostgreSQL does not rewrite the table.

```sql
-- SAFE: Adding nullable column
ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT;

-- UNSAFE: Adding NOT NULL without default rewrites the entire table
ALTER TABLE "Invoice" ADD COLUMN "notes" TEXT NOT NULL;
```

**In Prisma schema:**
```prisma
// SAFE: Always make new fields optional or provide @default
notes   String?

// SAFE: With a default value
status  String  @default("Active")
```

### 2. Adding an index (safe with CONCURRENT)

Standard `CREATE INDEX` blocks writes. Use `CREATE INDEX CONCURRENTLY`.

Prisma cannot generate `CONCURRENTLY` index commands natively. Use a multi-step approach:

**Step 1** — Create migration without the index:
```prisma
// Commit the column first
notes String?
```

**Step 2** — After deploy, add the index manually in a raw migration file:
```sql
-- In a new migration file: CREATE INDEX CONCURRENTLY
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_tenantId_date_idx"
  ON "Transaction"("tenantId", "date");
```

```bash
# Run the raw SQL migration without Prisma's schema check
psql $DATABASE_URL -f migration.sql
```

### 3. Renaming or dropping columns

Never rename or drop a column in production in a single step. Use the expand-contract pattern:

1. **Expand**: Add new column alongside old column
2. **Migrate**: Backfill data from old → new column in batches
3. **Contract**: Drop old column after verifying all references are updated

---

## Prisma-Specific Protections

### Baseline all existing migrations
Before any large schema change:
```bash
npx prisma migrate status
```

Ensure all prior migrations are marked `Applied` before deploying new ones.

### Batch backfills
For data migrations on large tables, never migrate all rows in one transaction.
Use a loop with `LIMIT`:

```sql
-- Backfill in batches to avoid long-running transactions
DO $$
DECLARE
  batch_size INT := 1000;
  rows_updated INT;
BEGIN
  LOOP
    WITH updated AS (
      UPDATE "Transaction"
      SET "newField" = "oldField"
      WHERE "newField" IS NULL
      LIMIT batch_size
      RETURNING 1
    )
    SELECT COUNT(*) INTO rows_updated FROM updated;
    EXIT WHEN rows_updated < batch_size;
    PERFORM pg_sleep(0.05); -- 50ms pause between batches
  END LOOP;
END$$;
```

### Lock timeout protection
Set a lock timeout before any schema change to abort rather than wait indefinitely:

```sql
-- Abort if lock cannot be acquired within 2 seconds
SET lock_timeout = '2s';
ALTER TABLE "Invoice" ADD COLUMN "externalRef" TEXT;
```

Add this at the top of your migration SQL files for table alterations.

---

## Deployment Checklist (DEV-002)

Before running `prisma migrate deploy` in production:

- [ ] Verify migration is additive only (adding nullable columns / optional fields)
- [ ] No `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a DEFAULT
- [ ] No inline data migrations in the same migration as schema changes
- [ ] Indexes are created with `CONCURRENTLY` after the fact
- [ ] Set `lock_timeout = '2s'` at the top of any ALTER migration
- [ ] Test migration on a staging database snapshot first
- [ ] Confirm `prisma migrate status` shows clean baseline before deploy
