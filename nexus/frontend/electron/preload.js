const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process via context bridge
contextBridge.exposeInMainWorld('electronAPI', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => process.platform,

    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    // Notifications
    showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),

    // Secure storage (for tokens)
    secureStore: {
        set: (key, value) => ipcRenderer.invoke('secure-store-set', { key, value }),
        get: (key) => ipcRenderer.invoke('secure-store-get', { key }),
        delete: (key) => ipcRenderer.invoke('secure-store-delete', { key }),
    },

    // App lifecycle
    onAppReady: (callback) => ipcRenderer.on('app-ready', callback),
    onBeforeQuit: (callback) => ipcRenderer.on('before-quit', callback),
});

// Log that preload script has loaded
console.log('[PRELOAD] Context bridge API exposed to renderer');