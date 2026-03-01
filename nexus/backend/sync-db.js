const { execSync } = require('child_process');

console.log('--- [PRE-START] DATABASE SCHEMA INITIALIZATION ---');

const isProduction = process.env.NODE_ENV === 'production';

try {
    if (isProduction) {
        // PROD-001: USE 'migrate deploy' in production for safety.
        // This only applies migration files in prisma/migrations and fails if there is a conflict.
        // It NEVER prompts or drops data unless the migration itself is destructive.
        console.log('Detected PRODUCTION environment — applying pending migrations...');
        execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
            env: process.env
        });
    } else {
        // DEV/STAGING: Use 'db push' for rapid prototyping.
        // Add --accept-data-loss ONLY in non-production.
        console.log('Detected NON-PRODUCTION environment — performing schema sync...');
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
            stdio: 'inherit',
            env: process.env
        });
    }
    console.log('--- [PRE-START] DATABASE INITIALIZATION COMPLETE ---');
} catch (error) {
    console.error('--- [PRE-START] FATAL: FAILED TO INITIALIZE DATABASE ---');
    if (isProduction) {
        console.error('Migration failed in production. Application will NOT start to prevent data corruption.');
    }
    console.error(error);
    process.exit(1);
}
