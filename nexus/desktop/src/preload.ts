import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('nexusDesktop', {
  shell: {
    isDesktop: true,
  },
  sync: {
    execute: () => ipcRenderer.invoke('sync:execute'),
    bootstrap: () => ipcRenderer.invoke('sync:bootstrap'),
    status: () => ipcRenderer.invoke('sync:status'),
    resolve: (conflicts: any[]) => ipcRenderer.invoke('sync:resolve', conflicts),
  },
  auth: {
    login: (credentials: any) => ipcRenderer.invoke('auth:login', credentials),
    verifyMfa: (data: any) => ipcRenderer.invoke('auth:verifyMfa', data),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    setToken: (token: string) => ipcRenderer.invoke('auth:setToken', token),
    clearToken: () => ipcRenderer.invoke('auth:clearToken'),
  },
  session: {
    get: () => ipcRenderer.invoke('session:get'),
    set: (session: unknown) => ipcRenderer.invoke('session:set', session),
    clear: () => ipcRenderer.invoke('session:clear'),
  },
  offline: {
    isOnline: () => ipcRenderer.invoke('offline:isOnline'),
  },
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  },
  localData: {
    get: () => ipcRenderer.invoke('local-data:get'),
    set: (state: unknown) => ipcRenderer.invoke('local-data:set', state),
    reset: () => ipcRenderer.invoke('local-data:reset'),
  },
  analytics: {
    track: (eventType: string, eventName: string, metadata?: any) =>
      ipcRenderer.invoke('analytics:track', eventType, eventName, metadata),
    getStats: () => ipcRenderer.invoke('analytics:stats'),
    getEvents: (since?: string) => ipcRenderer.invoke('analytics:events', since),
  },
});
