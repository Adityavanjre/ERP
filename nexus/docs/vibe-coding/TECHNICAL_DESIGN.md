# Technical Design Document
**Project:** Klypso ERP

## 1. System Architecture
Klypso utilizes a Hybrid Local-First architecture.
- **Central Cloud:** The global source of truth hosted on a Hostinger VPS (Node/NestJS + PostgreSQL + Redis via Docker/PM2).
- **Desktop Node:** The Desktop app (Electron) runs a bundled Express API and a local SQLite database (`_users`, `_tenant_settings`, `_sync_queue`). It acts as a local proxy for Web clients.
- **Web Clients:** Access the system via `http://localhost:3000` or the Desktop's local IP address over the LAN.

## 2. Tech Stack
- **Frontend:** Next.js 14+ (App Router), React, TailwindCSS, `lucide-react` for icons.
- **Backend:** NestJS, Prisma ORM.
- **Desktop:** Electron, SQLite3, `bonjour-service` for mDNS discovery.
- **Data Fetching:** Axios with a custom offline-bridge interceptor.
- **Deployment:** Hostinger VPS (Full root access, persistent processes).

## 3. Core Mechanisms
### 3.1 Local-First Bridge
The frontend `api.ts` file utilizes a custom Axios interceptor. If `shouldHandleDesktopOfflineRequest()` returns true, API calls are hijacked and resolved against the local SQLite database instead of traversing the internet to the Hostinger VPS.

### 3.2 Peer-to-Peer Sync
- **mDNS:** The desktop broadcasts its IP on port `3100` via Bonjour.
- **Sync Engine:** The `SyncEngine` polls the VPS API. If offline, it buffers mutations to a SQLite `_sync_queue`. Once reconnected, it pushes the queue to the cloud and pulls down any delta changes.

### 3.3 Dynamic Schema & PBAC
The Prisma schema relies on dynamic JSON fields for configurations rather than hardcoded enums. 
`User` entities do not have `role: "ADMIN"`. Instead, they belong to a `TenantRole` that maps to specific PBAC tokens checked via the `@Permissions()` NestJS decorator.
