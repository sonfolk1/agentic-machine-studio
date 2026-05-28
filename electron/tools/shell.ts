import { ipcMain, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import * as path from 'node:path';

type GetSettings = () => { workspaceDir?: string };

export function registerShellHandlers(getSettings: GetSettings) {
  ipcMain.handle(
    'shell:run',
    (_e, { command, opts }: { command: string; opts?: { cwd?: string } }) => {
      const settings = getSettings();
      if (!settings.workspaceDir) {
        throw new Error('Workspace folder not set. Pick one in Settings.');
      }
      const cwd = opts?.cwd
        ? path.resolve(settings.workspaceDir, opts.cwd)
        : settings.workspaceDir;

      return new Promise<{ stdout: string; stderr: string; exitCode: number }>(
        (resolve) => {
          const child = spawn(command, {
            cwd,
            shell: true,
            env: { ...process.env, FORCE_COLOR: '0' },
          });
          let stdout = '';
          let stderr = '';
          const senderWin = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
          const chunk = (kind: 'stdout' | 'stderr', text: string) => {
            senderWin?.webContents.send('agent:event', {
              type: 'shell-chunk',
              kind,
              text,
            });
          };
          child.stdout.on('data', (b) => {
            const t = b.toString('utf8');
            stdout += t;
            chunk('stdout', t);
          });
          child.stderr.on('data', (b) => {
            const t = b.toString('utf8');
            stderr += t;
            chunk('stderr', t);
          });
          child.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 0 });
          });
          child.on('error', (err) => {
            resolve({ stdout, stderr: stderr + String(err), exitCode: 1 });
          });
        },
      );
    },
  );
}
