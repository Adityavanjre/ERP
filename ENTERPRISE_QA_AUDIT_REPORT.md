# Comprehensive System Audit Report

## Phase 1 — Full System Discovery

### 1. Modules (24)
- D:\code\ERP\nexus\backend\src\accounting\accounting.module.ts
- D:\code\ERP\nexus\backend\src\accounting\ledger.module.ts
- D:\code\ERP\nexus\backend\src\analytics\analytics.module.ts
- D:\code\ERP\nexus\backend\src\app.module.ts
- D:\code\ERP\nexus\backend\src\auth\auth.module.ts
- D:\code\ERP\nexus\backend\src\common\common.module.ts
- D:\code\ERP\nexus\backend\src\construction\construction.module.ts
- D:\code\ERP\nexus\backend\src\core-domain\core-domain.module.ts
- D:\code\ERP\nexus\backend\src\crm\crm.module.ts
- D:\code\ERP\nexus\backend\src\health\health.module.ts
- D:\code\ERP\nexus\backend\src\healthcare\healthcare.module.ts
- D:\code\ERP\nexus\backend\src\hr\hr.module.ts
- D:\code\ERP\nexus\backend\src\infrastructure\infrastructure.module.ts
- D:\code\ERP\nexus\backend\src\infrastructure\queue\queue.module.ts
- D:\code\ERP\nexus\backend\src\inventory\inventory.module.ts
- D:\code\ERP\nexus\backend\src\logistics\logistics.module.ts
- D:\code\ERP\nexus\backend\src\manufacturing\manufacturing.module.ts
- D:\code\ERP\nexus\backend\src\nbfc\nbfc.module.ts
- D:\code\ERP\nexus\backend\src\prisma\prisma.module.ts
- D:\code\ERP\nexus\backend\src\projects\projects.module.ts
- D:\code\ERP\nexus\backend\src\purchases\purchases.module.ts
- D:\code\ERP\nexus\backend\src\sales\sales.module.ts
- D:\code\ERP\nexus\backend\src\system\system.module.ts
- D:\code\ERP\nexus\backend\src\users\users.module.ts

### 2. Controllers (33)
- D:\code\ERP\nexus\backend\src\accounting\accounting.controller.ts
- D:\code\ERP\nexus\backend\src\accounting\controllers\brs.controller.ts
- D:\code\ERP\nexus\backend\src\accounting\controllers\tds.controller.ts
- D:\code\ERP\nexus\backend\src\analytics\analytics.controller.ts
- D:\code\ERP\nexus\backend\src\app.controller.ts
- D:\code\ERP\nexus\backend\src\auth\auth.controller.ts
- D:\code\ERP\nexus\backend\src\construction\construction.controller.ts
- D:\code\ERP\nexus\backend\src\crm\crm.controller.ts
- D:\code\ERP\nexus\backend\src\health\health.controller.ts
- D:\code\ERP\nexus\backend\src\healthcare\healthcare.controller.ts
- D:\code\ERP\nexus\backend\src\hr\hr.controller.ts
- D:\code\ERP\nexus\backend\src\inventory\inventory.controller.ts
- D:\code\ERP\nexus\backend\src\logistics\logistics.controller.ts
- D:\code\ERP\nexus\backend\src\manufacturing\machine.controller.ts
- D:\code\ERP\nexus\backend\src\manufacturing\manufacturing.controller.ts
- D:\code\ERP\nexus\backend\src\nbfc\nbfc.controller.ts
- D:\code\ERP\nexus\backend\src\projects\projects.controller.ts
- D:\code\ERP\nexus\backend\src\purchases\purchases.controller.ts
- D:\code\ERP\nexus\backend\src\sales\sales.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\ai.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\api-key.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\b2b.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\billing.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\collaboration.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\plugin.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\registry.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\search.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\setup.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\studio.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\webhook.controller.ts
- D:\code\ERP\nexus\backend\src\system\controllers\workflow.controller.ts
- D:\code\ERP\nexus\backend\src\system\system.controller.ts
- D:\code\ERP\nexus\backend\src\users\users.controller.ts

### 3. Services (60)
- D:\code\ERP\nexus\backend\src\accounting\accounting.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\brs.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\credit-note.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\debit-note.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\eway-bill.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\fixed-asset.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\gstr1-export.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\invoice.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\ledger.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\onboarding.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\payment.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\reporting.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\tally-export.service.ts
- D:\code\ERP\nexus\backend\src\accounting\services\tds.service.ts
- D:\code\ERP\nexus\backend\src\analytics\analytics.service.ts
- D:\code\ERP\nexus\backend\src\app.service.ts
- D:\code\ERP\nexus\backend\src\auth\auth.service.ts
- D:\code\ERP\nexus\backend\src\auth\google-auth.service.ts
- D:\code\ERP\nexus\backend\src\auth\mfa-crypto.service.ts
- D:\code\ERP\nexus\backend\src\common\services\anomaly-alert.service.ts
- D:\code\ERP\nexus\backend\src\common\services\logging.service.ts
- D:\code\ERP\nexus\backend\src\common\services\security-storage.service.ts
- D:\code\ERP\nexus\backend\src\common\services\tenancy.service.ts
- D:\code\ERP\nexus\backend\src\common\services\trace.service.ts
- D:\code\ERP\nexus\backend\src\construction\construction.service.ts
- D:\code\ERP\nexus\backend\src\crm\crm.service.ts
- D:\code\ERP\nexus\backend\src\healthcare\healthcare.service.ts
- D:\code\ERP\nexus\backend\src\hr\hr.service.ts
- D:\code\ERP\nexus\backend\src\inventory\inventory.service.ts
- D:\code\ERP\nexus\backend\src\inventory\services\hsn.service.ts
- D:\code\ERP\nexus\backend\src\inventory\warehouse.service.ts
- D:\code\ERP\nexus\backend\src\logistics\logistics.service.ts
- D:\code\ERP\nexus\backend\src\manufacturing\machine.service.ts
- D:\code\ERP\nexus\backend\src\manufacturing\manufacturing.service.ts
- D:\code\ERP\nexus\backend\src\nbfc\nbfc.service.ts
- D:\code\ERP\nexus\backend\src\prisma\prisma.service.ts
- D:\code\ERP\nexus\backend\src\prisma\tenant-context.service.ts
- D:\code\ERP\nexus\backend\src\projects\projects.service.ts
- D:\code\ERP\nexus\backend\src\purchases\purchases.service.ts
- D:\code\ERP\nexus\backend\src\sales\sales.service.ts
- D:\code\ERP\nexus\backend\src\sales\services\pos.service.ts
- D:\code\ERP\nexus\backend\src\system\services\ai.service.ts
- D:\code\ERP\nexus\backend\src\system\services\api-key.service.ts
- D:\code\ERP\nexus\backend\src\system\services\audit-verification.service.ts
- D:\code\ERP\nexus\backend\src\system\services\audit.service.ts
- D:\code\ERP\nexus\backend\src\system\services\automation-worker.service.ts
- D:\code\ERP\nexus\backend\src\system\services\billing.service.ts
- D:\code\ERP\nexus\backend\src\system\services\cloudinary.service.ts
- D:\code\ERP\nexus\backend\src\system\services\cluster.service.ts
- D:\code\ERP\nexus\backend\src\system\services\collaboration.service.ts
- D:\code\ERP\nexus\backend\src\system\services\forecasting.service.ts
- D:\code\ERP\nexus\backend\src\system\services\mail.service.ts
- D:\code\ERP\nexus\backend\src\system\services\orm.service.ts
- D:\code\ERP\nexus\backend\src\system\services\registry.service.ts
- D:\code\ERP\nexus\backend\src\system\services\saas-analytics.service.ts
- D:\code\ERP\nexus\backend\src\system\services\search.service.ts
- D:\code\ERP\nexus\backend\src\system\services\system-audit.service.ts
- D:\code\ERP\nexus\backend\src\system\services\webhook-secret-rotation.service.ts
- D:\code\ERP\nexus\backend\src\system\services\workflow.service.ts
- D:\code\ERP\nexus\backend\src\users\users.service.ts

### 4. Middleware & Guards (16)
- D:\code\ERP\nexus\backend\src\common\services\trace.middleware.ts
- D:\code\ERP\nexus\backend\src\common\guards\admin.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\api-key.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\b2b.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\csrf.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\jwt-auth.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\mfa.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\mobile-whitelist.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\module.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\onboarding.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\permissions.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\plan.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\role-throttler.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\roles.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\tenant-membership.guard.ts
- D:\code\ERP\nexus\backend\src\common\guards\ws-jwt.guard.ts

### 5. Interceptors (6)
- D:\code\ERP\nexus\backend\src\common\interceptors\audit.interceptor.ts
- D:\code\ERP\nexus\backend\src\common\interceptors\cache.interceptor.ts
- D:\code\ERP\nexus\backend\src\common\interceptors\idempotency.interceptor.ts
- D:\code\ERP\nexus\backend\src\common\interceptors\tenancy.interceptor.ts
- D:\code\ERP\nexus\backend\src\common\interceptors\tenant.interceptor.ts
- D:\code\ERP\nexus\backend\src\common\interceptors\timeout.interceptor.ts

### 6. Background Workers, Schedulers & Cron Jobs (3)
- D:\code\ERP\nexus\backend\src\system\services\audit-verification.service.ts
- D:\code\ERP\nexus\backend\src\system\services\automation-worker.service.ts
- D:\code\ERP\system_audit_generator.js

### 7. Event Emitters & Queue Processors (26)
- D:\code\ERP\nexus\frontend\.next\cache\webpack\client-production\0.pack
- D:\code\ERP\nexus\frontend\.next\cache\webpack\client-production\4.pack
- D:\code\ERP\nexus\frontend\.next\cache\webpack\client-production\5.pack
- D:\code\ERP\nexus\frontend\.next\cache\webpack\edge-server-production\0.pack
- D:\code\ERP\nexus\frontend\.next\cache\webpack\server-production\0.pack
- D:\code\ERP\nexus\frontend\.next\cache\webpack\server-production\5.pack
- D:\code\ERP\nexus\frontend\.next\dev\cache\turbopack\23c46498\00000715.sst
- D:\code\ERP\nexus\frontend\.next\dev\cache\turbopack\23c46498\00000744.sst
- D:\code\ERP\nexus\frontend\.next\dev\cache\turbopack\23c46498\00000745.sst
- D:\code\ERP\nexus\frontend\.next\dev\cache\turbopack\23c46498\00000752.sst
- D:\code\ERP\nexus\frontend\.next\dev\cache\turbopack\23c46498\00000753.sst
- D:\code\ERP\nexus\frontend\.next\dev\server\chunks\ssr\nexus_f16602db._.js
- D:\code\ERP\nexus\frontend\.next\dev\server\chunks\ssr\nexus_f16602db._.js.map
- D:\code\ERP\nexus\frontend\.next\dev\static\chunks\638c1_next_dist_compiled_next-devtools_index_ac1b0320.js.map
- D:\code\ERP\nexus\frontend\.next\server\chunks\ssr\nexus_34730367._.js
- D:\code\ERP\nexus\frontend\.next\server\chunks\ssr\nexus_34730367._.js.map
- D:\code\ERP\nexus\frontend\.next\server\chunks\ssr\[root-of-the-server]__0c9f6012._.js
- D:\code\ERP\nexus\frontend\.next\server\chunks\ssr\[root-of-the-server]__0c9f6012._.js.map
- D:\code\ERP\nexus\frontend\.next\server\edge\chunks\[root-of-the-server]__2fd2234e._.js
- D:\code\ERP\nexus\frontend\.next\server\edge\chunks\[root-of-the-server]__2fd2234e._.js.map
- D:\code\ERP\nexus\frontend\.next\static\chunks\1462a3a215b6e3d2.js
- D:\code\ERP\system_audit_generator.js
- D:\code\ERP\nexus\backend\src\infrastructure\queue\bulk-import.processor.ts
- D:\code\ERP\nexus\backend\src\infrastructure\queue\webhook-dlq.processor.ts
- D:\code\ERP\nexus\backend\src\infrastructure\queue\year-close.processor.ts
- D:\code\ERP\system_audit_generator.js

### 8. Utilities (7)
- D:\code\ERP\agency\server\utils\cloudinary.js
- D:\code\ERP\agency\server\utils\generateToken.js
- D:\code\ERP\nexus\backend\src\common\utils\csv-sanitize.util.ts
- D:\code\ERP\nexus\backend\src\common\utils\file-magic.util.ts
- D:\code\ERP\nexus\backend\src\common\utils\gst-validation.util.ts
- D:\code\ERP\nexus\backend\src\common\utils\ssrf.util.ts
- D:\code\ERP\nexus\backend\src\common\utils\tally-state-mapper.util.ts
*(Truncated if too long)*

### 9. Environment Variables Referenced
- process.env.MONGO_URI
- process.env.ADMIN_PASSWORD
- process.env.EMAIL_USER
- process.env.EMAIL_PASS
- process.env.FRONTEND_URL
- process.env.INITIAL_ADMIN_EMAIL
- process.env.INITIAL_ADMIN_PASSWORD
- process.env.PORT
- process.env.JWT_SECRET
- process.env.NODE_ENV
- process.env.CLOUDINARY_CLOUD_NAME
- process.env.CLOUDINARY_API_KEY
- process.env.CLOUDINARY_API_SECRET
- process.env.AUDIT_HMAC_SECRET
- process.env.DATABASE_URL
- process.env.ADMIN_EMAIL
- process.env.MOBILE_WRITE_ENABLED
- process.env.SENTRY_DSN
- process.env.CLOUDINARY_URL
- process.env.OTEL_EXPORTER_OTLP_ENDPOINT
- process.env.APP_VERSION
- process.env.NEXUS_FRONTEND_URL
- process.env.KLYPSO_FRONTEND_URL
- process.env.CORS_ORIGIN
- process.env.RAM_TIER
- process.env.__NEXT_CACHE_COMPONENTS
- process.env.__NEXT_LINK_NO_TOUCH_START
- process.env.__NEXT_HAS_REWRITES
- process.env.__NEXT_I18N_SUPPORT
- process.env.__NEXT_I18N_DOMAINS
- process.env.__NEXT_IMAGE_OPTS
- process.env.__NEXT_TEST_MODE
- process.env.TURBOPACK
- process.env.__NEXT_STRICT_MODE
- process.env.NEXT_DEPLOYMENT_ID
- process.env.__NEXT_EXPERIMENTAL_STATIC_SHELL_DEBUGGING
- process.env.__NEXT_REACT_DEBUG_CHANNEL
- process.env.__NEXT_STRICT_MODE_APP
- process.env.__NEXT_TRANSITION_INDICATOR
- process.env.__NEXT_APP_NAV_FAIL_HANDLING
- process.env.__NEXT_CONFIG_OUTPUT
- process.env.__NEXT_ROUTER_BASEPATH
- process.env.__NEXT_MANUAL_CLIENT_BASE_PATH
- process.env.__NEXT_DYNAMIC_ON_HOVER
- process.env.__NEXT_MIDDLEWARE_MATCHERS
- process.env.__NEXT_PPR
- process.env.__NEXT_CLIENT_VALIDATE_RSC_REQUEST_HEADERS
- process.env.__NEXT_CLIENT_ROUTER_DYNAMIC_STALETIME
- process.env.__NEXT_CLIENT_ROUTER_STATIC_STALETIME
- process.env.__NEXT_MANUAL_TRAILING_SLASH
- process.env.__NEXT_TRAILING_SLASH
- process.env.__NEXT_CROSS_ORIGIN
- process.env.__NEXT_EXTERNAL_MIDDLEWARE_REWRITE_RESOLVE
- process.env.__NEXT_SCROLL_RESTORATION
- process.env.__NEXT_CLIENT_ROUTER_FILTER_ENABLED
- process.env.__NEXT_CLIENT_ROUTER_S_FILTER
- process.env.__NEXT_CLIENT_ROUTER_D_FILTER
- process.env.__NEXT_MIDDLEWARE_PREFETCH
- process.env.__NEXT_OPTIMISTIC_CLIENT_CACHE
- process.env.NEXT_PUBLIC_API_URL
- process.env.NEXT_RUNTIME
- process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS
- process.env.__NEXT_BUILD_ID
- process.env.__NEXT_RELATIVE_DIST_DIR
- process.env.__NEXT_RELATIVE_PROJECT_DIR
- process.env.__NEXT_MULTI_ZONE_DRAFT_MODE
- process.env.MINIMAL_MODE
- process.env.NEXT_OTEL_FETCH_DISABLED
- process.env.NEXT_OTEL_PERFORMANCE_PREFIX
- process.env.NEXT_OTEL_VERBOSE
- process.env.__NEXT_EXPERIMENTAL_REACT
- process.env.NEXT_PRIVATE_TEST_PROXY
- process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZE
- process.env.__NEXT_FETCH_CACHE_KEY_PREFIX
- process.env.NEXT_PHASE
- process.env.__NEXT_PREVIEW_MODE_ID
- process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY
- process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY
- process.env.NEXT_PRIVATE_RESPONSE_CACHE_TTL
- process.env.NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE
- process.env.NEXT_PRIVATE_DEBUG_CACHE
- process.env.NEXT_DEBUG_BUILD
- process.env.__NEXT_VERBOSE_LOGGING
- process.env.__NEXT_TEST_MAX_ISR_CACHE
- process.env.NEXT_SSG_FETCH_METRICS
- process.env.__NEXT_CASE_SENSITIVE_ROUTES
- process.env.__NEXT_BASE_PATH
- process.env.__NEXT_REWRITES
- process.env.__NEXT_I18N_CONFIG
- process.env.JEST_WORKER_ID
- process.env.FIGMA_PERSONAL_ACCESS_TOKEN
- process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
- process.env.VERCEL_ENV
- process.env.VERCEL
- process.env.VERCEL_PROJECT_PRODUCTION_URL
- process.env.VERCEL_BRANCH_URL
- process.env.VERCEL_URL
- process.env.__NEXT_EXPERIMENTAL_HTTPS
- process.env.__NEXT_PRIVATE_MINIMIZE_MACRO_FALSE
- process.env.DEBUG
- process.env.DEBUG_FD
- process.env.NEXT_RSPACKK
- process.env.NODE_ENVV
- process.env.NODE_ENVf
- process.env.NODE_ENVW
- process.env.__NEXT_APP_NAV_FAIL_HANDLINGS
- process.env.__NEXT_BROWSER_DEBUG_INFO_IN_TERMINAL
- process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZEC
- process.env.__
- process.env.NODE_ENVD
- process.env.8
- process.env.9
- process.env.__NEXT_APP_NAV_FAIL_HANDLING4
- process.env.__P
- process.env.__NEXT_TELEMETRY_DISABLED
- process.env.__NEXT
- process.env._
- process.env.__NEXT_DEV_INDICATOR
- process.env.NEXT_RUNTIMEX
- process.env.u
- process.env.NODE_ENV5
- process.env.NODE_ENVO
- process.env.J
- process.env.o
- process.env.NEXT_OTEL_PERFORMANCE_PREFIX4
- process.env.NODE_ENVY
- process.env.NODE_ENVE
- process.env.P
- process.env.VERCEL_ENVH
- process.env.NODE_ENVbN
- process.env.NODE_ENVg
- process.env.__NEXT_CLIENT_ROUTER_B
- process.env.B
- process.env.NEXT_DEPLOYMENT_IDa5
- process.env.__NEXT_VERSION
- process.env.__H
- process.env.NODE_ENVU
- process.env.NODE_ENV6K
- process.env.__NEXT_EXPERIMENTAL_X
- process.env.g
- process.env.t
- process.env.NODE_ENV3
- process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTSW
- process.env.NEXT_RUNTIMEv
- process.env.NODE_ENVO6
- process.env.NEXT_RUNTIMEc
- process.env.__q
- process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTSB
- process.env.__NEXT_CLIENT_ROUTER_
- process.env.NEXT_PUBLIC_API
- process.env.NODE_ENVN7
- process.env.__G_
- process.env.NODE_ENV_
- process.env.NEXT_RUNTIMEj5Jedge
- process.env.NODE_ENVK
- process.env.NODE_ENVP6
- process.env.NEXT_RUNTIMEs
- process.env.__NEXT_APP_NAV_FAIL_HANDLING3
- process.env.NODE_ENVq
- process.env.__G
- process.env.__e
- process.env.I
- process.env.__NEXT_ROUTER_BASEPATHB
- process.env.__NEXT_EXPERIMENTAL_Y
- process.env.NODE_ENVn
- process.env.NODE_ENVU3
- process.env.NODE_ENV49QproduN
- process.env.x
- process.env.C
- process.env.NODE_ENV1
- process.env.b9
- process.env.NODE_ENVT
- process.env.NEXT_DEPLOYMENT_IDY
- process.env.NEXT_RUNTIMEd
- process.env.NODE_ENVL
- process.env.e
- process.env.Kx
- process.env.__NEXT_APP_NAV_FAIL_HANDLINGa
- process.env.NEXT_RUNTIMEh
- process.env.NEXT_RSPACK
- process.env.NODE_ENVP
- process.env.NODE_ENVwO
- process.env.y
- process.env.Gv
- process.env.q
- process.env.h
- process.env.NODE_ENVo
- process.env.NODE_ENV4C
- process.env.NEXT_RUNTIMEaTr
- process.env.NEXT_RUNTIMEU3
- process.env.NODE_ENVR
- process.env.__NEXT_NO_MIDDLEWARE_URL_NORMALIZEH
- process.env.NODE_ENVzC
- process.env.NODE_ENVUTa
- process.env.NEXT_RUNTIMEx
- process.env.__v
- process.env.U
- process.env.__NEXT_ROUTER_BASEPATHC
- process.env.NODE_ENVV3
- process.env.i
- process.env.f
- process.env.__NEXT_MCP_SERVER
- process.env.__NEXT_DEV_INDICATOR_POSITION
- process.env.__NEXT_BUNDLER
- process.env.__NEXT_BUNDLER_HAS_PERSISTENT_CACHE
- process.env.__NEXT_DIST_DIR
- process.env.KLYPSO_BACKEND_URL
- process.env.EXPO_PUBLIC_API_URL

---

## Phase 2 — Complete API Endpoint Inventory
*Total Endpoints Discovered: 230*

| File | Method | Path | Handler | Auth Guard | Role Check |
|---|---|---|---|---|---|
| accounting.controller.ts | **GET** | `/accounting/health-score` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/leaderboard` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/recovery-memory` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/accounts` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/accounts` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/journals` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/invoices` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/invoices/bulk` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/invoices` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/invoices/:id` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/payments` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/ledger/:customerId` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/credit-notes` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/credit-notes` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/debit-notes` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/debit-notes` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/customers/:id/opening-balance` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/suppliers/:id/opening-balance` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/suppliers/:id/ledger` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/transactions` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/transactions/export-csv` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/stats` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/export/tally` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/export/validate` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/export/masters` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/auditor/dashboard` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/setup/coa` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/import/trial-balance` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/invoices/:id/cancel` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/reports/trial-balance` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/reports/profit-loss` | Get | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/fixed-assets` | Get | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/import/fixed-assets` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/fixed-assets` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/fixed-assets/:id/depreciate` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/lock-period` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/unlock-period` | Post | None Detected | Role Checked |
| accounting.controller.ts | **POST** | `/accounting/close-year` | Post | None Detected | Role Checked |
| accounting.controller.ts | **GET** | `/accounting/export/gstr1` | Get | None Detected | Role Checked |
| brs.controller.ts | **POST** | `/accounting/brs/upload/:accountId` | Post | None Detected | Role Checked |
| brs.controller.ts | **POST** | `/accounting/brs/auto-match/:statementId` | Post | None Detected | Role Checked |
| brs.controller.ts | **POST** | `/accounting/brs/manual-match` | Post | None Detected | Role Checked |
| brs.controller.ts | **GET** | `/accounting/brs/report/:accountId` | Get | None Detected | Role Checked |
| brs.controller.ts | **GET** | `/accounting/brs/statement/:statementId` | Get | None Detected | Role Checked |
| tds.controller.ts | **GET** | `/accounting/tds/report/vendor-wise` | Get | None Detected | Role Checked |
| tds.controller.ts | **GET** | `/accounting/tds/report/section-wise` | Get | None Detected | Role Checked |
| tds.controller.ts | **GET** | `/accounting/tds/summary/payable` | Get | None Detected | Role Checked |
| analytics.controller.ts | **GET** | `/analytics/summary` | Get | None Detected | Role Checked |
| analytics.controller.ts | **GET** | `/analytics/performance` | Get | None Detected | Role Checked |
| analytics.controller.ts | **GET** | `/analytics/health` | Get | None Detected | Role Checked |
| analytics.controller.ts | **GET** | `/analytics/activity` | Get | None Detected | Role Checked |
| analytics.controller.ts | **GET** | `/analytics/value-chain` | Get | None Detected | Role Checked |
| auth.controller.ts | **POST** | `/auth/login/web` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/login/mobile` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/login/admin` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/google-login/web` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/google-login/mobile` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/select-tenant` | Post | None Detected | None Detected |
| auth.controller.ts | **GET** | `/auth/tenants` | Get | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/onboarding` | Post | Requires Guard | Role Checked |
| auth.controller.ts | **POST** | `/auth/security-logs` | Post | Requires Guard | Role Checked |
| auth.controller.ts | **POST** | `/auth/client-telemetry` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/push-token` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/register` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/create-workspace` | Post | Requires Guard | None Detected |
| auth.controller.ts | **GET** | `/auth/profile` | Get | Requires Guard | None Detected |
| auth.controller.ts | **GET** | `/auth/me` | Get | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/forgot-password` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/reset-password` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/mfa/setup` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/mfa/verify-setup` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/mfa/verify-login` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/logout` | Post | Requires Guard | None Detected |
| auth.controller.ts | **POST** | `/auth/logout-all` | Post | None Detected | None Detected |
| auth.controller.ts | **POST** | `/auth/refresh` | Post | None Detected | None Detected |
| construction.controller.ts | **POST** | `/construction/boq` | Post | None Detected | Role Checked |
| construction.controller.ts | **PATCH** | `/construction/boq/:id/status` | Patch | None Detected | Role Checked |
| construction.controller.ts | **PATCH** | `/construction/boq/items/:id/actuals` | Patch | None Detected | Role Checked |
| construction.controller.ts | **POST** | `/construction/site-stock` | Post | None Detected | Role Checked |
| construction.controller.ts | **POST** | `/construction/ra-billing` | Post | None Detected | Role Checked |
| crm.controller.ts | **POST** | `/crm/customers` | Post | None Detected | Role Checked |
| crm.controller.ts | **POST** | `/crm/import` | Post | None Detected | Role Checked |
| crm.controller.ts | **GET** | `/crm/customers` | Get | None Detected | Role Checked |
| crm.controller.ts | **GET** | `/crm/stats` | Get | None Detected | Role Checked |
| crm.controller.ts | **POST** | `/crm/opportunities` | Post | None Detected | Role Checked |
| crm.controller.ts | **GET** | `/crm/opportunities` | Get | None Detected | Role Checked |
| crm.controller.ts | **DELETE** | `/crm/customers/:id` | Delete | None Detected | Role Checked |
| crm.controller.ts | **GET** | `/crm/export-csv` | Get | None Detected | Role Checked |
| crm.controller.ts | **POST** | `/crm/opportunities/:id` | Post | None Detected | Role Checked |
| crm.controller.ts | **PATCH** | `/crm/customers/:id` | Patch | None Detected | Role Checked |
| crm.controller.ts | **POST** | `/crm/customers/:id/opening-balance` | Post | None Detected | Role Checked |
| crm.controller.ts | **GET** | `/crm/customers/:id/opening-balances` | Get | None Detected | Role Checked |
| health.controller.ts | **GET** | `/health/readiness` | Get | None Detected | Role Checked |
| health.controller.ts | **GET** | `/health/liveness` | Get | None Detected | Role Checked |
| health.controller.ts | **GET** | `/health/pulse` | Get | None Detected | Role Checked |
| health.controller.ts | **GET** | `/health/forecast` | Get | None Detected | Role Checked |
| health.controller.ts | **GET** | `/health/infra` | Get | None Detected | Role Checked |
| healthcare.controller.ts | **POST** | `/healthcare/patients` | Post | None Detected | Role Checked |
| healthcare.controller.ts | **GET** | `/healthcare/patients` | Get | None Detected | Role Checked |
| healthcare.controller.ts | **GET** | `/healthcare/patients/:id/history` | Get | None Detected | Role Checked |
| healthcare.controller.ts | **POST** | `/healthcare/medical-records` | Post | None Detected | Role Checked |
| healthcare.controller.ts | **POST** | `/healthcare/appointments` | Post | None Detected | Role Checked |
| healthcare.controller.ts | **PATCH** | `/healthcare/appointments/:id/status` | Patch | None Detected | Role Checked |
| healthcare.controller.ts | **GET** | `/healthcare/pharmacy/expiry-alerts` | Get | None Detected | Role Checked |
| healthcare.controller.ts | **POST** | `/healthcare/pharmacy/batches` | Post | None Detected | Role Checked |
| hr.controller.ts | **POST** | `/hr/departments` | Post | None Detected | Role Checked |
| hr.controller.ts | **GET** | `/hr/departments` | Get | None Detected | Role Checked |
| hr.controller.ts | **POST** | `/hr/employees` | Post | None Detected | Role Checked |
| hr.controller.ts | **GET** | `/hr/employees` | Get | None Detected | Role Checked |
| hr.controller.ts | **POST** | `/hr/import` | Post | None Detected | Role Checked |
| hr.controller.ts | **POST** | `/hr/leaves` | Post | None Detected | Role Checked |
| hr.controller.ts | **GET** | `/hr/leaves` | Get | None Detected | Role Checked |
| hr.controller.ts | **PATCH** | `/hr/leaves/:id/status` | Patch | None Detected | Role Checked |
| hr.controller.ts | **POST** | `/hr/payroll` | Post | None Detected | Role Checked |
| hr.controller.ts | **GET** | `/hr/payroll` | Get | None Detected | Role Checked |
| hr.controller.ts | **GET** | `/hr/stats` | Get | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/warehouses` | Get | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/warehouses` | Post | None Detected | Role Checked |
| inventory.controller.ts | **PATCH** | `/inventory/warehouses/:id` | Patch | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/movements` | Post | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/products/:id/opening-balance` | Post | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/transfers` | Post | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/products` | Post | None Detected | Role Checked |
| inventory.controller.ts | **POST** | `/inventory/import` | Post | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/products` | Get | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/products/find-by-code` | Get | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/products/:id` | Get | None Detected | Role Checked |
| inventory.controller.ts | **PATCH** | `/inventory/products/:id` | Patch | None Detected | Role Checked |
| inventory.controller.ts | **DELETE** | `/inventory/products/:id` | Delete | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/stats` | Get | None Detected | Role Checked |
| inventory.controller.ts | **GET** | `/inventory/markdown-suggestions` | Get | None Detected | Role Checked |
| logistics.controller.ts | **POST** | `/logistics/vehicles` | Post | None Detected | Role Checked |
| logistics.controller.ts | **GET** | `/logistics/vehicles` | Get | None Detected | Role Checked |
| logistics.controller.ts | **POST** | `/logistics/fuel-logs` | Post | None Detected | Role Checked |
| logistics.controller.ts | **POST** | `/logistics/routes` | Post | None Detected | Role Checked |
| logistics.controller.ts | **PATCH** | `/logistics/routes/:id/status` | Patch | None Detected | Role Checked |
| logistics.controller.ts | **PATCH** | `/logistics/maintenance/:id/complete` | Patch | None Detected | Role Checked |
| logistics.controller.ts | **POST** | `/logistics/maintenance` | Post | None Detected | Role Checked |
| machine.controller.ts | **PATCH** | `/manufacturing/machines/:id/status` | Patch | None Detected | Role Checked |
| machine.controller.ts | **DELETE** | `/manufacturing/machines/:id` | Delete | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/boms/:id/yield-analysis` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/boms` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/boms` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/import/boms` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/boms/:id` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/boms/:id/explode` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/boms/:id/cost` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/work-orders` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/work-orders` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **PATCH** | `/manufacturing/work-orders/:id/status` | Patch | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/work-orders/:id/approve` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/work-orders/:id/reject` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/work-orders/:id/shortages` | Get | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/work-orders/:id/complete` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **POST** | `/manufacturing/machines` | Post | None Detected | Role Checked |
| manufacturing.controller.ts | **GET** | `/manufacturing/machines` | Get | None Detected | Role Checked |
| nbfc.controller.ts | **POST** | `/nbfc/loans` | Post | None Detected | Role Checked |
| nbfc.controller.ts | **PATCH** | `/nbfc/loans/:id/approve` | Patch | None Detected | Role Checked |
| nbfc.controller.ts | **POST** | `/nbfc/loans/:id/disburse` | Post | None Detected | Role Checked |
| nbfc.controller.ts | **PATCH** | `/nbfc/kyc/:loanId/status` | Patch | None Detected | Role Checked |
| nbfc.controller.ts | **POST** | `/nbfc/kyc/:loanId` | Post | None Detected | Role Checked |
| nbfc.controller.ts | **POST** | `/nbfc/loans/:id/recalculate` | Post | None Detected | Role Checked |
| nbfc.controller.ts | **POST** | `/nbfc/interest-accrual` | Post | None Detected | Role Checked |
| projects.controller.ts | **GET** | `/projects/stats` | Get | None Detected | Role Checked |
| projects.controller.ts | **GET** | `/projects/:id` | Get | None Detected | Role Checked |
| projects.controller.ts | **PATCH** | `/projects/:id` | Patch | None Detected | Role Checked |
| projects.controller.ts | **POST** | `/projects/:id/tasks` | Post | None Detected | Role Checked |
| projects.controller.ts | **GET** | `/projects/tasks/all` | Get | None Detected | Role Checked |
| projects.controller.ts | **PATCH** | `/projects/tasks/:taskId/status` | Patch | None Detected | Role Checked |
| projects.controller.ts | **DELETE** | `/projects/:id` | Delete | None Detected | Role Checked |
| purchases.controller.ts | **POST** | `/purchases/suppliers` | Post | None Detected | Role Checked |
| purchases.controller.ts | **GET** | `/purchases/suppliers` | Get | None Detected | Role Checked |
| purchases.controller.ts | **PATCH** | `/purchases/suppliers/:id` | Patch | None Detected | Role Checked |
| purchases.controller.ts | **POST** | `/purchases/import` | Post | None Detected | Role Checked |
| purchases.controller.ts | **POST** | `/purchases/orders` | Post | None Detected | Role Checked |
| purchases.controller.ts | **GET** | `/purchases/orders` | Get | None Detected | Role Checked |
| purchases.controller.ts | **PATCH** | `/purchases/orders/:id/status` | Patch | None Detected | Role Checked |
| purchases.controller.ts | **GET** | `/purchases/stats` | Get | None Detected | Role Checked |
| purchases.controller.ts | **POST** | `/purchases/suppliers/opening-balance` | Post | None Detected | Role Checked |
| purchases.controller.ts | **GET** | `/purchases/suppliers/:id/opening-balances` | Get | None Detected | Role Checked |
| sales.controller.ts | **POST** | `/sales/pos/checkout` | Post | None Detected | Role Checked |
| sales.controller.ts | **POST** | `/sales/orders` | Post | None Detected | Role Checked |
| sales.controller.ts | **GET** | `/sales/orders` | Get | None Detected | Role Checked |
| sales.controller.ts | **GET** | `/sales/orders/:id` | Get | None Detected | Role Checked |
| sales.controller.ts | **PATCH** | `/sales/orders/:id/status` | Patch | None Detected | Role Checked |
| sales.controller.ts | **POST** | `/sales/orders/:id/approve` | Post | None Detected | Role Checked |
| sales.controller.ts | **POST** | `/sales/orders/:id/reject` | Post | None Detected | Role Checked |
| sales.controller.ts | **GET** | `/sales/stats` | Get | None Detected | Role Checked |
| ai.controller.ts | **GET** | `/system/ai/analyze/:modelName` | Get | None Detected | Role Checked |
| ai.controller.ts | **GET** | `/system/ai/inventory-forecast` | Get | None Detected | Role Checked |
| api-key.controller.ts | **GET** | `/system/api/keys` | Get | None Detected | Role Checked |
| api-key.controller.ts | **POST** | `/system/api/keys` | Post | None Detected | Role Checked |
| api-key.controller.ts | **DELETE** | `/system/api/keys/:id` | Delete | None Detected | Role Checked |
| b2b.controller.ts | **GET** | `/b2b/invoices` | Get | None Detected | Role Checked |
| b2b.controller.ts | **GET** | `/b2b/purchase-orders` | Get | None Detected | Role Checked |
| b2b.controller.ts | **GET** | `/b2b/dashboard` | Get | None Detected | Role Checked |
| billing.controller.ts | **GET** | `/system/billing/status` | Get | None Detected | Role Checked |
| billing.controller.ts | **GET** | `/system/billing/history` | Get | None Detected | Role Checked |
| billing.controller.ts | **POST** | `/system/billing/upgrade` | Post | Requires Guard | Role Checked |
| billing.controller.ts | **POST** | `/system/billing/admin/:tenantId/suspend` | Post | Requires Guard | Role Checked |
| billing.controller.ts | **POST** | `/system/billing/admin/:tenantId/reactivate` | Post | Requires Guard | Role Checked |
| billing.controller.ts | **POST** | `/system/billing/admin/:tenantId/grace-period` | Post | Requires Guard | Role Checked |
| billing.controller.ts | **POST** | `/system/billing/admin/:tenantId/read-only` | Post | Requires Guard | Role Checked |
| collaboration.controller.ts | **POST** | `/collaboration/upload` | Post | None Detected | Role Checked |
| collaboration.controller.ts | **GET** | `/collaboration/comments/:type/:id` | Get | None Detected | Role Checked |
| collaboration.controller.ts | **POST** | `/collaboration/comments` | Post | None Detected | Role Checked |
| collaboration.controller.ts | **DELETE** | `/collaboration/comments/:id` | Delete | None Detected | Role Checked |
| plugin.controller.ts | **PATCH** | `/system/plugins/:id/toggle` | Patch | None Detected | None Detected |
| plugin.controller.ts | **GET** | `/system/plugins/active` | Get | None Detected | None Detected |
| registry.controller.ts | **GET** | `/installed` | Get | None Detected | Role Checked |
| registry.controller.ts | **POST** | `/:name/install` | Post | None Detected | Role Checked |
| registry.controller.ts | **POST** | `/:name/uninstall` | Post | None Detected | Role Checked |
| registry.controller.ts | **POST** | `/preset` | Post | None Detected | Role Checked |
| studio.controller.ts | **POST** | `/system/studio/models` | Post | None Detected | None Detected |
| studio.controller.ts | **GET** | `/system/studio/records/:modelName` | Get | None Detected | Role Checked |
| studio.controller.ts | **POST** | `/system/studio/records/:modelName` | Post | None Detected | Role Checked |
| studio.controller.ts | **GET** | `/system/studio/records/:modelName/:id` | Get | None Detected | Role Checked |
| studio.controller.ts | **POST** | `/system/studio/records/:modelName/:id` | Post | None Detected | Role Checked |
| webhook.controller.ts | **POST** | `/system/webhooks/razorpay` | Post | None Detected | None Detected |
| workflow.controller.ts | **GET** | `/system/workflows/:modelName` | Get | None Detected | Role Checked |
| workflow.controller.ts | **POST** | `/system/workflows/:id/nodes` | Post | None Detected | Role Checked |
| workflow.controller.ts | **POST** | `/system/workflows/:id/transitions` | Post | None Detected | Role Checked |
| system.controller.ts | **GET** | `/system/stats` | Get | None Detected | Role Checked |
| system.controller.ts | **GET** | `/system/config` | Get | None Detected | Role Checked |
| system.controller.ts | **GET** | `/system/audit` | Get | None Detected | Role Checked |
| system.controller.ts | **GET** | `/system/audit/logs` | Get | None Detected | Role Checked |
| system.controller.ts | **GET** | `/system/founder-dashboard` | Get | None Detected | Role Checked |
| users.controller.ts | **PATCH** | `/users/:id/role` | Patch | None Detected | Role Checked |
| users.controller.ts | **POST** | `/users/:id/reset-password` | Post | None Detected | Role Checked |
| users.controller.ts | **DELETE** | `/users/:id` | Delete | None Detected | Role Checked |

---

## Phase 3 — API Execution Verification (Simulated)
*Warning: Static analysis cannot actively execute endpoints. This represents the verification requirement checklist for QA context.*

- **Action Required**: Provide manual or automated E2E tests for the endpoints listed above.
- Verify status codes (2xx, 4xx, 5xx).
- Verify Rate Limiting, CSRF enforcement, error structure.

---

## Phase 4 — Mutation Operation Inventory
*Total Database Writes Discovered: 576*

| File | Operation |
|---|---|
| index.ts | .create |
| debug-mfg.ts | .updateMany |
| debug-mfg.ts | .update |
| debug-mfg.ts | .update |
| debug-mfg.ts | .create |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .deleteMany |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .createMany |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| seed-manufacturing.ts | .create |
| verify-audit-chain.ts | .update |
| audit-financials-deep.ts | .create |
| audit-financials-deep.ts | .create |
| audit-financials-deep.ts | .create |
| audit-financials-deep.ts | .update |
| audit-financials-deep.ts | .create |
| audit-financials-deep.ts | .create |
| create-admin.ts | .upsert |
| create-admin.ts | .upsert |
| create-admin.ts | .upsert |
| create-test-user.ts | .upsert |
| create-test-user.ts | .upsert |
| direct-stress.ts | .create |
| direct-stress.ts | .create |
| direct-stress.ts | .create |
| direct-stress.ts | .create |
| direct-stress.ts | .updateMany |
| direct-stress.ts | .create |
| execute-golden-path.ts | .create |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .create |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .create |
| execute-golden-path.ts | .create |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .create |
| execute-golden-path.ts | .update |
| execute-golden-path.ts | .update |
| import-tenant.ts | .create |
| master-seeder.ts | .create |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .upsert |
| master-seeder.ts | .upsert |
| master-seeder.ts | .upsert |
| master-seeder.ts | .create |
| master-seeder.ts | .upsert |
| master-seeder.ts | .upsert |
| master-seeder.ts | .upsert |
| master-seeder.ts | .upsert |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .deleteMany |
| master-seeder.ts | .create |
| master-seeder.ts | .create |
| master-seeder.ts | .create |
| master-seeder.ts | .create |
| master-seeder.ts | .update |
| master-seeder.ts | .update |
| master-seeder.ts | .create |
| master-seeder.ts | .create |
| master-seeder.ts | .create |
| reset-chiffons.ts | .upsert |
| reset-chiffons.ts | .upsert |
| reset-chiffons.ts | .upsert |
| setup-b2b.ts | .create |
| setup-b2b.ts | .create |
| setup-b2b.ts | .create |
| setup-b2b.ts | .create |
| setup-manager.ts | .create |
| setup-manager.ts | .create |
| setup-manager.ts | .update |
| stress-audit.script.ts | .create |
| stress-audit.script.ts | .create |
| stress-audit.script.ts | .create |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .deleteMany |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .update |
| super-seeder.ts | .update |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| super-seeder.ts | .create |
| test-reset-flow.ts | .upsert |
| test-reset-flow.ts | .update |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .deleteMany |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| ultimate-seeder.ts | .create |
| verify-audit-chain.ts | .update |
| verify-crm.ts | .create |
| verify-financials.ts | .create |
| verify-financials.ts | .create |
| verify-financials.ts | .create |
| verify-financials.ts | .create |
| verify-manufacturing.ts | .create |
| verify-manufacturing.ts | .create |
| verify-manufacturing.ts | .create |
| verify-manufacturing.ts | .create |
| verify-manufacturing.ts | .create |
| verify-manufacturing.ts | .create |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .deleteMany |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .update |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1-audit.ts | .create |
| verify-phase1.ts | .create |
| verify-phase1.ts | .create |
| verify-phase1.ts | .create |
| verify-phase1.ts | .create |
| verify-phase1.ts | .deleteMany |
| verify-phase1.ts | .deleteMany |
| verify-phase1.ts | .deleteMany |
| verify-phase1.ts | .deleteMany |
| verify-phase1.ts | .delete |
| verify-procurement.ts | .create |
| verify-procurement.ts | .create |
| verify-procurement.ts | .create |
| verify-search-draft.ts | .create |
| verify-search-draft.ts | .create |
| verify-search.ts | .create |
| verify-search.ts | .create |
| verify-subscription.ts | .update |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .deleteMany |
| verify-tally.ts | .create |
| verify-tally.ts | .create |
| verify-tally.ts | .create |
| verify-tally.ts | .create |
| verify-tally.ts | .create |
| verify-vertical-hardening.ts | .create |
| verify-vertical-hardening.ts | .create |
| verify-vertical-hardening.ts | .update |
| verify-vertical-hardening.ts | .update |
| verify-vertical-hardening.ts | .deleteMany |
| verify-vertical-hardening.ts | .delete |
| verify-vertical-hardening.ts | .delete |
| verify_warehouse_purchasing.ts | .create |
| accounting.service.ts | .create |
| accounting.service.ts | .create |
| accounting.service.ts | .updateMany |
| accounting.service.ts | .create |
| accounting.service.ts | .create |
| accounting.service.ts | .upsert |
| accounting.service.ts | .delete |
| accounting.service.ts | .update |
| accounting.service.ts | .delete |
| brs.service.ts | .create |
| brs.service.ts | .createMany |
| brs.service.ts | .updateMany |
| brs.service.ts | .create |
| brs.service.ts | .update |
| brs.service.ts | .delete |
| brs.service.ts | .update |
| credit-note.service.ts | .create |
| credit-note.service.ts | .update |
| credit-note.service.ts | .update |
| credit-note.service.ts | .upsert |
| credit-note.service.ts | .create |
| credit-note.service.ts | .create |
| debit-note.service.ts | .create |
| debit-note.service.ts | .update |
| debit-note.service.ts | .update |
| debit-note.service.ts | .upsert |
| debit-note.service.ts | .create |
| debit-note.service.ts | .create |
| fixed-asset.service.ts | .create |
| fixed-asset.service.ts | .update |
| fixed-asset.service.ts | .create |
| fixed-asset.service.ts | .update |
| fixed-asset.service.ts | .update |
| fixed-asset.service.ts | .create |
| invoice.service.ts | .create |
| invoice.service.ts | .create |
| invoice.service.ts | .create |
| invoice.service.ts | .update |
| invoice.service.ts | .updateMany |
| invoice.service.ts | .update |
| invoice.service.ts | .create |
| invoice.service.ts | .create |
| invoice.service.ts | .update |
| invoice.service.ts | .update |
| invoice.service.ts | .updateMany |
| invoice.service.ts | .create |
| ledger.service.ts | .create |
| ledger.service.ts | .createMany |
| ledger.service.ts | .create |
| ledger.service.ts | .createMany |
| ledger.service.ts | .updateMany |
| onboarding.service.ts | .create |
| payment.service.ts | .updateMany |
| payment.service.ts | .create |
| payment.service.ts | .create |
| payment.service.ts | .create |
| payment.service.ts | .update |
| payment.service.ts | .update |
| payment.service.ts | .updateMany |
| payment.service.ts | .updateMany |
| payment.service.ts | .create |
| payment.service.ts | .create |
| tally-export.service.ts | .upsert |
| tally-export.service.ts | .delete |
| tally-export.service.ts | .update |
| tally-export.service.ts | .delete |
| tds.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .create |
| auth.service.ts | .update |
| auth.service.ts | .create |
| auth.service.ts | .update |
| auth.service.ts | .create |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| auth.service.ts | .update |
| mfa-crypto.service.ts | .update |
| mfa-crypto.service.ts | .update |
| audit.interceptor.ts | .create |
| idempotency.interceptor.ts | .upsert |
| idempotency.interceptor.ts | .update |
| idempotency.interceptor.ts | .delete |
| anomaly-alert.service.ts | .create |
| anomaly-alert.service.ts | .create |
| logging.service.ts | .update |
| logging.service.ts | .create |
| security-storage.service.ts | .upsert |
| security-storage.service.ts | .deleteMany |
| construction.service.ts | .create |
| construction.service.ts | .update |
| construction.service.ts | .update |
| construction.service.ts | .update |
| construction.service.ts | .upsert |
| construction.service.ts | .createMany |
| crm.service.ts | .create |
| crm.service.ts | .create |
| crm.service.ts | .update |
| crm.service.ts | .create |
| crm.service.ts | .create |
| crm.service.ts | .updateMany |
| crm.service.ts | .update |
| crm.service.ts | .create |
| crm.service.ts | .update |
| crm.service.ts | .create |
| healthcare.service.ts | .create |
| healthcare.service.ts | .create |
| healthcare.service.ts | .create |
| healthcare.service.ts | .create |
| healthcare.service.ts | .update |
| healthcare.service.ts | .create |
| hr.service.ts | .create |
| hr.service.ts | .create |
| hr.service.ts | .create |
| hr.service.ts | .updateMany |
| hr.service.ts | .create |
| hr.service.ts | .update |
| hr.service.ts | .create |
| bulk-import.processor.ts | .upsert |
| bulk-import.processor.ts | .update |
| bulk-import.processor.ts | .update |
| webhook-dlq.processor.ts | .create |
| webhook-dlq.processor.ts | .create |
| year-close.processor.ts | .create |
| year-close.processor.ts | .create |
| inventory.service.ts | .create |
| inventory.service.ts | .create |
| inventory.service.ts | .upsert |
| inventory.service.ts | .update |
| inventory.service.ts | .update |
| inventory.service.ts | .updateMany |
| inventory.service.ts | .updateMany |
| inventory.service.ts | .create |
| inventory.service.ts | .updateMany |
| inventory.service.ts | .update |
| inventory.service.ts | .create |
| inventory.service.ts | .create |
| inventory.service.ts | .upsert |
| inventory.service.ts | .update |
| inventory.service.ts | .upsert |
| warehouse.service.ts | .create |
| warehouse.service.ts | .updateMany |
| warehouse.service.ts | .create |
| warehouse.service.ts | .upsert |
| warehouse.service.ts | .updateMany |
| warehouse.service.ts | .create |
| warehouse.service.ts | .upsert |
| warehouse.service.ts | .updateMany |
| warehouse.service.ts | .updateMany |
| warehouse.service.ts | .upsert |
| warehouse.service.ts | .createMany |
| logistics.service.ts | .create |
| logistics.service.ts | .create |
| logistics.service.ts | .update |
| logistics.service.ts | .create |
| logistics.service.ts | .create |
| logistics.service.ts | .update |
| logistics.service.ts | .upsert |
| logistics.service.ts | .update |
| logistics.service.ts | .update |
| machine.service.ts | .create |
| machine.service.ts | .updateMany |
| machine.service.ts | .updateMany |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .updateMany |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .upsert |
| manufacturing.service.ts | .updateMany |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| manufacturing.service.ts | .update |
| manufacturing.service.ts | .create |
| nbfc.service.ts | .createMany |
| nbfc.service.ts | .create |
| nbfc.service.ts | .update |
| nbfc.service.ts | .create |
| nbfc.service.ts | .update |
| nbfc.service.ts | .createMany |
| nbfc.service.ts | .create |
| nbfc.service.ts | .update |
| nbfc.service.ts | .update |
| nbfc.service.ts | .update |
| prisma-isolation.spec.ts | .create |
| prisma-isolation.spec.ts | .update |
| projects.service.ts | .create |
| projects.service.ts | .updateMany |
| projects.service.ts | .create |
| projects.service.ts | .updateMany |
| projects.service.ts | .updateMany |
| purchases.service.ts | .create |
| purchases.service.ts | .create |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .update |
| purchases.service.ts | .create |
| purchases.service.ts | .create |
| purchases.service.ts | .create |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .update |
| purchases.service.ts | .create |
| purchases.service.ts | .create |
| purchases.service.ts | .update |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .create |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .updateMany |
| purchases.service.ts | .create |
| sales.service.ts | .create |
| sales.service.ts | .updateMany |
| sales.service.ts | .updateMany |
| sales.service.ts | .updateMany |
| api-key.service.ts | .update |
| api-key.service.ts | .create |
| api-key.service.ts | .update |
| api-key.service.ts | .updateMany |
| api-key.service.ts | .delete |
| audit-verification.service.ts | .update |
| audit.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| billing.service.ts | .update |
| billing.service.ts | .create |
| collaboration.service.ts | .create |
| collaboration.service.ts | .delete |
| collaboration.service.ts | .deleteMany |
| orm.service.ts | .create |
| orm.service.ts | .create |
| orm.service.ts | .updateMany |
| orm.service.ts | .updateMany |
| plugin.manager.ts | .create |
| plugin.manager.ts | .update |
| registry.service.ts | .upsert |
| registry.service.ts | .update |
| registry.service.ts | .update |
| registry.service.ts | .updateMany |
| webhook-secret-rotation.service.ts | .update |
| webhook-secret-rotation.service.ts | .create |
| webhook-secret-rotation.service.ts | .create |
| webhook-secret-rotation.service.ts | .updateMany |
| webhook-secret-rotation.service.ts | .create |
| webhook-secret-rotation.service.ts | .updateMany |
| workflow.service.ts | .create |
| workflow.service.ts | .create |
| workflow.service.ts | .create |
| users.controller.ts | .create |
| users.service.ts | .create |
| users.service.ts | .create |
| users.service.ts | .update |
| users.service.ts | .update |
| users.service.ts | .delete |
| attack-simulation.e2e-spec.ts | .deleteMany |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .create |
| audit-rectification.e2e-spec.ts | .delete |
| field-reality.e2e-spec.ts | .deleteMany |
| governance-manifesto.e2e-spec.ts | .deleteMany |
| test_prisma.ts | .create |
| test_prisma.ts | .create |
| api.ts | .create |
| client.ts | .create |
| tally-test-gen.ts | .updateMany |
| tally-test-gen.ts | .updateMany |
| tally-test-gen.ts | .create |
| verify_block_3_manufacturing.ts | .create |
| verify_block_3_manufacturing.ts | .update |
| verify_block_3_secret_sauce.ts | .create |
| verify_block_3_secret_sauce.ts | .update |
| verify_block_3_secret_sauce.ts | .deleteMany |
| verify_block_3_secret_sauce.ts | .create |
| verify_block_3_secret_sauce.ts | .create |
| verify_block_3_secret_sauce.ts | .deleteMany |
| verify_block_4_governance_deep.ts | .updateMany |
| verify_block_6_advanced.ts | .upsert |
| verify_block_6_advanced.ts | .upsert |
| verify_block_6_advanced.ts | .update |
| verify_block_6_advanced.ts | .delete |
| verify_block_7_cogs.ts | .update |

---

## Phase 5 — Data Read Operation Audit
*Total Database Reads Discovered: 677*

| File | Operation |
|---|---|
| debug-mfg.ts | .findFirst |
| debug-mfg.ts | .findFirst |
| debug-mfg.ts | .findFirst |
| verify-audit-chain.ts | .findMany |
| verify-audit-chain.ts | .findMany |
| audit-financials-deep.ts | .findUnique |
| audit-financials-deep.ts | .findFirst |
| audit-financials.ts | .findMany |
| audit-minimal.ts | .findMany |
| check-db.ts | .findMany |
| check-user.ts | .findUnique |
| check-users.ts | .findMany |
| create-test-user.ts | .findFirst |
| data-audit.ts | .count |
| debug-data.ts | .findMany |
| debug-data.ts | .findMany |
| debug-data.ts | .findMany |
| debug-data.ts | .findMany |
| debug-user.ts | .findUnique |
| debug-user.ts | .findMany |
| direct-stress.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findMany |
| execute-golden-path.ts | .findFirst |
| execute-golden-path.ts | .findFirst |
| exhaustive-audit.ts | .count |
| export-tenant.ts | .findMany |
| list-users.ts | .findMany |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findMany |
| master-seeder.ts | .findUnique |
| master-seeder.ts | .findUnique |
| master-seeder.ts | .findUnique |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findFirst |
| master-seeder.ts | .findMany |
| security-audit.ts | .findMany |
| security-audit.ts | .findMany |
| setup-b2b.ts | .findUnique |
| setup-b2b.ts | .findUnique |
| setup-b2b.ts | .findUnique |
| setup-b2b.ts | .findUnique |
| setup-manager.ts | .findUnique |
| setup-manager.ts | .findUnique |
| setup-manager.ts | .findUnique |
| stress-audit.script.ts | .findFirst |
| stress-audit.script.ts | .findFirst |
| super-seeder.ts | .findFirst |
| super-seeder.ts | .findMany |
| super-seeder.ts | .findMany |
| super-seeder.ts | .findMany |
| super-seeder.ts | .findFirst |
| super-seeder.ts | .findFirst |
| super-seeder.ts | .count |
| super-seeder.ts | .findFirst |
| super-seeder.ts | .findMany |
| super-seeder.ts | .findMany |
| super-seeder.ts | .findFirst |
| test-reset-flow.ts | .findUnique |
| ultimate-seeder.ts | .findFirst |
| ultimate-seeder.ts | .findMany |
| ultimate-seeder.ts | .findMany |
| ultimate-seeder.ts | .findMany |
| ultimate-seeder.ts | .findMany |
| ultimate-seeder.ts | .findFirst |
| ultimate-seeder.ts | .findMany |
| verify-audit-chain.ts | .findMany |
| verify-crm.ts | .findFirst |
| verify-cycle.ts | .findFirst |
| verify-cycle.ts | .findMany |
| verify-cycle.ts | .findMany |
| verify-financials.ts | .findFirst |
| verify-financials.ts | .findUnique |
| verify-financials.ts | .findUnique |
| verify-financials.ts | .findUnique |
| verify-manufacturing.ts | .findFirst |
| verify-manufacturing.ts | .findFirst |
| verify-manufacturing.ts | .findFirst |
| verify-manufacturing.ts | .findUnique |
| verify-manufacturing.ts | .findUnique |
| verify-manufacturing.ts | .findFirst |
| verify-phase1-audit.ts | .findUnique |
| verify-phase1.ts | .aggregate |
| verify-phase1.ts | .aggregate |
| verify-phase1.ts | .findMany |
| verify-procurement.ts | .findFirst |
| verify-procurement.ts | .findUnique |
| verify-procurement.ts | .findFirst |
| verify-procurement.ts | .findUnique |
| verify-search-draft.ts | .findFirst |
| verify-search.ts | .findFirst |
| verify-subscription.ts | .findFirst |
| verify-subscription.ts | .count |
| verify-subscription.ts | .findMany |
| verify-trial-balance.ts | .findMany |
| verify-trial-balance.ts | .findMany |
| verify_warehouse_purchasing.ts | .findUnique |
| verify_warehouse_purchasing.ts | .findFirst |
| verify_warehouse_purchasing.ts | .findFirst |
| verify_warehouse_purchasing.ts | .findUnique |
| verify_warehouse_purchasing.ts | .findFirst |
| verify_warehouse_purchasing.ts | .findFirst |
| accounting.service.ts | .findMany |
| accounting.service.ts | .findFirst |
| accounting.service.ts | .findFirst |
| accounting.service.ts | .findMany |
| accounting.service.ts | .findMany |
| accounting.service.ts | .findMany |
| accounting.service.ts | .findUnique |
| accounting.service.ts | .findMany |
| accounting.service.ts | .findFirst |
| brs.service.ts | .findMany |
| brs.service.ts | .findMany |
| brs.service.ts | .findFirst |
| brs.service.ts | .findUnique |
| brs.service.ts | .findMany |
| brs.service.ts | .findUnique |
| credit-note.service.ts | .findUnique |
| credit-note.service.ts | .findUnique |
| credit-note.service.ts | .findUnique |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findFirst |
| credit-note.service.ts | .findMany |
| debit-note.service.ts | .findUnique |
| debit-note.service.ts | .findUnique |
| debit-note.service.ts | .findUnique |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findFirst |
| debit-note.service.ts | .findMany |
| eway-bill.service.ts | .findUnique |
| fixed-asset.service.ts | .findFirst |
| fixed-asset.service.ts | .findFirst |
| fixed-asset.service.ts | .findFirst |
| fixed-asset.service.ts | .findFirst |
| fixed-asset.service.ts | .findMany |
| fixed-asset.service.ts | .findUnique |
| fixed-asset.service.ts | .findFirst |
| fixed-asset.service.ts | .findFirst |
| gstr1-export.service.ts | .findUnique |
| gstr1-export.service.ts | .findMany |
| invoice.service.ts | .findUnique |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findMany |
| invoice.service.ts | .findMany |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findMany |
| invoice.service.ts | .count |
| invoice.service.ts | .count |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findUnique |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| invoice.service.ts | .findFirst |
| ledger.service.ts | .findUnique |
| ledger.service.ts | .findFirst |
| ledger.service.ts | .findMany |
| ledger.service.ts | .count |
| ledger.service.ts | .findMany |
| ledger.service.ts | .count |
| ledger.service.ts | .findMany |
| onboarding.service.ts | .findFirst |
| onboarding.service.ts | .findFirst |
| onboarding.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findMany |
| payment.service.ts | .findMany |
| payment.service.ts | .findMany |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findFirst |
| payment.service.ts | .findMany |
| payment.service.ts | .findMany |
| payment.service.ts | .findMany |
| reporting.service.ts | .findMany |
| tally-export.service.ts | .findUnique |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .count |
| tally-export.service.ts | .aggregate |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .aggregate |
| tally-export.service.ts | .aggregate |
| tally-export.service.ts | .aggregate |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .aggregate |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findUnique |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tally-export.service.ts | .findMany |
| tds.service.ts | .findFirst |
| tds.service.ts | .findFirst |
| tds.service.ts | .findUnique |
| tds.service.ts | .findMany |
| tds.service.ts | .findMany |
| tds.service.ts | .findMany |
| tds.service.ts | .findFirst |
| analytics.service.ts | .aggregate |
| analytics.service.ts | .aggregate |
| analytics.service.ts | .count |
| analytics.service.ts | .count |
| analytics.service.ts | .findMany |
| analytics.service.ts | .findMany |
| analytics.service.ts | .count |
| analytics.service.ts | .aggregate |
| analytics.service.ts | .count |
| analytics.service.ts | .count |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findFirst |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findFirst |
| auth.service.ts | .findFirst |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findFirst |
| auth.service.ts | .findUnique |
| auth.service.ts | .findMany |
| auth.service.ts | .findUnique |
| auth.service.ts | .findFirst |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| auth.service.ts | .findUnique |
| jwt.strategy.ts | .findUnique |
| b2b.guard.ts | .findFirst |
| b2b.guard.ts | .findFirst |
| tenant-membership.guard.ts | .findUnique |
| idempotency.interceptor.ts | .findUnique |
| anomaly-alert.service.ts | .count |
| logging.service.ts | .findFirst |
| security-storage.service.ts | .findUnique |
| construction.service.ts | .findUnique |
| construction.service.ts | .findUnique |
| construction.service.ts | .findUnique |
| construction.service.ts | .findFirst |
| construction.service.ts | .findMany |
| crm.service.ts | .findFirst |
| crm.service.ts | .findMany |
| crm.service.ts | .count |
| crm.service.ts | .findFirst |
| crm.service.ts | .findFirst |
| crm.service.ts | .findFirst |
| crm.service.ts | .findFirst |
| crm.service.ts | .count |
| crm.service.ts | .count |
| crm.service.ts | .findMany |
| crm.service.ts | .findMany |
| crm.service.ts | .findFirst |
| crm.service.ts | .findFirst |
| crm.service.ts | .findMany |
| healthcare.service.ts | .findFirst |
| healthcare.service.ts | .findMany |
| healthcare.service.ts | .findUnique |
| healthcare.service.ts | .findUnique |
| healthcare.service.ts | .findMany |
| healthcare.service.ts | .findUnique |
| hr.service.ts | .findMany |
| hr.service.ts | .findMany |
| hr.service.ts | .findFirst |
| hr.service.ts | .findMany |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findFirst |
| hr.service.ts | .findMany |
| hr.service.ts | .count |
| hr.service.ts | .count |
| hr.service.ts | .aggregate |
| bulk-import.processor.ts | .findUnique |
| year-close.processor.ts | .findMany |
| year-close.processor.ts | .findMany |
| year-close.processor.ts | .findFirst |
| inventory.service.ts | .findUnique |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findMany |
| inventory.service.ts | .count |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findUnique |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .findFirst |
| inventory.service.ts | .count |
| inventory.service.ts | .aggregate |
| inventory.service.ts | .count |
| inventory.service.ts | .findUnique |
| inventory.service.ts | .findUnique |
| inventory.service.ts | .count |
| inventory.service.ts | .findMany |
| hsn.service.ts | .findUnique |
| warehouse.service.ts | .findMany |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findFirst |
| warehouse.service.ts | .findUnique |
| logistics.service.ts | .findUnique |
| logistics.service.ts | .findMany |
| logistics.service.ts | .findUnique |
| logistics.service.ts | .findUnique |
| logistics.service.ts | .findUnique |
| machine.service.ts | .findMany |
| machine.service.ts | .findFirst |
| machine.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findMany |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findMany |
| manufacturing.service.ts | .findUnique |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findMany |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findUnique |
| manufacturing.service.ts | .findUnique |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findMany |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findFirst |
| manufacturing.service.ts | .findUnique |
| manufacturing.service.ts | .count |
| nbfc.service.ts | .findUnique |
| nbfc.service.ts | .findUnique |
| nbfc.service.ts | .findMany |
| nbfc.service.ts | .findMany |
| nbfc.service.ts | .findFirst |
| nbfc.service.ts | .findFirst |
| nbfc.service.ts | .findUnique |
| prisma-isolation.spec.ts | .findMany |
| prisma-isolation.spec.ts | .findMany |
| prisma-isolation.spec.ts | .aggregate |
| projects.service.ts | .findMany |
| projects.service.ts | .findFirst |
| projects.service.ts | .findMany |
| projects.service.ts | .count |
| projects.service.ts | .count |
| projects.service.ts | .count |
| projects.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findMany |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findUnique |
| purchases.service.ts | .findUnique |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .count |
| purchases.service.ts | .findMany |
| purchases.service.ts | .count |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findUnique |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findMany |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findUnique |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findFirst |
| purchases.service.ts | .findMany |
| sales.service.ts | .findUnique |
| sales.service.ts | .findFirst |
| sales.service.ts | .findMany |
| sales.service.ts | .findFirst |
| sales.service.ts | .findFirst |
| sales.service.ts | .findFirst |
| sales.service.ts | .findMany |
| pos.service.ts | .findUnique |
| b2b.controller.ts | .findMany |
| b2b.controller.ts | .findMany |
| b2b.controller.ts | .aggregate |
| b2b.controller.ts | .aggregate |
| plugin.controller.ts | .findMany |
| ai.service.ts | .findMany |
| ai.service.ts | .findMany |
| ai.service.ts | .findMany |
| ai.service.ts | .count |
| ai.service.ts | .aggregate |
| ai.service.ts | .count |
| ai.service.ts | .findMany |
| ai.service.ts | .count |
| ai.service.ts | .count |
| ai.service.ts | .findMany |
| api-key.service.ts | .findUnique |
| api-key.service.ts | .findMany |
| api-key.service.ts | .findUnique |
| audit-verification.service.ts | .findMany |
| audit-verification.service.ts | .findMany |
| audit-verification.service.ts | .findFirst |
| audit-verification.service.ts | .findFirst |
| audit.service.ts | .findMany |
| automation-worker.service.ts | .findMany |
| automation-worker.service.ts | .findMany |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .count |
| billing.service.ts | .count |
| billing.service.ts | .count |
| billing.service.ts | .count |
| billing.service.ts | .count |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .findUnique |
| billing.service.ts | .findMany |
| collaboration.service.ts | .findMany |
| collaboration.service.ts | .findFirst |
| forecasting.service.ts | .findMany |
| forecasting.service.ts | .findMany |
| orm.service.ts | .findUnique |
| orm.service.ts | .findFirst |
| orm.service.ts | .findFirst |
| orm.service.ts | .findFirst |
| orm.service.ts | .findMany |
| orm.service.ts | .findFirst |
| orm.service.ts | .findFirst |
| orm.service.ts | .findFirst |
| plugin.manager.ts | .findUnique |
| plugin.manager.ts | .findMany |
| registry.service.ts | .findMany |
| registry.service.ts | .findMany |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .aggregate |
| saas-analytics.service.ts | .count |
| saas-analytics.service.ts | .findFirst |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .findFirst |
| saas-analytics.service.ts | .findFirst |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .count |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .count |
| saas-analytics.service.ts | .findMany |
| saas-analytics.service.ts | .findMany |
| search.service.ts | .findMany |
| search.service.ts | .findMany |
| search.service.ts | .findMany |
| search.service.ts | .findMany |
| search.service.ts | .findMany |
| system-audit.service.ts | .findMany |
| system-audit.service.ts | .findMany |
| system-audit.service.ts | .findMany |
| system-audit.service.ts | .count |
| system-audit.service.ts | .findFirst |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .findUnique |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .count |
| system-audit.service.ts | .findMany |
| system-audit.service.ts | .count |
| system-audit.service.ts | .findMany |
| webhook-secret-rotation.service.ts | .findFirst |
| webhook-secret-rotation.service.ts | .findFirst |
| webhook-secret-rotation.service.ts | .findMany |
| workflow.service.ts | .findMany |
| system.controller.ts | .count |
| system.controller.ts | .count |
| system.controller.ts | .count |
| system.controller.ts | .count |
| users.service.ts | .findUnique |
| users.service.ts | .findMany |
| users.service.ts | .findUnique |
| users.service.ts | .findUnique |
| users.service.ts | .findUnique |
| users.service.ts | .count |
| users.service.ts | .findUnique |
| users.service.ts | .findUnique |
| users.service.ts | .count |
| attack-simulation.e2e-spec.ts | .findFirst |
| attack-simulation.e2e-spec.ts | .findFirst |
| attack-simulation.e2e-spec.ts | .findFirst |
| attack-simulation.e2e-spec.ts | .findFirst |
| audit-rectification.e2e-spec.ts | .findFirst |
| audit-rectification.e2e-spec.ts | .findFirst |
| audit-rectification.e2e-spec.ts | .findFirst |
| field-reality.e2e-spec.ts | .count |
| field-reality.e2e-spec.ts | .findFirst |
| governance-manifesto.e2e-spec.ts | .findFirst |
| governance-manifesto.e2e-spec.ts | .findFirst |
| test_prisma.ts | .findFirst |
| debug_cogs_accounts.ts | .findUnique |
| debug_cogs_accounts.ts | .findMany |
| list_products.ts | .findUnique |
| list_products.ts | .findMany |
| verify_block_1_foundation.ts | .findUnique |
| verify_block_1_foundation.ts | .findMany |
| verify_block_2_finance.ts | .findUnique |
| verify_block_2_finance.ts | .findFirst |
| verify_block_2_finance.ts | .findFirst |
| verify_block_2_finance.ts | .findFirst |
| verify_block_2_finance.ts | .findFirst |
| verify_block_2_finance.ts | .findUnique |
| verify_block_2_finance.ts | .findFirst |
| verify_block_2_procurement.ts | .findUnique |
| verify_block_2_procurement.ts | .findFirst |
| verify_block_2_procurement.ts | .findFirst |
| verify_block_2_procurement.ts | .findUnique |
| verify_block_2_procurement.ts | .findFirst |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findFirst |
| verify_block_3_manufacturing.ts | .findFirst |
| verify_block_3_manufacturing.ts | .findFirst |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findUnique |
| verify_block_3_manufacturing.ts | .findFirst |
| verify_block_3_manufacturing.ts | .findFirst |
| verify_block_3_secret_sauce.ts | .findUnique |
| verify_block_3_secret_sauce.ts | .findFirst |
| verify_block_3_secret_sauce.ts | .findFirst |
| verify_block_3_secret_sauce.ts | .findFirst |
| verify_block_4_governance_deep.ts | .findUnique |
| verify_block_4_governance_deep.ts | .findMany |
| verify_block_4_manufacturing_governance.ts | .findUnique |
| verify_block_4_manufacturing_governance.ts | .findFirst |
| verify_block_4_manufacturing_governance.ts | .findFirst |
| verify_block_4_manufacturing_governance.ts | .findFirst |
| verify_block_4_manufacturing_governance.ts | .findUnique |
| verify_block_4_manufacturing_governance.ts | .findUnique |
| verify_block_4_sales.ts | .findUnique |
| verify_block_4_sales.ts | .findFirst |
| verify_block_4_sales.ts | .findFirst |
| verify_block_4_sales.ts | .findUnique |
| verify_block_4_sales.ts | .findFirst |
| verify_block_4_sales.ts | .findFirst |
| verify_block_5_finance.ts | .findUnique |
| verify_block_5_finance.ts | .findFirst |
| verify_block_5_finance.ts | .findUnique |
| verify_block_5_finance.ts | .findFirst |
| verify_block_5_gaps.ts | .findUnique |
| verify_block_6_advanced.ts | .findUnique |
| verify_block_6_advanced.ts | .findMany |
| verify_block_6_advanced.ts | .findFirst |
| verify_block_6_advanced.ts | .findUnique |
| verify_block_7_cogs.ts | .findUnique |
| verify_block_7_cogs.ts | .findFirst |
| verify_block_7_cogs.ts | .findFirst |
| verify_block_7_cogs.ts | .findFirst |
| verify_master_data.ts | .findUnique |
| verify_master_data.ts | .findMany |
| verify_master_data.ts | .findMany |
| verify_master_data.ts | .findMany |
| verify_master_data.ts | .findMany |
| verify_master_data.ts | .findMany |
| verify_master_data.ts | .findMany |

---

## Phase 6 & 7 — Frontend/Mobile Communication Audit
*Total Client API Calls Discovered in Frontends: 7*

| File | Call Match |
|---|---|
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_original-stack-frames"` |
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_attach-nodejs-inspector"` |
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_devtools_config"` |
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_server_status"` |
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_server_status"` |
| 638c1_next_dist_compiled_next-devtools_index_ac1b0320.js | `fetch("/__nextjs_disable_dev_indicator"` |
| CreateSalesOrderScreen.tsx | `fetch('https://www.google.com'` |

---

## Phase 8 — Event and Background Job Audit
Please refer to Phase 1 (Event Emitters & Queue Processors). Retry policies and Dead letter queues must be verified in specific queue configurations (e.g. Bull queue initializations).

---

## Phase 9 — Guard and Security Coverage
Refer to Phase 2 for Endpoint-level Guard/Role mappings. 

---

## Phase 10 — Inter-Service Communication
*Action Required: Dynamic or deep AST analysis is required for full service-to-service dependency graphing.*
Observed services: 60.

---

## Phase 11 — End-to-End Workflow Verification
*Action Required: E2E Cypress/Playwright tests needed for core business flows.*

---

## Phase 12 — Concurrency and Race Condition Testing
*Action Required: Use tools like JMeter or Artillery to trigger concurrency tests on mutations.*

---

## Phase 13 — Observability and Logging Verification
Codebase log statements must be audited manually for sensitive PII. Standard Nest logger usage should be consistent.

---

## Phase 14 — Performance and Load Validation
*Action Required: Active Load testing required.*

---

## Phase 15 — Final System Health Report
**Status**: GENERATED STATIC DISCOVERY REPORT
**Certification**: PENDING LIVE LOAD/E2E RESULTS

