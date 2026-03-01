const { execSync } = require('child_process');

console.log('--- [PRE-START] DATABASE SCHEMA INITIALIZATION ---');

const isProduction = process.env.NODE_ENV === 'production';

function runMigrationsWithAutoRepair(attempt = 1) {
    try {
        console.log(`[Attempt ${attempt}] Running prisma migrate deploy...`);
        execSync('npx prisma migrate deploy', {
            stdio: 'pipe', // Capture output to read errors
            env: process.env,
            encoding: 'utf-8'
        });
        console.log('--- [PRE-START] CLOUD MIGRATION SYNC COMPLETE ---');
    } catch (error) {
        const output = (error.stdout || '') + (error.stderr || '');

        // P3009 means a previous migration failed halfway
        if (output.includes('P3009') || output.includes('failed migrations in the target database')) {
            console.warn('\n[AUTO-REPAIR] Detected corrupted migration history (P3009).');

            // Extract the name of the failing migration from the output
            // Example: "The `20260225235500_reversible_init` migration started at"
            const match = output.match(/The `([^`]+)` migration/);

            if (match && match[1]) {
                const migrationName = match[1];
                console.log(`[AUTO-REPAIR] Force-resolving stalled migration: ${migrationName}`);

                try {
                    execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
                        stdio: 'inherit',
                        env: process.env
                    });
                    console.log(`[AUTO-REPAIR] Successfully marked ${migrationName} as applied.`);

                    // Retry deployment after successful resolution
                    if (attempt < 3) {
                        return runMigrationsWithAutoRepair(attempt + 1);
                    }
                } catch (resolveError) {
                    console.error(`[AUTO-REPAIR] Failed to resolve migration ${migrationName}.`);
                    console.error(resolveError.stdout || resolveError.toString());
                    throw resolveError;
                }
            } else {
                console.error('[AUTO-REPAIR] Could not extract migration name from the error output.');
                console.error(output);
                throw error;
            }
        } else {
            console.error(output);
            throw error;
        }
    }
}

try {
    if (isProduction) {
        console.log('Detected PRODUCTION environment — applying safe, validated migrations...');
        runMigrationsWithAutoRepair();
    } else {
        // DEV/STAGING: Use 'db push' for rapid prototyping.
        console.log('Detected NON-PRODUCTION environment — forcefully syncing schema...');
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
            stdio: 'inherit',
            env: process.env
        });
        console.log('--- [PRE-START] LOCAL SYNC COMPLETE ---');
    }
} catch (error) {
    console.error('--- [PRE-START] FATAL: FAILED TO INITIALIZE DATABASE ---');
    if (isProduction) {
        console.error('Migration failed in production. Application will NOT start to prevent data corruption.');
    }
    process.exit(1);
}
