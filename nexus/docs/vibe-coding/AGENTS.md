# AGENTS.md (Context & Rules)

> This document defines the strict boundaries and coding styles for any AI assistant (Cursor, Windsurf) working on this codebase.

## 1. Strict Execution Protocol
- **DO NOT** invent new UI aesthetics, add custom cursors, floating particles, magnetic hover effects, or cinematic loading sequences unless explicitly instructed.
- **DO NOT** rewrite existing components to use non-standard libraries (stick to standard Tailwind, `lucide-react`, and Radix UI primitives where available).
- **DO NOT** make assumptions. If an implementation detail is missing, query the user or leave it out. 

## 2. Coding Principles (The Klypso Standard)
- **DRY (Don't Repeat Yourself):** Always reuse existing utility hooks (e.g., `useUX`, `api.ts`) rather than rebuilding them.
- **Dynamic Data Only:** NEVER hardcode text descriptions, collections, pricing, or metadata inside UI components. Always rely on the backend API or configuration hooks.
- **LAN-Awareness:** Assume the UI could be running without an active internet connection. Do not rely heavily on massive external CDN assets or cloud-only login providers (e.g., Google OAuth must gracefully degrade on LAN).

## 3. UI/UX "Showroom" Aesthetics
- **Materials Are the Hero:** The UI should be ultra-clean, mimicking a premium architectural showroom. 
- **Restrained Motion:** Use fast, responsive micro-animations for buttons (e.g., subtle scale/bg-color changes). No long-running GSAP parallax drifts on commercial data tables.
- **Typography:** Bold, readable, high-contrast headings with plenty of whitespace. 

## 4. Desktop Constraints
- Code added to the `desktop/` directory must be compatible with a Node integration environment (Electron) and respect IPC boundaries.
- Do not attempt to use PostgreSQL syntax on the desktop's SQLite instance.
