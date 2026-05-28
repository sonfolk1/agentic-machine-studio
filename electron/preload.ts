import { contextBridge, ipcRenderer } from 'electron';

type Listener<T = any> = (payload: T) => void;

const subscribe = (channel: string, listener: Listener) => {
  const wrapped = (_e: Electron.IpcRendererEvent, payload: any) => listener(payload);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch: any) => ipcRenderer.invoke('settings:set', patch),
    pickWorkspace: () => ipcRenderer.invoke('workspace:pick'),
  },
  fs: {
    create: (relPath: string, contents: string) =>
      ipcRenderer.invoke('fs:create', { relPath, contents }),
    view: (relPath: string) => ipcRenderer.invoke('fs:view', { relPath }),
    edit: (relPath: string, oldStr: string, newStr: string) =>
      ipcRenderer.invoke('fs:edit', { relPath, oldStr, newStr }),
    scan: (relPath?: string, depth?: number) =>
      ipcRenderer.invoke('fs:scan', { relPath, depth }),
  },
  shell: {
    run: (command: string, opts?: { cwd?: string }) =>
      ipcRenderer.invoke('shell:run', { command, opts }),
  },
  agent: {
    start: (payload: any) => ipcRenderer.invoke('agent:start', payload),
    cancel: (sessionId: string) => ipcRenderer.invoke('agent:cancel', { sessionId }),
    approve: (toolCallId: string, decision: 'approve' | 'deny') =>
      ipcRenderer.invoke('agent:approve', { toolCallId, decision }),
    onEvent: (cb: Listener) => subscribe('agent:event', cb),
  },
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },
  chrome: {
    status: () => ipcRenderer.invoke('chrome:status'),
    onStatus: (cb: Listener) => subscribe('chrome:status', cb),
  },
  bridge: {
    getToken: () => ipcRenderer.invoke('bridge:token'),
    rotateToken: () => ipcRenderer.invoke('bridge:rotate-token'),
  },
  plugins: {
    reload: () => ipcRenderer.invoke('plugins:reload'),
    dir: () => ipcRenderer.invoke('plugins:dir'),
  },
  tunnel: {
    status: () => ipcRenderer.invoke('tunnel:status'),
    start: () => ipcRenderer.invoke('tunnel:start'),
    stop: () => ipcRenderer.invoke('tunnel:stop'),
    detect: () => ipcRenderer.invoke('tunnel:detect'),
    onStatus: (cb: Listener) => subscribe('tunnel:status', cb),
  },
});

declare global {
  interface Window {
    api: any;
  }
}
