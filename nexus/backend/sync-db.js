const { execSync } = require('child_process');

console.log('--- [PRE-START] EMERGENCY PRISMA SCHEMA SYNC ---');

try {
    // Use npx to ensure we hit the local node_modules bin
    execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: process.env // Pass through the environment variables (crucial for DATABASE_URL)
    });
    console.log('--- [PRE-START] EMERGENCY SCHEMA SYNC COMPLETE ---');
    process.exit(0);
} catch (error) {
    console.error('--- [PRE-START] FATAL: FAILED TO SYNC DATABASE SCHEMA ---');
    console.error(error);
    process.exit(1);
}
