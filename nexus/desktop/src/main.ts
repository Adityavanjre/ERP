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
import { getDeviceId, getDeviceName } from './auth/device-manager';
import { startPeerServer, stopPeerServer } from './sync/peer-server';
import { config } from './config';

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

// Manual sync triggers removed in favor of automatic background polling

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

ipcMain.handle('shell:switchToCloud', async () => {
  if (mainWindow) {
    await mainWindow.loadURL('https://klypso.in/portal/login');
  }
});

ipcMain.handle('shell:getNetworkIPs', async () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
});

ipcMain.handle('config:getAuthMode', () => {
  return config.AUTH_MODE;
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
    syncEngine.startBackgroundSync();
  }
});

ipcMain.handle('auth:clearToken', async () => {
  if (!authStore) return;
  authStore.clearToken();
});

ipcMain.handle('auth:logout', async () => {
  if (authStore) authStore.clearToken();
  if (localSessionStore) localSessionStore.clear();
  if (syncEngine) syncEngine.stopBackgroundSync();
});

ipcMain.handle('auth:localOnboarding', async (_event, data) => {
  try {
    const db = getDb();
    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');
    
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const hash = bcrypt.hashSync(data.owner.password, 10);
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO _tenant_settings (tenant_id, enabled_modules) 
        VALUES (?, ?)
      `).run(tenantId, JSON.stringify([])); // Modules selected later
      
      db.prepare(`
        INSERT INTO _users (id, email, password_hash, full_name, tenant_id, is_super_admin)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(userId, data.owner.email, hash, data.owner.fullName, tenantId);
    })();
    
    return { success: true };
  } catch (err: any) {
    console.error('Local onboarding failed:', err);
    return { error: err.message };
  }
});

ipcMain.handle('settings:updateModules', async (_event, modules: string[]) => {
  try {
    const db = getDb();
    // Assuming single tenant per device for now in local mode
    const tenant = db.prepare('SELECT tenant_id FROM _tenant_settings LIMIT 1').get() as any;
    if (tenant) {
      db.prepare('UPDATE _tenant_settings SET enabled_modules = ?, updated_at = datetime("now") WHERE tenant_id = ?')
        .run(JSON.stringify(modules), tenant.tenant_id);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Update modules failed:', err);
    return { error: err.message };
  }
});

const pendingMfaPasswords = new Map<string, string>();

ipcMain.handle('auth:login', async (_event, credentials) => {
  const { email, password, isAdmin } = credentials;
  const db = getDb();

  // 1. Check local SQLite DB first for offline login
  try {
    const localUser = db.prepare('SELECT * FROM _users WHERE email = ?').get(email) as any;
    if (localUser) {
      const bcrypt = require('bcryptjs');
      if (bcrypt.compareSync(password, localUser.password_hash)) {
        console.log('[AUTH] Local offline login success for:', email);
        const offlineToken = 'offline_' + Math.random().toString(36).substring(2);
        
        const authData = {
          user: {
            id: localUser.id,
            email: localUser.email,
            fullName: localUser.full_name,
            isSuperAdmin: Boolean(localUser.is_super_admin),
            permissions: localUser.permissions ? JSON.parse(localUser.permissions) : null,
          },
          accessToken: offlineToken
        };
        
        if (authStore) authStore.setToken(offlineToken);
        if (syncEngine) {
          syncEngine.setToken(offlineToken);
          syncEngine.startBackgroundSync();
        }
        
        return { data: authData, status: 200 };
      }
    }
  } catch (err) {
    console.error('Local DB read error during auth:', err);
  }

  // 2. Fallback to Cloud Login
  const endpoint = isAdmin ? 'auth/login/admin' : 'auth/login/web';
  const url = `https://klypso.in/portal/api/v1/${endpoint}`;

  try {
    const response = await axios.post(url, { email, password }, {
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId(),
        'x-device-name': getDeviceName()
      },
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
          domain: '.klypso.in',
          path: '/',
          secure: true,
          httpOnly: cookieStr.includes('HttpOnly'),
          sameSite: 'lax'
        });
      }
    }

    if (response.data.accessToken && syncEngine) {
      syncEngine.setToken(response.data.accessToken);
      syncEngine.startBackgroundSync();

      try {
        await axios.post('https://klypso.in/portal/api/v1/auth/device/register', {
          deviceId: getDeviceId(),
          deviceName: getDeviceName(),
          platform: 'DESKTOP'
        }, {
          headers: { 'Authorization': `Bearer ${response.data.accessToken}` },
          withCredentials: true
        });
      } catch (err) {
        console.warn('Failed to register device:', err);
      }
    }

    if (response.data.tempToken) {
      pendingMfaPasswords.set(response.data.tempToken, password);
    } else if (response.data?.user) {
      try {
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync(password, 10);
        const u = response.data.user;
        db.prepare(`
          INSERT INTO _users (id, email, password_hash, full_name, tenant_id, is_super_admin, permissions)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            password_hash = excluded.password_hash,
            full_name = excluded.full_name,
            tenant_id = excluded.tenant_id,
            is_super_admin = excluded.is_super_admin,
            permissions = excluded.permissions
        `).run(
          u.id, 
          u.email, 
          hash, 
          u.fullName, 
          u.tenantId || null, 
          u.isSuperAdmin ? 1 : 0, 
          u.permissions ? JSON.stringify(u.permissions) : null
        );
      } catch (err) {
        console.error('Failed to cache user offline credentials:', err);
      }
    }

    return { data: response.data, status: response.status };
  } catch (error: any) {
    if (error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
      return { 
        error: true, 
        status: 0, 
        message: "Initial login requires internet. No local offline account found for this email.",
        code: error.code
      };
    }
    if (error.response?.status === 429) {
      console.warn('[429 RATE LIMIT] Cloud login blocked due to high frequency. Advise user to use Offline Mode.');
    }
    console.error('[CORE AUTH ERROR]', error.response?.data || error.message);
    return { 
      error: true, 
      status: error.response?.status, 
      message: error.response?.status === 429 
        ? "Klypso Cloud is temporarily limiting your requests. Please try again later."
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
      headers: { 
        'Content-Type': 'application/json',
        'x-device-id': getDeviceId(),
        'x-device-name': getDeviceName()
      },
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

    if (response.data.accessToken && syncEngine) {
      syncEngine.setToken(response.data.accessToken);
      syncEngine.startBackgroundSync();

      try {
        await axios.post('https://klypso.in/portal/api/v1/auth/device/register', {
          deviceId: getDeviceId(),
          deviceName: getDeviceName(),
          platform: 'DESKTOP'
        }, {
          headers: { 'Authorization': `Bearer ${response.data.accessToken}` },
          withCredentials: true
        });
      } catch (err) {
        console.warn('Failed to register device:', err);
      }
    }

    // Cache user credentials locally for future offline logins
    if (response.data?.user) {
      try {
        const password = pendingMfaPasswords.get(tempToken);
        if (password) {
          const bcrypt = require('bcryptjs');
          const hash = bcrypt.hashSync(password, 10);
          const u = response.data.user;
          const db = getDb();
          db.prepare(`
            INSERT INTO _users (id, email, password_hash, full_name, tenant_id, is_super_admin, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              email = excluded.email,
              password_hash = excluded.password_hash,
              full_name = excluded.full_name,
              tenant_id = excluded.tenant_id,
              is_super_admin = excluded.is_super_admin,
              permissions = excluded.permissions
          `).run(
            u.id, 
            u.email, 
            hash, 
            u.fullName, 
            u.tenantId || null, 
            u.isSuperAdmin ? 1 : 0, 
            u.permissions ? JSON.stringify(u.permissions) : null
          );
        }
      } catch (err) {
        console.error('Failed to cache MFA user offline credentials:', err);
      } finally {
        pendingMfaPasswords.delete(tempToken);
      }
    }

    return { data: response.data, status: response.status };
  } catch (error: any) {
    pendingMfaPasswords.delete(tempToken);
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
  
  try {
    startPeerServer(getDb());
  } catch (err) {
    console.error('Failed to start peer server:', err);
  }
});

app.on('before-quit', () => {
  localFrontendServer?.stop();
  localFrontendServer = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    localFrontendServer?.stop();
    localFrontendServer = null;
    stopPeerServer();
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
    // If a session exists, initialize sync and load dashboard immediately
    const token = authStore?.getToken();
    if (token && syncEngine) {
      syncEngine.setToken(token);
      syncEngine.startBackgroundSync();
    }
    return `${normalizedBase}/dashboard`;
  }
  
  // If no session exists, check AUTH_MODE
  if (config.AUTH_MODE === 'LOCAL' || config.AUTH_MODE === 'HYBRID') {
    // Check if local organization exists
    try {
      const db = getDb();
      const org = db.prepare('SELECT * FROM _tenant_settings LIMIT 1').get();
      if (!org) {
        return `${normalizedBase}/onboarding`;
      }
      
      // Local organization exists. Let's see if a local owner exists to auto-login.
      const localUser = db.prepare('SELECT * FROM _users LIMIT 1').get() as any;
      if (localUser) {
        // Construct the session payload format expected by LocalSessionStore
        const offlineSession = {
          mode: 'offline' as const,
          userId: localUser.id,
          fullName: localUser.full_name,
          email: localUser.email,
          role: localUser.is_super_admin ? 'Owner' : 'Manager',
          tenantId: localUser.tenant_id || 'local-tenant',
          tenantName: 'Local Workspace',
          industry: 'General',
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString()
        };
        
        if (!localSessionStore) {
          localSessionStore = new LocalSessionStore();
        }
        
        // Save it! The frontend's hydrateDesktopOfflineSession() will automatically
        // pick this up from IPC and inject it into localStorage.
        localSessionStore.set(offlineSession);
        
        // Ensure background sync starts if needed
        const offlineToken = 'offline_' + Math.random().toString(36).substring(2);
        if (authStore) authStore.setToken(offlineToken);
        if (syncEngine) {
          syncEngine.setToken(offlineToken);
          syncEngine.startBackgroundSync();
        }
        
        console.log('[AUTO-LOGIN] Bypassed login screen. Booting directly into local workspace for:', localUser.email);
        return `${normalizedBase}/dashboard`;
      }
    } catch (err) {
      console.warn('Could not query _tenant_settings or _users', err);
    }
  }

  return `${normalizedBase}/login`;
}

function resolveWindowIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build', 'icon.ico');
  }

  return path.join(__dirname, '..', 'build', 'icon.ico');
}
