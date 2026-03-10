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
        // Skip baseline migrations from the strict CONCURRENTLY check
        const isBaseline = migration.endsWith('_init') || migration.includes('_catchup_');
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

        // DEV-006: Enforce CONCURRENTLY on index creations
        const upSqlPath = path.join(MIGRATIONS_DIR, migration, 'migration.sql');
        if (fs.existsSync(upSqlPath)) {
            const sqlContent = fs.readFileSync(upSqlPath, 'utf8');
            const lines = sqlContent.split('\n');
            lines.forEach((line, index) => {
                const upperLine = line.toUpperCase();
                // Match simple CREATE INDEX and CREATE UNIQUE INDEX, missing CONCURRENTLY
                if ((upperLine.includes('CREATE INDEX') || upperLine.includes('CREATE UNIQUE INDEX')) && !isBaseline) {
                    if (!upperLine.includes('CONCURRENTLY')) {
                        console.error(`[CRITICAL] DEV-006: Migration "${migration}", line ${index + 1} creates an index WITHOUT the CONCURRENTLY keyword. This will lock tables in production.`);
                        hasUntagged = true;
                    }
                }
            });
        }
    }

    if (hasUntagged) {
        console.error('--- Migration Compliance Check Failed ---');
        process.exit(1);
    } else {
        console.log('--- Migration Compliance Check Passed ---');
        process.exit(0);
    }
}

checkMigrations();
