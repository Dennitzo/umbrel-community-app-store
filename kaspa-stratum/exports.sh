# Kaspa Stratum Bridge export variables
APP_KASPA_STRATUM_KASPAD_ADDRESS="${APP_KASPA_STRATUM_KASPAD_ADDRESS:-host.docker.internal:16110}"
APP_KASPA_STRATUM_PUBLIC_HOST="${APP_KASPA_STRATUM_PUBLIC_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"

mkdir -p "${EXPORTS_APP_DIR}" "${EXPORTS_APP_DIR}/bridge-data"
chmod -R 777 "${EXPORTS_APP_DIR}/bridge-data"

CONFIG_PATH="${EXPORTS_APP_DIR}/config.yaml"
if [ ! -f "${CONFIG_PATH}" ]; then
  cat > "${CONFIG_PATH}" <<CONFIG
kaspad_address: "${APP_KASPA_STRATUM_KASPAD_ADDRESS}"
print_stats: true

instances:
  - stratum_port: ":5555"
    min_share_diff: 512
    prom_port: ":2114"
    log_to_file: false
    var_diff: true
CONFIG
fi
