# Kaspa database and indexing export variables
export APP_KASPA_DB_ADDRESS="kaspa_db"
export APP_KASPA_NODE_ADDRESS="${APP_KASPA_NODE_ADDRESS:-host.docker.internal}"
export APP_KASPA_DB_PORT="5432"
export APP_KASPA_DB_NAME="kaspa"
export APP_KASPA_NODE_PORT="${APP_KASPA_NODE_PORT:-17110}"

KASPA_DB_ENV="${EXPORTS_APP_DIR}/.env"
mkdir -p "${EXPORTS_APP_DIR}/data"

if [[ ! -f "${KASPA_DB_ENV}" ]]; then
	APP_KASPA_DB_USER="kaspa"
	APP_KASPA_DB_PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
	{
		echo "export APP_KASPA_DB_USER='${APP_KASPA_DB_USER}'"
		echo "export APP_KASPA_DB_PASSWORD='${APP_KASPA_DB_PASSWORD}'"
	} > "${KASPA_DB_ENV}"
fi

. "${KASPA_DB_ENV}"

export APP_KASPA_NETWORK="mainnet"
export APP_KASPA_INDEXER_ADDRESS="10.21.24.11"
export APP_KASPA_PROCESSOR_ADDRESS="10.21.24.12"
export APP_KASPA_INDEXER_API_ADDRESS="10.21.24.13"
export APP_KASPA_INDEXER_UI_ADDRESS="10.21.24.14"
export APP_KASPA_INDEXER_API_PORT="8000"
export APP_KASPA_INDEXER_UI_PORT="19110"

# Provide a helper connection string for other services
export APP_KASPA_DB_URI="postgresql://${APP_KASPA_DB_USER}:${APP_KASPA_DB_PASSWORD}@${APP_KASPA_DB_ADDRESS}:${APP_KASPA_DB_PORT}/${APP_KASPA_DB_NAME}"
