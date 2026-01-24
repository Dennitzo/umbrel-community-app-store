#!/usr/bin/env bash
set -euo pipefail

KASPA_SOURCE="/home/umbrel/umbrel/app-data/kaspa-node/kaspa-mainnet"
KASPA_DEST="/home/umbrel/Kaspa/backup/kaspa-mainnet"

GRAPH_SOURCE="/home/umbrel/umbrel/app-data/kaspa-node/graph-postgres"
GRAPH_DEST="/home/umbrel/Kaspa/backup/graph-postgres"

KASPA_DB_SOURCE="/home/umbrel/umbrel/app-data/kaspa-database/data/db"
KASPA_DB_DEST="/home/umbrel/Kaspa/backup/kaspa-database-db"

docker stop kaspa-node_kaspad_1 || true
docker stop kaspa-node_graph-postgres_1 || true
docker stop kaspa-database_kaspa_db_1 || true

mkdir -p "${KASPA_DEST}" "${GRAPH_DEST}" "${KASPA_DB_DEST}"
rsync -a --delete "${KASPA_SOURCE}/" "${KASPA_DEST}/"
rsync -a --delete "${GRAPH_SOURCE}/" "${GRAPH_DEST}/"
rsync -a --delete "${KASPA_DB_SOURCE}/" "${KASPA_DB_DEST}/"

docker start kaspa-database_kaspa_db_1 || true
docker start kaspa-node_graph-postgres_1 || true
docker start kaspa-node_kaspad_1 || true

echo "Backup done:"
echo "  ${KASPA_DEST}"
echo "  ${GRAPH_DEST}"
echo "  ${KASPA_DB_DEST}"
