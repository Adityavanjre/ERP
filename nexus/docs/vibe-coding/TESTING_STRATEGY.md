# Testing Strategy
**Project:** Klypso ERP

## 1. Web UI (Cloud Mode)
- **Objective:** Verify standard operation against Render.com backend.
- **How to Test:** Run `npm run dev` in `frontend/`. Access `http://localhost:3000`.
- **Expected Results:** Standard login screen appears, Google Auth is visible, and all mutating requests correctly attach the `nexus-csrf` cookie.

## 2. Local-First / LAN Mode
- **Objective:** Verify the Web UI safely downgrades features when served from the Desktop over a LAN.
- **How to Test:** Access the application via a LAN IP (e.g., `http://192.168.1.50:3000`). 
- **Expected Results:** 
  - `isLocalNetwork` flag triggers.
  - "Sign in with Google" button is hidden.
  - "Super Admin Mode" is hidden.

## 3. Desktop Electron Shell
- **Objective:** Verify IPC routing and offline sync.
- **How to Test:** Run `npm run dev` in `desktop/`. Disable the machine's WiFi/Ethernet adapter.
- **Expected Results:** 
  - App transitions to "Offline Mode".
  - Read requests hit SQLite.
  - Mutating requests queue gracefully in the `_sync_queue`.
  - Re-enabling the network triggers an immediate flush to Render.com.

## 4. PBAC (Permissions) Validation
- **How to Test:** Log in as a user assigned a stripped-down role (e.g., `Viewer`).
- **Expected Results:** The `useUX` hook must hide "Edit" and "Delete" buttons in the UI for unauthorized modules. The Backend `@Permissions()` guard must reject direct API hits with a `403 Forbidden` error.
