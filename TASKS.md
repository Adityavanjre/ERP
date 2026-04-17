# Klypso Production Readiness Audit

This is the comprehensive checklist for final stabilization. It covers critical build issues, UI cleanliness for both Desktop and Web, and automated deployment verification.

## 1. CRITICAL: CI/CD & Build Stability
- `[/]` **TASK-24**: Implementation of Phase 9 (Deep Clean).
- `[/]` **TASK-25**: Resolve `bullmq` ghosting (Synchronize versions & dedupe).
- `[/]` **TASK-26**: Converge Path Aliases to Relative Paths for critical infrastructure (Harden CI resolution).
- `[ ]` **TASK-27**: Verify "Build & Validate" turns Green in GitHub Actions.

## 2. HIGH: Desktop "Clean App" Experience
- `[x]` Redirect root (`/`) to `/login` for desktop shell.
- `[x]` Hide "Create Account" / "Forgot Password" from desktop login.
- `[ ]` **TASK-28**: Gate the remaining Marketing routes (`/industries/*` [X], `/klypso-health` [N/A]) with desktop redirects.
- `[ ]` **TASK-29**: Hardened Navigation: Update "Back to Home" links to use `/login` instead of `/` when in desktop shell.
- `[x]` **TASK-33**: Install and configure `graphifyy` knowledge graph tool.

## 3. MEDIUM: Dashboard & Performance
- `[x]` Implemented 1s safety timeout for "Synchronizing" state.
- `[ ]` **TASK-30**: Verify the fix on the final Cloud-deployed build (Manual test).

## 4. LOW: Production Deployment & Polish
- `[ ]` **TASK-31**: Verify Render deployment hook triggers after CI passes.
- `[ ]` **TASK-32**: Global code format check (Prettier).

---

## Execution Order
**Current Phase**: Phase 11 (Absolute Brute Force & Knowledge Graph)
**Next Phase**: Phase 12 (Final Verification)
