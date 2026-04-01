import { app, BrowserWindow, ipcMain, net as electronNet, shell } from 'electron';
import * as path from 'path';
import { initDatabase, getDb, createDbAdapter } from './db/database';
import { DesktopSyncEngine } from './sync/desktop-sync-engine';
import { AuthStore } from './auth/auth-store';
import { configureRenderer } from './renderer';
import { DesktopAnalytics } from './analytics/desktop-analytics';
import { LocalFrontendServer } from './local-frontend-server';
import { LocalSessionStore, type LocalSessionRecord } from './local/local-session-store';
import { LocalDataStore, type LocalDataState } from './local/local-data-store';
import { JsonSqliteBridge } from './local/json-sqlite-bridge';

let mainWindow: BrowserWindow | null = null;
let syncEngine: DesktopSyncEngine | null = null;
let authStore: AuthStore | null = null;
let analytics: DesktopAnalytics | null = null;
let localFrontendServer: LocalFrontendServer | null = null;
let localSessionStore: LocalSessionStore | null = null;
let localDataStore: LocalDataStore | null = null;
const gotTheLock = app.requestSingleInstanceLock();
app.setAppUserModelId('in.klypso.nexus');

if (!gotTheLock) {
  app.quit();
}

async function createWindow() {
  await initDatabase();
  authStore = new AuthStore();
  syncEngine = new DesktopSyncEngine(getDb());
  analytics = new DesktopAnalytics(createDbAdapter());
  localSessionStore = new LocalSessionStore();
  localDataStore = new LocalDataStore();
  const frontendBaseUrl = await resolveFrontendBaseUrl();
  const allowedOrigin = new URL(frontendBaseUrl).origin;

  // Restore token if saved
  const savedToken = authStore.getToken();
  if (savedToken) {
    syncEngine.setToken(savedToken);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Klypso Nexus ERP',
    icon: resolveWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(frontendBaseUrl)) {
      return { action: 'allow' };
    }

    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (new URL(navigationUrl).origin !== allowedOrigin) {
      event.preventDefault();
      void shell.openExternal(navigationUrl);
    }
  });

  await mainWindow.loadURL(`${frontendBaseUrl}/login`);

  configureRenderer(mainWindow, [allowedOrigin]);

  // Track session start
  void analytics?.trackEvent('session', 'start', { platform: 'windows' });


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('sync:execute', async () => {
  if (!syncEngine) return { error: 'Sync engine not initialized' };
  analytics?.trackEvent('sync', 'manual_sync_start', {});
  const result = await syncEngine.sync();
  analytics?.trackEvent('sync', 'manual_sync_complete', {
    phase: result.phase,
    pushed: result.pushedCount,
    pulled: result.pulledCount,
    conflicts: result.conflictCount,
  });

  // Pull new data from SQLite back into the UI state
  if (localDataStore && result.pulledCount && result.pulledCount > 0) {
    const currentState = localDataStore.get();
    const updatedState = await JsonSqliteBridge.syncSqliteToJson(currentState);
    localDataStore.set(updatedState);
  }

  return result;
});

ipcMain.handle('sync:status', async () => {
  if (!syncEngine) return { pendingChanges: 0, conflicts: 0, isOnline: false };
  return syncEngine.getStatus();
});

ipcMain.handle('sync:resolve', async (_event, conflicts) => {
  if (!syncEngine) return { resolved: 0 };
  return syncEngine.resolveConflicts(conflicts);
});

ipcMain.handle('auth:getToken', async () => {
  if (!authStore) return null;
  return authStore.getToken();
});

ipcMain.handle('auth:setToken', async (_event, token) => {
  if (!authStore) return;
  authStore.setToken(token);
});

ipcMain.handle('auth:clearToken', async () => {
  if (!authStore) return;
  authStore.clearToken();
});

ipcMain.handle('session:get', async () => {
  return localSessionStore?.get() ?? null;
});

ipcMain.handle('session:set', async (_event, session: LocalSessionRecord) => {
  if (!localSessionStore) {
    localSessionStore = new LocalSessionStore();
  }

  return localSessionStore.set(session);
});

ipcMain.handle('session:clear', async () => {
  localSessionStore?.clear();
});

ipcMain.handle('offline:isOnline', () => {
  return electronNet.isOnline();
});

ipcMain.handle('db:query', async (_event, sql, params) => {
  if (!syncEngine) return [];
  return syncEngine.query(sql, params);
});

ipcMain.handle('local-data:get', async () => {
  if (!localDataStore) {
    localDataStore = new LocalDataStore();
  }

  return localDataStore.get();
});

ipcMain.handle('local-data:set', async (_event, state: LocalDataState) => {
  if (!localDataStore) {
    localDataStore = new LocalDataStore();
  }

  const oldState = localDataStore.get();
  const nextState = localDataStore.set(state);
  
  // Push changed JSON arrays down to SQLite so Sync Engine sees them
  await JsonSqliteBridge.syncJsonToSqlite(oldState, nextState);
  return nextState;
});

ipcMain.handle('local-data:reset', async () => {
  if (!localDataStore) {
    localDataStore = new LocalDataStore();
  }

  return localDataStore.reset();
});

ipcMain.handle('analytics:track', async (_event, eventType, eventName, metadata) => {
  if (!analytics) return;
  await analytics.trackEvent(eventType, eventName, metadata || {});
});

ipcMain.handle('analytics:stats', async () => {
  if (!analytics) return { totalEvents: 0, sessions: 0, syncEvents: 0, lastActivity: null };
  return analytics.getStats();
});

ipcMain.handle('analytics:events', async (_event, since) => {
  if (!analytics) return [];
  return analytics.getEvents(since);
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(() => void createWindow());

app.on('before-quit', () => {
  localFrontendServer?.stop();
  localFrontendServer = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    localFrontendServer?.stop();
    localFrontendServer = null;
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

async function resolveFrontendBaseUrl(): Promise<string> {
  const configuredFrontendUrl = process.env.NEXUS_FRONTEND_URL?.trim();
  if (configuredFrontendUrl) {
    return configuredFrontendUrl.replace(/\/$/, '');
  }

  if (!localFrontendServer) {
    localFrontendServer = new LocalFrontendServer(process.env.NEXUS_BACKEND_URL);
  }

  return localFrontendServer.start();
}

function resolveWindowIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.ico');
  }

  return path.join(__dirname, '..', 'build', 'icon.ico');
}
