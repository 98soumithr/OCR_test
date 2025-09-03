#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=${HOST:-127.0.0.1}
PORT=${PORT:-8000}
export PYTHONUNBUFFERED=1
exec uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
