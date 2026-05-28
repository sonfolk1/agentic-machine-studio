import React from 'react';
import clsx from 'clsx';
import { useStore, type View } from '@/store/useStore';
import {
  IconChat,
  IconCowork,
  IconCode,
  IconCog,
  IconSpark,
} from './icons/BrandIcons';

interface NavItem {
  id: View;
  label: string;
  Icon: React.FC<any>;
}

const NAV: NavItem[] = [
  { id: 'chat', label: 'Chat', Icon: IconChat },
  { id: 'cowork', label: 'Cowork', Icon: IconCowork },
  { id: 'code', label: 'Code', Icon: IconCode },
];

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    setSettingsOpen,
    recent,
    resetSession,
  } = useStore();

  return (
    <aside className="no-drag w-[228px] shrink-0 border-r border-white/[0.05] bg-ink-900/60 flex flex-col">
      <div className="px-4 pt-3 pb-4">
        <button
          onClick={resetSession}
          className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-ink-100 hover:text-white transition-colors"
        >
          <span className="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 grid place-items-center">
            <IconSpark size={12} />
          </span>
          Agentic Studio
        </button>
      </div>

      <nav className="px-2 flex flex-col gap-0.5">
        {NAV.map(({ id, label, Icon }) => {
          const active = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={clsx(
                'group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors',
                active
                  ? 'bg-white/[0.06] text-ink-100'
                  : 'text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]',
              )}
            >
              <Icon size={15} className={active ? 'text-accent-soft' : 'text-ink-400'} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-5 px-4 text-[10.5px] font-semibold tracking-[0.16em] text-ink-400 uppercase">
        Recent
      </div>
      <div className="mt-1 px-2 flex flex-col gap-0.5 overflow-y-auto flex-1">
        {recent.length === 0 ? (
          <div className="px-2 py-1.5 text-[12px] text-ink-500">No recent tasks</div>
        ) : (
          recent.map((t) => (
            <button
              key={t.id}
              className="text-left px-2.5 py-1.5 rounded-md text-[12.5px] text-ink-300 hover:text-ink-100 hover:bg-white/[0.035] truncate"
              title={t.preview}
            >
              {t.title}
            </button>
          ))
        )}
      </div>

      <div className="p-2 border-t border-white/[0.05]">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] text-ink-300 hover:text-ink-100 hover:bg-white/[0.035]"
        >
          <IconCog size={14} className="text-ink-400" />
          Settings
        </button>
      </div>
    </aside>
  );
};
