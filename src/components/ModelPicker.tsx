import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { MODEL_GROUPS, findModelById } from '@/lib/models';
import { BrandIcon, IconChevronDown, IconCheck, IconSliders } from './icons/BrandIcons';

export const ModelPicker: React.FC = () => {
  const { settings, modelPickerOpen, setModelPickerOpen, updateSettings } = useStore();
  const ref = useRef<HTMLDivElement | null>(null);

  const current = findModelById(settings.selectedModel);
  // A selection that isn't in any group is a bring-your-own ("Custom") model.
  const isCustom = !current && !!settings.selectedModel;

  // The custom model gets its own row in the list alongside the built-ins.
  const [customModel, setCustomModel] = useState<string | null>(
    isCustom ? settings.selectedModel : null,
  );
  const [customDraft, setCustomDraft] = useState('');

  useEffect(() => {
    if (!modelPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelPickerOpen, setModelPickerOpen]);

  // Keep the custom row in sync with a persisted/loaded custom selection.
  useEffect(() => {
    if (isCustom && customModel !== settings.selectedModel) {
      setCustomModel(settings.selectedModel);
    }
  }, [isCustom, settings.selectedModel, customModel]);

  const applyCustom = () => {
    const id = customDraft.trim();
    if (!id) return;
    setCustomModel(id);
    updateSettings({ selectedModel: id });
    setCustomDraft('');
    setModelPickerOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setModelPickerOpen(!modelPickerOpen)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-white/[0.06] bg-ink-800/70 hover:bg-ink-700/70 text-[12px] text-ink-200 transition-colors"
      >
        {current ? (
          <BrandIcon brand={current.group.brand} size={12} className="text-ink-300" />
        ) : isCustom ? (
          <IconSliders size={12} className="text-ink-300" />
        ) : null}
        <span className="font-medium tracking-tight max-w-[150px] truncate">
          {current?.entry.label ?? (isCustom ? settings.selectedModel : 'Select model')}
        </span>
        <IconChevronDown size={11} className="text-ink-400" />
      </button>

      {modelPickerOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-[320px] max-h-[480px] overflow-y-auto rounded-xl glass shadow-popover p-1.5 z-50 animate-fadeIn">
          {/* Per-turn capabilities — pinned at the top. */}
          <div className="px-2 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Capabilities</div>
          <button
            onClick={() => updateSettings({ visionEnabled: !settings.visionEnabled })}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">Vision input</span>
              <span className="text-[10.5px] text-ink-500">Send browser screenshots back to the model</span>
            </div>
            <span className={`w-8 h-4 rounded-full relative transition-colors ${settings.visionEnabled ? 'bg-gradient-to-br from-accent to-accent-soft' : 'bg-ink-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-ink-100 transition-transform ${settings.visionEnabled ? 'translate-x-4' : ''}`} />
            </span>
          </button>
          <div className="my-1 h-px bg-white/[0.05]" />
          {MODEL_GROUPS.map((group) => (
            <div key={group.brand} className="pt-1">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
                <BrandIcon brand={group.brand} size={11} className="text-ink-300" />
                <span>{group.name}</span>
              </div>
              {group.models.map((m) => {
                const selected = m.id === settings.selectedModel;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      updateSettings({ selectedModel: m.id });
                      setModelPickerOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px]',
                      selected
                        ? 'bg-white/[0.06] text-ink-100'
                        : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]',
                    )}
                  >
                    <span className="font-mono tracking-tight">{m.label}</span>
                    {selected && <IconCheck size={12} className="text-accent-soft" />}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Custom — bring-your-own model; sits in the list with all the others. */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
              <IconSliders size={11} className="text-ink-300" />
              <span>Custom</span>
            </div>
            {customModel && (
              <button
                onClick={() => {
                  updateSettings({ selectedModel: customModel });
                  setModelPickerOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px]',
                  customModel === settings.selectedModel
                    ? 'bg-white/[0.06] text-ink-100'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]',
                )}
              >
                <span className="font-mono tracking-tight truncate">{customModel}</span>
                {customModel === settings.selectedModel && (
                  <IconCheck size={12} className="text-accent-soft shrink-0 ml-2" />
                )}
              </button>
            )}
            <form onSubmit={(e) => { e.preventDefault(); applyCustom(); }} className="px-2 pt-1 pb-1">
              <div className="flex items-center gap-1.5">
                <input
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  placeholder="provider/model-id"
                  spellCheck={false}
                  autoComplete="off"
                  className="flex-1 min-w-0 h-7 px-2 rounded-md bg-ink-800/80 border border-white/[0.06] text-[12px] font-mono text-ink-100 placeholder:text-ink-500 focus:border-accent/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customDraft.trim()}
                  className="h-7 px-2.5 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 text-[11.5px] font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {customModel ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
