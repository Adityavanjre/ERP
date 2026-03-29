import * as SQLite from 'expo-sqlite';
import { ALL_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function initMobileDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  
  try {
    db = await SQLite.openDatabaseAsync('nexus-offline.db');

    // FIX CRIT-005: Proper PRAGMA settings for mobile
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('PRAGMA synchronous = NORMAL;');
    await db.execAsync('PRAGMA cache_size = -64000;'); // 64MB cache

    // Initialize schema
    const statements = ALL_SQL.split(';').filter(s => s.trim());
    let successCount = 0;
    let errorCount = 0;

    for (const stmt of statements) {
      try {
        await db.execAsync(stmt);
        successCount++;
      } catch (err) {
        // Log but don't fail - table might already exist
        if (err instanceof Error) {
          // Only skip "already exists" errors, log others
          if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
            console.warn('[MobileDB] Schema warning:', err.message);
            errorCount++;
          }
        }
      }
    }

    console.log(`[MobileDB] Schema initialized: ${successCount} succeeded, ${errorCount} warnings`);
    return db;
  } catch (error) {
    console.error('[MobileDB] Failed to initialize database:', error);
    throw error; // Re-throw so caller knows initialization failed
  }
}

export function getMobileDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Mobile database not initialized. Call initMobileDb() first.');
  }
  return db;
}

export function createMobileDbAdapter() {
  const database = getMobileDb();
  return {
    async run(sql: string, params: unknown[] = []): Promise<void> {
      try {
        await database.runAsync(sql, params);
      } catch (err) {
        console.error('[MobileDB] Run error:', err);
        throw err;
      }
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      try {
        return (await database.getFirstAsync<T>(sql, params)) ?? undefined;
      } catch (err) {
        console.error('[MobileDB] Get error:', err);
        throw err;
      }
    },
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      try {
        return await database.getAllAsync<T>(sql, params);
      } catch (err) {
        console.error('[MobileDB] All error:', err);
        throw err;
      }
    },
  };
}

// Database health check
export async function checkMobileDbHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    if (!db) {
      return { healthy: false, message: 'Database not initialized' };
    }
    await db.execAsync('SELECT 1');
    return { healthy: true, message: 'Database healthy' };
  } catch (err) {
    return { healthy: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}
