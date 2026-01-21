const statusEl = document.getElementById('status');
const timestampEl = document.getElementById('timestamp');
const outputEl = document.getElementById('log-output');
const tailSelect = document.getElementById('tail');
const refreshButton = document.getElementById('refresh');

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.background = isError
    ? 'rgba(255, 99, 99, 0.18)'
    : 'rgba(255, 255, 255, 0.08)';
  statusEl.style.color = isError ? '#ffb3b3' : '#eef1f6';
}

async function fetchLogs() {
  const tail = Number(tailSelect.value || 400);
  setStatus('Loading logs...', false);
  refreshButton.disabled = true;

  try {
    const response = await fetch(`/logs/simply-kaspa-indexer.log?cache=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Log file not available yet');
    }
    const text = await response.text();
    const lines = text.split('\n');
    const sliced = lines.slice(Math.max(lines.length - tail, 0)).join('\n');
    outputEl.textContent = sliced || 'Log file is empty.';
    setStatus('Logs synced', false);
    timestampEl.textContent = `Last refreshed ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    outputEl.textContent = 'Waiting for simply-kaspa-indexer to start...';
    setStatus('Unable to read log file', true);
    timestampEl.textContent = 'Check that the indexer is running';
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', fetchLogs);

tailSelect.addEventListener('change', fetchLogs);

fetchLogs();
setInterval(fetchLogs, 15000);
