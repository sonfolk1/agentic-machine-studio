import { ipcMain, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChromeBridge } from './chromeBridge';
import { listPlugins } from './plugins';

type GetSettings = () => {
  openrouterKey?: string;
  workspaceDir?: string;
  requireApproval: boolean;
  visionEnabled?: boolean;
};

type GetMainWindow = () => BrowserWindow | null;

interface AssistantMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Create a new file (or overwrite existing) inside the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path relative to the workspace root.' },
          contents: { type: 'string', description: 'UTF-8 file contents.' },
        },
        required: ['path', 'contents'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'view_file',
      description: 'View a file or list a directory inside the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative path.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file_patch',
      description:
        'Replace a unique substring inside a workspace file. old_string must appear exactly once.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_string: { type: 'string' },
          new_string: { type: 'string' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_directory',
      description: 'List the workspace directory tree up to depth (default 3).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          depth: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description:
        'Run a shell command (npm, pip, brew, scripts). Streams stdout/stderr back; resolves with exit code.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Optional sub-path relative to workspace.' },
        },
        required: ['command'],
      },
    },
  },
  // ── Chrome browser tools (via the Agentic Studio Bridge extension) ──────
  {
    type: 'function',
    function: {
      name: 'browser_list_tabs',
      description: 'List the user\'s open Chrome tabs (id, url, title, active).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_navigate',
      description: 'Navigate to a URL. Opens a new tab when tabId is omitted.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          tabId: { type: 'number' },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_get_page_text',
      description: 'Return the readable text of the page (innerText, truncated).',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_get_page_snapshot',
      description:
        'Return a structured list of interactive elements (links, buttons, inputs) with selectors you can pass back to browser_click/browser_type.',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_click',
      description: 'Click an element matched by a CSS selector on the page.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          tabId: { type: 'number' },
        },
        required: ['selector'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_type',
      description: 'Type text into the element matched by a CSS selector.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' },
          tabId: { type: 'number' },
        },
        required: ['selector', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_eval',
      description:
        'Run arbitrary JavaScript in the page and return its String/JSON value. Use sparingly.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          tabId: { type: 'number' },
        },
        required: ['code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_close_tab',
      description: 'Close a tab by id.',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' } },
        required: ['tabId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'browser_wait',
      description:
        'Wait for ms milliseconds (capped at 10000). Useful for letting a page finish loading after a click.',
      parameters: {
        type: 'object',
        properties: { ms: { type: 'number' } },
        required: ['ms'],
      },
    },
  },
];

const pendingApprovals = new Map<string, (decision: 'approve' | 'deny') => void>();
const activeSessions = new Map<string, AbortController>();

function resolveInWorkspace(workspace: string | undefined, relPath: string): string {
  if (!workspace) throw new Error('Workspace not set.');
  const root = path.resolve(workspace);
  const candidate = path.resolve(root, relPath || '.');
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path escapes workspace: ${relPath}`);
  }
  return candidate;
}

async function executeTool(
  name: string,
  args: any,
  getSettings: GetSettings,
  win: BrowserWindow | null,
  chromeBridge: ChromeBridge,
): Promise<string> {
  const s = getSettings();
  if (name.startsWith('browser_')) {
    const method = name.slice('browser_'.length);
    try {
      const result = await chromeBridge.call(method, args ?? {});
      return JSON.stringify(result);
    } catch (err: any) {
      return JSON.stringify({ error: String(err?.message ?? err) });
    }
  }
  // Plugin-registered tool? Route to its run() handler.
  const plugin = listPlugins().find((p) => p.name === name);
  if (plugin) {
    try {
      const result = await plugin.run(args ?? {}, {
        workspaceDir: s.workspaceDir,
        log: (m) => console.log(`[plugin:${name}]`, m),
      });
      return JSON.stringify(result ?? { ok: true });
    } catch (err: any) {
      return JSON.stringify({ error: String(err?.message ?? err) });
    }
  }
  switch (name) {
    case 'create_file': {
      const abs = resolveInWorkspace(s.workspaceDir, args.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, args.contents ?? '', 'utf8');
      return JSON.stringify({ ok: true, path: args.path, bytes: Buffer.byteLength(args.contents ?? '', 'utf8') });
    }
    case 'view_file': {
      const abs = resolveInWorkspace(s.workspaceDir, args.path);
      if (!fs.existsSync(abs)) return JSON.stringify({ error: `Not found: ${args.path}` });
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(abs, { withFileTypes: true }).map((d) => ({
          name: d.name,
          kind: d.isDirectory() ? 'dir' : 'file',
        }));
        return JSON.stringify({ kind: 'directory', entries });
      }
      const raw = fs.readFileSync(abs, 'utf8');
      return JSON.stringify({
        kind: 'file',
        truncated: raw.length > 60_000,
        contents: raw.slice(0, 60_000),
      });
    }
    case 'edit_file_patch': {
      const abs = resolveInWorkspace(s.workspaceDir, args.path);
      if (!fs.existsSync(abs)) return JSON.stringify({ error: `Not found: ${args.path}` });
      const orig = fs.readFileSync(abs, 'utf8');
      const idx = orig.indexOf(args.old_string);
      if (idx < 0) return JSON.stringify({ error: 'old_string not found' });
      if (idx !== orig.lastIndexOf(args.old_string))
        return JSON.stringify({ error: 'old_string not unique; expand context' });
      const updated =
        orig.slice(0, idx) + (args.new_string ?? '') + orig.slice(idx + args.old_string.length);
      fs.writeFileSync(abs, updated, 'utf8');
      return JSON.stringify({ ok: true, path: args.path });
    }
    case 'scan_directory': {
      const abs = resolveInWorkspace(s.workspaceDir, args.path || '.');
      const maxDepth = Math.max(1, Math.min(args.depth ?? 3, 6));
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
      return JSON.stringify({ root: abs, entries: out });
    }
    case 'run_shell': {
      if (!s.workspaceDir) return JSON.stringify({ error: 'workspace not set' });
      const cwd = args.cwd ? path.resolve(s.workspaceDir, args.cwd) : s.workspaceDir;
      return new Promise<string>((resolve) => {
        const child = spawn(args.command, { cwd, shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (b) => {
          const t = b.toString('utf8');
          stdout += t;
          win?.webContents.send('agent:event', { type: 'shell-chunk', kind: 'stdout', text: t });
        });
        child.stderr.on('data', (b) => {
          const t = b.toString('utf8');
          stderr += t;
          win?.webContents.send('agent:event', { type: 'shell-chunk', kind: 'stderr', text: t });
        });
        child.on('close', (code) => {
          resolve(JSON.stringify({
            exitCode: code ?? 0,
            stdout: stdout.slice(-8000),
            stderr: stderr.slice(-4000),
          }));
        });
        child.on('error', (err) => {
          resolve(JSON.stringify({ exitCode: 1, error: String(err) }));
        });
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function awaitApproval(
  win: BrowserWindow | null,
  toolCallId: string,
  toolName: string,
  args: any,
): Promise<'approve' | 'deny'> {
  return new Promise((resolve) => {
    pendingApprovals.set(toolCallId, resolve);
    win?.webContents.send('agent:event', {
      type: 'approval-request',
      toolCallId,
      toolName,
      args,
    });
  });
}

const SYSTEM_PROMPT = `You are Agentic Studio, an autonomous agent running inside a native macOS desktop app.

Workspace tools (filesystem + shell, scoped to the user's chosen folder):
  create_file, view_file, edit_file_patch, scan_directory, run_shell.

Browser tools (only when the Agentic Studio Chrome extension is connected):
  browser_list_tabs, browser_navigate, browser_get_page_text, browser_get_page_snapshot,
  browser_click, browser_type, browser_eval, browser_close_tab, browser_wait.

Guidance:
- Scan before you assume structure. Prefer small focused edits with edit_file_patch.
- For browser work: list tabs or navigate first, then call browser_get_page_snapshot to discover interactive elements, then click/type with the selectors it returned.
- After a click or navigation, use browser_wait (500–2000ms) before reading the page again.
- Be decisive — call tools instead of describing what you would do. Keep replies concise.`;

/**
 * Streaming OpenRouter call. Emits 'assistant-delta' events as tokens arrive,
 * and resolves with the assembled assistant message + usage metrics.
 */
async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: AssistantMessage[],
  reasoning: { effort: 'minimal' | 'low' | 'medium' | 'high' } | null,
  abort: AbortSignal,
  onDelta: (text: string) => void,
  onUsage: (usage: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number }) => void,
): Promise<AssistantMessage> {
  // Build the full tool list each turn — plugins can be hot-added.
  const allTools = [
    ...tools,
    ...listPlugins().map((p) => ({
      type: 'function' as const,
      function: { name: p.name, description: p.description, parameters: p.parameters },
    })),
  ];
  const body: any = {
    model,
    messages,
    tools: allTools,
    tool_choice: 'auto',
    stream: true,
    usage: { include: true },
  };
  if (reasoning) body.reasoning = { effort: reasoning.effort };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: abort,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'HTTP-Referer': 'https://agentic.studio.local',
      'X-Title': 'Agentic Studio',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 400)}`);
  }
  if (!res.body) throw new Error('OpenRouter returned no stream body');

  let assembledContent = '';
  // Accumulate tool_calls by index — providers may stream args one token at a time.
  const toolCallAcc: Record<number, { id?: string; name?: string; args: string }> = {};

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    if (abort.aborted) throw new Error('Cancelled');
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by blank lines.
    let frameEnd: number;
    while ((frameEnd = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      const dataLines = frame.split('\n').filter((l) => l.startsWith('data:'));
      for (const line of dataLines) {
        const payload = line.slice(5).trimStart();
        if (payload === '[DONE]') continue;
        let evt: any;
        try { evt = JSON.parse(payload); } catch { continue; }
        if (evt.usage) onUsage(evt.usage);
        const choice = evt.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta || {};
        if (typeof delta.content === 'string' && delta.content.length > 0) {
          assembledContent += delta.content;
          onDelta(delta.content);
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const slot = (toolCallAcc[idx] ||= { args: '' });
            if (tc.id) slot.id = tc.id;
            if (tc.function?.name) slot.name = tc.function.name;
            if (typeof tc.function?.arguments === 'string') slot.args += tc.function.arguments;
          }
        }
      }
    }
  }

  const tool_calls = Object.keys(toolCallAcc)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => toolCallAcc[Number(k)])
    .filter((t) => t.id && t.name)
    .map((t) => ({
      id: t.id!,
      type: 'function' as const,
      function: { name: t.name!, arguments: t.args },
    }));

  return {
    role: 'assistant',
    content: assembledContent,
    tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
  };
}

export function registerAgentHandlers(
  getSettings: GetSettings,
  getMainWindow: GetMainWindow,
  chromeBridge: ChromeBridge,
) {
  ipcMain.handle('agent:approve', (_e, { toolCallId, decision }: { toolCallId: string; decision: 'approve' | 'deny' }) => {
    const resolver = pendingApprovals.get(toolCallId);
    if (resolver) {
      pendingApprovals.delete(toolCallId);
      resolver(decision);
    }
    return { ok: true };
  });

  ipcMain.handle('agent:cancel', (_e, { sessionId }: { sessionId: string }) => {
    const ctrl = activeSessions.get(sessionId);
    if (ctrl) ctrl.abort();
    activeSessions.delete(sessionId);
    return { ok: true };
  });

  ipcMain.handle('agent:start', async (_e, payload: {
    sessionId?: string;
    model: string;
    reasoning: 'minimal' | 'low' | 'medium' | 'high' | null;
    history: AssistantMessage[];
    userMessage: string;
    attachments?: Array<{ kind: 'text' | 'image'; name: string; content: string }>;
  }) => {
    const settings = getSettings();
    if (!settings.openrouterKey) {
      throw new Error('OpenRouter API key not set. Open Settings to add one.');
    }
    if (!settings.workspaceDir) {
      throw new Error('Workspace folder not set. Open Settings to pick one.');
    }

    const win = getMainWindow();
    const sessionId = payload.sessionId || randomUUID();
    const abort = new AbortController();
    activeSessions.set(sessionId, abort);

    // Build the user turn — may be multi-modal if attachments are present.
    const atts = payload.attachments ?? [];
    let userContent: any = payload.userMessage;
    const hasImage = atts.some((a) => a.kind === 'image');
    const hasText  = atts.some((a) => a.kind === 'text');
    if (hasImage || hasText) {
      const parts: any[] = [];
      if (payload.userMessage) parts.push({ type: 'text', text: payload.userMessage });
      for (const a of atts) {
        if (a.kind === 'image') {
          parts.push({ type: 'image_url', image_url: { url: a.content } });
        } else {
          parts.push({ type: 'text', text: `\n\n--- attached file: ${a.name} ---\n${a.content}\n--- end of ${a.name} ---` });
        }
      }
      userContent = parts;
    }

    const messages: AssistantMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...payload.history,
      { role: 'user', content: userContent as any },
    ];

    // Memory-pressure guard. After ~12 turns the in-memory chat grows quickly
    // (assistant + tool-result + tool messages each turn; vision adds full
    // base64 PNGs). Prune older messages and strip inlined image_url parts.
    const MAX_HISTORY = 80;
    function pruneMessages() {
      if (messages.length <= MAX_HISTORY) return;
      // Keep the first system message + the tail.
      const head = messages.slice(0, 1);
      const tail = messages.slice(-(MAX_HISTORY - 1));
      messages.length = 0;
      messages.push(...head, ...tail);
    }
    function stripStaleImages() {
      // For every message past the most recent 4, drop inline image bytes.
      const cutoff = Math.max(0, messages.length - 4);
      for (let i = 0; i < cutoff; i++) {
        const m = messages[i];
        if (Array.isArray(m.content)) {
          m.content = (m.content as any[]).map((p) =>
            p?.type === 'image_url' ? { type: 'text', text: '[image dropped from history to save memory]' } : p
          ) as any;
        }
      }
    }

    win?.webContents.send('agent:event', { type: 'turn-start', sessionId });

    const supportsReasoning = (m: string) =>
      /(\bo1\b|gpt-5|opus|sonnet|claude-4|gemini-3|grok-4|deepseek-v4|glm-5|kimi-k2|qwen3?\.\d|mimo)/i.test(m);

    let safety = 0;
    try {
      while (safety++ < 24) {
        if (abort.signal.aborted) throw new Error('Cancelled');

        // Keep memory bounded — drops old turns and old inlined images.
        pruneMessages();
        stripStaleImages();

        win?.webContents.send('agent:event', { type: 'thinking', sessionId });

        // Generate a stable message id so streaming deltas can append into one bubble.
        const assistantMessageId = randomUUID();
        win?.webContents.send('agent:event', {
          type: 'assistant-start',
          sessionId,
          messageId: assistantMessageId,
        });

        const assistantMsg = await callOpenRouter(
          settings.openrouterKey,
          payload.model,
          messages,
          payload.reasoning && supportsReasoning(payload.model)
            ? { effort: payload.reasoning }
            : null,
          abort.signal,
          (delta) => {
            win?.webContents.send('agent:event', {
              type: 'assistant-delta',
              sessionId,
              messageId: assistantMessageId,
              text: delta,
            });
          },
          (usage) => {
            win?.webContents.send('agent:event', {
              type: 'usage',
              sessionId,
              model: payload.model,
              usage,
            });
          },
        );
        messages.push(assistantMsg);

        win?.webContents.send('agent:event', {
          type: 'assistant-end',
          sessionId,
          messageId: assistantMessageId,
        });

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
          break;
        }

        for (const call of assistantMsg.tool_calls) {
          if (abort.signal.aborted) throw new Error('Cancelled');
          let args: any = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch {}

          if (getSettings().requireApproval) {
            win?.webContents.send('agent:event', {
              type: 'tool-call-pending',
              sessionId,
              toolCallId: call.id,
              toolName: call.function.name,
              args,
            });
            const decision = await awaitApproval(win, call.id, call.function.name, args);
            if (decision === 'deny') {
              const denied = JSON.stringify({ error: 'User denied this tool call.' });
              messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: denied });
              win?.webContents.send('agent:event', {
                type: 'tool-result',
                sessionId,
                toolCallId: call.id,
                toolName: call.function.name,
                result: denied,
                denied: true,
              });
              continue;
            }
          }

          win?.webContents.send('agent:event', {
            type: 'tool-call-running',
            sessionId,
            toolCallId: call.id,
            toolName: call.function.name,
            args,
          });

          let result: string;
          try {
            result = await executeTool(call.function.name, args, getSettings, win, chromeBridge);
          } catch (err: any) {
            result = JSON.stringify({ error: String(err?.message ?? err) });
          }

          messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: result });
          win?.webContents.send('agent:event', {
            type: 'tool-result',
            sessionId,
            toolCallId: call.id,
            toolName: call.function.name,
            result,
          });

          // Vision: when the screenshot tool fires and vision is enabled,
          // smuggle the captured image back in as a user-side image so a
          // vision-capable model can actually see what's on the page.
          if (
            call.function.name === 'browser_screenshot' &&
            getSettings().visionEnabled
          ) {
            try {
              const parsed = JSON.parse(result || '{}');
              if (parsed?.dataUrl) {
                messages.push({
                  role: 'user',
                  content: [
                    { type: 'text', text: '[Screenshot from the active Chrome tab]' },
                    { type: 'image_url', image_url: { url: parsed.dataUrl } },
                  ] as any,
                });
              }
            } catch {}
          }
        }
      }

      win?.webContents.send('agent:event', { type: 'turn-end', sessionId });
      return { sessionId, messages };
    } catch (err: any) {
      win?.webContents.send('agent:event', {
        type: 'error',
        sessionId,
        message: String(err?.message ?? err),
      });
      throw err;
    } finally {
      activeSessions.delete(sessionId);
    }
  });
}
