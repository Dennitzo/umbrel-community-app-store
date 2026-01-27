class StratumBridgeDashboard {
  constructor() {
    this.updateInterval = 10000;
    this.retryInterval = 5000;
    this.pollTimer = null;
    this.lastStatus = null;
    this.sharesPieSegments = [];
    this.blocksPieSegments = [];
    this.hideWallets = true;
    this.hideBlockWallets = true;
    this.lastStats = null;
    this.nodeApiBase = '';
    this.init();
  }

  init() {
    this.bindWalletToggle();
    this.bindBlocksWalletToggle();
    this.syncWalletToggles();
    this.bindCoinbaseTagSuffix();
    this.fetchData();
  }

  syncWalletToggles() {
    const walletToggle = document.getElementById('walletToggle');
    if (walletToggle) {
      walletToggle.classList.toggle('is-hidden', this.hideWallets);
      walletToggle.setAttribute('aria-pressed', this.hideWallets ? 'true' : 'false');
      walletToggle.setAttribute('aria-label', this.hideWallets ? 'Show wallets' : 'Hide wallets');
    }

    const blocksToggle = document.getElementById('blocksWalletToggle');
    if (blocksToggle) {
      blocksToggle.classList.toggle('is-hidden', this.hideBlockWallets);
      blocksToggle.setAttribute('aria-pressed', this.hideBlockWallets ? 'true' : 'false');
      blocksToggle.setAttribute('aria-label', this.hideBlockWallets ? 'Show wallets' : 'Hide wallets');
    }
  }

  async fetchData() {
    try {
      const [statusRes, statsRes, nodeStatus, config] = await Promise.all([
        fetch(`/api/status?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' }),
        this.fetchNodeStatus(),
        this.fetchConfig(),
      ]);

      if (!statusRes.ok || !statsRes.ok) {
        throw new Error('API returned an unexpected status');
      }

      const status = await statusRes.json();
      const stats = await statsRes.json();

      this.renderStatus(status, nodeStatus);
      this.renderConfig(config);
      this.renderStats(stats);
      const connected = status?.kaspad_connected === true;
      this.updateStatus(true, connected);
      this.setLastUpdated();
      this.scheduleNext(this.updateInterval);
    } catch (error) {
      console.error(error);
      this.updateStatus(false, false);
      this.scheduleNext(this.retryInterval);
    }
  }

  scheduleNext(delayMs) {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    this.pollTimer = setTimeout(() => this.fetchData(), delayMs);
  }

  updateStatus(bridgeOk, kaspadOk) {
    const badge = document.getElementById('statusBadge');
    const kaspadBadge = document.getElementById('kaspadBadge');

    if (badge) {
      badge.textContent = bridgeOk ? 'BRIDGE ONLINE' : 'BRIDGE OFFLINE';
      badge.style.borderColor = bridgeOk ? 'rgba(16, 185, 129, 0.6)' : 'rgba(248, 113, 113, 0.6)';
      badge.style.background = bridgeOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)';
    }
    if (kaspadBadge) {
      kaspadBadge.textContent = kaspadOk ? 'KASPAD ONLINE' : 'KASPAD OFFLINE';
      kaspadBadge.style.borderColor = kaspadOk ? 'rgba(16, 185, 129, 0.6)' : 'rgba(248, 113, 113, 0.6)';
      kaspadBadge.style.background = kaspadOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)';
    }
  }

  resolveApiBase(appOverride) {
    const params = new URLSearchParams(window.location.search);
    const origin = params.get('origin');
    const app = appOverride || params.get('app');

    if (!origin || !app) {
      return '';
    }

    return `${window.location.origin}/?origin=${encodeURIComponent(origin)}&app=${encodeURIComponent(app)}&path=`;
  }

  buildApiUrl(base, path) {
    if (!base) {
      return path;
    }

    return `${base}${encodeURIComponent(path)}`;
  }

  async fetchNodeStatus() {
    try {
      const host = window.location.hostname || 'umbrel.local';
      const protocol = window.location.protocol || 'http:';
      const response = await fetch(`${protocol}//${host}:19112/api/status?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        return null;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  }

  async fetchConfig() {
    try {
      const response = await fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  }

  renderConfig(config) {
    const input = document.getElementById('coinbaseTagSuffixInput');
    if (!config || !input) {
      return;
    }
    const current = typeof config.coinbase_tag_suffix === 'string' ? config.coinbase_tag_suffix : '';
    if (!input.value) {
      input.value = current;
    }
  }

  bindCoinbaseTagSuffix() {
    const input = document.getElementById('coinbaseTagSuffixInput');
    const button = document.getElementById('coinbaseTagSuffixSave');
    const statusEl = document.getElementById('coinbaseTagSuffixStatus');
    if (!input || !button) {
      return;
    }
    button.addEventListener('click', async () => {
      const value = input.value.trim();
      if (statusEl) statusEl.textContent = 'Saving...';
      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coinbase_tag_suffix: value }),
        });
        if (!response.ok) {
          throw new Error('Save failed');
        }
        if (statusEl) statusEl.textContent = 'Saved. Restart bridge to apply.';
      } catch {
        if (statusEl) statusEl.textContent = 'Save failed. Try again.';
      }
    });
  }

  renderStatus(status, nodeStatus) {
    this.lastStatus = status || null;
    this.setText('kaspadAddressValue', status?.kaspad_address);
    this.setText('kaspadVersionValue', status?.kaspad_version || '—');
    let imageLabel = nodeStatus?.image || '';
    imageLabel = imageLabel ? imageLabel.replace(/^dennitzo\//, 'kaspanet/') : '—';
    this.setText('bridgeVersionValue', imageLabel);
    this.renderEndpoints(status);
  }

  renderStats(stats) {
    this.lastStats = stats || null;
    this.setText('uptimeValue', this.formatUptimeSeconds(stats?.uptimeSeconds));
    this.setText('totalBlocksValue', this.formatNumber(stats?.totalBlocks));
    this.setText('totalSharesValue', this.formatNumber(stats?.totalShares));
    this.setText('activeWorkersValue', this.formatNumber(stats?.activeWorkers));
    const networkHashrate = Number(stats?.networkHashrate || 0);
    this.setText('networkHashrateValue', networkHashrate > 0 ? this.formatHashrateHs(networkHashrate) : '--');
    if (stats?.kaspadVersion) {
      this.setText('kaspadVersionValue', stats.kaspadVersion);
    }

    const internalCpu = stats?.internalCpu || null;
    const cpuHashrateCard = document.getElementById('internalCpuHashrateCard');
    const cpuBlocksCard = document.getElementById('internalCpuBlocksCard');

    if (internalCpu) {
      this.setText('internalCpuHashrateValue', this.formatHashrateHs((Number(internalCpu.hashrateGhs) || 0) * 1e9));
      this.setText('internalCpuBlocksValue', this.formatNumber(internalCpu.blocksAccepted));
      if (cpuHashrateCard) cpuHashrateCard.classList.remove('hidden');
      if (cpuBlocksCard) cpuBlocksCard.classList.remove('hidden');
    } else {
      if (cpuHashrateCard) cpuHashrateCard.classList.add('hidden');
      if (cpuBlocksCard) cpuBlocksCard.classList.add('hidden');
    }

    this.renderWorkers(stats?.workers || []);
    this.renderBlocks(stats?.blocks || []);
    this.renderSharesPie(stats?.workers || []);
    this.renderBlocksPie(stats?.blocks || []);
  }

  renderWorkers(workers) {
    const body = document.getElementById('workersTableBody');
    if (!body) return;

    if (!workers.length) {
      body.innerHTML = '<tr><td colspan="7" class="py-6 text-center text-zinc-500">No workers reported yet.</td></tr>';
      return;
    }

    body.innerHTML = workers
      .sort((a, b) => (b.hashrate || 0) - (a.hashrate || 0))
      .map((worker) => {
        const hashrateHs = (Number(worker.hashrate) || 0) * 1e9;
        const wallet = this.hideWallets
          ? this.maskWallet(worker.wallet)
          : this.escape(worker.wallet);
        return `
          <tr>
            <td>${this.escape(worker.worker)}</td>
            <td class="truncate">${wallet}</td>
            <td>${this.formatHashrateHs(hashrateHs)}</td>
            <td>${this.formatNumber(worker.shares)}</td>
            <td>${this.formatNumber(worker.stale)}</td>
            <td>${this.formatNumber(worker.invalid)}</td>
            <td>${this.formatNumber(worker.blocks)}</td>
          </tr>
        `;
      })
      .join('');
  }

  bindWalletToggle() {
    const toggle = document.getElementById('walletToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      this.hideWallets = !this.hideWallets;
      toggle.classList.toggle('is-hidden', this.hideWallets);
      toggle.setAttribute('aria-pressed', this.hideWallets ? 'true' : 'false');
      toggle.setAttribute('aria-label', this.hideWallets ? 'Show wallets' : 'Hide wallets');
      this.renderWorkers(this.lastStats?.workers || []);
    });
  }

  bindBlocksWalletToggle() {
    const toggle = document.getElementById('blocksWalletToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      this.hideBlockWallets = !this.hideBlockWallets;
      toggle.classList.toggle('is-hidden', this.hideBlockWallets);
      toggle.setAttribute('aria-pressed', this.hideBlockWallets ? 'true' : 'false');
      toggle.setAttribute('aria-label', this.hideBlockWallets ? 'Show wallets' : 'Hide wallets');
      this.renderBlocks(this.lastStats?.blocks || []);
    });
  }

  maskWallet(value) {
    if (!value) return '--';
    return '***';
  }

  maskHash(value) {
    if (!value) return '--';
    return '***';
  }

  renderBlocks(blocks) {
    const body = document.getElementById('blocksTableBody');
    if (!body) return;

    if (!blocks.length) {
      body.innerHTML = '<tr><td colspan="3" class="py-6 text-center text-zinc-500">No blocks reported yet.</td></tr>';
      return;
    }

    const sorted = [...blocks].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    body.innerHTML = sorted
      .slice(0, 12)
      .map((block) => {
        const wallet = this.hideBlockWallets
          ? this.maskWallet(block.wallet)
          : this.escape(block.wallet);
        const hash = this.hideBlockWallets
          ? this.maskHash(block.hash)
          : this.escape(block.hash);
        return `
          <tr>
            <td>${this.escape(block.worker)}</td>
            <td class="break-all">${wallet}</td>
            <td class="break-all">${hash}</td>
          </tr>
        `;
      })
      .join('');
  }

  renderSharesPie(workers) {
    const canvas = document.getElementById('sharesPieChart');
    const legend = document.getElementById('sharesPieLegend');
    const tooltip = document.getElementById('sharesPieTooltip');
    if (!canvas || !legend) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = Array.isArray(workers)
      ? workers
          .map((worker) => ({
            label: `${worker.worker || 'Unknown'}`,
            value: Number(worker.shares || 0),
          }))
          .filter((item) => Number.isFinite(item.value) && item.value > 0)
      : [];

    if (!data.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.classList.add('empty');
      legend.innerHTML = '<li class="text-zinc-500 text-sm">No shares reported yet.</li>';
      this.sharesPieSegments = [];
      if (tooltip) {
        tooltip.classList.remove('visible');
      }
      return;
    }

    legend.classList.remove('empty');
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const palette = [
      '#14b8a6',
      '#22d3ee',
      '#60a5fa',
      '#a78bfa',
      '#f472b6',
      '#f97316',
      '#facc15',
      '#4ade80',
    ];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 8;
    let startAngle = -Math.PI / 2;
    const segments = [];

    data.forEach((item, index) => {
      const slice = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = palette[index % palette.length];
      ctx.fill();
      segments.push({
        start: startAngle,
        end: startAngle + slice,
        label: item.label,
        value: item.value,
        percent: (item.value / total) * 100,
        color: palette[index % palette.length],
      });
      startAngle += slice;
    });

    this.sharesPieSegments = segments;
    this.setupSharesTooltip(canvas, tooltip, centerX, centerY, radius);

    legend.innerHTML = data
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, index) => {
        const color = palette[index % palette.length];
        return `
          <li>
            <span class="chart-swatch" style="background:${color}"></span>
            <span>${this.escape(item.label)} - ${this.formatNumber(item.value)} shares</span>
          </li>
        `;
      })
      .join('');
  }

  setupSharesTooltip(canvas, tooltip, centerX, centerY, radius) {
    if (!tooltip || !canvas) return;

    const handleMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        tooltip.classList.remove('visible');
        return;
      }

      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) {
        angle += Math.PI * 2;
      }
      if (angle < -Math.PI / 2) {
        angle = -Math.PI / 2;
      }

      const segment = this.sharesPieSegments.find(
        (item) => angle >= item.start && angle <= item.end
      );

      if (!segment) {
        tooltip.classList.remove('visible');
        return;
      }

      tooltip.textContent = `${segment.label} — ${this.formatNumber(segment.value)} shares (${segment.percent.toFixed(1)}%)`;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      tooltip.classList.add('visible');
    };

    const handleLeave = () => {
      tooltip.classList.remove('visible');
    };

    if (!canvas.dataset.tooltipBound) {
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseleave', handleLeave);
      canvas.dataset.tooltipBound = 'true';
    }
  }

  renderBlocksPie(blocks) {
    const canvas = document.getElementById('blocksPieChart');
    const legend = document.getElementById('blocksPieLegend');
    const tooltip = document.getElementById('blocksPieTooltip');
    if (!canvas || !legend) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const counts = new Map();
    if (Array.isArray(blocks)) {
      blocks.forEach((block) => {
        const label = block.worker || 'Unknown';
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    }

    const data = Array.from(counts.entries()).map(([label, value]) => ({ label, value }));

    if (!data.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.classList.add('empty');
      legend.innerHTML = '<li class="text-zinc-500 text-sm">No blocks reported yet.</li>';
      this.blocksPieSegments = [];
      if (tooltip) {
        tooltip.classList.remove('visible');
      }
      return;
    }

    legend.classList.remove('empty');
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const palette = [
      '#14b8a6',
      '#22d3ee',
      '#60a5fa',
      '#a78bfa',
      '#f472b6',
      '#f97316',
      '#facc15',
      '#4ade80',
    ];
    const sharedColors = new Map(
      (this.sharesPieSegments || []).map((segment) => [segment.label, segment.color])
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 8;
    let startAngle = -Math.PI / 2;
    const segments = [];

    data.forEach((item, index) => {
      const slice = (item.value / total) * Math.PI * 2;
      const color = sharedColors.get(item.label) || palette[index % palette.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      segments.push({
        start: startAngle,
        end: startAngle + slice,
        label: item.label,
        value: item.value,
        percent: (item.value / total) * 100,
        color,
      });
      startAngle += slice;
    });

    this.blocksPieSegments = segments;
    this.setupBlocksTooltip(canvas, tooltip, centerX, centerY, radius);

    legend.innerHTML = data
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, index) => {
        const color = sharedColors.get(item.label) || palette[index % palette.length];
        return `
          <li>
            <span class="chart-swatch" style="background:${color}"></span>
            <span>${this.escape(item.label)} - ${this.formatNumber(item.value)} blocks</span>
          </li>
        `;
      })
      .join('');
  }

  setupBlocksTooltip(canvas, tooltip, centerX, centerY, radius) {
    if (!tooltip || !canvas) return;

    const handleMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.hypot(dx, dy);

      if (distance > radius) {
        tooltip.classList.remove('visible');
        return;
      }

      let angle = Math.atan2(dy, dx);
      if (angle < -Math.PI / 2) {
        angle += Math.PI * 2;
      }
      if (angle < -Math.PI / 2) {
        angle = -Math.PI / 2;
      }

      const segment = this.blocksPieSegments.find(
        (item) => angle >= item.start && angle <= item.end
      );

      if (!segment) {
        tooltip.classList.remove('visible');
        return;
      }

      tooltip.textContent = `${segment.label} — ${this.formatNumber(segment.value)} blocks (${segment.percent.toFixed(1)}%)`;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;
      tooltip.classList.add('visible');
    };

    const handleLeave = () => {
      tooltip.classList.remove('visible');
    };

    if (!canvas.dataset.blocksTooltipBound) {
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseleave', handleLeave);
      canvas.dataset.blocksTooltipBound = 'true';
    }
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '--' : String(value);
  }

  formatUptimeSeconds(value) {
    const totalSeconds = Number(value ?? 0);
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '--';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
  }

  renderEndpoints(status) {
    const list = document.getElementById('stratumEndpoints');
    if (!list) return;

    const ports = Array.isArray(status?.stratum_ports) && status.stratum_ports.length
      ? status.stratum_ports
      : status?.stratum_port
        ? [status.stratum_port]
        : [':5555'];

    const host = 'umbrel.local';
    const entries = ports.map((rawPort, index) => {
      const port = this.normalizePort(String(rawPort));
      const endpoint = `stratum+tcp://${host}${port}`;
      return `
        <li class="endpoint-item">
          <span class="endpoint-label">Instance ${index + 1}</span>
          <span class="endpoint-value">${this.escape(endpoint)}</span>
        </li>
      `;
    });

    list.innerHTML = entries.join('');
  }

  normalizePort(value) {
    if (!value) return ':5555';
    if (value.startsWith(':')) return value;
    if (/^\d+$/.test(value)) return `:${value}`;
    const match = value.match(/:(\d+)$/);
    if (match) return `:${match[1]}`;
    return `:${value}`;
  }

  setLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (!el) return;
    el.textContent = new Date().toLocaleString();
  }

  formatNumber(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) return '--';
    return num.toLocaleString();
  }

  formatHashrateHs(hs) {
    const num = Number(hs || 0);
    if (!Number.isFinite(num) || num <= 0) return '--';
    const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
    let v = num;
    let i = 0;
    while (v >= 1000 && i < units.length - 1) {
      v /= 1000;
      i += 1;
    }
    return `${Math.round(v)} ${units[i]}`;
  }

  formatDifficulty(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return '--';
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}G`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(2);
  }

  formatUnixSeconds(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return this.escape(ts);
    return new Date(n * 1000).toLocaleString();
  }

  shortHash(h) {
    if (!h) return '--';
    return h.length > 18 ? `${h.slice(0, 10)}...${h.slice(-6)}` : h;
  }

  escape(value) {
    const str = value == null ? '' : String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StratumBridgeDashboard();
});
