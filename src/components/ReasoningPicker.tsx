import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore, type ReasoningEffort } from '@/store/useStore';
import { IconSpark, IconChevronDown, IconCheck } from './icons/BrandIcons';

const EFFORTS: { id: ReasoningEffort; label: string; hint: string }[] = [
  { id: 'minimal', label: 'Minimal', hint: 'Fastest, no extra thinking' },
  { id: 'low', label: 'Low', hint: 'Light reasoning budget' },
  { id: 'medium', label: 'Medium', hint: 'Balanced default' },
  { id: 'high', label: 'High', hint: 'Deep step-by-step' },
];

export const ReasoningPicker: React.FC = () => {
  const { settings, updateSettings } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = EFFORTS.find((e) => e.id === settings.reasoningEffort);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 h-7 rounded-md border border-white/[0.06] bg-ink-800/70 hover:bg-ink-700/70 text-[12px] text-ink-200 transition-colors"
        title="Reasoning effort"
      >
        <IconSpark size={11} className="text-accent-soft" />
        <span className="tracking-tight">{current?.label ?? 'Reasoning'}</span>
        <IconChevronDown size={10} className="text-ink-400" />
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-[200px] rounded-xl glass shadow-popover p-1.5 z-50 animate-fadeIn">
          <div className="px-2 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
            Reasoning effort
          </div>
          {EFFORTS.map((e) => {
            const selected = e.id === settings.reasoningEffort;
            return (
              <button
                key={e.id}
                onClick={() => {
                  updateSettings({ reasoningEffort: e.id });
                  setOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[12.5px] text-left',
                  selected
                    ? 'bg-white/[0.06] text-ink-100'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]',
                )}
              >
                <div>
                  <div className="font-medium">{e.label}</div>
                  <div className="text-[10.5px] text-ink-500">{e.hint}</div>
                </div>
                {selected && <IconCheck size={12} className="text-accent-soft" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
