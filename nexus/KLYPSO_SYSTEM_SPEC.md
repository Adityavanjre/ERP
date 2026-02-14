
# 🌌 Klypso Enterprise OS: System Specifications

## 1. Executive Architecture
The Klypso OS is built on a **Modular Kernel** architecture, inspired by Odoo but implemented with modern Node.js/Next.js performance standards. It follows the **SaaS Multi-Tenant Pattern** ensuring strict isolation and rapid scalability.

### Core Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion, ShadCN UI.
- **Backend**: NestJS (Modular Architecture), Prisma ORM.
- **Database**: PostgreSQL (Multi-tenant schema-ready).
- **Communication**: RESTful API + Logic Integration Layer.

---

## 2. Infrastructure Folder Structure
```text
erp/
├── backend/                # NestJS Micro-Kernel
│   ├── src/
│   │   ├── kernel/         # The Brain: App Registry, ORM, Studio, AI
│   │   ├── apps/           # Hot-Loadable App Manifests
│   │   ├── common/         # Guards, Decorators, Interceptors
│   │   ├── prisma/         # Database abstraction
│   │   └── [modules]/      # CRM, Inventory, Manufacturing, etc.
│   └── prisma/             # Schema & Migrations
├── frontend/               # Next.js Neural Interface
│   ├── src/
│   │   ├── app/            # App Router (Dashboard, Apps, Studio)
│   │   ├── components/     # Atomic UI System (ShadCN)
│   │   └── lib/            # API Clients, Utilities
└── shared/                 # Types, Constants (Future)
```

---

## 3. Database Entity Relationship (ER) Summary

### A. Kernel Logic
- **App**: Manages life-cycle of installed modules.
- **ModelDefinition**: Odoo-style metadata storage for dynamic objects.
- **FieldDefinition**: Column definitions for dynamic models.
- **Record**: Unified JSON-storage for custom business data.
- **ModelAccess**: Role-Based Access Control (RBAC) per model.

### B. Business Logic
- **Product**: Centralized master data for items/services.
- **BillOfMaterial (BOM)**: Recursive recipe tree for manufacturing.
- **WorkOrder**: Shop-floor execution units.
- **PurchaseOrder**: Procurement & supply chain tracking.
- **Tenant**: Top-level entity for SaaS isolation.

---

## 4. API Endpoints (Primary Interface)

### App Registry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kernel/apps` | List all available manifests |
| POST | `/kernel/apps/:name/install` | Activate a module |
| POST | `/kernel/apps/:name/uninstall` | Hibernate a module |

### Studio (No-Code Builder)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kernel/studio/models` | Materialize a new DB object |
| GET | `/kernel/studio/records/:model` | Fetch dynamic records |

### Manufacturing (MRP)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/manufacturing/boms/:id/explode` | Recursive explosion of BOM tree |
| POST | `/manufacturing/work-orders` | Generate production sequences |

---

## 5. Security & Isolation Strategy
1. **Tenant Isolation**: Every query is scoped via a `tenantId` discriminator. In "Enterprise" mode, this can be transitioned to Schema-per-Tenant.
2. **RBAC**: Access rights are checked against the `ModelAccess` table before any ORM mutation.
3. **Audit Trail**: Every transaction is logged via the `AuditService` with User/IP/Action metadata.

---

## 6. Development Roadmap
- **Phase 1 (Complete)**: Kernel Registry, Dynamic ORM, Basic ERP Modules.
- **Phase 2 (Active)**: Workflow Engine implementation, No-Code Automation UI.
- **Phase 3 (Future)**: AI-Driven forecasting (Neural Inventory), Stripe SaaS Billing.
- **Phase 4 (Legacy)**: White-labeling & Multi-region Docker deployment.
