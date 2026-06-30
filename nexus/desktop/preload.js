const { contextBridge, ipcRenderer } = require('electron');

// Expose nexusDesktop bridge to renderer process
// This is the primary interface for desktop-specific functionality
contextBridge.exposeInMainWorld('nexusDesktop', {
  shell: {
    isDesktop: true,
    getNetworkIPs: () => ipcRenderer.invoke('shell:getNetworkIPs'),
  },
  sync: {
    execute: () => ipcRenderer.invoke('sync:bootstrap'),
    status: () => ipcRenderer.invoke('sync:status'),
    resolve: (conflicts) => ipcRenderer.invoke('sync:resolve', conflicts),
  },
  auth: {
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    setToken: (token) => ipcRenderer.invoke('auth:setToken', token),
    clearToken: () => ipcRenderer.invoke('auth:clearToken'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    verifyMfa: (data) => ipcRenderer.invoke('auth:verifyMfa', data),
    localOnboarding: (data) => ipcRenderer.invoke('auth:localOnboarding', data),
  },
  settings: {
    updateModules: (modules) => ipcRenderer.invoke('settings:updateModules', modules),
  },
  session: {
    get: () => ipcRenderer.invoke('session:get'),
    set: (session) => ipcRenderer.invoke('session:set', session),
    clear: () => ipcRenderer.invoke('session:clear'),
  },
  offline: {
    isOnline: () => ipcRenderer.invoke('offline:isOnline'),
  },
  db: {
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  },
  localData: {
    get: () => ipcRenderer.invoke('local-data:get'),
    set: (state) => ipcRenderer.invoke('local-data:set', state),
    reset: () => ipcRenderer.invoke('local-data:reset'),
  },
  analytics: {
    track: (eventType, eventName, metadata) => ipcRenderer.invoke('analytics:track', eventType, eventName, metadata),
    getStats: () => ipcRenderer.invoke('analytics:stats'),
    getEvents: (since) => ipcRenderer.invoke('analytics:events', since),
  },
});

// Also expose electronAPI for backwards compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => '1.0.0',
  getPlatform: () => process.platform,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-always-on-top', flag),

  // App lifecycle
  quit: () => ipcRenderer.send('app-quit'),
  relaunch: () => ipcRenderer.send('app-relaunch'),

  // Open external links
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Storage (for offline cache)
  getStorage: (key) => localStorage.getItem(key),
  setStorage: (key, value) => localStorage.setItem(key, value),
  removeStorage: (key) => localStorage.removeItem(key),

  // Listeners
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

// Log preload script loaded
console.log('Nexus Desktop: Preload script loaded');