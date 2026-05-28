import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { MODEL_GROUPS, findModelById } from '@/lib/models';
import { BrandIcon, IconChevronDown, IconCheck } from './icons/BrandIcons';

export const ModelPicker: React.FC = () => {
  const { settings, modelPickerOpen, setModelPickerOpen, updateSettings } = useStore();
  const ref = useRef<HTMLDivElement | null>(null);

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

  const current = findModelById(settings.selectedModel);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setModelPickerOpen(!modelPickerOpen)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-white/[0.06] bg-ink-800/70 hover:bg-ink-700/70 text-[12px] text-ink-200 transition-colors"
      >
        {current && <BrandIcon brand={current.group.brand} size={12} className="text-ink-300" />}
        <span className="font-medium tracking-tight">
          {current?.entry.label ?? 'Select model'}
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
        </div>
      )}
    </div>
  );
};
