import Database from 'better-sqlite3';
import { net } from 'electron';
import {
  SyncEngine,
  type DBAdapter,
  type ApiClient,
  type NetworkStatus,
  type SyncProgress,
  type SyncStatus,
} from '@nexus/sync-engine';
import * as https from 'https';
import * as http from 'http';

class SqliteAdapter implements DBAdapter {
  constructor(private db: Database.Database) {}

  async run(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }

  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }
}

class DesktopApiClient implements ApiClient {
  // Confirmed production endpoint — no probing needed
  private readonly baseUrl = 'https://klypso.in/portal/api/v1';
  private token: string | null = null;
  private priorityOnly: boolean = false;

  setToken(token: string) {
    this.token = token;
  }

  setPriorityMode(enabled: boolean) {
    this.priorityOnly = enabled;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let rawPath = path.startsWith('/') ? path : `/${path}`;
    if (rawPath.startsWith('/api/v1')) {
      rawPath = rawPath.replace('/api/v1', '');
    }
    let url = `${this.baseUrl}${rawPath}`;

    // MICRO-SYNC: If in priority mode during a pull, restrict the tables to UI-critical ones
    if (this.priorityOnly && method === 'GET' && path.includes('/sync/pull')) {
      const priorityTables = 'users,tenants,workspaces,modules,permissions,categories,system_configs';
      const urlObj = new URL(url);
      urlObj.searchParams.set('tables', priorityTables);
      url = urlObj.toString();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || '443',
        path: urlObj.pathname + urlObj.search,
        method,
        headers,
        timeout: 60000, // 60s for Render warmup
      };

      const proto = urlObj.protocol === 'https:' ? https : http;
      const req = proto.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
            // MANUAL-ONLY: Do not auto-retry sync requests.
            // One explicit user click should produce one server attempt.
            if (res.statusCode === 429) {
              reject(new Error('Too many requests. Desktop sync is paused until you retry manually.'));
              return;
            }

            // 503/504 = Server waking up - surface error immediately without automatic retries
            if (res.statusCode === 503 || res.statusCode === 504 || res.statusCode === 502) {
              reject(new Error('Klypso Cloud is waking up from sleep. Please wait 60 seconds and try syncing again.'));
              return;
            }

            // 401 = JWT expired — surface a clean error to the UI
            if (res.statusCode === 401) {
              reject(new Error('UNAUTHORIZED: Cloud session expired. Please sign in again.'));
              return;
            }

            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`Request failed with status ${res.statusCode ?? 'unknown'}: ${data.slice(0, 300)}`));
              return;
            }

            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
            }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Klypso Cloud timed out. The server is waking up — please try again in 30 seconds.'));
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<T>('GET', `${path}${query}`);
  }
}

class DesktopNetworkStatus implements NetworkStatus {
  isOnline(): boolean {
    return net.isOnline();
  }
}

export class DesktopSyncEngine {
  private engine: SyncEngine;
  private api: DesktopApiClient;
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    const adapter = new SqliteAdapter(db);
    this.api = new DesktopApiClient();
    const network = new DesktopNetworkStatus();
    this.engine = new SyncEngine(adapter, this.api, network);
  }

  async sync(): Promise<SyncProgress> {
    this.api.setPriorityMode(false);
    return this.engine.sync();
  }

  async bootstrapSync(): Promise<SyncProgress> {
    console.log('[SYNC] Starting Priority Bootstrap (UI First)...');
    this.api.setPriorityMode(true);
    const result = await this.engine.sync();
    this.api.setPriorityMode(false);
    return result;
  }

  async getStatus(): Promise<SyncStatus> {
    return this.engine.getStatus();
  }

  async resolveConflicts(conflicts: any[]): Promise<{ resolved: number }> {
    const result = await this.engine.resolveConflicts({ conflicts });
    return { resolved: result };
  }

  setToken(token: string): void {
    this.api.setToken(token);
  }

  query(sql: string, params: unknown[] = []): any[] {
    return this.db.prepare(sql).all(...params);
  }
}
