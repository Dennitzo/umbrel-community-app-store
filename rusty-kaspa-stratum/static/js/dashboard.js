class StratumBridgeDashboard {
  constructor() {
    this.updateInterval = 10000;
    this.retryInterval = 5000;
    this.pollTimer = null;
    this.init();
  }

  init() {
    this.fetchData();
  }

  async fetchData() {
    try {
      const [statusRes, statsRes] = await Promise.all([
        fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/stats?t=${Date.now()}`, { cache: 'no-store' }),
      ]);

      if (!statusRes.ok || !statsRes.ok) {
        throw new Error('API returned an unexpected status');
      }

      const status = await statusRes.json();
      const stats = await statsRes.json();

      this.renderStatus(status);
      this.renderStats(stats);
      this.updateStatus(true, 'Live');
      this.setLastUpdated();
      this.scheduleNext(this.updateInterval);
    } catch (error) {
      console.error(error);
      this.updateStatus(false, 'Offline');
      this.scheduleNext(this.retryInterval);
    }
  }

  scheduleNext(delayMs) {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    this.pollTimer = setTimeout(() => this.fetchData(), delayMs);
  }

  updateStatus(isOk, label) {
    const badge = document.getElementById('statusBadge');
    const dot = document.getElementById('statusDot');
    const statusLabel = document.getElementById('statusLabel');

    if (badge) {
      badge.textContent = isOk ? 'Bridge Online' : 'Bridge Offline';
      badge.style.borderColor = isOk ? 'rgba(16, 185, 129, 0.6)' : 'rgba(248, 113, 113, 0.6)';
      badge.style.background = isOk ? 'rgba(16, 185, 129, 0.15)' : 'rgba(248, 113, 113, 0.15)';
    }
    if (dot) {
      dot.className = `w-3 h-3 rounded-full ${isOk ? 'bg-emerald-400' : 'bg-red-400'} ${isOk ? 'animate-pulse' : ''}`;
    }
    if (statusLabel) {
      statusLabel.textContent = label || (isOk ? 'Live' : 'Offline');
    }
  }

  renderStatus(status) {
    this.setText('kaspadAddressValue', status?.kaspad_address);
    this.setText('kaspadVersionValue', status?.kaspad_version || '—');
    this.setText('instancesValue', status?.instances || 1);
    this.setText('webBindValue', status?.prom_port || status?.health_check_port || '—');
  }

  renderStats(stats) {
    this.setText('totalBlocksValue', this.formatNumber(stats?.totalBlocks));
    this.setText('totalSharesValue', this.formatNumber(stats?.totalShares));
    this.setText('activeWorkersValue', this.formatNumber(stats?.activeWorkers));
    this.setText('networkHashrateValue', this.formatHashrateHs(Number(stats?.networkHashrate || 0)));
    this.setText('networkDifficultyValue', this.formatDifficulty(stats?.networkDifficulty));
    this.setText('networkBlockCountValue', this.formatNumber(stats?.networkBlockCount));

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
  }

  renderWorkers(workers) {
    const body = document.getElementById('workersTableBody');
    if (!body) return;

    if (!workers.length) {
      body.innerHTML = '<tr><td colspan="8" class="py-6 text-center text-zinc-500">No workers reported yet.</td></tr>';
      return;
    }

    body.innerHTML = workers
      .sort((a, b) => (b.hashrate || 0) - (a.hashrate || 0))
      .map((worker) => {
        const hashrateHs = (Number(worker.hashrate) || 0) * 1e9;
        return `
          <tr>
            <td>${this.escape(worker.instance)}</td>
            <td>${this.escape(worker.worker)}</td>
            <td class="truncate">${this.escape(worker.wallet)}</td>
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

  renderBlocks(blocks) {
    const body = document.getElementById('blocksTableBody');
    if (!body) return;

    if (!blocks.length) {
      body.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-zinc-500">No blocks reported yet.</td></tr>';
      return;
    }

    const sorted = [...blocks].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    body.innerHTML = sorted
      .slice(0, 12)
      .map((block) => {
        return `
          <tr>
            <td>${this.escape(block.instance)}</td>
            <td>${this.escape(block.worker)}</td>
            <td class="truncate">${this.escape(block.wallet)}</td>
            <td>${this.formatUnixSeconds(block.timestamp)}</td>
            <td class="truncate">${this.escape(this.shortHash(block.hash))}</td>
          </tr>
        `;
      })
      .join('');
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '--' : String(value);
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
    return `${v.toFixed(2)} ${units[i]}`;
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
