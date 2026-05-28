import { describe, it, expect, vi } from 'vitest';

// The bridge imports electron; we don't have a runtime here.
vi.mock('electron', () => ({
  BrowserWindow: { getAllWindows: () => [] },
}));

import { ChromeBridge } from '../electron/agent/chromeBridge';

describe('ChromeBridge', () => {
  it('exposes connection-state helpers without crashing', () => {
    const bridge = new ChromeBridge(8799, () => 'token');
    expect(bridge.isChromeConnected()).toBe(false);
    expect(bridge.isMobileConnected()).toBe(false);
    expect(bridge.isConnected()).toBe(false);
  });

  it('accepts a token provider', () => {
    let calls = 0;
    const bridge = new ChromeBridge(8800, () => {
      calls += 1;
      return 'rotating-token';
    });
    expect(bridge).toBeDefined();
    // The provider is only invoked when a remote client tries to authenticate,
    // not at construction time. So we don't assert calls > 0 here.
    expect(calls).toBe(0);
  });
});
