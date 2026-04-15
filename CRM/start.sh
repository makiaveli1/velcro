#!/bin/bash
# Start both CRM backend and frontend from a single command.
# Usage: ./start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRM_DIR="$SCRIPT_DIR"
UI_DIR="$SCRIPT_DIR/ui"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[start.sh]${NC} $1"; }
warn() { echo -e "${YELLOW}[start.sh]${NC} $1"; }

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}[start.sh] ERROR: Node.js not found${NC}"
  exit 1
fi

# Kill anything already on these ports
kill_port() {
  local port=$1
  local pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    warn "Port $port in use — killing PID $pid"
    kill $pid 2>/dev/null || true
    sleep 1
  fi
}

log "Starting Verdantia CRM..."

log "Starting backend on port 3100..."
cd "$CRM_DIR"
PORT=3100 node server.js &
BACKEND_PID=$!

log "Starting frontend on port 5173..."
cd "$UI_DIR"
npm run dev -- --port 5173 &
FRONTEND_PID=$!

log "Both services started."
log "  Backend: http://localhost:3100"
log "  Frontend: http://localhost:5173"
log ""
log "Press Ctrl+C to stop both services."

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
