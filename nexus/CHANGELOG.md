# Changelog

## [Incident - 2026-02-27] Production Deploy Failure

### Root Cause Analysis (RCA)
1. **Prisma Migration Error (P3018): `type "VendorType" already exists`**
   - **Cause:** The `20260225235500_init` migration was renamed locally to `20260225235500_reversible_init` to pass a pre-deploy hook. Because the original `_init` was already applied to the production database, Prisma treated the renamed directory as a new migration and attempted to recreate existing types/tables.
   - **Action Taken:** Instructed the user to manually mark the renamed migration as resolved on the production database to avoid destructive hot-edits.

2. **Backend Crash: `TypeError: Resource is not a constructor`**
   - **Cause:** In `src/tracing.ts`, `Resource` was imported using CommonJS `require` instead of ESM `import` in a TypeScript ESM environment, causing it to resolve incorrectly at runtime.
   - **Action Taken:** Patched `src/tracing.ts` to use `import { Resource } from '@opentelemetry/resources';`. Fixed in branch `fix/render-deploy-crash` for tagged release.
