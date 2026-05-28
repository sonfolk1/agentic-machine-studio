import { ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

type GetSettings = () => { workspaceDir?: string };

function resolveInWorkspace(workspace: string | undefined, relPath: string): string {
  if (!workspace) throw new Error('Workspace folder not set. Pick one in Settings.');
  const absWorkspace = path.resolve(workspace);
  const candidate = path.resolve(absWorkspace, relPath || '.');
  if (!candidate.startsWith(absWorkspace + path.sep) && candidate !== absWorkspace) {
    throw new Error(`Path escapes workspace: ${relPath}`);
  }
  return candidate;
}

export function registerFsHandlers(getSettings: GetSettings) {
  ipcMain.handle('fs:create', (_e, { relPath, contents }: { relPath: string; contents: string }) => {
    const workspace = getSettings().workspaceDir;
    const abs = resolveInWorkspace(workspace, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, contents, 'utf8');
    return { ok: true, path: abs, bytes: Buffer.byteLength(contents, 'utf8') };
  });

  ipcMain.handle('fs:view', (_e, { relPath }: { relPath: string }) => {
    const workspace = getSettings().workspaceDir;
    const abs = resolveInWorkspace(workspace, relPath);
    if (!fs.existsSync(abs)) throw new Error(`Not found: ${relPath}`);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(abs, { withFileTypes: true }).map((d) => ({
        name: d.name,
        kind: d.isDirectory() ? 'dir' : 'file',
      }));
      return { kind: 'directory', path: abs, entries };
    }
    if (stat.size > 1_500_000) {
      return {
        kind: 'file',
        path: abs,
        truncated: true,
        contents: fs.readFileSync(abs, { encoding: 'utf8' }).slice(0, 1_500_000),
      };
    }
    return { kind: 'file', path: abs, contents: fs.readFileSync(abs, 'utf8') };
  });

  ipcMain.handle(
    'fs:edit',
    (_e, { relPath, oldStr, newStr }: { relPath: string; oldStr: string; newStr: string }) => {
      const workspace = getSettings().workspaceDir;
      const abs = resolveInWorkspace(workspace, relPath);
      if (!fs.existsSync(abs)) throw new Error(`Not found: ${relPath}`);
      const original = fs.readFileSync(abs, 'utf8');
      const idx = original.indexOf(oldStr);
      if (idx < 0) throw new Error('Edit failed: old_string not found.');
      const lastIdx = original.lastIndexOf(oldStr);
      if (idx !== lastIdx) throw new Error('Edit failed: old_string not unique. Add more context.');
      const updated = original.slice(0, idx) + newStr + original.slice(idx + oldStr.length);
      fs.writeFileSync(abs, updated, 'utf8');
      return { ok: true, path: abs, replaced: 1 };
    },
  );

  ipcMain.handle(
    'fs:scan',
    (_e, { relPath, depth }: { relPath?: string; depth?: number }) => {
      const workspace = getSettings().workspaceDir;
      const abs = resolveInWorkspace(workspace, relPath || '.');
      const maxDepth = Math.max(1, Math.min(depth ?? 3, 6));
      const ignored = new Set([
        'node_modules',
        '.git',
        '.next',
        '.vite',
        'dist',
        'dist-electron',
        'build',
        'release',
        '.DS_Store',
      ]);
      const result: { path: string; kind: 'file' | 'dir'; size?: number }[] = [];
      const walk = (dir: string, d: number) => {
        if (d > maxDepth) return;
        let entries: fs.Dirent[];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          return;
        }
        for (const ent of entries) {
          if (ignored.has(ent.name)) continue;
          const full = path.join(dir, ent.name);
          const rel = path.relative(abs, full);
          if (ent.isDirectory()) {
            result.push({ path: rel || ent.name, kind: 'dir' });
            walk(full, d + 1);
          } else {
            let size: number | undefined;
            try {
              size = fs.statSync(full).size;
            } catch {}
            result.push({ path: rel || ent.name, kind: 'file', size });
          }
          if (result.length > 800) return;
        }
      };
      walk(abs, 1);
      return { root: abs, entries: result };
    },
  );
}
