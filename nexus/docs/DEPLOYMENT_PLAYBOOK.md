# Nexus Gateway: Manual Deployment Playbook

Since auto-deploy is disabled for forensic safety, follow this exact sequence to release the certified codebase.

## 1. Prerequisites
*   **CRITICAL**: Ensure `DATABASE_URL` uses the **Supabase IPv4 address**. Render free tier does not support IPv6.
    *   *Correction*: Replace `db.<ref>.supabase.co` with the IPv4 address provided in your Supabase DB settings (or use the non-pooled string if the pooler is IPv6-only).
*   Ensure all environment variables are configured in the Render Dashboard.
*   Confirm the latest commit (`feat: final production hardening and forensic certification`) is visible on GitHub.

## 2. Deployment Sequence (Strict Order)
To ensure database migrations complete before traffic routing changes, deploy in this order:

### Phase A: Core Infrastructure
1.  **klypso-backend** (Nexus Backend)
    *   *Why*: Triggers `npx prisma migrate deploy`. If this fails, STOP.
2.  **klypso-agency-backend**
    *   *Why*: Seeds initial admin data to MongoDB.

### Phase B: Frontend Surfaces
3.  **klypso-frontend** (Nexus ERP)
4.  **klypso-agency-viewer** (Marketing Site)
5.  **klypso-agency-frontend** (Agency Admin)

### Phase C: Routing (Final Step)
6.  **klypso-gateway** (Nginx/Docker)
    *   *Why*: Maps the traffic to the newly deployed instances.

## 3. How to Trigger Deployment
For each service above, go to the Render Dashboard and click **"Manual Deploy"** -> **"Deploy latest commit"**.

Alternatively, if you have configured **Deploy Hooks**, you can trigger them via `curl` from your terminal:

```bash
# Example command for each service
curl -X POST https://api.render.com/deploy/srv-<YOUR_SERVICE_ID>?key=<YOUR_DEPLOY_KEY>
```

## 4. Verification Post-Deploy
Immediately after Phase C is complete, verify the following forensic health check:
1.  **Public API**: `https://nexus.klypso.in/portal/api/v1/health/liveness` should return 200/Healthy.
2.  **Nginx Mapping**: Verify `https://nexus.klypso.in/agency-api/api/health` returns MongoDB connection status.
3.  **Mobile Kill Switch**: Confirm that setting `MOBILE_WRITE_ENABLED=false` in Render Dashboard instantly blocks mobile mutations.

---
**GOVERNANCE REMINDER**: Do not perform partial deploys. All services must be at the same commit level to maintain forensic certification.
