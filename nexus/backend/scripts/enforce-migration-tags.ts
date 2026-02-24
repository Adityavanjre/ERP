import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

function checkMigrations() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.log('No migrations found. Skipping check.');
        return;
    }

    const migrations = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory());

    let hasUntagged = false;

    for (const migration of migrations) {
        // Expected format: <timestamp>_reversible_<name> or <timestamp>_destructive_<name>
        if (!migration.includes('_reversible_') && !migration.includes('_destructive_')) {
            console.error(`[CRITICAL] Migration "${migration}" is missing a safety tag (_reversible_ or _destructive_).`);
            hasUntagged = true;
        }

        const downSqlPath = path.join(MIGRATIONS_DIR, migration, 'down.sql');
        if (migration.includes('_reversible_') && !fs.existsSync(downSqlPath)) {
            console.error(`[CRITICAL] Reversible migration "${migration}" is missing a "down.sql" script.`);
            hasUntagged = true;
        }
    }

    if (hasUntagged) {
        console.error('--- Rollback Readiness Check Failed ---');
        process.exit(1);
    } else {
        console.log('--- Rollback Readiness Check Passed ---');
        process.exit(0);
    }
}

checkMigrations();
