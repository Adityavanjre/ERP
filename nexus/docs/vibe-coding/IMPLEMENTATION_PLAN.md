# Implementation Plan Roadmap
**Project:** Klypso ERP

This roadmap acts as the blueprint for future expansions. AI tools must reference this plan to understand the boundaries of the current sprint and avoid over-engineering components scheduled for later phases.

## Phase 1: Core Foundation (COMPLETED)
- Desktop shell scaffolding.
- Local SQLite + Cloud PostgreSQL dual-engine architecture.
- Web UI (Next.js) parity with Desktop.

## Phase 2: Secure Access & Identity (COMPLETED)
- PBAC (Policy-Based Access Control) Engine implementation.
- LAN-only mode toggles (Hiding Google Auth on local network).
- Offline-first API interceptors.

## Phase 3: Core Business Models (IN PROGRESS)
- **CRM Module:** Customer records, leads, and basic editing.
- **Inventory Module:** Product catalog, categories, pricing, and basic editing.
- **Accounting Module (Upcoming):** Ledger, Double-entry Journals, Tally Export formatting.

## Phase 4: Advanced Modules (Upcoming)
- **HR & Payroll:** Employee management, attendance tracking.
- **Reporting Engine:** Dynamic localized BI dashboards.

*Note to AI:* Only implement the features requested in the current context. Do not proactively build Phase 4 components if the user asks for a Phase 3 CRM fix.
