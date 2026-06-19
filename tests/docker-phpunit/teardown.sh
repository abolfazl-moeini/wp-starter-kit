#!/usr/bin/env bash
#
# Stop and remove temporary PHPUnit Docker containers and volumes.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}"

docker compose down -v

if [[ -f "${SCRIPT_DIR}/wp-tests-config.php" ]]; then
  rm -f "${SCRIPT_DIR}/wp-tests-config.php"
fi

echo "Docker PHPUnit environment removed."