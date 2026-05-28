import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChatView } from './components/ChatView';
import { InputBar } from './components/InputBar';
import { SettingsModal } from './components/SettingsModal';
import { ApprovalBanner } from './components/ApprovalBanner';

export const App: React.FC = () => {
  const { loadSettings, handleAgentEvent, isActive, initChromeStatus } = useStore();
  const [showDash, setShowDash] = useState(true);

  useEffect(() => {
    loadSettings();
    const off = window.api.agent.onEvent(handleAgentEvent);
    let offChrome: (() => void) | undefined;
    initChromeStatus().then((u) => { offChrome = u; });
    return () => {
      off?.();
      offChrome?.();
    };
  }, [loadSettings, handleAgentEvent, initChromeStatus]);

  // Slide-away: when the session activates, let the dashboard play its exit
  // animation, then unmount it. When the session resets, snap back instantly.
  useEffect(() => {
    if (isActive && showDash) {
      const t = window.setTimeout(() => setShowDash(false), 360);
      return () => window.clearTimeout(t);
    }
    if (!isActive && !showDash) {
      setShowDash(true);
    }
  }, [isActive, showDash]);

  return (
    <div className="h-screen w-screen flex flex-col bg-ink-900 text-ink-100 overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar />
        <main className="flex-1 relative min-w-0">
          <div className="absolute inset-0">
            {showDash ? <Dashboard exiting={isActive} /> : <ChatView />}
          </div>
          <ApprovalBanner />
          <InputBar />
        </main>
      </div>
      <SettingsModal />
    </div>
  );
};
