import {
  SyncChange,
  SyncConflict,
  SyncStatus,
  SyncOptions,
  SyncProgress,
  PushResult,
  PullResult,
  StorageAdapter,
} from './types';

export class SyncEngine {
  private options: SyncOptions;
  private storage: StorageAdapter;
  private isSyncing = false;

  constructor(storage: StorageAdapter, options: SyncOptions) {
    this.storage = storage;
    this.options = options;
  }

  async initialize(): Promise<void> {
    await this.storage.execute(`
      CREATE TABLE IF NOT EXISTS _sync_meta (
        table_name TEXT PRIMARY KEY,
        last_pull_at TEXT,
        last_push_at TEXT,
        record_count INTEGER DEFAULT 0
      )
    `);

    await this.storage.execute(`
      CREATE TABLE IF NOT EXISTS _sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT,
        created_at TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);

    await this.storage.execute(`
      CREATE TABLE IF NOT EXISTS _conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        resolved_data TEXT,
        resolution TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `);

    for (const table of this.options.tables) {
      await this.storage.execute(
        `INSERT OR IGNORE INTO _sync_meta (table_name, last_pull_at) VALUES (?, ?)`,
        [table, '1970-01-01T00:00:00.000Z'],
      );
    }
  }

  async sync(): Promise<SyncStatus> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    try {
      this.reportProgress('push', 0, 0, 'Preparing to sync...');

      const pushResults = await this.push();
      this.reportProgress('pull', 0, 0, 'Push complete. Pulling changes...');

      const pullResult = await this.pull();
      this.reportProgress('idle', 0, 0, 'Sync complete');

      await this.updateSyncTimestamps();

      return this.getStatus();
    } finally {
      this.isSyncing = false;
    }
  }

  async push(): Promise<PushResult[]> {
    const changes = await this.getPendingChanges();
    if (changes.length === 0) return [];

    const results: PushResult[] = [];
    const batches = this.batch(changes, this.options.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.reportProgress('push', i + 1, batches.length, `Pushing batch ${i + 1}/${batches.length}...`);

      await this.markBatchSyncing(batch);

      try {
        const response = await fetch(`${this.options.apiBaseUrl}/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.options.getToken() ? { Authorization: `Bearer ${this.options.getToken()}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ changes: batch.map(c => ({
            table: c.table,
            id: c.recordId,
            operation: c.operation,
            data: c.data,
            clientTimestamp: c.clientTimestamp,
          }))}),
        });

        if (!response.ok) {
          throw new Error(`Push failed: ${response.status}`);
        }

        const batchResults = await response.json() as PushResult[];

        for (const result of batchResults) {
          if (result.status === 'ok') {
            await this.markChangeSynced(result.id);
          } else if (result.status === 'conflict') {
            const change = batch.find(c => c.recordId === result.id);
            if (change && result.serverData) {
              await this.recordConflict(change, result.serverData);
              this.options.onConflict?.({
                id: 0,
                table: change.table,
                recordId: change.recordId,
                localData: change.data,
                serverData: result.serverData,
                createdAt: new Date().toISOString(),
              });
            }
          } else {
            await this.markChangeFailed(result.id, result.error || 'Unknown error');
          }
          results.push(result);
        }
      } catch (err: any) {
        for (const change of batch) {
          await this.markChangeFailed(change.id.toString(), err.message);
          results.push({ id: change.recordId, status: 'error', error: err.message });
        }
      }
    }

    return results;
  }

  async pull(): Promise<PullResult> {
    const result: PullResult = { records: {}, serverTimestamp: new Date().toISOString() };

    for (const table of this.options.tables) {
      const meta = await this.storage.query<{ last_pull_at: string }>(
        `SELECT last_pull_at FROM _sync_meta WHERE table_name = ?`,
        [table],
      );
      const since = meta[0]?.last_pull_at || '1970-01-01T00:00:00.000Z';

      try {
        const response = await fetch(
          `${this.options.apiBaseUrl}/sync/pull?since=${encodeURIComponent(since)}&tables=${table}`,
          {
            headers: {
              ...(this.options.getToken() ? { Authorization: `Bearer ${this.options.getToken()}` } : {}),
            },
            credentials: 'include',
          },
        );

        if (!response.ok) continue;

        const data = await response.json() as PullResult;
        result.records[table] = (data.records as any)?.[table] || [];
        result.serverTimestamp = data.serverTimestamp || result.serverTimestamp;

        for (const record of result.records[table]) {
          await this.applyPulledRecord(table, record);
        }

        await this.storage.execute(
          `UPDATE _sync_meta SET last_pull_at = ? WHERE table_name = ?`,
          [result.serverTimestamp, table],
        );
      } catch (err: any) {
        console.warn(`[Sync] Pull failed for ${table}:`, err.message);
      }
    }

    return result;
  }

  async enqueueChange(table: string, recordId: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: Record<string, unknown>): Promise<void> {
    await this.storage.execute(
      `INSERT INTO _sync_queue (table_name, record_id, operation, data, created_at, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [table, recordId, operation, JSON.stringify(data), new Date().toISOString()],
    );
  }

  async getStatus(): Promise<SyncStatus> {
    const pending = await this.storage.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM _sync_queue WHERE status = 'pending'`,
    );
    const conflicts = await this.storage.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM _conflicts WHERE resolved_at IS NULL`,
    );
    const lastMeta = await this.storage.query<{ last_pull_at: string; last_push_at: string }>(
      `SELECT MAX(last_pull_at) as last_pull_at, MAX(last_push_at) as last_push_at FROM _sync_meta`,
    );

    return {
      isOnline: typeof globalThis !== 'undefined' && 'navigator' in globalThis ? (globalThis as any).navigator?.onLine ?? true : true,
      lastPullAt: lastMeta[0]?.last_pull_at || null,
      lastPushAt: lastMeta[0]?.last_push_at || null,
      pendingChanges: pending[0]?.count || 0,
      conflicts: conflicts[0]?.count || 0,
    };
  }

  async getConflicts(): Promise<SyncConflict[]> {
    const rows = await this.storage.query<{
      id: number;
      table_name: string;
      record_id: string;
      local_data: string;
      server_data: string;
      resolution: string | null;
      created_at: string;
      resolved_at: string | null;
    }>(`SELECT * FROM _conflicts WHERE resolved_at IS NULL ORDER BY created_at ASC`);

    return rows.map(r => ({
      id: r.id,
      table: r.table_name,
      recordId: r.record_id,
      localData: JSON.parse(r.local_data),
      serverData: JSON.parse(r.server_data),
      resolution: r.resolution as any,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at || undefined,
    }));
  }

  async resolveConflict(conflictId: number, resolution: 'local_wins' | 'server_wins', resolvedData?: Record<string, unknown>): Promise<void> {
    const conflicts = await this.storage.query<{ table_name: string; record_id: string; local_data: string; server_data: string }>(
      `SELECT * FROM _conflicts WHERE id = ?`,
      [conflictId],
    );
    if (conflicts.length === 0) throw new Error('Conflict not found');

    const conflict = conflicts[0];
    const data = resolvedData || (resolution === 'local_wins' ? JSON.parse(conflict.local_data) : JSON.parse(conflict.server_data));

    if (resolution === 'local_wins') {
      await this.enqueueChange(conflict.table_name, conflict.record_id, 'UPDATE', data);
    }

    await this.storage.execute(
      `UPDATE _conflicts SET resolution = ?, resolved_data = ?, resolved_at = ? WHERE id = ?`,
      [resolution, JSON.stringify(data), new Date().toISOString(), conflictId],
    );
  }

  async clearLocalData(): Promise<void> {
    for (const table of this.options.tables) {
      await this.storage.execute(`DELETE FROM ${table}`);
    }
    await this.storage.execute(`DELETE FROM _sync_queue`);
    await this.storage.execute(`DELETE FROM _conflicts`);
  }

  private async getPendingChanges(): Promise<SyncChange[]> {
    const rows = await this.storage.query<{
      id: number;
      table_name: string;
      record_id: string;
      operation: string;
      data: string;
      created_at: string;
      retry_count: number;
      last_error: string | null;
      status: string;
    }>(`SELECT * FROM _sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ${this.options.batchSize * 3}`);

    return rows.map(r => ({
      id: r.id.toString(),
      table: r.table_name,
      recordId: r.record_id,
      operation: r.operation as any,
      data: JSON.parse(r.data || '{}'),
      clientTimestamp: r.created_at,
      status: 'pending' as const,
      retryCount: r.retry_count,
      lastError: r.last_error || undefined,
    }));
  }

  private async markBatchSyncing(batch: SyncChange[]): Promise<void> {
    for (const change of batch) {
      await this.storage.execute(
        `UPDATE _sync_queue SET status = 'syncing' WHERE id = ?`,
        [change.id],
      );
    }
  }

  private async markChangeSynced(recordId: string): Promise<void> {
    await this.storage.execute(
      `UPDATE _sync_queue SET status = 'synced' WHERE record_id = ? AND status = 'syncing'`,
      [recordId],
    );
  }

  private async markChangeFailed(id: string, error: string): Promise<void> {
    await this.storage.execute(
      `UPDATE _sync_queue SET status = 'failed', last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [error, id],
    );
  }

  private async recordConflict(change: SyncChange, serverData: Record<string, unknown>): Promise<void> {
    await this.storage.execute(
      `INSERT INTO _conflicts (table_name, record_id, local_data, server_data, created_at) VALUES (?, ?, ?, ?, ?)`,
      [change.table, change.recordId, JSON.stringify(change.data), JSON.stringify(serverData), new Date().toISOString()],
    );
  }

  private async applyPulledRecord(table: string, record: Record<string, unknown>): Promise<void> {
    const local = await this.storage.query<{ _dirty: number }>(
      `SELECT _dirty FROM ${table} WHERE id = ?`,
      [record.id],
    );

    if (local.length > 0 && local[0]._dirty === 1) {
      await this.storage.execute(
        `UPDATE ${table} SET _conflict = 'server_updated' WHERE id = ?`,
        [record.id],
      );
      this.options.onConflict?.({
        id: 0,
        table,
        recordId: record.id as string,
        localData: {},
        serverData: record,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const fields = Object.keys(record).filter(k => !k.startsWith('_'));
    const values = Object.values(record).filter((_, i) => !Object.keys(record)[i].startsWith('_'));
    const setClauses = fields.map(f => `${f} = ?`).join(', ');

    if (local.length > 0) {
      await this.storage.execute(
        `UPDATE ${table} SET ${setClauses}, _dirty = 0, _last_modified = ? WHERE id = ?`,
        [...values, new Date().toISOString(), record.id],
      );
    } else {
      const placeholders = fields.map(() => '?').join(', ');
      await this.storage.execute(
        `INSERT INTO ${table} (${fields.join(', ')}, _dirty, _last_modified) VALUES (${placeholders}, 0, ?)`,
        [...values, new Date().toISOString()],
      );
    }
  }

  private async updateSyncTimestamps(): Promise<void> {
    const now = new Date().toISOString();
    await this.storage.execute(`UPDATE _sync_meta SET last_push_at = ?`, [now]);
  }

  private reportProgress(phase: SyncProgress['phase'], current: number, total: number, message: string): void {
    this.options.onProgress?.({ phase, current, total, message });
  }

  private batch<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }
}
