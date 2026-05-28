import React from 'react';
import { useStore } from '@/store/useStore';

interface TileProps {
  title: string;
  hint: string;
  onClick?: () => void;
  accent?: boolean;
}

const Tile: React.FC<TileProps> = ({ title, hint, onClick, accent }) => (
  <button
    onClick={onClick}
    className={`group text-left rounded-xl border border-white/[0.05] p-4 h-[122px] flex flex-col justify-between
      bg-gradient-to-br from-ink-850/80 to-ink-900/70 hover:from-ink-800/80 hover:to-ink-850/70
      transition-colors`}
  >
    <div className={`text-[13.5px] font-medium tracking-tight ${accent ? 'text-accent-soft' : 'text-ink-100'}`}>
      {title}
    </div>
    <div className="text-[12px] text-ink-400 leading-snug">{hint}</div>
  </button>
);

export const Dashboard: React.FC<{ exiting: boolean }> = ({ exiting }) => {
  const { setComposer } = useStore();
  const seed = (t: string) => setComposer(t);

  return (
    <div
      className={`px-10 pt-10 pb-40 bg-radial-soft w-full h-full overflow-y-auto ${
        exiting ? 'animate-slideAwayUp pointer-events-none' : 'animate-fadeIn'
      }`}
    >
      <div className="max-w-[920px] mx-auto">
        <h1 className="text-[28px] font-medium tracking-tight text-ink-100">
          What are we building?
        </h1>
        <p className="mt-2 text-[14px] text-ink-400">
          Drop a task below — Agentic Studio will plan, run shell commands, and edit files in
          your workspace.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Tile
            accent
            title="Scaffold a new app"
            hint="Vite + React + Tailwind from scratch"
            onClick={() => seed('Scaffold a new Vite + React + Tailwind app in this workspace and run the dev server.')}
          />
          <Tile
            title="Audit & fix"
            hint="Find issues across the codebase"
            onClick={() => seed('Scan this workspace, identify the top three problems, and propose patches.')}
          />
          <Tile
            title="Install + run"
            hint="Pull deps and verify the build"
            onClick={() => seed('Detect the package manager in this workspace, install dependencies, and run the build.')}
          />
          <Tile
            title="Refactor"
            hint="Rewrite a module with tests"
            onClick={() => seed('Refactor the largest source file into smaller modules and verify nothing breaks.')}
          />
          <Tile
            title="Generate tests"
            hint="Add a test suite to a module"
            onClick={() => seed('Add tests for the most critical module in this workspace and run them.')}
          />
          <Tile
            title="Document it"
            hint="Produce a README from the source"
            onClick={() => seed('Read this workspace and write a clean README.md describing what it does and how to run it.')}
          />
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.05] p-5 bg-ink-850/50">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Capabilities</div>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink-300">
              <li>• Full filesystem access (workspace-scoped)</li>
              <li>• Local shell &mdash; npm, pip, brew, scripts</li>
              <li>• Multi-turn tool loop via OpenRouter</li>
              <li>• Optional manual-approval gate</li>
            </ul>
          </div>
          <div className="rounded-xl border border-white/[0.05] p-5 bg-ink-850/50">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Tips</div>
            <ul className="mt-3 space-y-1.5 text-[13px] text-ink-300">
              <li>• Pick a workspace folder in Settings before starting</li>
              <li>• Toggle Manual Approval to review every tool call</li>
              <li>• Use the model picker to switch families per task</li>
              <li>• Reasoning effort tunes the thinking budget</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
