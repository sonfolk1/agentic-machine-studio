import React, { useEffect, useState, useRef } from 'react';
import type { TunnelState } from '@/vite-env';

/** Bridge token, plugin loader, off-LAN tunnel — the three system-level
 *  panels that live inside the Settings modal.
 */
export const SystemSettings: React.FC = () => {
  return (
    <div className="space-y-4">
      <BridgeTokenSection />
      <PluginsSection />
      <TunnelSection />
    </div>
  );
};

// ── Bridge token ────────────────────────────────────────────────────────────

const BridgeTokenSection: React.FC = () => {
  const [token, setToken] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    window.api.bridge.getToken().then(setToken).catch(() => {});
  }, []);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const rotate = async () => {
    if (!confirm('Regenerate the bridge token? Currently-paired devices will need to re-enter the new token before they can reconnect.')) return;
    setRotating(true);
    try {
      const fresh = await window.api.bridge.rotateToken();
      setToken(fresh);
    } finally {
      setRotating(false);
    }
  };

  const masked = token ? token.replace(/./g, '•') : '';

  return (
    <section className="rounded-xl border border-white/[0.05] bg-ink-850/50">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-400">Bridge token</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            Remote clients (iPhone, anything off-loopback) must present this token when they connect.
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2">
        <code
          className="flex-1 px-3 py-2 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] font-mono text-ink-200 truncate select-all"
          title={revealed ? token : 'click reveal to show'}
        >
          {revealed ? (token || '(empty)') : masked || '(loading…)'}
        </code>
        <button
          onClick={() => setRevealed((r) => !r)}
          className="h-8 px-2.5 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12px] text-ink-200 hover:bg-ink-750/80"
        >
          {revealed ? 'Hide' : 'Reveal'}
        </button>
        <button
          onClick={() => copy(token)}
          className="h-8 px-2.5 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12px] text-ink-200 hover:bg-ink-750/80"
          disabled={!token}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={rotate}
          className="h-8 px-2.5 rounded-md bg-rose-500/15 border border-rose-300/15 text-[12px] text-rose-200 hover:bg-rose-500/25"
          disabled={rotating}
        >
          {rotating ? '…' : 'Regenerate'}
        </button>
      </div>
    </section>
  );
};

// ── Plugins ──────────────────────────────────────────────────────────────────

const PluginsSection: React.FC = () => {
  const [plugins, setPlugins] = useState<Array<{ name: string; description: string }>>([]);
  const [dir, setDir] = useState('');
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    window.api.plugins.reload().then(setPlugins).catch(() => {});
    window.api.plugins.dir().then(setDir).catch(() => {});
  }, []);

  const reload = async () => {
    setReloading(true);
    try {
      setPlugins(await window.api.plugins.reload());
    } finally {
      setReloading(false);
    }
  };

  const openFolder = () => {
    if (dir) window.api.app.openExternal(`file://${dir}`);
  };

  return (
    <section className="rounded-xl border border-white/[0.05] bg-ink-850/50">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-400">Plugins</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            Drop <code className="font-mono text-ink-300">.cjs</code> files into the plugin folder to add custom tools.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openFolder}
            disabled={!dir}
            className="h-7 px-2 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] text-ink-200 hover:bg-ink-750/80"
          >
            Open folder
          </button>
          <button
            onClick={reload}
            className="h-7 px-2 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] text-ink-200 hover:bg-ink-750/80"
          >
            {reloading ? '…' : 'Reload'}
          </button>
        </div>
      </div>
      <div className="px-4 pb-3">
        {plugins.length === 0 ? (
          <div className="px-3 py-3 rounded-md bg-ink-800/40 border border-white/[0.04] text-[12px] text-ink-500">
            No plugins loaded yet. Click <span className="text-ink-300">Open folder</span> → drop a <code className="font-mono">.cjs</code> file → click <span className="text-ink-300">Reload</span>.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {plugins.map((p) => (
              <li
                key={p.name}
                className="px-3 py-2 rounded-md bg-ink-800/60 border border-white/[0.04] flex items-start gap-3"
              >
                <code className="font-mono text-[11.5px] text-accent-soft shrink-0 mt-0.5">{p.name}</code>
                <span className="text-[12px] text-ink-300 leading-snug">{p.description || '(no description)'}</span>
              </li>
            ))}
          </ul>
        )}
        {dir && (
          <div className="mt-2 text-[10.5px] font-mono text-ink-500 truncate" title={dir}>
            {dir}
          </div>
        )}
      </div>
    </section>
  );
};

// ── Tunnel ──────────────────────────────────────────────────────────────────

const TunnelSection: React.FC = () => {
  const [state, setState] = useState<TunnelState>({ status: 'stopped' });
  const [detected, setDetected] = useState<string | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.api.tunnel.status().then(setState).catch(() => {});
    window.api.tunnel.detect().then(setDetected).catch(() => setDetected(null));
    const off = window.api.tunnel.onStatus(setState);
    return () => off?.();
  }, []);

  const start = async () => {
    setState({ status: 'starting' });
    try {
      setState(await window.api.tunnel.start());
    } catch (err: any) {
      setState({ status: 'error', message: String(err?.message ?? err) });
    }
  };
  const stop = async () => {
    setState(await window.api.tunnel.stop());
  };

  const copyUrl = async () => {
    if (state.status !== 'running') return;
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const dotColor =
    state.status === 'running' ? 'bg-emerald-400' :
    state.status === 'starting' ? 'bg-amber-400' :
    state.status === 'error' ? 'bg-rose-400' :
    'bg-ink-500';

  return (
    <section className="rounded-xl border border-white/[0.05] bg-ink-850/50">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-400">Off-LAN tunnel</div>
          <div className="text-[12px] text-ink-500 mt-0.5">
            Expose the bridge over the internet via Cloudflare Quick Tunnels.
            Pair the iPhone from cellular or a different network.
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {state.status === 'running' || state.status === 'starting' ? (
            <button
              onClick={stop}
              className="h-7 px-2.5 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] text-ink-200 hover:bg-ink-750/80"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={start}
              disabled={detected === null}
              className="h-7 px-2.5 rounded-md bg-gradient-to-br from-accent to-accent-soft text-ink-900 text-[11.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[12px] text-ink-300">
            {state.status === 'running'  && 'Tunnel is live'}
            {state.status === 'starting' && 'Starting…'}
            {state.status === 'stopped'  && 'Stopped'}
            {state.status === 'error'    && `Error — ${state.message}`}
          </span>
        </div>

        {state.status === 'running' && (
          <div className="flex items-center gap-2">
            <code
              className="flex-1 px-3 py-2 rounded-md bg-ink-800/80 border border-white/[0.05] text-[11.5px] font-mono text-ink-200 truncate select-all"
              title={state.url}
            >
              {state.url}
            </code>
            <button
              onClick={copyUrl}
              className="h-8 px-2.5 rounded-md bg-ink-800/80 border border-white/[0.05] text-[12px] text-ink-200 hover:bg-ink-750/80"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        {detected === null && (
          <div className="mt-2 px-3 py-2 rounded-md bg-ink-800/40 border border-white/[0.04] text-[11.5px] text-ink-400">
            <code className="font-mono text-accent-soft">cloudflared</code> isn't installed. Install with:
            <pre className="mt-1 text-[11px] text-ink-300 font-mono">brew install cloudflare/cloudflare/cloudflared</pre>
          </div>
        )}

        {detected && (
          <div className="mt-2 text-[10.5px] font-mono text-ink-500 truncate" title={detected}>
            {detected}
          </div>
        )}
      </div>
    </section>
  );
};
