#!/usr/bin/env bash
set -euo pipefail

# Build and push all Kaspa stack images (no compose up/down).

ROOT_DIR="/home/umbrel/Kaspa/umbrel-community-app-store"
docker login

# kaspa-k-social
cd "${ROOT_DIR}/kaspa-k-social"
git pull

cd "${ROOT_DIR}"
docker build -t dennitzo/k-social-web:latest -f k/Dockerfile k
docker push dennitzo/k-social-web:latest

# kaspa-database
cd "${ROOT_DIR}/kaspa-database"
git pull

docker build -t dennitzo/kaspa-database-api:latest ./api
docker push dennitzo/kaspa-database-api:latest
docker build -t dennitzo/kaspa-database-ui:latest ./frontend
docker push dennitzo/kaspa-database-ui:latest

# kaspa-explorer-ng
cd "${ROOT_DIR}/kaspa-explorer-ng"
git pull

cd "${ROOT_DIR}"
docker build -t dennitzo/kaspa-explorer-ng:latest -f kaspa-explorer-ng/Dockerfile kaspa-explorer-ng
docker push dennitzo/kaspa-explorer-ng:latest

# kaspa-stratum
cd "${ROOT_DIR}/rusty-kaspa-RKStratum2.0"
git pull

cd "${ROOT_DIR}"
docker build -t dennitzo/kaspa-stratum-bridge:latest -f rusty-kaspa-RKStratum2.0/bridge/Dockerfile.stratum-bridge rusty-kaspa-RKStratum2.0
docker push dennitzo/kaspa-stratum-bridge:latest

docker build -t dennitzo/kaspa-stratum-dashboard:latest -f rusty-kaspa-RKStratum2.0/bridge/Dockerfile.dashboard rusty-kaspa-RKStratum2.0/bridge
docker push dennitzo/kaspa-stratum-dashboard:latest

# kaspa-node (incl. graph-inspector images)
cd "${ROOT_DIR}"
git pull

docker build -t dennitzo/kaspa-node-ui:latest -f kaspa-node/frontend/Dockerfile kaspa-node/frontend
docker push dennitzo/kaspa-node-ui:latest

docker build -t dennitzo/kaspa-node-api:latest -f kaspa-node/api/Dockerfile kaspa-node/api
docker push dennitzo/kaspa-node-api:latest

docker build -t dennitzo/kaspa-graph-inspector-processing:latest -f kaspa-graph-inspector/processing/Dockerfile kaspa-graph-inspector/processing
docker push dennitzo/kaspa-graph-inspector-processing:latest

docker build -t dennitzo/kaspa-graph-inspector-api:latest -f kaspa-graph-inspector/api/Dockerfile kaspa-graph-inspector/api
docker push dennitzo/kaspa-graph-inspector-api:latest

docker build -t dennitzo/kaspa-graph-inspector-web:latest -f kaspa-graph-inspector/web/Dockerfile kaspa-graph-inspector/web
docker push dennitzo/kaspa-graph-inspector-web:latest
