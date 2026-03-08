-- Add isActive column to Account table
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
