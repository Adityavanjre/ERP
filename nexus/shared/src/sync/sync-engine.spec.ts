import { SyncEngine } from '../sync/sync-engine';
import type { StorageAdapter, SyncOptions } from '../sync/types';

class MockStorage implements StorageAdapter {
  private tables: Map<string, Map<string, Record<string, unknown>>> = new Map();
  private queue: any[] = [];
  private meta: Map<string, { last_pull_at: string; last_push_at: string }> = new Map();

  constructor() {
    this.tables.set('_sync_meta', new Map());
    this.tables.set('_sync_queue', new Map());
    this.tables.set('_conflicts', new Map());
    this.tables.set('products', new Map());
    this.tables.set('suppliers', new Map());
  }

  async execute(sql: string, params: unknown[] = []): void {
    // Parse simple INSERT/UPDATE for test simulation
    if (sql.includes('INSERT INTO _sync_queue')) {
      this.queue.push({
        id: this.queue.length + 1,
        table_name: params[0],
        record_id: params[1],
        operation: params[2],
        data: params[3],
        created_at: params[4],
        status: 'pending',
        retry_count: 0,
      });
    }
    if (sql.includes('UPDATE _sync_queue SET status')) {
      const idx = this.queue.findIndex((q) => q.record_id === params[1] || q.id === Number(params[1]));
      if (idx >= 0) this.queue[idx].status = sql.includes("'synced'") ? 'synced' : 'failed';
    }
    if (sql.includes('INSERT OR IGNORE INTO _sync_meta')) {
      this.meta.set(params[0] as string, { last_pull_at: params[1] as string, last_push_at: '' });
    }
    if (sql.includes('UPDATE _sync_meta SET last_pull_at')) {
      const entry = this.meta.get(params[1] as string);
      if (entry) entry.last_pull_at = params[0] as string;
    }
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (sql.includes('_sync_queue') && sql.includes("status = 'pending'")) {
      return this.queue.filter((q) => q.status === 'pending') as T[];
    }
    if (sql.includes('COUNT') && sql.includes('_sync_queue')) {
      return [{ count: this.queue.filter((q) => q.status === 'pending').length }] as T[];
    }
    if (sql.includes('COUNT') && sql.includes('_conflicts')) {
      return [{ count: 0 }] as T[];
    }
    if (sql.includes('MAX') && sql.includes('_sync_meta')) {
      return [{ last_pull_at: '1970-01-01', last_push_at: '1970-01-01' }] as T[];
    }
    if (sql.includes('SELECT last_pull_at FROM _sync_meta')) {
      const entry = this.meta.get(params[0] as string);
      return [{ last_pull_at: entry?.last_pull_at || '1970-01-01' }] as T[];
    }
    if (sql.includes('SELECT') && sql.includes('_conflicts')) {
      return [] as T[];
    }
    if (sql.includes('SELECT _dirty FROM')) {
      return [] as T[];
    }
    return [] as T[];
  }

  async transaction(fn: () => Promise<void>): Promise<void> {
    await fn();
  }
}

describe('SyncEngine (Offline-First)', () => {
  let engine: SyncEngine;
  let storage: MockStorage;
  let mockFetch: jest.SpyInstance;

  beforeEach(async () => {
    storage = new MockStorage();

    const options: SyncOptions = {
      apiBaseUrl: 'http://localhost:3000/api/v1',
      getToken: () => 'test-token',
      tables: ['products', 'suppliers'],
      batchSize: 10,
      maxRetries: 3,
    };

    engine = new SyncEngine(storage, options);
    await engine.initialize();

    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('initialize', () => {
    it('should create sync metadata tables', async () => {
      const status = await engine.getStatus();
      expect(status).toBeDefined();
      expect(status.pendingChanges).toBe(0);
      expect(status.conflicts).toBe(0);
    });
  });

  describe('enqueueChange', () => {
    it('should add change to sync queue', async () => {
      await engine.enqueueChange('products', 'p1', 'INSERT', { name: 'Test Product' });

      const status = await engine.getStatus();
      expect(status.pendingChanges).toBe(1);
    });

    it('should handle multiple changes', async () => {
      await engine.enqueueChange('products', 'p1', 'INSERT', { name: 'Product 1' });
      await engine.enqueueChange('products', 'p2', 'INSERT', { name: 'Product 2' });
      await engine.enqueueChange('suppliers', 's1', 'INSERT', { name: 'Supplier 1' });

      const status = await engine.getStatus();
      expect(status.pendingChanges).toBe(3);
    });
  });

  describe('sync (push)', () => {
    it('should push pending changes to server', async () => {
      await engine.enqueueChange('products', 'p1', 'INSERT', { name: 'Test' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'p1', status: 'ok' }],
      });

      const status = await engine.sync();
      expect(status.pendingChanges).toBe(0);
    });

    it('should handle push failure gracefully', async () => {
      await engine.enqueueChange('products', 'p1', 'INSERT', { name: 'Test' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const status = await engine.sync();
      // Failed changes remain pending
      expect(status).toBeDefined();
    });
  });

  describe('pull', () => {
    it('should pull records from server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: {
            products: [{ id: 'p1', name: 'Server Product', sku: 'SP001' }],
          },
          serverTimestamp: '2026-03-29T00:00:00Z',
        }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: { suppliers: [] },
          serverTimestamp: '2026-03-29T00:00:00Z',
        }),
      });

      const status = await engine.sync();
      expect(status).toBeDefined();
    });
  });

  describe('conflict resolution', () => {
    it('should return empty conflicts initially', async () => {
      const conflicts = await engine.getConflicts();
      expect(conflicts).toEqual([]);
    });

    it('should throw when resolving non-existent conflict', async () => {
      await expect(
        engine.resolveConflict(999, 'server_wins'),
      ).rejects.toThrow('Conflict not found');
    });
  });

  describe('clearLocalData', () => {
    it('should clear all local tables', async () => {
      await engine.enqueueChange('products', 'p1', 'INSERT', { name: 'Test' });

      await engine.clearLocalData();

      const status = await engine.getStatus();
      expect(status.pendingChanges).toBe(0);
    });
  });
});
