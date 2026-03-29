export interface SyncableRecord {
  id: string;
  tenantId: string;
  _sync_version: number;
  _dirty: boolean;
  _deleted: boolean;
  _last_modified: string;
  _conflict: string | null;
}

export interface SyncMeta {
  table_name: string;
  last_pull_at: string | null;
  last_push_at: string | null;
}

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: string | null;
  created_at: string;
  retry_count: number;
  last_error: string | null;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface ConflictRecord {
  id?: number;
  table_name: string;
  record_id: string;
  local_data: string;
  server_data: string;
  resolved_data: string | null;
  resolution: 'local_wins' | 'server_wins' | 'manual' | null;
  created_at: string;
  resolved_at: string | null;
}

export type TableName = 'products' | 'suppliers' | 'customers' | 'purchase_orders' | 'stock_movements' | 'invoices' | 'payments';

export interface PushChange {
  table: TableName;
  id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  clientTimestamp: string;
}

export interface PushRequest {
  changes: PushChange[];
}

export interface PushResult {
  id: string;
  status: 'ok' | 'conflict' | 'error';
  serverData?: Record<string, unknown>;
  error?: string;
}

export interface PushResponse {
  results: PushResult[];
}

export interface PullResponse {
  records: Record<TableName, Record<string, unknown>[]>;
  serverTimestamp: string;
}

export interface SyncStatus {
  pendingChanges: number;
  lastSync: string | null;
  conflicts: number;
  isOnline: boolean;
}

export type ConflictResolution = 'local_wins' | 'server_wins' | 'manual';

export interface ConflictResolveRequest {
  conflicts: Array<{
    table: TableName;
    id: string;
    resolution: ConflictResolution;
    mergedData?: Record<string, unknown>;
  }>;
}

export interface SyncProgress {
  phase: 'idle' | 'pushing' | 'pulling' | 'resolving' | 'complete' | 'error';
  pushedCount: number;
  pulledCount: number;
  conflictCount: number;
  error?: string;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;
