class KaspaDatabaseDashboard {
    constructor() {
        this.updateInterval = 10000;
        this.retryInterval = 5000;
        this.apiTimeout = 30000;
        this.apiBase = this.resolveApiBase();
        this.elements = this.cacheElements();
        this.logStream = null;
        this.logBuffer = [];
        this.logPollTimer = null;
        this.activeLogService = null;
        this.pollTimer = null;
        this.init();
    }

    cacheElements() {
        return {
            dbSizeValue: document.getElementById('dbSizeValue'),
            connectedClientsValue: document.getElementById('connectedClientsValue'),
            tableCountValue: document.getElementById('tableCountValue'),
            largestTableValue: document.getElementById('largestTableValue'),
            rowSummary: document.getElementById('rowSummary'),
            tableStatsBody: document.getElementById('tableStatsBody'),
            statusBadge: document.getElementById('statusBadge'),
            statusLabel: document.getElementById('statusLabel'),
            statusDot: document.getElementById('statusDot'),
            logModal: document.getElementById('logModal'),
            logOutput: document.getElementById('logOutput'),
            logServiceLabel: document.getElementById('logServiceLabel'),
            lastUpdated: document.getElementById('lastUpdated'),
        };
    }

    init() {
        this.fetchData();
        this.bindLogLinks();
    }

    async fetchData() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.apiTimeout);
        try {
            const response = await fetch(this.buildApiUrl(`/api/status?t=${Date.now()}`), {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error('API returned an unexpected status');
            }

            const data = await response.json();
            this.render(data);
            this.updateStatus(true, 'Synced with API');
            this.scheduleNext(this.updateInterval);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(error);
            this.updateStatus(false);
            this.scheduleNext(this.retryInterval);
        }
    }

    resolveApiBase() {
        const params = new URLSearchParams(window.location.search);
        const origin = params.get('origin');
        const app = params.get('app');

        if (!origin || !app) {
            return '';
        }

        return `${window.location.origin}/?origin=${encodeURIComponent(origin)}&app=${encodeURIComponent(app)}&path=`;
    }

    buildApiUrl(path) {
        if (!this.apiBase) {
            return path;
        }

        return `${this.apiBase}${encodeURIComponent(path)}`;
    }

    scheduleNext(delayMs) {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
        }
        this.pollTimer = setTimeout(() => this.fetchData(), delayMs);
    }

    bindLogLinks() {
        const logLinks = document.querySelectorAll('[data-log-service]');
        const closeTargets = document.querySelectorAll('[data-log-close]');

        logLinks.forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const service = link.getAttribute('data-log-service');
                const label = link.getAttribute('data-log-label') || link.textContent.trim();
                if (service) {
                    this.openLogStream(service, label);
                }
            });
        });

        closeTargets.forEach((button) => {
            button.addEventListener('click', () => this.closeLogStream());
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeLogStream();
            }
        });
    }

    openLogStream(service, label) {
        if (!this.elements.logModal || !this.elements.logOutput) {
            return;
        }

        this.closeLogStream();
        this.logBuffer = [];
        this.activeLogService = service;
        this.elements.logServiceLabel.textContent = label;
        this.elements.logOutput.textContent = 'Connecting to live logs...';
        this.elements.logModal.classList.add('is-open');
        this.elements.logModal.setAttribute('aria-hidden', 'false');

        this.fetchLogs();
    }

    closeLogStream() {
        if (this.logStream) {
            this.logStream.close();
            this.logStream = null;
        }
        if (this.logPollTimer) {
            clearTimeout(this.logPollTimer);
            this.logPollTimer = null;
        }
        this.activeLogService = null;
        if (this.elements.logModal) {
            this.elements.logModal.classList.remove('is-open');
            this.elements.logModal.setAttribute('aria-hidden', 'true');
        }
    }

    async fetchLogs() {
        if (!this.activeLogService) {
            return;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(
                this.buildApiUrl(`/api/logs/${encodeURIComponent(this.activeLogService)}?tail=200`),
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error('Log fetch failed');
            }
            const text = await response.text();
            this.logBuffer = text ? text.split('\n') : [];
            this.elements.logOutput.textContent = this.logBuffer.join('\n') || 'No logs available yet.';
            this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
        } catch (error) {
            console.error(error);
            this.elements.logOutput.textContent = 'Unable to load logs right now.';
        } finally {
            if (this.activeLogService) {
                this.logPollTimer = setTimeout(() => this.fetchLogs(), 3000);
            }
        }
    }

    appendLogLine(line) {
        if (!this.elements.logOutput) {
            return;
        }
        this.logBuffer.push(line);
        if (this.logBuffer.length > 400) {
            this.logBuffer.shift();
        }
        this.elements.logOutput.textContent = this.logBuffer.join('\n');
        this.elements.logOutput.scrollTop = this.elements.logOutput.scrollHeight;
    }

    render(payload) {
        const nodeStatus = payload.status || 'unknown';
        const image = payload.image || '—';
        const uptimeSeconds = Number(payload.uptimeSeconds ?? 0);
        const appDir = payload.appDir || '—';
        const utxoIndexEnabled = payload.utxoIndexEnabled ? 'enabled' : 'disabled';

        this.elements.dbSizeValue.textContent = nodeStatus;
        this.elements.connectedClientsValue.textContent = this.formatDuration(uptimeSeconds);
        this.elements.tableCountValue.textContent = utxoIndexEnabled;
        this.elements.largestTableValue.textContent = image;
        this.elements.rowSummary.textContent = `App dir: ${appDir}`;

        this.populateTableStats(payload.logTail || []);

        if (this.elements.lastUpdated) {
            if (payload.timestamp) {
                const updatedAt = new Date(payload.timestamp);
                this.elements.lastUpdated.textContent = Number.isNaN(updatedAt.getTime())
                    ? new Date().toLocaleString()
                    : updatedAt.toLocaleString();
            } else {
                this.elements.lastUpdated.textContent = new Date().toLocaleString();
            }
        }
    }

    populateTableStats(stats) {
        const container = this.elements.tableStatsBody;
        container.innerHTML = '';

        if (!Array.isArray(stats) || stats.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="py-6 text-center text-zinc-500">No log data available yet.</td>
                </tr>
            `;
            return;
        }

        stats.forEach((entry) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium text-sm leading-tight">${entry.message}</td>
                <td>${entry.level}</td>
                <td>${entry.timestamp}</td>
                <td>${entry.source}</td>
            `;
            container.appendChild(row);
        });
    }

    updateStatus(healthy, label) {
        if (healthy) {
            this.elements.statusBadge.textContent = 'Connected';
            this.elements.statusBadge.style.borderColor = 'rgba(20, 184, 166, 0.6)';
            this.elements.statusBadge.style.backgroundColor = 'rgba(20, 184, 166, 0.15)';
            this.elements.statusLabel.textContent = label;
            this.elements.statusDot.className = 'w-3 h-3 rounded-full bg-teal-400 animate-pulse';
        } else {
            this.elements.statusBadge.textContent = 'Offline';
            this.elements.statusBadge.style.borderColor = 'rgba(248, 113, 113, 0.7)';
            this.elements.statusBadge.style.backgroundColor = 'rgba(248, 113, 113, 0.15)';
            this.elements.statusLabel.textContent = 'Waiting for API response';
            this.elements.statusDot.className = 'w-3 h-3 rounded-full bg-red-500 animate-pulse';
            this.elements.dbSizeValue.textContent = '--';
            this.elements.connectedClientsValue.textContent = '--';
            this.elements.tableCountValue.textContent = '--';
            this.elements.rowSummary.textContent = 'Waiting for connection...';
            this.elements.largestTableValue.textContent = '—';
            this.elements.tableStatsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-6 text-center text-zinc-500">Waiting for data...</td>
                </tr>
            `;
            if (this.elements.lastUpdated) {
                this.elements.lastUpdated.textContent = '--';
            }
        }
    }

    handleError() {
        this.updateStatus(false);
    }

    formatBytes(value) {
        const num = Number(value) || 0;
        if (num >= 1_000_000_000) {
            return `${(num / 1_000_000_000).toFixed(1)} GB`;
        }
        if (num >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(1)} MB`;
        }
        if (num >= 1_000) {
            return `${(num / 1_000).toFixed(1)} KB`;
        }
        return `${num.toLocaleString()} B`;
    }

    formatNumber(value) {
        const num = Number(value) || 0;
        if (num >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(1)}M`;
        }
        if (num >= 1_000) {
            return `${(num / 1_000).toFixed(1)}k`;
        }
        return num.toLocaleString();
    }

    formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) {
            return '--';
        }
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new KaspaDatabaseDashboard();
});
