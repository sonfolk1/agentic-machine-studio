import React from 'react';
import { useStore } from '@/store/useStore';
import { findModelById } from '@/lib/models';
import { BrandIcon } from './icons/BrandIcons';

export const TitleBar: React.FC = () => {
  const { settings, isActive, messages } = useStore();
  const model = findModelById(settings.selectedModel);

  const title =
    isActive && messages[0]?.text
      ? messages[0].text.slice(0, 60) + (messages[0].text.length > 60 ? '…' : '')
      : 'Agentic Studio';

  return (
    <div className="draggable h-11 shrink-0 flex items-center justify-between border-b border-white/[0.05] px-4 bg-ink-900/70">
      <div className="w-20" /> {/* traffic-light cutout */}
      <div className="flex-1 flex justify-center items-center gap-2 text-[12.5px] text-ink-300/90">
        {model && (
          <span className="no-drag inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink-800/70 border border-white/[0.05]">
            <span className="text-ink-200/70"><BrandIcon brand={model.group.brand} size={11} /></span>
            <span className="font-medium tracking-tight">{model.entry.label}</span>
          </span>
        )}
        <span className="truncate max-w-[480px]">{title}</span>
      </div>
      <div className="w-20" />
    </div>
  );
};
