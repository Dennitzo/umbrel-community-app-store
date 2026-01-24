#!/usr/bin/env bash
set -euo pipefail

# Deploy all Kaspa stack services without deleting volumes or images.

ROOT_DIR="/home/umbrel/Kaspa/umbrel-community-app-store"
APP_DATA_BASE="/home/umbrel/umbrel/app-data"

docker login

# k-social
cd "${ROOT_DIR}/k-social"
docker compose down --remove-orphans
git pull

cd "${ROOT_DIR}"
docker build -t dennitzo/k-social-web:latest -f k-social/Dockerfile k-social
docker push dennitzo/k-social-web:latest

cd "${ROOT_DIR}/k-social"
APP_DATA_DIR="${APP_DATA_BASE}/k-social" docker compose up -d --build

# kaspa-database
cd "${ROOT_DIR}/kaspa-database"
docker compose down --remove-orphans
git pull

docker build -t dennitzo/kaspa-database-api:latest ./api
docker push dennitzo/kaspa-database-api:latest
docker build -t dennitzo/kaspa-database-ui:latest ./frontend
docker push dennitzo/kaspa-database-ui:latest

APP_DATA_DIR="${APP_DATA_BASE}/kaspa-database" docker compose up -d --build

# kaspa-node (incl. graph-inspector images)
cd "${ROOT_DIR}/kaspa-node"
APP_DATA_DIR="${APP_DATA_BASE}/kaspa-node" docker compose down --remove-orphans

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

APP_DATA_DIR="${APP_DATA_BASE}/kaspa-node" \
  docker compose -f "${ROOT_DIR}/kaspa-node/docker-compose.yml" up -d --build
