import type {
  TableName,
  PushChange,
  PushRequest,
  PushResponse,
  PullResponse,
  SyncProgress,
  SyncProgressCallback,
  SyncStatus,
  ConflictResolveRequest,
} from '../types/sync.types';
import { ChangeTracker, type DBAdapter } from './change-tracker';
import { ConflictResolver } from '../conflict/conflict-resolver';

const SYNC_TABLES: TableName[] = [
  'products',
  'suppliers',
  'customers',
  'purchase_orders',
  'stock_movements',
];

export interface ApiClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
}

export interface NetworkStatus {
  isOnline(): boolean;
}

export class SyncEngine {
  private tracker: ChangeTracker;
  private resolver: ConflictResolver;

  constructor(
    private db: DBAdapter,
    private api: ApiClient,
    private network: NetworkStatus,
    private onProgress?: SyncProgressCallback
  ) {
    this.tracker = new ChangeTracker(db);
    this.resolver = new ConflictResolver(db);
  }

  async getStatus(): Promise<SyncStatus> {
    const pendingChanges = await this.tracker.getPendingCount();
    const conflicts = await this.resolver.getConflictCount();
    const lastPull = await this.tracker.getLastPullAt('products');

    return {
      pendingChanges,
      lastSync: lastPull,
      conflicts,
      isOnline: this.network.isOnline(),
    };
  }

  async sync(): Promise<SyncProgress> {
    if (!this.network.isOnline()) {
      return this.reportProgress('error', 0, 0, 0, 'No network connection');
    }

    await this.tracker.resetStuckSyncing();
    await this.tracker.clearFailedRetries();

    try {
      const pushResult = await this.push();
      const pullResult = await this.pull();

      return this.reportProgress(
        'complete',
        pushResult.pushed,
        pullResult.pulled,
        pushResult.conflicts
      );
    } catch (err: any) {
      return this.reportProgress('error', 0, 0, 0, err.message);
    }
  }

  async push(): Promise<{ pushed: number; conflicts: number }> {
    this.reportProgress('pushing', 0, 0, 0);

    const pending = await this.tracker.getPendingChanges();
    if (pending.length === 0) return { pushed: 0, conflicts: 0 };

    const changes: PushChange[] = [];
    for (const item of pending) {
      const table = item.table_name as TableName;
      await this.tracker.markSyncing(table, item.record_id);

      let data: Record<string, unknown> | null = null;
      if (item.operation !== 'DELETE') {
        data = await this.tracker.getRecordData(table, item.record_id);
      }

      changes.push({
        table,
        id: item.record_id,
        operation: item.operation,
        data: data ?? {},
        clientTimestamp: item.created_at,
      });
    }

    let response: PushResponse;
    try {
      response = await this.api.post<PushResponse>('/api/v1/sync/push', { changes });
    } catch (err: any) {
      for (const change of changes) {
        await this.tracker.markFailed(change.table, change.id, err.message);
      }
      throw err;
    }

    let pushed = 0;
    let conflictCount = 0;

    for (const result of response.results) {
      const matchingChange = changes.find(c => c.id === result.id);
      if (!matchingChange) continue;

      if (result.status === 'ok') {
        await this.tracker.markSynced(matchingChange.table, matchingChange.id);
        pushed++;
      } else if (result.status === 'conflict') {
        const localData = matchingChange.data;
        if (result.serverData) {
          await this.resolver.recordConflict(
            matchingChange.table,
            matchingChange.id,
            localData,
            result.serverData
          );
        }
        await this.tracker.markSynced(matchingChange.table, matchingChange.id);
        conflictCount++;
      } else {
        await this.tracker.markFailed(
          matchingChange.table,
          matchingChange.id,
          result.error || 'Unknown error'
        );
      }
    }

    const now = new Date().toISOString();
    for (const table of SYNC_TABLES) {
      await this.tracker.setLastPushAt(table, now);
    }

    return { pushed, conflicts: conflictCount };
  }

  async pull(): Promise<{ pulled: number }> {
    this.reportProgress('pulling', 0, 0, 0);

    const since = await this.tracker.getLastPullAt('products') || '1970-01-01T00:00:00Z';
    const tablesParam = SYNC_TABLES.join(',');

    let response: PullResponse;
    try {
      response = await this.api.get<PullResponse>(
        `/api/v1/sync/pull?since=${encodeURIComponent(since)}&tables=${tablesParam}`
      );
    } catch (err: any) {
      throw new Error(`Pull failed: ${err.message}`);
    }

    let pulled = 0;
    const now = new Date().toISOString();

    for (const table of SYNC_TABLES) {
      const records = response.records[table];
      if (!records || records.length === 0) continue;

      for (const record of records) {
        const recordId = record.id as string;
        const localRecord = await this.db.get<{ _dirty: number; _deleted: number }>(
          `SELECT _dirty, _deleted FROM ${table} WHERE id = ?`,
          [recordId]
        );

        if (localRecord?._dirty === 1) {
          await this.resolver.recordConflict(
            table,
            recordId,
            (await this.tracker.getRecordData(table, recordId)) ?? {},
            record
          );
          continue;
        }

        if (localRecord) {
          const columns = Object.keys(record).filter(k => !k.startsWith('_'));
          const setClauses = columns.map(c => `${this.camelToSnake(c)} = ?`).join(', ');
          const values = columns.map(c => record[c]);
          await this.db.run(
            `UPDATE ${table} SET ${setClauses}, _dirty = 0, _last_modified = ? WHERE id = ?`,
            [...values, now, recordId]
          );
        } else {
          const columns = Object.keys(record).filter(k => !k.startsWith('_'));
          const placeholders = columns.map(() => '?').join(', ');
          const colNames = columns.map(c => this.camelToSnake(c)).join(', ');
          const values = columns.map(c => record[c]);
          await this.db.run(
            `INSERT INTO ${table} (${colNames}, _dirty, _last_modified) VALUES (${placeholders}, 0, ?)`,
            [...values, now]
          );
        }
        pulled++;
      }

      await this.tracker.setLastPullAt(table, response.serverTimestamp);
    }

    return { pulled };
  }

  async resolveConflicts(req: ConflictResolveRequest): Promise<number> {
    let resolved = 0;
    for (const item of req.conflicts) {
      const conflict = await this.db.get<{ id: number }>(
        `SELECT id FROM _conflicts WHERE table_name = ? AND record_id = ? AND resolved_at IS NULL`,
        [item.table, item.id]
      );
      if (conflict) {
        await this.resolver.resolveConflict(conflict.id, item.resolution, item.mergedData);
        resolved++;
      }
    }
    return resolved;
  }

  private reportProgress(
    phase: SyncProgress['phase'],
    pushedCount: number,
    pulledCount: number,
    conflictCount: number,
    error?: string
  ): SyncProgress {
    const progress: SyncProgress = { phase, pushedCount, pulledCount, conflictCount, error };
    if (this.onProgress) this.onProgress(progress);
    return progress;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
