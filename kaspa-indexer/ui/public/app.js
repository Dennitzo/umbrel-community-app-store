const e = React.createElement;
const { useState, useEffect, useCallback, useMemo } = React;

function App() {
  const [logs, setLogs] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [tail, setTail] = useState(400);
  const [lastUpdated, setLastUpdated] = useState(null);

  const tailOptions = useMemo(() => [200, 400, 800, 2000], []);

  const fetchLogs = useCallback(() => {
    setStatus('loading');
    setError('');
    fetch(`/api/logs?lines=${tail}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || 'Failed to load logs');
        }
        return res.text();
      })
      .then((text) => {
        setLogs(text);
        setLastUpdated(new Date());
        setStatus('idle');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, [tail]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const statusLabel = useMemo(() => {
    if (status === 'loading') return 'Loading logs…';
    if (status === 'error') return 'Unable to reach container';
    return 'Logs synced';
  }, [status]);

  return e(
    'main',
    { className: 'log-shell' },
    e(
      'header',
      { className: 'log-header' },
      e('div', { className: 'log-title' }, e('h1', null, 'Kaspa Indexer Logs')),
      e(
        'div',
        { className: 'log-meta' },
        e('span', { className: 'log-status' }, statusLabel),
        e(
          'span',
          { className: 'log-updated' }, !lastUpdated ? 'Waiting for first fetch…' : `Last refreshed ${lastUpdated.toLocaleTimeString()}`)
      )
    ),
    e(
      'section',
      { className: 'log-controls' },
      e(
        'label',
        { className: 'log-select-label' },
        'Lines',
        e(
          'select',
          {
            value: tail,
            onChange: (evt) => setTail(Number(evt.target.value)),
            disabled: status === 'loading'
          },
          tailOptions.map((option) =>
            e('option', { key: option, value: option }, `${option} lines`)
          )
        )
      ),
      e(
        'button',
        {
          type: 'button',
          className: 'refresh-button',
          onClick: fetchLogs,
          disabled: status === 'loading'
        },
        status === 'loading' ? 'Refreshing…' : 'Refresh'
      )
    ),
    error && e('p', { className: 'log-error' }, error),
    e(
      'section',
      { className: 'log-viewer' },
      e('pre', { className: 'log-text' }, logs || 'Waiting for logs…')
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(e(App));
