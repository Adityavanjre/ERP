#!/usr/bin/env node

/**
 * Credential Rotation Helper
 * 
 * Generates cryptographically secure values for all .env secrets.
 * Run: node scripts/generate-secrets.js
 * 
 * Copy the output into your .env file or Render environment variables.
 */

const crypto = require('crypto');

function generateHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateBase64(bytes) {
  return crypto.randomBytes(bytes).toString('base64url');
}

console.log('=== KLYPSO NEXUS ERP — SECRET ROTATION ===\n');
console.log('# Copy these values into your .env file or Render dashboard\n');
console.log(`JWT_SECRET="${generateHex(32)}"`);
console.log(`MFA_ENCRYPTION_KEY="${generateHex(32)}"`);
console.log(`AUDIT_HMAC_SECRET="${generateHex(32)}"`);
console.log(`CSRF_SECRET="${generateHex(32)}"`);
console.log(`ADMIN_PASSWORD="${generateBase64(16)}"`);
console.log(`SESSION_SECRET="${generateHex(32)}"`);
console.log(`# RESEND_API_KEY="re_${generateBase64(24)}"  # Regenerate at resend.com`);
console.log(`# DATABASE_URL="postgresql://..."  # Rotate in Supabase dashboard`);
console.log('\n=== DONE ===');
console.log('\nNext steps:');
console.log('1. Update these values in Render dashboard > Environment');
console.log('2. Update these values in your local .env file');
console.log('3. Redeploy the backend service');
console.log('4. Verify login still works');
console.log('5. Purge git history if .env was ever committed:');
console.log('   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch backend/.env" --prune-empty --tag-name-filter cat -- --all');
