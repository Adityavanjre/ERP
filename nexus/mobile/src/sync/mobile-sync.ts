import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

// API URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://nexus.klypso.in';

// Network Status Interface
interface NetworkStatus {
  isOnline(): boolean;
  onNetworkChange(callback: (online: boolean) => void): () => void;
}

// API Client Interface  
interface ApiClient {
  setToken(token: string): void;
  async post<T>(path: string, body: unknown): Promise<T>;
  async get<T>(path: string, params?: Record<string, string>): Promise<T>;
}

// FIX CRIT-001: Implement proper NetworkStatus with real network detection
class MobileNetworkStatus implements NetworkStatus {
  private isConnected: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.initNetworkListener();
  }

  private async initNetworkListener(): Promise<void> {
    try {
      // Get initial state
      const state = await NetInfo.fetch();
      this.isConnected = state.isConnected ?? false;
      
      // Subscribe to changes
      NetInfo.addEventListener(netState => {
        const wasConnected = this.isConnected;
        this.isConnected = netState.isConnected ?? false;
        
        // Notify listeners of changes
        if (wasConnected !== this.isConnected) {
          this.listeners.forEach(callback => {
            try {
              callback(this.isConnected);
            } catch (err) {
              console.error('[NetworkStatus] Listener error:', err);
            }
          });
        }
      });
    } catch (err) {
      console.error('[NetworkStatus] Failed to initialize:', err);
      this.isConnected = true; // Default to online if detection fails
    }
  }

  isOnline(): boolean {
    return this.isConnected;
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

// Mobile API Client using expo-sqlite for token storage
class MobileApiClient implements ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await axios.post(`${API_URL}${path}`, body, { headers: this.getHeaders() });
    return res.data;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await axios.get(`${API_URL}${path}`, { headers: this.getHeaders() });
    return res.data;
  }
}

// Sync Engine implementation
interface SyncProgress {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

interface SyncStatus {
  lastSyncAt: string | null;
  pendingChanges: number;
  isSyncing: boolean;
}

class MobileSyncEngine {
  private apiClient: MobileApiClient;
  private networkStatus: MobileNetworkStatus;
  private isSyncing: boolean = false;
  private pendingQueue: any[] = [];

  constructor(apiClient: ApiClient, networkStatus: NetworkStatus) {
    this.apiClient = apiClient as MobileApiClient;
    this.networkStatus = networkStatus as MobileNetworkStatus;
  }

  async sync(): Promise<SyncProgress> {
    if (this.isSyncing) {
      return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Sync already in progress'] };
    }

    if (!this.networkStatus.isOnline()) {
      return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Offline - sync deferred'] };
    }

    this.isSyncing = true;
    const result: SyncProgress = { pushed: 0, pulled: 0, conflicts: 0, errors: [] };

    try {
      // Push pending changes
      for (const change of this.pendingQueue) {
        try {
          await this.apiClient.post('/sync/push', change);
          result.pushed++;
        } catch (err) {
          result.errors.push(err instanceof Error ? err.message : 'Push failed');
        }
      }
      this.pendingQueue = [];

      // Pull server changes
      try {
        const serverChanges = await this.apiClient.get<any[]>('/sync/pull');
        result.pulled = serverChanges?.length ?? 0;
      } catch (err) {
        result.errors.push(err instanceof Error ? err.message : 'Pull failed');
      }

      // Clear pending queue on success
      this.pendingQueue = [];
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  getStatus(): SyncStatus {
    return {
      lastSyncAt: null,
      pendingChanges: this.pendingQueue.length,
      isSyncing: this.isSyncing
    };
  }

  queueChange(change: any) {
    this.pendingQueue.push(change);
  }
}

let engine: MobileSyncEngine | null = null;
let apiClient: MobileApiClient | null = null;
let networkStatus: MobileNetworkStatus | null = null;

export function getMobileSyncEngine(): MobileSyncEngine {
  if (!engine) {
    apiClient = new MobileApiClient();
    networkStatus = new MobileNetworkStatus();
    engine = new MobileSyncEngine(apiClient, networkStatus);
  }
  return engine;
}

export async function setMobileToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('nexus_token', token);
  if (apiClient) apiClient.setToken(token);
}

export async function loadMobileToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync('nexus_token');
  if (token && apiClient) apiClient.setToken(token);
  return token;
}

export async function mobileSync(): Promise<SyncProgress> {
  const engine = getMobileSyncEngine();
  return engine.sync();
}

export async function mobileSyncStatus(): Promise<SyncStatus> {
  const engine = getMobileSyncEngine();
  return engine.getStatus();
}

// FIX-002: Export network status for UI components
export function getNetworkStatus(): { isOnline: boolean; subscribe: (callback: (online: boolean) => void) => () => void } {
  if (!networkStatus) {
    networkStatus = new MobileNetworkStatus();
  }
  return {
    isOnline: networkStatus.isOnline(),
    subscribe: (callback: (online: boolean) => void) => networkStatus!.onNetworkChange(callback)
  };
}
