# Disaster Recovery Plan (DRP)
## Nexus ERP System

**Authority:** Principal Architect
**Classification:** SENSITIVE
**Last Updated:** 2026-02-27

---

## 1. Objectives
- **Recovery Point Objective (RPO):** 1 hour (Maximum data loss since last backup/PITR log).
- **Recovery Time Objective (RTO):** 4 hours (Maximum time to restore full service).

## 2. Backup Strategy
### 2.1 Point-in-Time Recovery (PITR)
- **Provider:** Supabase / Render Managed DB.
- **Frequency:** Continuous transaction logging with snapshots every 24 hours.
- **Retention:** 30 days.

### 2.2 Automated Offsite Backups
- **Mechanism:** Nightly `pg_dump` to encrypted S3 bucket.
- **Script:** `scripts/backup-to-s3.sh` (Triggered via GitHub Actions).
- **Encryption:** AES-256 at rest.

### 2.3 Tenant-Level Portability
- **Tool:** `npm run export:tenant --tenantId=<uuid>`
- **Usage:** Used for individual tenant data migration or forensic investigation.

## 3. Recovery Procedures

### 3.1 Full Database Restore (PITR)
1. Log into Supabase/Render Console.
2. Select the Database instance.
3. Navigate to 'Backups' -> 'Point in Time Recovery'.
4. Select the target timestamp (e.g., 5 minutes before the incident).
5. Initiate Restore. This will spin up a new instance.
6. Verify data integrity on the new instance.
7. Update `DATABASE_URL` in backend environment variables to point to the restored instance.

### 3.2 Individual Tenant Recovery
If a single tenant's data is corrupted:
1. Identify the corruption timestamp.
2. Restore a PITR backup to a separate temporary instance.
3. Use the `export:tenant` tool against the temporary instance to extract the specific tenant's data.
4. Wipe the corrupted tenant data in production (using extreme caution).
5. Re-import the clean data using the tenant-level import tool (to be implemented).

## 4. Communication Protocol
1. **Detection:** Anomaly alerts trigger (P0).
2. **Containment:** Principal Architect evaluates the breach/corruption.
3. **Decision:** "GO/NO-GO" for restore is issued within 30 minutes.
4. **Notification:** Tenant owners are notified of the "Maintenance Window" if downtime is required.

## 5. Annual Drill Requirement
- A full restore dry-run must be performed every 12 months.
- Results must be documented in the `backups/dr-drills/` directory.

---
*End of Document*
