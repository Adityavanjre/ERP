-- =============================================================================
-- CATCH-UP MIGRATION: All schema additions post initial deployment
-- Safely adds new columns and tables that exist in schema.prisma but not in DB.
-- All statements use IF NOT EXISTS / DO $$ guards to be fully idempotent.
-- Safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. NEW ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('Active', 'Grace', 'Suspended', 'ReadOnly', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PlanType" AS ENUM ('Free', 'Starter', 'Growth', 'Enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('Email', 'Google', 'Microsoft');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. COLUMN ADDITIONS TO EXISTING TABLES
-- ---------------------------------------------------------------------------

-- User: tokenVersion (SEC-007) and pushToken (MOB-005)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "pushToken" TEXT;

-- Tenant: Subscription lifecycle columns (billing system)
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS "planExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "suspendReason" TEXT;

-- Tenant: RES-002 Background Worker Retries
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "downgradeRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastDowngradeRetryAt" TIMESTAMP(3);

-- Tenant: Razorpay Integration (SUB-002)
ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "razorpayCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpaySubscriptionId" TEXT;

-- KYCRecord: COMP-001 visual evidence
ALTER TABLE "KYCRecord"
  ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;

-- AuditLog: Hash chain fields for tamper evidence
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "prevHash" TEXT,
  ADD COLUMN IF NOT EXISTS "entryHash" TEXT,
  ADD COLUMN IF NOT EXISTS "channel" TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "responseTimeMs" INTEGER;

-- StockMovement: Audit trail for traceability (AUDIT-011)
ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "correlationId" TEXT;

-- Product: baseUnit for INV-007 unit conversions
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "baseUnit" TEXT NOT NULL DEFAULT 'pcs';

-- ---------------------------------------------------------------------------
-- 3. NEW TABLES
-- ---------------------------------------------------------------------------

-- BillingEvent: audit trail for subscription state transitions
CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "fromPlan" TEXT,
  "toPlan" TEXT,
  "reason" TEXT,
  "performedBy" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "BillingEvent_tenantId_createdAt_idx" ON "BillingEvent"("tenantId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BillingEvent_event_idx" ON "BillingEvent"("event");

ALTER TABLE "BillingEvent"
  DROP CONSTRAINT IF EXISTS "BillingEvent_tenantId_fkey",
  ADD CONSTRAINT "BillingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RevokedToken: JTI blacklist for server-side logout (SEC-005)
CREATE TABLE IF NOT EXISTS "RevokedToken" (
  "jti" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("jti")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "RevokedToken_expiresAt_idx" ON "RevokedToken"("expiresAt");

-- IdempotencyKey: DB-backed atomic idempotency store (SEC-009)
CREATE TABLE IF NOT EXISTS "IdempotencyKey" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "response" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "IdempotencyKey_tenantId_key_key" ON "IdempotencyKey"("tenantId", "key");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- GovernanceProfile: IND-001 tenant-configurable compliance rules
CREATE TABLE IF NOT EXISTS "GovernanceProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "criticalPotassium" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
  "criticalHemoglobin" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
  "criticalGlucose" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
  "warningPotassium" DOUBLE PRECISION NOT NULL DEFAULT 5.2,
  "warningHemoglobin" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
  "warningGlucose" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
  "allowedVehicleIndustries" TEXT[] DEFAULT ARRAY['Logistics','Manufacturing','Construction'],
  "fuelEfficiencyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1.15,
  CONSTRAINT "GovernanceProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "GovernanceProfile_tenantId_key" ON "GovernanceProfile"("tenantId");

ALTER TABLE "GovernanceProfile"
  DROP CONSTRAINT IF EXISTS "GovernanceProfile_tenantId_fkey",
  ADD CONSTRAINT "GovernanceProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- UnitConversion: INV-007 BOM quantity conversions
CREATE TABLE IF NOT EXISTS "UnitConversion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromUnit" TEXT NOT NULL,
  "toUnit" TEXT NOT NULL,
  "factor" DOUBLE PRECISION NOT NULL,
  "productId" TEXT,
  CONSTRAINT "UnitConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "UnitConversion_tenantId_fromUnit_toUnit_productId_key" ON "UnitConversion"("tenantId", "fromUnit", "toUnit", "productId");

ALTER TABLE "UnitConversion"
  DROP CONSTRAINT IF EXISTS "UnitConversion_tenantId_fkey",
  ADD CONSTRAINT "UnitConversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MobileDevice: GOV-002 device registration table
CREATE TABLE IF NOT EXISTS "MobileDevice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "deviceName" TEXT,
  "platform" TEXT NOT NULL,
  "pushToken" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "strictMode" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "MobileDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "MobileDevice_tenantId_deviceId_key" ON "MobileDevice"("tenantId", "deviceId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "MobileDevice_userId_idx" ON "MobileDevice"("userId");

ALTER TABLE "MobileDevice"
  DROP CONSTRAINT IF EXISTS "MobileDevice_tenantId_fkey",
  DROP CONSTRAINT IF EXISTS "MobileDevice_userId_fkey",
  ADD CONSTRAINT "MobileDevice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "MobileDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- WebhookSecretRotation: SEC-017 dual-secret grace window
CREATE TABLE IF NOT EXISTS "WebhookSecretRotation" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Active',
  "rotatedBy" TEXT NOT NULL,
  "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "graceExpiresAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),
  "previousSecretId" TEXT,
  CONSTRAINT "WebhookSecretRotation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookSecretRotation_provider_status_idx" ON "WebhookSecretRotation"("provider", "status");

-- WebhookDeadLetter: OPS-004 exhausted webhook retry store
CREATE TABLE IF NOT EXISTS "WebhookDeadLetter" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "tenantId" TEXT,
  "originalTimestamp" TIMESTAMP(3) NOT NULL,
  "jobId" TEXT NOT NULL,
  "totalAttempts" INTEGER NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDeadLetter_pkey" PRIMARY KEY ("id")
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookDeadLetter_provider_resolvedAt_idx" ON "WebhookDeadLetter"("provider", "resolvedAt");

-- BackgroundJob: ARCH-001 BullMQ job tracking
CREATE TABLE IF NOT EXISTS "BackgroundJob" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "resultSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "BackgroundJob_idempotencyKey_key" ON "BackgroundJob"("idempotencyKey");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "BackgroundJob_tenantId_type_status_idx" ON "BackgroundJob"("tenantId", "type", "status");

-- =============================================================================
-- END OF CATCH-UP MIGRATION
-- =============================================================================
