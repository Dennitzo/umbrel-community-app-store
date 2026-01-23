# IP assignments for K-Social services
export APP_K_SOCIAL_WEB_ADDRESS="10.21.24.20"
export APP_K_SOCIAL_KWEBSERVER_ADDRESS="10.21.24.21"
export APP_K_SOCIAL_PROCESSOR_ADDRESS="10.21.24.22"

export APP_K_SOCIAL_PORT="5173"
export APP_K_SOCIAL_KWEBSERVER_PORT="3001"
export APP_K_SOCIAL_KWEBSERVER_API_URI="http://${APP_K_SOCIAL_KWEBSERVER_ADDRESS}:${APP_K_SOCIAL_KWEBSERVER_PORT}"

# Kaspa Database connection (reuse kaspa-database exports)
KASPA_DB_EXPORTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../kaspa-database" && pwd)"
if [[ -f "${KASPA_DB_EXPORTS_DIR}/exports.sh" ]]; then
  # shellcheck disable=SC1090
  source "${KASPA_DB_EXPORTS_DIR}/exports.sh"
else
  echo "Missing kaspa-database/exports.sh at ${KASPA_DB_EXPORTS_DIR}" >&2
fi

# Override DB host for local dev to reach kaspa-database via host.docker.internal.
export APP_KASPA_DB_ADDRESS="host.docker.internal"
export APP_KASPA_DB_PORT="${APP_KASPA_DB_PORT:-5432}"

required_vars=(
  APP_KASPA_DB_ADDRESS
  APP_KASPA_DB_PORT
  APP_KASPA_DB_NAME
  APP_KASPA_DB_USER
  APP_KASPA_DB_PASSWORD
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    missing_vars+=("${var}")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "Missing required kaspa-database exports: ${missing_vars[*]}" >&2
  return 1
fi
