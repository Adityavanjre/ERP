# Code Review Report

## Scope Reviewed
- `agency/server` (Express API)
- `agency/client` (Vite + React)
- `nexus/backend` (NestJS API)
- `nexus/frontend` (Next.js frontend)
- deployment config (`nexus/docker-compose.yml`)

## Critical Findings

### 1) Public user registration endpoint in Agency API [CLOSED]
**Severity:** High  
**Where:** `agency/server/routes/userRoutes.js`  
**Issue:** `POST /api/users` is publicly accessible (`.post(registerUser)`), which allows unrestricted account creation. Even if `isAdmin` defaults to `false`, this still creates an unnecessary attack surface for account sprawl and abuse.

**Fix Applied:** Added `protect` and `admin` middleware to the registration route to ensure only authorized administrators can create new user accounts.

### 2) Hardcoded JWT secret in Docker Compose [CLOSED]
**Severity:** High  
**Where:** `nexus/docker-compose.yml`  
**Issue:** `JWT_SECRET` is hardcoded in source-controlled deployment config.

**Fix Applied:** Replaced the hardcoded secret with environment variable injection (`${JWT_SECRET}`).

## Medium Findings

### 3) Mass-assignment risk in project create/update handlers [CLOSED]
**Severity:** Medium  
**Where:** `agency/server/controllers/projectController.js`  
**Issue:** `new Project(req.body)` and `Object.assign(project, req.body)` accept arbitrary client-provided fields. This enables unintended field mutation if schema expands in future.

**Fix Applied:** Implemented allowlist mapping for both `createProject` and `updateProject`. Only recognized schema fields are picked from `req.body`.

### 4) Logout cookie clearing is incomplete [CLOSED]
**Severity:** Medium  
**Where:** `agency/server/controllers/userController.js`  
**Issue:** Login sets cookie flags (`httpOnly`, `secure`, `sameSite`), but logout does not mirror all flags when clearing the cookie. In some browser combinations this can fail to clear reliably.

**Fix Applied:** Updated `logoutUser` to clear the cookie with matching attributes: `httpOnly`, `secure`, `sameSite`, and `path`.

### 5) Enquiry email send is fire-and-forget after DB write [CLOSED]
**Severity:** Medium  
**Where:** `agency/server/controllers/enquiryController.js`  
**Issue:** API returns 201 even if mail delivery fails (`transporter.sendMail` callback only logs errors). This can hide operational failures and reduce visibility for sales follow-up.

**Fix Applied:** Converted `transporter.sendMail` to use `await` before sending the 201 response. If the email delivery fails, the API will now catch the error and respond accordingly.

## Low / Operational Findings

### 6) Request logging is too verbose and unstructured [CLOSED]
**Severity:** Low  
**Where:** `agency/server/index.js`  
**Issue:** Logs every request via `console.log` including URL directly. This can create noisy logs and potential leakage of sensitive query params.

**Fix Applied:** Restricted request logging to development mode only and added logic to redact query strings from emitted logs.

### 7) Existing lint artifact contains local machine path leakage [CLOSED]
**Severity:** Low  
**Where:** `nexus/frontend/lint_results_final_8.json`  
**Issue:** Report includes absolute Windows path fragments (`D:\code\ERP\...`) which can leak local environment details when committed.

**Fix Applied:** Deleted all generated lint and build artifacts from `nexus/frontend` and updated `.gitignore` to prevent future commits of these files.

## Summary of Remediation (2026-03-08)
All 7 findings from the initial audit have been resolved. The system security posture and operational visibility have been improved by:
- Hardening authentication and registration flows.
- Adopting DTO patterns to block mass-assignment.
- Securing environment configuration.
- Refining logging to prevent data leakage.
- Modernizing multi-step logout reliability.
