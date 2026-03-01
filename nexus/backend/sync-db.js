const { execSync } = require('child_process');

console.log('--- [PRE-START] DATABASE SCHEMA INITIALIZATION ---');

const isProduction = process.env.NODE_ENV === 'production';

try {
    if (isProduction) {
        // PROD-001: Reverted to 'db push' for deployment stability.
        // Because the live Supabase instance was originally seeded without formal migration tracking,
        // 'migrate deploy' gets stuck on a P3009 error. 'db push' ensures the schema matches
        // without relying on the _prisma_migrations table history.
        console.log('Detected PRODUCTION environment — forcefully syncing schema...');
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
            stdio: 'inherit',
            env: process.env
        });
    } else {
        // DEV/STAGING: Use 'db push' for rapid prototyping.
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
