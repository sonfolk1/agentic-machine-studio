import React from 'react';
import { useStore } from '@/store/useStore';
import { IconCheck, IconX, IconFile, IconTerminal, IconFolder } from './icons/BrandIcons';

const summarize = (toolName: string, args: any): { kind: string; primary: string; detail?: string } => {
  switch (toolName) {
    case 'create_file':
      return { kind: 'Write file', primary: args?.path ?? '(unknown)', detail: args?.contents };
    case 'edit_file_patch':
      return { kind: 'Edit file', primary: args?.path ?? '(unknown)', detail: `- ${args?.old_string}\n+ ${args?.new_string}` };
    case 'view_file':
      return { kind: 'Read file', primary: args?.path ?? '(unknown)' };
    case 'scan_directory':
      return { kind: 'Scan directory', primary: args?.path ?? '.' };
    case 'run_shell':
      return { kind: 'Run shell', primary: args?.command ?? '(command)' };
    default:
      return { kind: toolName, primary: '' };
  }
};

const iconFor = (name: string) => {
  if (name === 'run_shell') return IconTerminal;
  if (name === 'scan_directory') return IconFolder;
  return IconFile;
};

export const ApprovalBanner: React.FC = () => {
  const { pendingApproval, respondApproval } = useStore();
  if (!pendingApproval) return null;

  const s = summarize(pendingApproval.toolName, pendingApproval.args);
  const Icon = iconFor(pendingApproval.toolName);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-32 z-30 w-[640px] max-w-[92%] rounded-xl glass shadow-floating animate-fadeIn">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <div className="w-7 h-7 rounded-md bg-amber-400/15 border border-amber-300/20 grid place-items-center">
          <Icon size={14} className="text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-ink-100">{s.kind} &mdash; awaiting approval</div>
          <div className="text-[11.5px] text-ink-400 truncate font-mono">{s.primary}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => respondApproval('deny')}
            className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12px] text-ink-200 hover:bg-rose-500/15 hover:text-rose-200"
          >
            <IconX size={12} />
            Deny
          </button>
          <button
            onClick={() => respondApproval('approve')}
            className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 text-[12px] font-medium hover:brightness-110"
          >
            <IconCheck size={12} />
            Approve
          </button>
        </div>
      </div>
      {s.detail && (
        <pre className="px-4 py-3 text-[11.5px] font-mono text-ink-300 whitespace-pre-wrap max-h-44 overflow-y-auto">
          {s.detail.slice(0, 1400)}
          {s.detail.length > 1400 ? '\n…' : ''}
        </pre>
      )}
    </div>
  );
};
