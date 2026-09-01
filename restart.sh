#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

SERVICE_NAME="receipt-elevate.service"
STOP_TIMEOUT_SECONDS=20

wait_for_service_stopped() {
  local timeout_seconds="$1"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local current_state
    current_state="$(systemctl is-active "${SERVICE_NAME}" 2>/dev/null || true)"

    if [[ "${current_state}" == "inactive" || "${current_state}" == "failed" ]]; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for ${SERVICE_NAME} to stop. Current state: ${current_state:-unknown}" >&2
      return 1
    fi

    sleep 1
  done
}

wait_for_service_state() {
  local expected_state="$1"
  local timeout_seconds="$2"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local current_state
    current_state="$(systemctl is-active "${SERVICE_NAME}" 2>/dev/null || true)"

    if [[ "${current_state}" == "${expected_state}" ]]; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for ${SERVICE_NAME} to become '${expected_state}'. Current state: ${current_state:-unknown}" >&2
      return 1
    fi

    sleep 1
  done
}

echo "[1/4] Building Next.js production app..."
npm run build

echo "[2/4] Stopping ${SERVICE_NAME} cleanly..."
systemctl stop "${SERVICE_NAME}" || true

if ! wait_for_service_stopped "${STOP_TIMEOUT_SECONDS}"; then
  echo "Service did not stop cleanly. Killing remaining processes in the unit..." >&2
  systemctl kill --kill-who=all --signal=SIGKILL "${SERVICE_NAME}" || true
  if ! wait_for_service_stopped 10; then
    echo "Service still did not stop after SIGKILL." >&2
    exit 1
  fi
fi

echo "[3/4] Starting ${SERVICE_NAME}..."
systemctl reset-failed "${SERVICE_NAME}" || true
systemctl start "${SERVICE_NAME}"
wait_for_service_state "active" 20

echo "[4/4] Checking ${SERVICE_NAME} status..."
systemctl --no-pager --full status "${SERVICE_NAME}"
