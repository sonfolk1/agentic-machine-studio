// Off-LAN tunneling. Spawns `cloudflared tunnel --url tcp://localhost:8765`
// to expose the bridge over the internet. Cloudflared is free, doesn't need
// an account for quick tunnels, and the URL is one tap away from the iPhone.
//
// brew install cloudflare/cloudflare/cloudflared

import { spawn, ChildProcess } from 'node:child_process';
import { BrowserWindow } from 'electron';
import { execSync } from 'node:child_process';

export type TunnelState =
  | { status: 'stopped' }
  | { status: 'starting' }
  | { status: 'running'; url: string }
  | { status: 'error'; message: string };

export class TunnelManager {
  private child: ChildProcess | null = null;
  private state: TunnelState = { status: 'stopped' };

  current(): TunnelState { return this.state; }

  private setState(next: TunnelState) {
    this.state = next;
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('tunnel:status', next);
    }
  }

  static detect(): string | null {
    try {
      const p = execSync('which cloudflared', { encoding: 'utf8' }).trim();
      return p || null;
    } catch {
      return null;
    }
  }

  start(port = 8765) {
    if (this.child) return;
    const bin = TunnelManager.detect();
    if (!bin) {
      this.setState({
        status: 'error',
        message: 'cloudflared not installed. Run: brew install cloudflare/cloudflare/cloudflared',
      });
      return;
    }
    this.setState({ status: 'starting' });
    // cloudflared writes the URL to stderr in a banner.
    const child = spawn(bin, [
      'tunnel',
      '--no-autoupdate',
      '--url', `http://127.0.0.1:${port}`,
    ]);
    this.child = child;

    const sniff = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && this.state.status !== 'running') {
        const httpsUrl = m[0];
        const wssUrl = 'wss://' + httpsUrl.slice('https://'.length);
        this.setState({ status: 'running', url: wssUrl });
      }
    };
    child.stdout?.on('data', sniff);
    child.stderr?.on('data', sniff);

    child.on('exit', (code) => {
      this.child = null;
      if (this.state.status !== 'error') {
        this.setState({ status: 'stopped' });
      }
      console.log(`[tunnel] cloudflared exited (code=${code})`);
    });
    child.on('error', (err) => {
      this.child = null;
      this.setState({ status: 'error', message: String(err) });
    });
  }

  stop() {
    if (!this.child) return;
    try { this.child.kill(); } catch {}
    this.child = null;
    this.setState({ status: 'stopped' });
  }
}
