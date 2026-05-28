import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { IconX, IconFolder, IconCheck } from './icons/BrandIcons';
import { SystemSettings } from './SystemSettings';

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    settings,
    updateSettings,
    pickWorkspace,
  } = useStore();

  const [keyDraft, setKeyDraft] = useState('');
  const [saving, setSaving] = useState(false);

  if (!settingsOpen) return null;

  const saveKey = async () => {
    if (!keyDraft.trim()) return;
    setSaving(true);
    await updateSettings({ openrouterKey: keyDraft.trim() } as any);
    setKeyDraft('');
    setSaving(false);
  };

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="w-[640px] max-w-[92vw] max-h-[84vh] rounded-2xl glass shadow-floating p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-ink-100 tracking-tight">Settings</h2>
            <p className="text-[12px] text-ink-400 mt-0.5">
              Local-only. The key is stored encrypted via macOS Keychain when available.
            </p>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="w-7 h-7 rounded-md hover:bg-white/[0.05] grid place-items-center text-ink-400 hover:text-ink-100"
          >
            <IconX size={13} />
          </button>
        </div>

        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-ink-400 mb-2">
            OpenRouter API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={settings.hasKey ? '••••••••••••  (key saved)' : 'sk-or-v1-…'}
              className="flex-1 h-9 px-3 rounded-md bg-ink-800/80 border border-white/[0.05] text-[13px] text-ink-100 placeholder:text-ink-500 focus:border-accent/40"
            />
            <button
              onClick={saveKey}
              disabled={saving || !keyDraft.trim()}
              className="h-9 px-3 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 text-[12.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <p className="text-[11.5px] text-ink-500 mt-2">
            Get one at{' '}
            <button
              className="text-accent-soft underline-offset-2 hover:underline"
              onClick={() => window.api.app.openExternal('https://openrouter.ai/keys')}
            >
              openrouter.ai/keys
            </button>
            .
          </p>
        </section>

        <section className="mb-5">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-ink-400 mb-2">
            Workspace folder
          </label>
          <button
            onClick={pickWorkspace}
            className="w-full flex items-center gap-2 px-3 h-9 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12.5px] text-ink-200 hover:bg-ink-750/80"
          >
            <IconFolder size={13} className="text-ink-400" />
            <span className="truncate flex-1 text-left">
              {settings.workspaceDir || 'Choose a folder…'}
            </span>
            <span className="text-[11px] text-ink-400">Browse</span>
          </button>
          <p className="text-[11.5px] text-ink-500 mt-2">
            All filesystem &amp; shell operations stay inside this folder.
          </p>
        </section>

        <section className="mb-5">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-ink-800/60 border border-white/[0.05]">
            <div>
              <div className="text-[13px] font-medium text-ink-100">
                Require Manual Approval for Local Code Execution
              </div>
              <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
                When on, every file edit and shell command pauses for a click-through before running.
                When off, the agent executes tools immediately.
              </p>
            </div>
            <Toggle
              value={settings.requireApproval}
              onChange={(v) => updateSettings({ requireApproval: v })}
            />
          </div>
        </section>

        <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-ink-400">System</div>
        <SystemSettings />

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setSettingsOpen(false)}
            className="h-8 px-3 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12.5px] text-ink-200 hover:bg-ink-750/80"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
      value ? 'bg-gradient-to-br from-accent to-accent-soft' : 'bg-ink-700'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-ink-100 shadow transition-transform ${
        value ? 'translate-x-4' : ''
      }`}
    />
  </button>
);
