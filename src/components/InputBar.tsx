import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { ModelPicker } from './ModelPicker';
import { ReasoningPicker } from './ReasoningPicker';
import { IconSend, IconX } from './icons/BrandIcons';
import { AttachmentChips, useDropTarget } from './AttachmentChips';
import { estimateCost, formatCost } from '@/lib/pricing';
import { findModelById } from '@/lib/models';

export const InputBar: React.FC = () => {
  const {
    composer,
    setComposer,
    sendMessage,
    thinking,
    settings,
    setSettingsOpen,
    chromeConnected,
    attachments,
    cancel,
    totalTokens,
    usageByModel,
  } = useStore();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const dropTarget = useRef<HTMLDivElement | null>(null);
  useDropTarget(dropTarget);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [composer]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const submit = () => {
    if (!composer.trim() && attachments.length === 0) return;
    if (thinking) return;
    if (!settings.hasKey || !settings.workspaceDir) {
      setSettingsOpen(true);
      return;
    }
    sendMessage();
  };

  const cost = estimateCost(usageByModel);
  const currentModel = findModelById(settings.selectedModel);

  return (
    <div className="absolute bottom-0 inset-x-0 px-8 pb-6 pt-10 pointer-events-none bg-gradient-to-t from-ink-900 via-ink-900/85 to-transparent">
      <div
        ref={dropTarget}
        className="pointer-events-auto max-w-[820px] mx-auto rounded-2xl glass shadow-floating transition-all"
      >
        <AttachmentChips />
        <textarea
          ref={ref}
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder={
            settings.hasKey
              ? settings.workspaceDir
                ? 'Describe a task. Drop files, paste images...'
                : 'Pick a workspace folder in Settings to begin'
              : 'Add your OpenRouter API key in Settings to begin'
          }
          className="w-full bg-transparent text-[14px] text-ink-100 placeholder:text-ink-500 px-4 pt-3.5 pb-1 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-2 text-[11.5px] text-ink-400">
            <span className="px-1.5 py-0.5 rounded bg-ink-800/70 border border-white/[0.05] font-mono">
              {settings.requireApproval ? 'manual approval' : 'auto-execute'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono ${
                chromeConnected
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
                  : 'border-white/[0.05] bg-ink-800/70 text-ink-500'
              }`}
              title={
                chromeConnected
                  ? 'Chrome extension connected — browser tools enabled'
                  : 'Chrome extension not connected — load chrome-extension/ in chrome://extensions'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${chromeConnected ? 'bg-emerald-400' : 'bg-ink-500'}`}
              />
              chrome
            </span>
            {settings.workspaceDir && (
              <span
                className="truncate max-w-[200px]"
                title={settings.workspaceDir}
              >
                ↳ {settings.workspaceDir.split('/').slice(-2).join('/')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <ReasoningPicker />
            <ModelPicker />
            {thinking ? (
              <button
                onClick={cancel}
                className="ml-1 grid place-items-center w-7 h-7 rounded-md bg-ink-800/80 border border-white/[0.05] text-ink-200 hover:bg-rose-500/15 hover:text-rose-200 transition"
                title="Stop (cancel current turn)"
              >
                <span className="block w-2.5 h-2.5 rounded-sm bg-current" />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!composer.trim() && attachments.length === 0}
                className="ml-1 grid place-items-center w-7 h-7 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition"
                title="Send (↩)"
              >
                <IconSend size={13} />
              </button>
            )}
          </div>
        </div>
        {/* Hidden-ish cost meter — bottom-right, low-contrast. */}
        <div className="absolute right-3 -bottom-5 text-[9.5px] font-mono text-ink-500/70 select-none pointer-events-none">
          {totalTokens > 0 && (
            <span title={`${totalTokens.toLocaleString()} tokens this session`}>
              {totalTokens.toLocaleString()} tok · {formatCost(cost)}
              {currentModel ? ` · ${currentModel.entry.label}` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
