import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

async function rollbackLastMigration() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        console.error('No migrations directory found.');
        process.exit(1);
    }

    const migrations = fs.readdirSync(MIGRATIONS_DIR)
        .filter(f => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
        .sort()
        .reverse();

    if (migrations.length === 0) {
        console.log('No migrations to rollback.');
        process.exit(0);
    }

    const lastMigration = migrations[0];
    const downSqlPath = path.join(MIGRATIONS_DIR, lastMigration, 'down.sql');

    if (!fs.existsSync(downSqlPath)) {
        console.error(`[CRITICAL] Cannot rollback migration "${lastMigration}": Missing down.sql script.`);
        process.exit(1);
    }

    console.log(`--- Rolling back migration: ${lastMigration} ---`);
    const downSql = fs.readFileSync(downSqlPath, 'utf8');

    try {
        // Execute the raw SQL for the rollback
        await prisma.$executeRawUnsafe(downSql);

        // In a real scenario, you'd also need to update the _prisma_migrations table
        // or use prisma migrate resolve depending on the state.

        console.log('--- Rollback Successful ---');
        process.exit(0);
    } catch (e: any) {
        console.error(`[ERROR] Rollback failed: ${e.message}`);
        process.exit(1);
    }
}

rollbackLastMigration();
