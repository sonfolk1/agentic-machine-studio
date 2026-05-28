/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    api: {
      settings: {
        get: () => Promise<any>;
        set: (patch: any) => Promise<any>;
        pickWorkspace: () => Promise<string | null>;
      };
      fs: {
        create: (relPath: string, contents: string) => Promise<any>;
        view: (relPath: string) => Promise<any>;
        edit: (relPath: string, oldStr: string, newStr: string) => Promise<any>;
        scan: (relPath?: string, depth?: number) => Promise<any>;
      };
      shell: {
        run: (command: string, opts?: { cwd?: string }) => Promise<any>;
      };
      agent: {
        start: (payload: any) => Promise<any>;
        cancel: (sessionId: string) => Promise<any>;
        approve: (toolCallId: string, decision: 'approve' | 'deny') => Promise<any>;
        onEvent: (cb: (e: any) => void) => () => void;
      };
      app: {
        openExternal: (url: string) => Promise<any>;
      };
      chrome: {
        status: () => Promise<{ connected: boolean; mobileConnected?: boolean }>;
        onStatus: (cb: (e: { connected: boolean; mobileConnected?: boolean; clients?: number }) => void) => () => void;
      };
      bridge: {
        getToken: () => Promise<string>;
        rotateToken: () => Promise<string>;
      };
      plugins: {
        reload: () => Promise<Array<{ name: string; description: string }>>;
        dir: () => Promise<string>;
      };
      tunnel: {
        status: () => Promise<TunnelState>;
        start: () => Promise<TunnelState>;
        stop: () => Promise<TunnelState>;
        detect: () => Promise<string | null>;
        onStatus: (cb: (e: TunnelState) => void) => () => void;
      };
    };
  }
}

export type TunnelState =
  | { status: 'stopped' }
  | { status: 'starting' }
  | { status: 'running'; url: string }
  | { status: 'error'; message: string };
