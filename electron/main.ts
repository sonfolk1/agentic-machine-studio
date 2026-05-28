import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, safeStorage } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registerFsHandlers } from './tools/filesystem';
import { registerShellHandlers } from './tools/shell';
import { registerAgentHandlers } from './agent/openrouter';
import { ChromeBridge } from './agent/chromeBridge';
import { loadPlugins, ensureSamplePlugin, reloadPlugins, pluginsDir } from './agent/plugins';
import { TunnelManager } from './agent/tunnel';

const isDev = !!process.env.ELECTRON_DEV || !app.isPackaged;
const userDataDir = app.getPath('userData');
const settingsPath = path.join(userDataDir, 'settings.json');
const crashLogPath = path.join(userDataDir, 'crash.log');

// Give V8 more headroom — defaults are conservative on 8 GB Macs and we
// can blow past them after long sessions with image attachments + markdown.
// Must run before app.whenReady().
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Persist uncaught exceptions to a file so the next "did it crash?" question
// has evidence beyond a macOS .crash report.
function appendCrashLog(label: string, err: unknown) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    const stack = (err as any)?.stack || String(err);
    fs.appendFileSync(
      crashLogPath,
      `\n[${new Date().toISOString()}] ${label}\n${stack}\n`,
      'utf8',
    );
  } catch {}
}
process.on('uncaughtException', (err) => {
  appendCrashLog('uncaughtException', err);
  console.error('[main] uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
  appendCrashLog('unhandledRejection', err);
  console.error('[main] unhandledRejection:', err);
});

export interface Settings {
  openrouterKey?: string;       // stored encrypted via safeStorage when available
  workspaceDir?: string;
  requireApproval: boolean;
  selectedModel: string;
  reasoningEffort: 'minimal' | 'low' | 'medium' | 'high';
  visionEnabled: boolean;
  bridgeToken: string;          // 32-char hex, required by remote clients on connect
}

import { randomBytes } from 'node:crypto';

const defaults: Settings = {
  requireApproval: true,
  selectedModel: 'anthropic/claude-opus-4.7',
  reasoningEffort: 'medium',
  visionEnabled: false,
  bridgeToken: randomBytes(16).toString('hex'),
};

function readSettings(): Settings {
  try {
    if (!fs.existsSync(settingsPath)) {
      // Persist a fresh bridge token on first run.
      writeSettings({});
      return readSettingsRaw();
    }
    return readSettingsRaw();
  } catch {
    return { ...defaults };
  }
}

function readSettingsRaw(): Settings {
  if (!fs.existsSync(settingsPath)) return { ...defaults };
  const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  let key: string | undefined;
  if (raw.openrouterKey && raw.openrouterKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      key = safeStorage.decryptString(Buffer.from(raw.openrouterKey, 'base64'));
    } catch {
      key = undefined;
    }
  } else if (raw.openrouterKey && !raw.openrouterKeyEncrypted) {
    key = raw.openrouterKey;
  }
  // Make sure a token exists even after a settings.json predating this feature.
  const bridgeToken = typeof raw.bridgeToken === 'string' && raw.bridgeToken.length >= 16
    ? raw.bridgeToken
    : randomBytes(16).toString('hex');
  return {
    ...defaults,
    ...raw,
    openrouterKey: key,
    bridgeToken,
  };
}

function writeSettings(next: Partial<Settings>): Settings {
  const current = readSettings();
  const merged: Settings = { ...current, ...next };
  let stored: any = { ...merged };
  if (merged.openrouterKey) {
    if (safeStorage.isEncryptionAvailable()) {
      stored.openrouterKey = safeStorage.encryptString(merged.openrouterKey).toString('base64');
      stored.openrouterKeyEncrypted = true;
    } else {
      stored.openrouterKeyEncrypted = false;
    }
  } else {
    delete stored.openrouterKey;
    stored.openrouterKeyEncrypted = false;
  }
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(stored, null, 2), 'utf8');
  return merged;
}

export function getSettings(): Settings {
  return readSettings();
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b0b0c',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 16 },
    vibrancy: 'under-window',
    visualEffectState: 'active',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    appendCrashLog('render-process-gone', new Error(`reason=${details.reason} exitCode=${details.exitCode}`));
    if (details.reason === 'oom' || details.reason === 'crashed') {
      // Surface to the user via a basic dialog so they're not staring at a blank window.
      dialog.showErrorBox(
        'Agentic Studio recovered from a crash',
        `Renderer ${details.reason}. The window will reload. Your settings are safe.\nDetails written to ${crashLogPath}.`,
      );
      mainWindow?.reload();
    }
  });
}

app.whenReady().then(() => {
  // Settings IPC
  ipcMain.handle('settings:get', () => {
    const s = readSettings();
    return { ...s, hasKey: !!s.openrouterKey };
  });
  ipcMain.handle('settings:set', (_e, patch: Partial<Settings>) => {
    const next = writeSettings(patch);
    return { ...next, hasKey: !!next.openrouterKey };
  });

  ipcMain.handle('workspace:pick', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Select Workspace Folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    writeSettings({ workspaceDir: res.filePaths[0] });
    return res.filePaths[0];
  });

  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url));

  const chromeBridge = new ChromeBridge(8765, () => getSettings().bridgeToken);
  chromeBridge.start();

  ipcMain.handle('bridge:token', () => getSettings().bridgeToken);
  ipcMain.handle('bridge:rotate-token', () => {
    const fresh = randomBytes(16).toString('hex');
    writeSettings({ bridgeToken: fresh });
    return fresh;
  });

  // Plugin system: write the sample plugin on first run, then load.
  ensureSamplePlugin();
  loadPlugins();
  ipcMain.handle('plugins:reload', () => reloadPlugins());
  ipcMain.handle('plugins:dir', () => pluginsDir());

  // Cloudflared tunnel (off-LAN).
  const tunnel = new TunnelManager();
  ipcMain.handle('tunnel:status',  () => tunnel.current());
  ipcMain.handle('tunnel:start',   () => { tunnel.start(8765); return tunnel.current(); });
  ipcMain.handle('tunnel:stop',    () => { tunnel.stop();      return tunnel.current(); });
  ipcMain.handle('tunnel:detect',  () => TunnelManager.detect());

  ipcMain.handle('chrome:status', () => ({
    connected: chromeBridge.isChromeConnected(),
    mobileConnected: chromeBridge.isMobileConnected(),
  }));

  // ── Mobile RPC handler ──────────────────────────────────────────────
  // Mobile clients (Agentic Studio Mobile on iPhone) send {id, type, ...}
  // requests for remote shell + filesystem operations.
  function resolveInWorkspace(workspace: string | undefined, relPath: string): string {
    if (!workspace) throw new Error('Workspace folder not set on the desktop.');
    const root = path.resolve(workspace);
    const candidate = path.resolve(root, relPath || '.');
    if (!candidate.startsWith(root + path.sep) && candidate !== root) {
      throw new Error(`Path escapes workspace: ${relPath}`);
    }
    return candidate;
  }

  chromeBridge.setIncomingHandler(async (type, payload) => {
    const settings = getSettings();
    switch (type) {
      case 'ping':
        return { ok: true, ts: Date.now() };

      case 'shell': {
        if (!settings.workspaceDir) throw new Error('Workspace folder not set on the desktop.');
        const cwd = payload.cwd
          ? path.resolve(settings.workspaceDir, payload.cwd)
          : settings.workspaceDir;
        return await new Promise((resolve) => {
          const child = spawn(payload.command, {
            cwd,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' },
          });
          let stdout = '';
          let stderr = '';
          child.stdout.on('data', (b) => { stdout += b.toString('utf8'); });
          child.stderr.on('data', (b) => { stderr += b.toString('utf8'); });
          child.on('close', (code) => {
            resolve({
              exitCode: code ?? 0,
              stdout: stdout.slice(-12_000),
              stderr: stderr.slice(-6_000),
            });
          });
          child.on('error', (err) => {
            resolve({ exitCode: 1, stdout, stderr: stderr + String(err) });
          });
        });
      }

      case 'create_file': {
        const abs = resolveInWorkspace(settings.workspaceDir, payload.path);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, payload.contents ?? '', 'utf8');
        return { ok: true, path: payload.path, bytes: Buffer.byteLength(payload.contents ?? '', 'utf8') };
      }

      case 'view_file': {
        const abs = resolveInWorkspace(settings.workspaceDir, payload.path);
        if (!fs.existsSync(abs)) throw new Error(`Not found: ${payload.path}`);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
          const entries = fs.readdirSync(abs, { withFileTypes: true }).map((d) => ({
            name: d.name,
            kind: d.isDirectory() ? 'dir' : 'file',
          }));
          return { kind: 'directory', entries };
        }
        const raw = fs.readFileSync(abs, 'utf8');
        return {
          kind: 'file',
          truncated: raw.length > 60_000,
          contents: raw.slice(0, 60_000),
        };
      }

      case 'edit_file': {
        const abs = resolveInWorkspace(settings.workspaceDir, payload.path);
        if (!fs.existsSync(abs)) throw new Error(`Not found: ${payload.path}`);
        const orig = fs.readFileSync(abs, 'utf8');
        const idx = orig.indexOf(payload.old_string);
        if (idx < 0) throw new Error('old_string not found');
        if (idx !== orig.lastIndexOf(payload.old_string)) {
          throw new Error('old_string not unique; expand context');
        }
        const updated =
          orig.slice(0, idx) + (payload.new_string ?? '') + orig.slice(idx + payload.old_string.length);
        fs.writeFileSync(abs, updated, 'utf8');
        return { ok: true, path: payload.path };
      }

      case 'scan_directory': {
        const abs = resolveInWorkspace(settings.workspaceDir, payload.path || '.');
        const maxDepth = Math.max(1, Math.min(payload.depth ?? 3, 6));
        const ignored = new Set([
          'node_modules', '.git', '.next', 'dist', 'dist-electron', 'build', 'release', '.DS_Store',
        ]);
        const out: string[] = [];
        const walk = (dir: string, d: number) => {
          if (d > maxDepth || out.length > 400) return;
          let entries: fs.Dirent[];
          try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const ent of entries) {
            if (ignored.has(ent.name)) continue;
            const rel = path.relative(abs, path.join(dir, ent.name));
            out.push(`${ent.isDirectory() ? 'd' : 'f'} ${rel}`);
            if (ent.isDirectory()) walk(path.join(dir, ent.name), d + 1);
          }
        };
        walk(abs, 1);
        return { root: abs, entries: out };
      }

      case 'workspace_info': {
        return {
          workspaceDir: settings.workspaceDir ?? null,
          platform: process.platform,
          hostname: require('node:os').hostname(),
        };
      }

      default:
        throw new Error(`Unknown mobile RPC type: ${type}`);
    }
  });

  registerFsHandlers(getSettings);
  registerShellHandlers(getSettings);
  registerAgentHandlers(getSettings, () => mainWindow, chromeBridge);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
