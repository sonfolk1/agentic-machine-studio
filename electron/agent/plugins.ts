// Plugin loader. Each *.js file in
//   ~/Library/Application Support/agentic-studio/plugins/
// exports a tool spec the agent can call:
//
//   module.exports = {
//     name: 'pull_request',
//     description: 'Open a GitHub PR with the staged changes.',
//     parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
//     async run(args, ctx) {
//       // ctx.workspaceDir, ctx.exec(...), ctx.log(...)
//       return { ok: true };
//     },
//   };

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PluginContext {
  workspaceDir?: string;
  log: (message: string) => void;
}

export interface PluginTool {
  name: string;
  description: string;
  parameters: any;
  run: (args: any, ctx: PluginContext) => Promise<any>;
}

const plugins = new Map<string, PluginTool>();

export function pluginsDir(): string {
  return path.join(app.getPath('userData'), 'plugins');
}

export function listPlugins(): PluginTool[] {
  return Array.from(plugins.values());
}

export function loadPlugins() {
  plugins.clear();
  const dir = pluginsDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') && !file.endsWith('.cjs')) continue;
    const full = path.join(dir, file);
    try {
      // Invalidate require cache so editing a plugin + restarting picks up changes.
      delete require.cache[require.resolve(full)];
      const mod = require(full);
      const tool: PluginTool = mod && (mod.default || mod);
      if (!tool || typeof tool.run !== 'function' || typeof tool.name !== 'string') {
        console.warn(`[plugins] ${file}: missing name or run()`);
        continue;
      }
      plugins.set(tool.name, tool);
      console.log(`[plugins] loaded ${tool.name} from ${file}`);
    } catch (err) {
      console.warn(`[plugins] failed to load ${file}:`, err);
    }
  }
}

export function reloadPlugins() {
  loadPlugins();
  return listPlugins().map((t) => ({ name: t.name, description: t.description }));
}

/** Write a starter plugin into the user's plugins folder if it's empty. */
export function ensureSamplePlugin() {
  const dir = pluginsDir();
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  const sample = path.join(dir, 'sample-time.cjs');
  if (fs.existsSync(sample)) return;
  const src = `// Sample Agentic Studio plugin. Drop more .cjs/.js files into this folder
// and reload from the Settings panel.

module.exports = {
  name: 'current_time',
  description: 'Return the desktop\\'s current local time. Useful when the model needs ground truth.',
  parameters: { type: 'object', properties: {} },
  async run(_args, _ctx) {
    return { now: new Date().toString(), epoch: Date.now() };
  },
};
`;
  try { fs.writeFileSync(sample, src, 'utf8'); } catch {}
}
