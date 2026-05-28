// Agentic Studio Bridge — Chrome MV3 service worker.
// Maintains a persistent WebSocket to the Agentic Studio desktop app
// (ws://127.0.0.1:8765) and dispatches RPC calls from the agent.

const WS_URL = 'ws://127.0.0.1:8765';
const RECONNECT_MS = 2000;

let socket = null;
let connected = false;
let reconnectTimer = null;
let lastError = null;
let lastAttemptAt = 0;
let attempts = 0;

function setBadge(on) {
  try {
    chrome.action.setBadgeText({ text: on ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ color: on ? '#c98a5b' : '#444' });
  } catch {}
}

function connect() {
  clearTimeout(reconnectTimer);
  attempts += 1;
  lastAttemptAt = Date.now();
  console.log('[bridge] connecting to', WS_URL, 'attempt', attempts);
  try {
    socket = new WebSocket(WS_URL);
  } catch (err) {
    lastError = 'WebSocket ctor threw: ' + (err && err.message ? err.message : String(err));
    console.warn('[bridge]', lastError);
    scheduleReconnect();
    return;
  }

  socket.addEventListener('open', () => {
    connected = true;
    lastError = null;
    setBadge(true);
    console.log('[bridge] connected');
  });

  socket.addEventListener('close', (ev) => {
    connected = false;
    setBadge(false);
    socket = null;
    lastError = 'closed (code=' + (ev && ev.code) + ', reason="' + (ev && ev.reason || '') + '")';
    console.warn('[bridge]', lastError);
    scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    lastError = lastError || 'WebSocket error (handshake refused or network blocked)';
    console.warn('[bridge] error event');
  });

  socket.addEventListener('message', async (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg && msg.type === 'hello') {
      console.log('[bridge] hello received', msg);
      return;
    }
    if (!msg || !msg.id || !msg.method) return;
    try {
      const result = await dispatch(msg.method, msg.params || {});
      sendSafe({ id: msg.id, result });
    } catch (err) {
      sendSafe({ id: msg.id, error: err && err.message ? err.message : String(err) });
    }
  });
}

function sendSafe(obj) {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(obj));
    }
  } catch {}
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, RECONNECT_MS);
}

// Keep the service worker alive while waiting for RPCs.
// 0.5 is the lowest period Chrome accepts for unpacked extensions.
chrome.alarms.create('keepalive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepalive') {
    chrome.runtime.getPlatformInfo(() => void chrome.runtime.lastError);
    if (!connected) connect();
  }
});

chrome.runtime.onStartup.addListener(() => connect());
chrome.runtime.onInstalled.addListener(() => connect());

console.log('[bridge] service worker booted');
connect();

// Popup status query.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'status') {
    sendResponse({
      connected,
      lastError,
      attempts,
      sinceLastAttemptMs: lastAttemptAt ? Date.now() - lastAttemptAt : null,
      url: WS_URL,
    });
    return false;
  }
  if (msg && msg.type === 'reconnect') {
    try { socket && socket.close(); } catch {}
    lastError = null;
    connect();
    sendResponse({ ok: true });
    return false;
  }
});

// ─── RPC dispatcher ────────────────────────────────────────────────────────

async function dispatch(method, params) {
  switch (method) {
    case 'list_tabs':         return await listTabs();
    case 'navigate':          return await navigate(params);
    case 'get_page_text':     return await runInTab(params.tabId, fnGetPageText);
    case 'get_page_snapshot': return await runInTab(params.tabId, fnGetPageSnapshot);
    case 'click':             return await runInTab(params.tabId, fnClick, [params.selector]);
    case 'type':              return await runInTab(params.tabId, fnType, [params.selector, params.text]);
    case 'eval':              return await runInTab(params.tabId, fnEval, [params.code]);
    case 'close_tab':         return await closeTab(params.tabId);
    case 'wait':              return await wait(params.ms);
    case 'screenshot':        return await screenshot(params.tabId);
    default: throw new Error(`Unknown RPC method: ${method}`);
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');
  return tab;
}

async function resolveTab(tabId) {
  if (tabId) return await chrome.tabs.get(tabId);
  return await activeTab();
}

async function listTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.map((t) => ({
    id: t.id,
    url: t.url,
    title: t.title,
    active: t.active,
    windowId: t.windowId,
  }));
}

async function navigate({ url, tabId }) {
  if (!url) throw new Error('navigate: url is required');
  if (tabId) {
    await chrome.tabs.update(tabId, { url });
    await waitForComplete(tabId);
    return { tabId };
  }
  const tab = await chrome.tabs.create({ url, active: true });
  if (tab.id) await waitForComplete(tab.id);
  return { tabId: tab.id };
}

function waitForComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(handler);
      clearTimeout(timer);
      resolve();
    };
    const handler = (id, info) => {
      if (id === tabId && info.status === 'complete') done();
    };
    chrome.tabs.onUpdated.addListener(handler);
    const timer = setTimeout(done, timeoutMs);
  });
}

async function runInTab(tabId, func, args = []) {
  const tab = await resolveTab(tabId);
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args,
    func,
    world: 'MAIN',
  });
  return result;
}

async function closeTab(tabId) {
  await chrome.tabs.remove(tabId);
  return { ok: true };
}

async function wait(ms) {
  const dur = Math.max(0, Math.min(Number(ms) || 0, 10000));
  await new Promise((r) => setTimeout(r, dur));
  return { ok: true, waited: dur };
}

async function screenshot(tabId) {
  const tab = await resolveTab(tabId);
  // JPEG @ q70 keeps payloads under ~150 KB for full-screen captures, which
  // is small enough to inline as image_url back into the next OpenRouter turn.
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
  return { dataUrl };
}

// ─── Injected page-side helpers ────────────────────────────────────────────
// (Pure functions because chrome.scripting.executeScript injects them by source.)

function fnGetPageText() {
  const text = (document.body && document.body.innerText) || '';
  return { url: location.href, title: document.title, text: text.slice(0, 30000), truncated: text.length > 30000 };
}

function fnGetPageSnapshot() {
  // Build a stable selector for an element. Prefers id → data-testid →
  // aria-label → role+name → tag+text → short nth-of-type chain.
  function buildSelector(el) {
    if (!(el instanceof Element)) return null;
    if (el.id) {
      const sel = '#' + CSS.escape(el.id);
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    for (const attr of ['data-testid', 'data-test', 'data-qa']) {
      const v = el.getAttribute(attr);
      if (v) {
        const sel = '[' + attr + '="' + CSS.escape(v) + '"]';
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }
    const aria = el.getAttribute('aria-label');
    if (aria) {
      const sel = el.tagName.toLowerCase() + '[aria-label="' + CSS.escape(aria) + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 5) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (!parent) { parts.unshift(tag); break; }
      const same = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
      const idx = same.indexOf(cur) + 1;
      parts.unshift(tag + (same.length > 1 ? ':nth-of-type(' + idx + ')' : ''));
      cur = parent;
    }
    return parts.join(' > ');
  }

  // Compute an a11y-style accessible name. Mirrors the WAI accname algorithm:
  // aria-labelledby → aria-label → associated <label> → alt → placeholder → text.
  function accName(el) {
    const byId = el.getAttribute('aria-labelledby');
    if (byId) {
      const ref = byId.split(/\s+/).map((id) => document.getElementById(id)?.innerText).filter(Boolean).join(' ');
      if (ref) return ref;
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      const id = el.id;
      if (id) {
        const lbl = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (lbl && lbl.innerText) return lbl.innerText;
      }
      const wrap = el.closest('label');
      if (wrap && wrap.innerText) return wrap.innerText;
    }
    if (el.tagName === 'IMG') {
      const alt = el.getAttribute('alt');
      if (alt) return alt;
    }
    if ('placeholder' in el && el.placeholder) return el.placeholder;
    const txt = (el.innerText || el.textContent || '').trim();
    if (txt) return txt;
    if (el.value) return String(el.value);
    return '';
  }

  // Visibility test that also catches CSS-hidden / off-screen elements.
  function isVisible(el) {
    if (!(el instanceof HTMLElement)) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    return true;
  }

  // Implicit ARIA role mapping (subset of the HTML AAM spec).
  function impliedRole(el) {
    const tag = el.tagName;
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    if (tag === 'A' && el.hasAttribute('href')) return 'link';
    if (tag === 'BUTTON') return 'button';
    if (tag === 'TEXTAREA') return 'textbox';
    if (tag === 'SELECT') return 'combobox';
    if (tag === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      if (['button', 'submit', 'reset'].includes(t)) return 'button';
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      if (t === 'range') return 'slider';
      return 'textbox';
    }
    if (el.isContentEditable) return 'textbox';
    return null;
  }

  const out = [];
  const selectors = [
    'a[href]', 'button', '[role]', 'input', 'textarea', 'select',
    '[contenteditable=""]', '[contenteditable="true"]',
    '[onclick]', '[tabindex]:not([tabindex="-1"])',
  ];
  const all = document.querySelectorAll(selectors.join(','));
  const seen = new WeakSet();
  for (const el of all) {
    if (seen.has(el)) continue;
    seen.add(el);
    if (!isVisible(el)) continue;
    const role = impliedRole(el);
    if (!role) continue;
    const name = accName(el).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (!name && role !== 'textbox' && role !== 'checkbox' && role !== 'radio') continue;
    const rect = el.getBoundingClientRect();
    out.push({
      role,
      name,
      selector: buildSelector(el),
      tag: el.tagName.toLowerCase(),
      type: el.type || undefined,
      href: el.href || undefined,
      value: ('value' in el && el.value) ? String(el.value).slice(0, 60) : undefined,
      checked: ('checked' in el) ? !!el.checked : undefined,
      bbox: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
    });
    if (out.length >= 200) break;
  }
  return { url: location.href, title: document.title, elements: out };
}

function fnClick(selector) {
  const el = document.querySelector(selector);
  if (!el) return { ok: false, error: 'not found: ' + selector };
  try { el.scrollIntoView({ block: 'center', inline: 'center' }); } catch {}
  if (typeof el.click === 'function') el.click();
  else el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return { ok: true };
}

function fnType(selector, text) {
  const el = document.querySelector(selector);
  if (!el) return { ok: false, error: 'not found: ' + selector };
  try { el.focus(); } catch {}
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const proto = tag === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = desc && desc.set;
    if (setter) setter.call(el, text); else el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }
  if (el.isContentEditable) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return { ok: true };
  }
  return { ok: false, error: 'element is not editable' };
}

function fnEval(code) {
  try {
    const fn = new Function('return (async () => { ' + code + ' })()');
    return Promise.resolve(fn()).then((v) => {
      let str;
      try { str = typeof v === 'string' ? v : JSON.stringify(v); } catch { str = String(v); }
      return { ok: true, value: (str || '').slice(0, 8000) };
    }).catch((e) => ({ ok: false, error: String(e && e.message || e) }));
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}
