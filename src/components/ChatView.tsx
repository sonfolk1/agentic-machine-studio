import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useStore, type ChatMessage, type ToolCallRecord } from '@/store/useStore';
import { IconCheck, IconX, IconFile, IconTerminal, IconFolder } from './icons/BrandIcons';
import { Markdown } from './Markdown';

const toolIcon = (name: string) => {
  if (name === 'run_shell') return IconTerminal;
  if (name === 'scan_directory') return IconFolder;
  return IconFile;
};

const ToolCallBlock: React.FC<{ tc: ToolCallRecord }> = ({ tc }) => {
  const Icon = toolIcon(tc.name);
  const label = (() => {
    if (tc.name === 'run_shell') return tc.args?.command || '(command)';
    if (tc.name === 'create_file') return tc.args?.path || '(file)';
    if (tc.name === 'edit_file_patch') return tc.args?.path || '(file)';
    if (tc.name === 'view_file') return tc.args?.path || '(file)';
    if (tc.name === 'scan_directory') return tc.args?.path || '.';
    return '';
  })();

  const statusColor =
    tc.status === 'done'
      ? 'text-emerald-400/90'
      : tc.status === 'denied'
        ? 'text-rose-400/90'
        : tc.status === 'running'
          ? 'text-amber-300/90'
          : tc.status === 'pending'
            ? 'text-ink-300'
            : 'text-ink-400';

  const statusLabel =
    tc.status === 'pending'
      ? 'awaiting approval'
      : tc.status === 'running'
        ? 'running'
        : tc.status === 'done'
          ? 'done'
          : tc.status === 'denied'
            ? 'denied'
            : tc.status;

  return (
    <div className="my-2 rounded-lg border border-white/[0.05] bg-ink-850/70 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.04]">
        <Icon size={13} className="text-ink-300" />
        <span className="text-[12px] font-medium text-ink-200">{tc.name}</span>
        <span className="text-[11.5px] text-ink-500 truncate flex-1">{label}</span>
        <span className={clsx('text-[11px] uppercase tracking-[0.14em]', statusColor)}>
          {statusLabel}
        </span>
      </div>
      {tc.name === 'run_shell' && (
        <pre className="px-3 py-2 text-[11.5px] text-ink-300 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
          $ {tc.args?.command}
        </pre>
      )}
      {tc.name === 'create_file' && tc.args?.contents && (
        <pre className="px-3 py-2 text-[11.5px] text-ink-300 font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {String(tc.args.contents).slice(0, 1200)}
          {String(tc.args.contents).length > 1200 ? '\n…' : ''}
        </pre>
      )}
      {tc.name === 'edit_file_patch' && (
        <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
          <pre className="px-3 py-2 text-[11.5px] text-rose-300/80 font-mono bg-ink-900/70 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            - {String(tc.args?.old_string ?? '').slice(0, 600)}
          </pre>
          <pre className="px-3 py-2 text-[11.5px] text-emerald-300/80 font-mono bg-ink-900/70 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            + {String(tc.args?.new_string ?? '').slice(0, 600)}
          </pre>
        </div>
      )}
      {tc.result && tc.status === 'done' && (
        <pre className="px-3 py-2 text-[11px] text-ink-400 font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto border-t border-white/[0.04]">
          {tc.result.slice(0, 800)}
          {tc.result.length > 800 ? '\n…' : ''}
        </pre>
      )}
    </div>
  );
};

const MessageBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[78%] bg-ink-800/90 border border-white/[0.06] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[13.5px] text-ink-100 whitespace-pre-wrap">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 flex gap-3">
      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent-soft grid place-items-center shrink-0">
        <span className="text-[10px] font-semibold text-ink-900">AS</span>
      </div>
      <div className="flex-1 min-w-0">
        {msg.text && <Markdown text={msg.text} />}
        {msg.toolCalls?.map((tc) => <ToolCallBlock key={tc.id} tc={tc} />)}
        {msg.shellOutput && msg.shellOutput.length > 0 && (
          <pre className="mt-1 rounded-md border border-white/[0.04] bg-ink-950/80 p-2 text-[11px] font-mono text-ink-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {msg.shellOutput.map((c, i) => (
              <span key={i} className={c.kind === 'stderr' ? 'text-rose-300/80' : 'text-ink-200'}>
                {c.text}
              </span>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
};

const ThinkingIndicator: React.FC = () => (
  <div className="my-3 flex gap-3 items-center">
    <div className="w-7 h-7 rounded-md bg-ink-800 border border-white/[0.05] grid place-items-center">
      <span className="text-[10px] font-semibold text-ink-300">AS</span>
    </div>
    <div className="h-2.5 w-32 rounded-full bg-shimmer animate-shimmer" />
  </div>
);

export const ChatView: React.FC = () => {
  const { messages, thinking } = useStore();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  return (
    <div
      ref={ref}
      className="w-full h-full overflow-y-auto px-10 pt-8 pb-40 animate-fadeIn"
    >
      <div className="max-w-[820px] mx-auto">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {thinking && <ThinkingIndicator />}
      </div>
    </div>
  );
};
