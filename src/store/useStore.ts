import { create } from 'zustand';
import type { Brand } from '@/lib/models';

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export type View = 'chat' | 'cowork' | 'code';

export interface ToolCallRecord {
  id: string;
  name: string;
  args: any;
  status: 'pending' | 'approved' | 'denied' | 'running' | 'done' | 'error';
  result?: string;
}

export interface ShellChunk {
  kind: 'stdout' | 'stderr';
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: ToolCallRecord[];
  shellOutput?: ShellChunk[];
  createdAt: number;
}

export interface RecentTask {
  id: string;
  title: string;
  preview: string;
  at: number;
}

export interface Settings {
  hasKey: boolean;
  workspaceDir?: string;
  requireApproval: boolean;
  selectedModel: string;
  reasoningEffort: ReasoningEffort;
  visionEnabled: boolean;
  bridgeToken?: string;
}

export interface PendingApproval {
  toolCallId: string;
  toolName: string;
  args: any;
}

interface StoreState {
  // UI
  activeView: View;
  setActiveView: (v: View) => void;
  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;
  modelPickerOpen: boolean;
  setModelPickerOpen: (b: boolean) => void;
  chromeConnected: boolean;
  initChromeStatus: () => Promise<() => void>;

  // Settings
  settings: Settings;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings> & { openrouterKey?: string }) => Promise<void>;
  pickWorkspace: () => Promise<void>;

  // Session state
  isActive: boolean;            // True after first user message (drives slide-away)
  sessionId: string | null;
  messages: ChatMessage[];
  recent: RecentTask[];
  thinking: boolean;
  pendingApproval: PendingApproval | null;

  // Composer
  composer: string;
  setComposer: (s: string) => void;

  sendMessage: () => Promise<void>;
  resetSession: () => void;
  cancel: () => Promise<void>;
  respondApproval: (decision: 'approve' | 'deny') => Promise<void>;

  // Cost & usage tracking
  totalTokens: number;
  usageByModel: Record<string, number>;

  // Attachments staged on the composer
  attachments: ComposerAttachment[];
  addAttachment: (att: ComposerAttachment) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;

  // Event handling (called from preload bridge)
  handleAgentEvent: (e: any) => void;
}

export interface ComposerAttachment {
  id: string;
  kind: 'text' | 'image';
  name: string;
  size: number;
  /** For text: full contents. For image: data URL. */
  content: string;
}

const initial: Pick<StoreState, 'messages' | 'recent' | 'isActive' | 'sessionId' | 'thinking' | 'pendingApproval'> = {
  messages: [],
  recent: [],
  isActive: false,
  sessionId: null,
  thinking: false,
  pendingApproval: null,
};

export const useStore = create<StoreState>((set, get) => ({
  activeView: 'chat',
  setActiveView: (v) => set({ activeView: v }),
  settingsOpen: false,
  setSettingsOpen: (b) => set({ settingsOpen: b }),
  modelPickerOpen: false,
  setModelPickerOpen: (b) => set({ modelPickerOpen: b }),
  chromeConnected: false,
  initChromeStatus: async () => {
    const initial = await window.api.chrome.status();
    set({ chromeConnected: !!initial?.connected });
    return window.api.chrome.onStatus((e) => set({ chromeConnected: !!e?.connected }));
  },

  settings: {
    hasKey: false,
    requireApproval: true,
    selectedModel: 'anthropic/claude-opus-4.7',
    reasoningEffort: 'medium',
    visionEnabled: false,
  },

  loadSettings: async () => {
    const s = await window.api.settings.get();
    set({ settings: s });
  },

  updateSettings: async (patch) => {
    const s = await window.api.settings.set(patch);
    set({ settings: s });
  },

  pickWorkspace: async () => {
    const dir = await window.api.settings.pickWorkspace();
    if (dir) {
      const s = await window.api.settings.get();
      set({ settings: s });
    }
  },

  composer: '',
  setComposer: (s) => set({ composer: s }),

  ...initial,
  totalTokens: 0,
  usageByModel: {},
  attachments: [],
  addAttachment: (att) => set((s) => ({ attachments: [...s.attachments, att] })),
  removeAttachment: (id) => set((s) => ({ attachments: s.attachments.filter((a) => a.id !== id) })),
  clearAttachments: () => set({ attachments: [] }),
  cancel: async () => {
    const sid = get().sessionId;
    if (!sid) return;
    await window.api.agent.cancel(sid);
    set({ thinking: false });
  },

  resetSession: () =>
    set({
      messages: [],
      isActive: false,
      sessionId: null,
      thinking: false,
      pendingApproval: null,
    }),

  sendMessage: async () => {
    const { composer, messages, settings, attachments } = get();
    const text = composer.trim();
    if (!text && attachments.length === 0) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      createdAt: Date.now(),
    };

    // Pre-generate a session id so cancellation works mid-stream.
    const sid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    set((s) => ({
      messages: [...s.messages, userMsg],
      composer: '',
      isActive: true,
      thinking: true,
      sessionId: sid,
    }));

    // Build the wire-format history out of prior assistant messages.
    const history = messages
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.text))
      .map((m) => ({ role: m.role, content: m.text }));

    // Pop attachments off the composer once submitted.
    const sentAttachments = attachments.slice();
    set({ attachments: [] });

    try {
      const result = await window.api.agent.start({
        sessionId: sid,
        model: settings.selectedModel,
        reasoning: settings.reasoningEffort,
        history,
        userMessage: text,
        attachments: sentAttachments,
      });
      const sessionId = result?.sessionId ?? sid;
      if (sessionId) set({ sessionId });
    } catch (err: any) {
      const errText = String(err?.message ?? err);
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `e_${Date.now()}`,
            role: 'assistant',
            text: `**Error:** ${errText}`,
            createdAt: Date.now(),
          },
        ],
        thinking: false,
      }));
    }

    // Record into recents
    set((s) => ({
      recent: [
        {
          id: userMsg.id,
          title: text.slice(0, 48),
          preview: text.slice(0, 120),
          at: Date.now(),
        },
        ...s.recent,
      ].slice(0, 12),
    }));
  },

  respondApproval: async (decision) => {
    const pending = get().pendingApproval;
    if (!pending) return;
    await window.api.agent.approve(pending.toolCallId, decision);
    set({ pendingApproval: null });
  },

  handleAgentEvent: (e: any) => {
    if (!e?.type) return;
    switch (e.type) {
      case 'turn-start':
      case 'thinking':
        set({ thinking: true });
        break;
      case 'assistant-start': {
        set((s) => {
          // Keep the rendered list bounded — old turns get dropped from the
          // UI but server-side history pruning is what matters for OOM.
          const MAX_UI_MESSAGES = 200;
          const next = [
            ...s.messages,
            { id: e.messageId, role: 'assistant' as const, text: '', createdAt: Date.now() },
          ];
          const trimmed = next.length > MAX_UI_MESSAGES ? next.slice(-MAX_UI_MESSAGES) : next;
          return { messages: trimmed, thinking: true };
        });
        break;
      }
      case 'assistant-delta': {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === e.messageId ? { ...m, text: m.text + e.text } : m,
          ),
          thinking: false,
        }));
        break;
      }
      case 'assistant-end': {
        set({ thinking: false });
        break;
      }
      case 'usage': {
        const tokens = e.usage?.total_tokens || 0;
        set((s) => ({
          totalTokens: (s.totalTokens || 0) + tokens,
          usageByModel: { ...(s.usageByModel || {}), [e.model]: ((s.usageByModel?.[e.model]) || 0) + tokens },
        }));
        break;
      }
      // Back-compat with the old non-streaming event.
      case 'assistant-text': {
        const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        set((s) => ({
          messages: [
            ...s.messages,
            { id, role: 'assistant', text: e.text, createdAt: Date.now() },
          ],
          thinking: false,
        }));
        break;
      }
      case 'tool-call-pending': {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          const record: ToolCallRecord = {
            id: e.toolCallId,
            name: e.toolName,
            args: e.args,
            status: 'pending',
          };
          if (last && last.role === 'assistant') {
            last.toolCalls = [...(last.toolCalls ?? []), record];
          } else {
            msgs.push({
              id: `a_${Date.now()}`,
              role: 'assistant',
              text: '',
              toolCalls: [record],
              createdAt: Date.now(),
            });
          }
          return {
            messages: msgs,
            pendingApproval: {
              toolCallId: e.toolCallId,
              toolName: e.toolName,
              args: e.args,
            },
          };
        });
        break;
      }
      case 'tool-call-running': {
        set((s) => ({
          messages: s.messages.map((m) => ({
            ...m,
            toolCalls: m.toolCalls?.map((tc) =>
              tc.id === e.toolCallId ? { ...tc, status: 'running' } : tc,
            ),
          })),
          pendingApproval: null,
        }));
        break;
      }
      case 'tool-result': {
        set((s) => ({
          messages: s.messages.map((m) => ({
            ...m,
            toolCalls: m.toolCalls?.map((tc) =>
              tc.id === e.toolCallId
                ? { ...tc, status: e.denied ? 'denied' : 'done', result: e.result }
                : tc,
            ),
          })),
        }));
        break;
      }
      case 'shell-chunk': {
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            last.shellOutput = [...(last.shellOutput ?? []), { kind: e.kind, text: e.text }];
          }
          return { messages: msgs };
        });
        break;
      }
      case 'turn-end':
        set({ thinking: false });
        break;
      case 'error':
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: `e_${Date.now()}`,
              role: 'assistant',
              text: `**Error:** ${e.message}`,
              createdAt: Date.now(),
            },
          ],
          thinking: false,
        }));
        break;
    }
  },
}));

export const brandLabel = (b: Brand): string => {
  switch (b) {
    case 'openai': return 'OpenAI';
    case 'anthropic': return 'Anthropic';
    case 'google': return 'Google';
    case 'alibaba': return 'Alibaba';
    case 'moonshot': return 'Moonshot';
    case 'minimax': return 'MiniMax';
    case 'xai': return 'xAI';
    case 'tsinghua': return 'Tsinghua';
    case 'deepseek': return 'Deepseek';
    case 'stepfun': return 'StepFun';
    case 'openrouter': return 'OpenRouter';
  }
};
