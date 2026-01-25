class StratumBridgeDashboard {
  constructor() {
    this.updateInterval = 10000;
    this.retryInterval = 5000;
    this.pollTimer = null;
    this.localIp = null;
    this.lastStatus = null;
    this.init();
  }

  init() {
    this.resolveLocalIp();
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
    this.lastStatus = status || null;
    this.setText('kaspadAddressValue', status?.kaspad_address);
    this.setText('kaspadVersionValue', status?.kaspad_version || '—');
    this.setText('instancesValue', status?.instances || 1);
    this.setText('webBindValue', this.formatWebBind(status));
    this.renderEndpoints(status);
  }

  renderStats(stats) {
    this.setText('totalBlocksValue', this.formatNumber(stats?.totalBlocks));
    this.setText('totalSharesValue', this.formatNumber(stats?.totalShares));
    this.setText('activeWorkersValue', this.formatNumber(stats?.activeWorkers));
    this.setText('networkHashrateValue', this.formatHashrateHs(Number(stats?.networkHashrate || 0)));
    this.setText('networkDifficultyValue', this.formatDifficulty(stats?.networkDifficulty));
    this.setText('networkBlockCountValue', this.formatNumber(stats?.networkBlockCount));
    this.setText('kaspadVersionValue', stats?.kaspadVersion);

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

  renderSharesPie(workers) {
    const canvas = document.getElementById('sharesPieChart');
    const legend = document.getElementById('sharesPieLegend');
    if (!canvas || !legend) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = Array.isArray(workers)
      ? workers
          .map((worker) => ({
            label: `${worker.worker || 'Unknown'} (${worker.instance || '1'})`,
            value: Number(worker.shares || 0),
          }))
          .filter((item) => Number.isFinite(item.value) && item.value > 0)
      : [];

    if (!data.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.classList.add('empty');
      legend.innerHTML = '<li class="text-zinc-500 text-sm">No shares reported yet.</li>';
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

    data.forEach((item, index) => {
      const slice = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = palette[index % palette.length];
      ctx.fill();
      startAngle += slice;
    });

    legend.innerHTML = data
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, index) => {
        const percent = ((item.value / total) * 100).toFixed(1);
        const color = palette[index % palette.length];
        return `
          <li>
            <span class="chart-swatch" style="background:${color}"></span>
            <span>${this.escape(item.label)} — ${this.formatNumber(item.value)} shares (${percent}%)</span>
          </li>
        `;
      })
      .join('');
  }

  renderBlocksPie(blocks) {
    const canvas = document.getElementById('blocksPieChart');
    const legend = document.getElementById('blocksPieLegend');
    if (!canvas || !legend) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const counts = new Map();
    if (Array.isArray(blocks)) {
      blocks.forEach((block) => {
        const wallet = block.wallet || 'Unknown';
        counts.set(wallet, (counts.get(wallet) || 0) + 1);
      });
    }

    const data = Array.from(counts.entries()).map(([label, value]) => ({ label, value }));

    if (!data.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.classList.add('empty');
      legend.innerHTML = '<li class="text-zinc-500 text-sm">No blocks reported yet.</li>';
      return;
    }

    legend.classList.remove('empty');
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const palette = [
      '#38bdf8',
      '#22d3ee',
      '#14b8a6',
      '#a78bfa',
      '#f59e0b',
      '#f472b6',
      '#4ade80',
      '#e879f9',
    ];

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 8;
    let startAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const slice = (item.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = palette[index % palette.length];
      ctx.fill();
      startAngle += slice;
    });

    legend.innerHTML = data
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((item, index) => {
        const percent = ((item.value / total) * 100).toFixed(1);
        const color = palette[index % palette.length];
        return `
          <li>
            <span class="chart-swatch" style="background:${color}"></span>
            <span>${this.escape(item.label)} — ${this.formatNumber(item.value)} blocks (${percent}%)</span>
          </li>
        `;
      })
      .join('');
  }

  setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '--' : String(value);
  }

  formatWebBind(status) {
    const rawPort = status?.prom_port || status?.health_check_port;
    if (!rawPort) return '—';
    const host = status?.public_host || status?.local_ip || this.localIp || window.location.hostname || 'localhost';
    const port = this.normalizePort(String(rawPort));
    return `http://${host}${port}`;
  }

  renderEndpoints(status) {
    const list = document.getElementById('stratumEndpoints');
    if (!list) return;

    const ports = Array.isArray(status?.stratum_ports) && status.stratum_ports.length
      ? status.stratum_ports
      : status?.stratum_port
        ? [status.stratum_port]
        : [':5555'];

    const host = status?.public_host || status?.local_ip || this.localIp || window.location.hostname || 'localhost';
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

  async resolveLocalIp() {
    try {
      const ip = await this.getLocalIpFromWebRTC();
      if (ip) {
        this.localIp = ip;
        if (this.lastStatus) {
          this.renderEndpoints(this.lastStatus);
        }
      }
    } catch (error) {
      console.warn('Unable to resolve local IP', error);
    }
  }

  getLocalIpFromWebRTC() {
    return new Promise((resolve, reject) => {
      if (!window.RTCPeerConnection) {
        resolve(null);
        return;
      }

      const peer = new RTCPeerConnection({ iceServers: [] });
      peer.createDataChannel('ip');
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .catch(reject);

      peer.onicecandidate = (event) => {
        if (!event?.candidate?.candidate) {
          peer.close();
          resolve(null);
          return;
        }

        const match = event.candidate.candidate.match(
          /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/
        );
        if (match) {
          const ip = match[1];
          if (this.isPrivateIp(ip)) {
            peer.onicecandidate = null;
            peer.close();
            resolve(ip);
          }
        }
      };
    });
  }

  isPrivateIp(ip) {
    return (
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
    );
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
