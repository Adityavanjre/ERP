import { app, BrowserWindow, ipcMain, net as electronNet, shell, dialog, session } from 'electron';
import axios from 'axios';
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
app.name = 'Klypso ERP';
app.setAppUserModelId('in.klypso.erp');

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
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Klypso ERP',
    icon: resolveWindowIconPath(),
    show: false, // Don't show until ready or loading is set
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // LOCAL-FIRST: Show loading screen immediately
  const loadingPath = path.join(__dirname, 'loading.html');
  await mainWindow.loadFile(loadingPath);
  mainWindow.show();

  // Background Bootstrapping
  void (async () => {
    try {
      const frontendBaseUrl = await resolveFrontendBaseUrl();
      const allowedOrigin = new URL(frontendBaseUrl).origin;
      const initialUrl = await getInitialUrl(frontendBaseUrl);
      
      // Security: Handle external links
      mainWindow!.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith(frontendBaseUrl)) {
          return { action: 'allow' };
        }
        void shell.openExternal(url);
        return { action: 'deny' };
      });

      // Security: Restrict navigation
      mainWindow!.webContents.on('will-navigate', (event, navigationUrl) => {
        const url = new URL(navigationUrl);
        if (url.origin !== allowedOrigin) {
          event.preventDefault();
          void shell.openExternal(navigationUrl);
        }
      });

      // UX: Handle unsaved changes
      mainWindow!.webContents.on('will-prevent-unload', (event) => {
        const choice = dialog.showMessageBoxSync(mainWindow!, {
          type: 'question',
          buttons: ['Leave and Lose Changes', 'Stay'],
          title: 'Unsaved Changes',
          message: 'There are unsaved forms on your screen. Are you sure you want to close Klypso? Changes will be lost.',
          defaultId: 0,
          cancelId: 1
        });
        if (choice === 0) {
          event.preventDefault();
        }
      });

      configureRenderer(mainWindow!, [allowedOrigin]);
      await mainWindow!.loadURL(initialUrl);

      // Track session start
      void analytics?.trackEvent('session', 'start', { platform: 'windows' });
      
    } catch (err: any) {
      console.error('Core Boot Failure:', err);
      dialog.showErrorBox(
        'Klypso Startup Error',
        `The application failed to initialize properly.\n\nError: ${err.message}`
      );
      app.quit();
    }
  })();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('sync:execute', async () => {
  if (!syncEngine) return { error: 'Sync engine not initialized' };
  return syncEngine.sync();
});

ipcMain.handle('sync:bootstrap', async () => {
  if (!syncEngine) return { error: 'Sync engine not initialized' };
  return syncEngine.bootstrapSync();
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
  if (syncEngine && token) {
    syncEngine.setToken(token);
  }
});

ipcMain.handle('auth:clearToken', async () => {
  if (!authStore) return;
  authStore.clearToken();
});

ipcMain.handle('auth:login', async (_event, credentials) => {
  const { email, password, isAdmin } = credentials;
  const endpoint = isAdmin ? 'auth/login/admin' : 'auth/login/web';
  const url = `https://klypso.in/portal/api/v1/${endpoint}`;

  try {
    const response = await axios.post(url, { email, password }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });

    // MASQUERADE-003: Core-Level Cookie Injection
    // Node.js got the cookies, but the Renderer doesn't know yet.
    // We manually push these into the Electron session memory.
    const cookies = response.headers['set-cookie'];
    if (cookies && mainWindow) {
      for (const cookieStr of cookies) {
        const parts = cookieStr.split(';')[0].split('=');
        const name = parts[0].trim();
        const value = parts[1].trim();
        
        // RECOVERY-01: Ensure cookies are pinned to the top-level domain for reliable sync session reuse
        await session.defaultSession.cookies.set({
          url: 'https://klypso.in',
          name,
          value,
          domain: '.klypso.in', // Using wildcard domain for cross-subdomain API access
          path: '/',
          secure: true,
          httpOnly: cookieStr.includes('HttpOnly'),
          sameSite: 'lax'
        });
      }
    }

    if (response.data.accessToken && syncEngine) {
      syncEngine.setToken(response.data.accessToken);
    }

    return { data: response.data, status: response.status };
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn('[429 RATE LIMIT] Cloud login blocked due to high frequency. Advise user to use Offline Mode.');
    }
    console.error('[CORE AUTH ERROR]', error.response?.data || error.message);
    return { 
      error: true, 
      status: error.response?.status, 
      message: error.response?.status === 429 
        ? "Klypso Cloud is temporarily limiting your requests. Please try 'Continue Offline' instead."
        : (error.response?.data?.message || error.message),
      code: error.code
    };
  }
});

ipcMain.handle('auth:verifyMfa', async (_event, data) => {
  const { tempToken, totpCode } = data;
  const url = `https://klypso.in/portal/api/v1/auth/mfa/verify-login`;

  try {
    const response = await axios.post(url, { tempToken, totpCode }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });

    const cookies = response.headers['set-cookie'];
    if (cookies && mainWindow) {
      for (const cookieStr of cookies) {
        const parts = cookieStr.split(';')[0].split('=');
        const name = parts[0].trim();
        const value = parts[1].trim();
        await session.defaultSession.cookies.set({
          url: 'https://klypso.in',
          name,
          value,
          domain: 'klypso.in',
          path: '/',
          secure: true,
          httpOnly: cookieStr.includes('HttpOnly'),
          sameSite: 'lax'
        });
      }
    }

    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { 
      error: true, 
      status: error.response?.status, 
      message: error.response?.data?.message || error.message 
    };
  }
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

app.whenReady().then(() => {
  createWindow().catch((err) => {
    console.error('Failed to create window:', err);
    dialog.showErrorBox(
      'Klypso Startup Error',
      `The application failed to initialize properly.\n\nError: ${err.message}\n\nStack: ${err.stack}`
    );
    app.quit();
  });
});

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

async function getInitialUrl(baseUrl: string): Promise<string> {
  const session = localSessionStore?.get();
  // Ensure the base URL ends with /portal if it's the dev server or root-mapped
  const normalizedBase = baseUrl.endsWith('/portal') ? baseUrl : `${baseUrl}/portal`;
  
  if (session) {
    return `${normalizedBase}/dashboard`;
  }
  return `${normalizedBase}/login`;
}

function resolveWindowIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.ico');
  }

  return path.join(__dirname, '..', 'build', 'icon.ico');
}
