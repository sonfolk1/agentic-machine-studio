import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { BrowserWindow } from 'electron';

interface Pending {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  timeout: NodeJS.Timeout;
}

export type ClientRole = 'chrome' | 'mobile' | 'unknown';

interface ClientInfo {
  ws: WebSocket;
  role: ClientRole;
  remoteAddress?: string;
  connectedAt: number;
  isAlive: boolean;
  authenticated: boolean;
  isLoopback: boolean;
}

/** Handles incoming RPC requests from mobile clients ({id, type, ...payload}). */
export type IncomingRequestHandler = (
  type: string,
  payload: any,
  fromRole: ClientRole,
) => Promise<any>;

export class ChromeBridge {
  private server: WebSocketServer | null = null;
  private clients = new Set<ClientInfo>();
  private pending = new Map<string, Pending>();
  private port: number;
  private incomingHandler: IncomingRequestHandler | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private tokenProvider: () => string;

  constructor(port = 8765, tokenProvider: () => string = () => '') {
    this.port = port;
    this.tokenProvider = tokenProvider;
  }

  start() {
    if (this.server) return;
    try {
      // Bind to all interfaces so iPhones on the same LAN can connect.
      this.server = new WebSocketServer({ host: '0.0.0.0', port: this.port });

      this.server.on('connection', (ws, req) => {
        const remoteAddress = req.socket.remoteAddress;
        const origin = req.headers.origin || '';
        const isExtension = origin.startsWith('chrome-extension://');
        // Loopback (chrome ext, dev tools, same machine) skips token auth.
        const isLoopback = /^(127\.|::1|::ffff:127\.)/.test(remoteAddress ?? '');
        const initialRole: ClientRole = isExtension ? 'chrome' : 'unknown';
        const info: ClientInfo = {
          ws,
          role: initialRole,
          remoteAddress,
          connectedAt: Date.now(),
          isAlive: true,
          authenticated: isLoopback,   // implicit trust for same-machine clients
          isLoopback,
        };
        this.clients.add(info);
        console.log(
          `[bridge] connection from ${remoteAddress} | origin=${origin || '(none)'} | role=${initialRole} | loopback=${isLoopback}`,
        );
        this.broadcastStatus();

        // Remote (non-loopback) clients have 5 s to authenticate or get dropped.
        if (!isLoopback) {
          setTimeout(() => {
            if (!info.authenticated && ws.readyState === WebSocket.OPEN) {
              console.warn('[bridge] dropping unauthenticated client', remoteAddress);
              try { ws.close(4401, 'auth required'); } catch {}
            }
          }, 5000);
        }

        try {
          ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
        } catch {}

        // Mark alive on pong (browser/native sendPing replies trigger this).
        ws.on('pong', () => { info.isAlive = true; });

        ws.on('message', (data) => {
          info.isAlive = true;     // any traffic counts as alive
          this.onMessage(info, data.toString());
        });
        ws.on('close', (code, reason) => {
          this.clients.delete(info);
          console.log(`[bridge] client closed (role=${info.role}) code=${code} reason="${reason?.toString?.() || ''}"`);
          this.broadcastStatus();
        });
        ws.on('error', (err) => {
          console.warn('[bridge] client error:', err);
        });
      });

      // 30 s heartbeat: ping each client, terminate the ones that didn't pong.
      this.heartbeatInterval = setInterval(() => {
        for (const c of this.clients) {
          if (!c.isAlive) {
            try { c.ws.terminate(); } catch {}
            continue;
          }
          c.isAlive = false;
          try { c.ws.ping(); } catch {}
        }
      }, 30_000);

      this.server.on('error', (err) => {
        console.error('[bridge] server error:', err);
      });

      console.log(`[bridge] listening on ws://0.0.0.0:${this.port}`);
    } catch (err) {
      console.error('[bridge] failed to start:', err);
    }
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    for (const c of this.clients) {
      try { c.ws.close(); } catch {}
    }
    this.clients.clear();
    try { this.server?.close(); } catch {}
    this.server = null;
  }

  setIncomingHandler(handler: IncomingRequestHandler) {
    this.incomingHandler = handler;
  }

  /** Is any Chrome extension client currently connected? */
  isChromeConnected(): boolean {
    for (const c of this.clients) {
      if ((c.role === 'chrome' || c.role === 'unknown') && c.ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  /** Is any mobile client currently connected? */
  isMobileConnected(): boolean {
    for (const c of this.clients) {
      if (c.role === 'mobile' && c.ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  /** Back-compat shim for older callers. */
  isConnected(): boolean {
    return this.isChromeConnected();
  }

  private pickChromeClient(): ClientInfo | null {
    for (const c of this.clients) {
      if ((c.role === 'chrome' || c.role === 'unknown') && c.ws.readyState === WebSocket.OPEN) return c;
    }
    return null;
  }

  private broadcastStatus() {
    const payload = {
      connected: this.isChromeConnected(),
      mobileConnected: this.isMobileConnected(),
      clients: this.clients.size,
    };
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('chrome:status', payload);
    }
  }

  async call(method: string, params: any = {}, timeoutMs = 60_000): Promise<any> {
    const client = this.pickChromeClient();
    if (!client) {
      throw new Error(
        'Chrome extension not connected. Install the Agentic Studio bridge in chrome://extensions and reload Chrome.',
      );
    }
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome RPC '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      try {
        client.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this.pending.delete(id);
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  private async onMessage(info: ClientInfo, text: string) {
    let msg: any;
    try { msg = JSON.parse(text); } catch { return; }
    if (!msg) return;

    // Client identification handshake (also carries the auth token).
    if (msg.type === 'client_hello' && typeof msg.role === 'string') {
      const role: ClientRole = msg.role === 'mobile' ? 'mobile' : 'chrome';
      info.role = role;
      if (!info.isLoopback) {
        const expected = this.tokenProvider();
        if (!expected || msg.token !== expected) {
          console.warn(`[bridge] auth rejected from ${info.remoteAddress} (bad/missing token)`);
          try {
            info.ws.send(JSON.stringify({ type: 'auth_error', message: 'invalid bridge token' }));
            info.ws.close(4401, 'invalid token');
          } catch {}
          return;
        }
      }
      info.authenticated = true;
      console.log(`[bridge] client identified as ${role} (authenticated)`);
      this.broadcastStatus();
      try {
        info.ws.send(JSON.stringify({ type: 'ack', role }));
      } catch {}
      return;
    }

    // Anything else from an unauthenticated remote client is dropped.
    if (!info.authenticated) {
      try {
        info.ws.send(JSON.stringify({ id: msg.id, error: 'unauthenticated' }));
      } catch {}
      return;
    }

    // Response to one of our outgoing RPCs (Chrome ext → desktop).
    if (msg.id && this.pending.has(msg.id) && ('result' in msg || 'error' in msg)) {
      const p = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      clearTimeout(p.timeout);
      if (msg.error) p.reject(new Error(String(msg.error)));
      else p.resolve(msg.result);
      return;
    }

    // Incoming RPC request (mobile → desktop).
    if (msg.id && typeof msg.type === 'string') {
      const { id, type, ...payload } = msg;
      if (!this.incomingHandler) {
        try {
          info.ws.send(JSON.stringify({ id, error: 'no incoming handler registered' }));
        } catch {}
        return;
      }
      try {
        const result = await this.incomingHandler(type, payload, info.role);
        try { info.ws.send(JSON.stringify({ id, result })); } catch {}
      } catch (err: any) {
        try { info.ws.send(JSON.stringify({ id, error: String(err?.message ?? err) })); } catch {}
      }
      return;
    }
  }
}
