export interface SyncChange {
  id: string;
  table: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  clientTimestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface SyncConflict {
  id: number;
  table: string;
  recordId: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  resolvedData?: Record<string, unknown>;
  resolution?: 'local_wins' | 'server_wins' | 'manual';
  createdAt: string;
  resolvedAt?: string;
}

export interface PullResult {
  records: Record<string, Record<string, unknown>[]>;
  serverTimestamp: string;
}

export interface PushResult {
  id: string;
  status: 'ok' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastPullAt: string | null;
  lastPushAt: string | null;
  pendingChanges: number;
  conflicts: number;
}

export interface SyncOptions {
  apiBaseUrl: string;
  getToken: () => string | null;
  tables: string[];
  batchSize: number;
  maxRetries: number;
  onProgress?: (progress: SyncProgress) => void;
  onConflict?: (conflict: SyncConflict) => void;
}

export interface SyncProgress {
  phase: 'push' | 'pull' | 'resolve' | 'idle';
  current: number;
  total: number;
  message: string;
}

export interface LocalRecord {
  id: string;
  [key: string]: unknown;
  _sync_version: number;
  _dirty: number;
  _deleted: number;
  _last_modified: string;
  _conflict?: string;
}

export interface StorageAdapter {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(fn: () => Promise<void>): Promise<void>;
}
