class KaspaDatabaseDashboard {
    constructor() {
        this.updateInterval = 10000;
        this.elements = this.cacheElements();
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
            lastUpdated: document.getElementById('lastUpdated'),
            statusBadge: document.getElementById('statusBadge'),
            statusLabel: document.getElementById('statusLabel'),
            statusDot: document.getElementById('statusDot'),
        };
    }

    init() {
        this.fetchData();
        setInterval(() => this.fetchData(), this.updateInterval);
    }

    async fetchData() {
        try {
            const response = await fetch(`/api/status?t=${Date.now()}`);

            if (!response.ok) {
                throw new Error('API returned an unexpected status');
            }

            const data = await response.json();
            this.render(data);
            this.updateStatus(true, 'Indexer connected');
        } catch (error) {
            console.error(error);
            this.handleError();
        }
    }

    render(payload) {
        const dbSize = Number(payload.dbSizeBytes ?? 0);
        const connectedClients = Number(payload.connectedClients ?? 0);
        const tableCount = Number(payload.tableCount ?? 0);
        const tableTotals = payload.tableTotals ?? {};

        this.elements.dbSizeValue.textContent = this.formatBytes(dbSize);
        this.elements.connectedClientsValue.textContent = connectedClients.toLocaleString();
        this.elements.tableCountValue.textContent = tableCount.toLocaleString();
        this.elements.largestTableValue.textContent = payload.largestTable || '—';

        const sampledRows = Number(tableTotals.liveRows ?? 0);
        const sampledSize = this.formatBytes(Number(tableTotals.totalSizeBytes ?? 0));
        this.elements.rowSummary.textContent = `${this.formatNumber(sampledRows)} rows, ${sampledSize} in sample`;

        this.populateTableStats(payload.tableStats || []);

        if (payload.timestamp) {
            try {
                const updatedAt = new Date(payload.timestamp);
                if (!Number.isNaN(updatedAt.getTime())) {
                    this.elements.lastUpdated.textContent = updatedAt.toLocaleString();
                }
            } catch {
                this.elements.lastUpdated.textContent = new Date().toLocaleString();
            }
        } else {
            this.elements.lastUpdated.textContent = new Date().toLocaleString();
        }
    }

    populateTableStats(stats) {
        const container = this.elements.tableStatsBody;
        container.innerHTML = '';

        if (!Array.isArray(stats) || stats.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="py-6 text-center text-zinc-500">No table information available yet.</td>
                </tr>
            `;
            return;
        }

        stats.forEach((table) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium text-sm leading-tight">${table.table_name}</td>
                <td>${this.formatNumber(table.live_rows)}</td>
                <td>${this.formatBytes(table.total_size_bytes)}</td>
                <td>${this.formatNumber(table.seq_scan)}</td>
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
            this.elements.statusLabel.textContent = 'Unable to reach API';
            this.elements.statusDot.className = 'w-3 h-3 rounded-full bg-red-500 animate-pulse';
            this.elements.dbSizeValue.textContent = '--';
            this.elements.connectedClientsValue.textContent = '--';
            this.elements.tableCountValue.textContent = '--';
            this.elements.rowSummary.textContent = 'Waiting for connection...';
            this.elements.largestTableValue.textContent = '—';
            this.elements.lastUpdated.textContent = 'never';
            this.elements.tableStatsBody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-6 text-center text-red-400">Unable to load data.</td>
                </tr>
            `;
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
}

document.addEventListener('DOMContentLoaded', () => {
    new KaspaDatabaseDashboard();
});
