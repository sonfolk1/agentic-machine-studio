// MCP server that exposes Agentic Studio's workspace tools over stdio.
// Other MCP clients (Claude Desktop, Cursor, Zed, …) can talk to this and
// drive the same workspace + Chrome bridge.
//
// Spawn it with:
//   node /path/to/dist-electron/mcp/server.js <workspace-dir>
// or via the wrapper script in scripts/mcp-stdio.cjs.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const workspaceDir = path.resolve(process.argv[2] ?? process.cwd());

function resolveInWorkspace(rel: string): string {
  const root = path.resolve(workspaceDir);
  const candidate = path.resolve(root, rel || '.');
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path escapes workspace: ${rel}`);
  }
  return candidate;
}

const tools = [
  {
    name: 'view_file',
    description: 'View a file or list a directory inside the workspace.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'create_file',
    description: 'Create or overwrite a file inside the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        contents: { type: 'string' },
      },
      required: ['path', 'contents'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace a unique substring inside a workspace file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        old_string: { type: 'string' },
        new_string: { type: 'string' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'scan_directory',
    description: 'List the workspace tree up to a depth.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        depth: { type: 'number' },
      },
    },
  },
  {
    name: 'run_shell',
    description: 'Run a shell command inside the workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        cwd: { type: 'string' },
      },
      required: ['command'],
    },
  },
];

async function runTool(name: string, args: any): Promise<string> {
  switch (name) {
    case 'view_file': {
      const abs = resolveInWorkspace(args.path);
      if (!fs.existsSync(abs)) return JSON.stringify({ error: `Not found: ${args.path}` });
      const st = fs.statSync(abs);
      if (st.isDirectory()) {
        return JSON.stringify({
          kind: 'directory',
          entries: fs.readdirSync(abs, { withFileTypes: true }).map((d) => ({
            name: d.name, kind: d.isDirectory() ? 'dir' : 'file',
          })),
        });
      }
      const raw = fs.readFileSync(abs, 'utf8');
      return JSON.stringify({ kind: 'file', truncated: raw.length > 60_000, contents: raw.slice(0, 60_000) });
    }
    case 'create_file': {
      const abs = resolveInWorkspace(args.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, args.contents ?? '', 'utf8');
      return JSON.stringify({ ok: true, path: args.path });
    }
    case 'edit_file': {
      const abs = resolveInWorkspace(args.path);
      if (!fs.existsSync(abs)) return JSON.stringify({ error: `Not found: ${args.path}` });
      const orig = fs.readFileSync(abs, 'utf8');
      const idx = orig.indexOf(args.old_string);
      if (idx < 0) return JSON.stringify({ error: 'old_string not found' });
      if (idx !== orig.lastIndexOf(args.old_string)) return JSON.stringify({ error: 'old_string not unique' });
      const updated = orig.slice(0, idx) + (args.new_string ?? '') + orig.slice(idx + args.old_string.length);
      fs.writeFileSync(abs, updated, 'utf8');
      return JSON.stringify({ ok: true, path: args.path });
    }
    case 'scan_directory': {
      const abs = resolveInWorkspace(args.path || '.');
      const maxDepth = Math.max(1, Math.min(args.depth ?? 3, 6));
      const ignored = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'release', '.DS_Store']);
      const out: string[] = [];
      const walk = (dir: string, d: number) => {
        if (d > maxDepth || out.length > 400) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const ent of entries) {
          if (ignored.has(ent.name)) continue;
          out.push(`${ent.isDirectory() ? 'd' : 'f'} ${path.relative(abs, path.join(dir, ent.name))}`);
          if (ent.isDirectory()) walk(path.join(dir, ent.name), d + 1);
        }
      };
      walk(abs, 1);
      return JSON.stringify({ root: abs, entries: out });
    }
    case 'run_shell': {
      const cwd = args.cwd ? path.resolve(workspaceDir, args.cwd) : workspaceDir;
      return await new Promise<string>((resolve) => {
        const child = spawn(args.command, { cwd, shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
        let stdout = '', stderr = '';
        child.stdout.on('data', (b) => { stdout += b.toString('utf8'); });
        child.stderr.on('data', (b) => { stderr += b.toString('utf8'); });
        child.on('close', (code) => resolve(JSON.stringify({
          exitCode: code ?? 0,
          stdout: stdout.slice(-8_000),
          stderr: stderr.slice(-4_000),
        })));
        child.on('error', (err) => resolve(JSON.stringify({ exitCode: 1, error: String(err) })));
      });
    }
  }
  throw new Error(`Unknown tool: ${name}`);
}

const server = new Server(
  { name: 'agentic-studio', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req: any) => {
  const text = await runTool(req.params.name, req.params.arguments ?? {});
  return { content: [{ type: 'text', text }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
