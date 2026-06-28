# Product Requirements Document (PRD)
**Project Name:** Klypso ERP
**Architecture:** Local-First / Peer-to-Peer Hybrid Web Application

## 1. Core Problem & Objective
Standard cloud ERP systems fail or become severely degraded in regions with poor internet connectivity, leaving local staff unable to process transactions. 
**Objective:** Provide a seamlessly synchronized ERP that runs a local server directly on the owner's Desktop machine. It guarantees 100% uptime on the local network (LAN) and synchronizes with the cloud whenever the internet is available.

## 2. Target Audience
- **Small to Medium Businesses (SMBs)** in emerging markets.
- **Retail & Showroom environments** needing high aesthetics.
- Teams sharing a single physical location (LAN) where the Owner's PC is the primary "server."

## 3. MVP Features (In-Scope)
- **Local-First P2P Sync Engine:** The Desktop app embeds an Express API and SQLite database. It serves requests to the web interface over the local network.
- **Dynamic Modular Architecture:** Includes CRM (Customers/Opportunities), Inventory (Products/Warehouses), and Accounting (Ledger/Journals). Modules can be toggled on/off dynamically by the organization.
- **Policy-Based Access Control (PBAC):** A sophisticated permissioning system mapping roles to specific granular permissions across modules.
- **Premium Showroom UI:** Strict aesthetic constraints emphasizing product realism, minimal motion, and "architectural" design principles over bloated animations.

## 4. Out of Scope (Do Not Build)
- **Complex Cloud-Exclusive Clustering:** Do not architect features that assume constant multi-region cloud replication for local nodes.
- **Overly Gamified/Cinematic UI:** No floating particles, arbitrary delays, or "cinematic" transitions that slow down commercial utility.
- **Generic Role Systems:** Do not revert to hardcoded `Admin` vs `User` enums. The system MUST use PBAC.
