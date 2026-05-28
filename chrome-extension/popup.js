function render(resp) {
  const dot = document.getElementById('dot');
  const status = document.getElementById('status');
  const diag = document.getElementById('diag');

  const connected = !!(resp && resp.connected);
  if (connected) {
    dot.classList.add('on');
    status.textContent = 'Connected to Agentic Studio';
  } else {
    dot.classList.remove('on');
    status.textContent = 'Disconnected — is the app open?';
  }

  if (!resp) {
    diag.textContent = 'Service worker not responding. Reload the extension.';
    return;
  }

  const lines = [];
  lines.push('URL: ' + (resp.url || 'ws://127.0.0.1:8765'));
  lines.push('Attempts: ' + (resp.attempts ?? 0));
  if (resp.sinceLastAttemptMs != null) {
    lines.push('Last try: ' + Math.round(resp.sinceLastAttemptMs / 1000) + 's ago');
  }
  if (!connected && resp.lastError) {
    lines.push('Last error: ' + resp.lastError);
  }
  diag.textContent = lines.join('\n');
}

function refresh() {
  chrome.runtime.sendMessage({ type: 'status' }, (resp) => {
    // If the SW didn't respond, chrome.runtime.lastError will be set.
    void chrome.runtime.lastError;
    render(resp);
  });
}

document.getElementById('reconnect').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'reconnect' }, () => {
    void chrome.runtime.lastError;
    setTimeout(refresh, 500);
  });
});

refresh();
setInterval(refresh, 1500);
