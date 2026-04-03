const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
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