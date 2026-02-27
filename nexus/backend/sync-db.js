const { execSync } = require('child_process');

console.log('--- [PRE-START] EMERGENCY PRISMA SCHEMA SYNC ---');

try {
    // Use npx to ensure we hit the local node_modules bin
    // Add --skip-generate safely as we just built the client minutes prior
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
        stdio: 'inherit',
        env: process.env // Pass through the environment variables (crucial for DATABASE_URL)
    });
    console.log('--- [PRE-START] EMERGENCY SCHEMA SYNC COMPLETE ---');
    // DO NOT call process.exit(0) here, it terminates the entire NPM lifecycle chain before main.ts boots
} catch (error) {
    console.error('--- [PRE-START] FATAL: FAILED TO SYNC DATABASE SCHEMA ---');
    console.error(error);
    process.exit(1);
}
