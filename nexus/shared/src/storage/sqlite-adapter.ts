import { StorageAdapter } from '../sync/types';

export interface SqliteDb {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(fn: () => Promise<void>): Promise<void>;
}

export class SqliteStorageAdapter implements StorageAdapter {
  constructor(private db: SqliteDb) {}

  async execute(sql: string, params?: unknown[]): Promise<void> {
    await this.db.execute(sql, params);
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.db.query<T>(sql, params);
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    await this.db.transaction(fn);
  }
}
