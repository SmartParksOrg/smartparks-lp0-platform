#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

ADMIN_EMAIL="${ADMIN_EMAIL:-${SMARTPARKS_ADMIN_EMAIL:-admin@example.com}}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-${SMARTPARKS_ADMIN_PASSWORD:-}}"

if [[ -z "${ADMIN_PASSWORD// /}" ]]; then
  echo "Error: ADMIN_PASSWORD is required. Set ADMIN_PASSWORD or SMARTPARKS_ADMIN_PASSWORD." >&2
  exit 1
fi

# Backend venv + deps
cd "$BACKEND_DIR"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt

# Frontend deps
cd "$FRONTEND_DIR"
if [[ ! -d "node_modules" ]]; then
  npm install
fi

# Start services
cd "$BACKEND_DIR"
SMARTPARKS_ADMIN_EMAIL="$ADMIN_EMAIL" \
SMARTPARKS_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

cleanup() {
  echo "\nStopping services..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Backend: http://localhost:8000"
echo "Frontend: check Vite output (usually http://localhost:5173)"
echo "Admin email: $ADMIN_EMAIL"

wait "$BACKEND_PID" "$FRONTEND_PID"
