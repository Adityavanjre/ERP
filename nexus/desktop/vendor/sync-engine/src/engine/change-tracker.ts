import type { TableName, SyncQueueItem, SyncableRecord } from '../types/sync.types';

export interface DBAdapter {
  run(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export class ChangeTracker {
  constructor(private db: DBAdapter) {}

  async markDirty(table: TableName, recordId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${table} SET _dirty = 1, _last_modified = ? WHERE id = ?`,
      [now, recordId]
    );
    await this.db.run(
      `INSERT INTO _sync_queue (table_name, record_id, operation, data, created_at, status)
       SELECT ?, ?, 'UPDATE', NULL, ?, 'pending'
       WHERE NOT EXISTS (
         SELECT 1 FROM _sync_queue WHERE table_name = ? AND record_id = ? AND status = 'pending'
       )`,
      [table, recordId, now, table, recordId]
    );
  }

  async markInserted(table: TableName, recordId: string, data: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${table} SET _dirty = 1, _last_modified = ? WHERE id = ?`,
      [now, recordId]
    );
    await this.db.run(
      `INSERT INTO _sync_queue (table_name, record_id, operation, data, created_at, status)
       VALUES (?, ?, 'INSERT', ?, ?, 'pending')`,
      [table, recordId, JSON.stringify(data), now]
    );
  }

  async markDeleted(table: TableName, recordId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE ${table} SET _dirty = 1, _deleted = 1, _last_modified = ? WHERE id = ?`,
      [now, recordId]
    );
    await this.db.run(
      `DELETE FROM _sync_queue WHERE table_name = ? AND record_id = ? AND status = 'pending'`,
      [table, recordId]
    );
    await this.db.run(
      `INSERT INTO _sync_queue (table_name, record_id, operation, data, created_at, status)
       VALUES (?, ?, 'DELETE', NULL, ?, 'pending')`,
      [table, recordId, now]
    );
  }

  async getPendingChanges(): Promise<SyncQueueItem[]> {
    return this.db.all<SyncQueueItem>(
      `SELECT * FROM _sync_queue WHERE status = 'pending' ORDER BY created_at ASC`
    );
  }

  async getPendingCount(): Promise<number> {
    const row = await this.db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM _sync_queue WHERE status = 'pending'`
    );
    return row?.count ?? 0;
  }

  async markSyncing(table: TableName, recordId: string): Promise<void> {
    await this.db.run(
      `UPDATE _sync_queue SET status = 'syncing' WHERE table_name = ? AND record_id = ? AND status = 'pending'`,
      [table, recordId]
    );
  }

  async markSynced(table: TableName, recordId: string): Promise<void> {
    await this.db.run(
      `UPDATE _sync_queue SET status = 'synced' WHERE table_name = ? AND record_id = ?`,
      [table, recordId]
    );
    await this.db.run(
      `UPDATE ${table} SET _dirty = 0 WHERE id = ?`,
      [recordId]
    );
  }

  async markFailed(table: TableName, recordId: string, error: string): Promise<void> {
    await this.db.run(
      `UPDATE _sync_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1
       WHERE table_name = ? AND record_id = ? AND status = 'syncing'`,
      [error, table, recordId]
    );
  }

  async getRecordData(table: TableName, recordId: string): Promise<Record<string, unknown> | null> {
    const row = await this.db.get<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = ?`,
      [recordId]
    );
    return row ?? null;
  }

  async getDirtyRecords(table: TableName): Promise<SyncableRecord[]> {
    return this.db.all<SyncableRecord>(
      `SELECT * FROM ${table} WHERE _dirty = 1`
    );
  }

  async getLastPullAt(table: TableName): Promise<string | null> {
    const row = await this.db.get<{ last_pull_at: string | null }>(
      `SELECT last_pull_at FROM _sync_meta WHERE table_name = ?`,
      [table]
    );
    return row?.last_pull_at ?? null;
  }

  async setLastPullAt(table: TableName, timestamp: string): Promise<void> {
    await this.db.run(
      `INSERT INTO _sync_meta (table_name, last_pull_at) VALUES (?, ?)
       ON CONFLICT(table_name) DO UPDATE SET last_pull_at = ?`,
      [table, timestamp, timestamp]
    );
  }

  async setLastPushAt(table: TableName, timestamp: string): Promise<void> {
    await this.db.run(
      `INSERT INTO _sync_meta (table_name, last_push_at) VALUES (?, ?)
       ON CONFLICT(table_name) DO UPDATE SET last_push_at = ?`,
      [table, timestamp, timestamp]
    );
  }

  async clearFailedRetries(maxRetries: number = 5): Promise<void> {
    await this.db.run(
      `UPDATE _sync_queue SET status = 'pending' WHERE status = 'failed' AND retry_count < ?`,
      [maxRetries]
    );
  }

  async resetStuckSyncing(): Promise<void> {
    await this.db.run(
      `UPDATE _sync_queue SET status = 'pending' WHERE status = 'syncing'`
    );
  }
}
