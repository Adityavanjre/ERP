import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import type { DBAdapter } from '@nexus/sync-engine';
import { ALL_SQL } from './schema';

let db: Database.Database | null = null;

export async function initDatabase(): Promise<void> {
  const dbPath = path.join(app.getPath('userData'), 'nexus-offline.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  db.pragma('foreign_keys = ON');

  try {
    db.exec(ALL_SQL);
  } catch (error) {
    console.error('FAILED TO APPLY SCHEMA TO SQLITE:', error);
    // Continue anyway for now, but logging is critical
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function createDbAdapter(): DBAdapter {
  const database = getDb();
  return {
    async run(sql: string, params: unknown[] = []): Promise<void> {
      database.prepare(sql).run(...params);
    },
    async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
      return database.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return database.prepare(sql).all(...params) as T[];
    },
  };
}
