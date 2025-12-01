#!/bin/bash

# KIKA Development Server (Browser-only, no Tauri GUI)
# Safe for WSL environments without display

set -e

echo "========================================"
echo "KIKA Development Server"
echo "========================================"
echo ""

# Kill any existing processes on development ports (for safety)
echo "Cleaning up any existing processes on ports 8000, 8001, 1420..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:1420 | xargs kill -9 2>/dev/null || true
sleep 1

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Run ./setup_workspace.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Kill any existing processes on the ports we need
echo "Checking for existing processes..."
pkill -f "uvicorn app.main" 2>/dev/null && echo "Killed existing uvicorn process" || echo "No existing uvicorn process"
pkill -f "uvicorn app:app" 2>/dev/null && echo "Killed existing auth backend" || echo "No existing auth backend"
pkill -f "vite" 2>/dev/null && echo "Killed existing Vite dev server" || echo "No existing Vite dev server"
lsof -ti:1420 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on port 1420" || echo "Port 1420 is free"
lsof -ti:8001 2>/dev/null | xargs kill -9 2>/dev/null && echo "Killed process on port 8001" || echo "Port 8001 is free"

# Give processes time to clean up
sleep 2

echo "Starting services..."
echo ""

# Option to run local auth backend for testing
LOCAL_AUTH="${LOCAL_AUTH:-false}"
AUTH_PID=""

if [ "$LOCAL_AUTH" = "true" ]; then
    echo "[1/3] Starting LOCAL Auth Backend on http://localhost:8000"
    cd backend-auth
    uvicorn app:app --host 127.0.0.1 --port 8000 --reload &
    AUTH_PID=$!
    cd ..
    sleep 2
    export VITE_BACKEND_URL="http://localhost:8000"
else
    echo "[1/3] Using CLOUD Auth Backend (https://kika-backend.onrender.com)"
fi

# Start Backend Core (port 8001)
echo "[2/3] Starting Core Backend on http://localhost:8001"
cd backend-core
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload &
CORE_PID=$!
cd ..

sleep 2

# Start Vite dev server (port 1420) - browser only, no Tauri
echo "[3/3] Starting Frontend on http://localhost:1420"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "All services started!"
echo ""
echo "  Frontend:     http://localhost:1420"
if [ "$LOCAL_AUTH" = "true" ]; then
    echo "  Auth API:     http://localhost:8000/docs (LOCAL)"
else
    echo "  Auth API:     https://kika-backend.onrender.com (CLOUD)"
fi
echo "  Core API:     http://localhost:8001/docs"
echo ""
echo "To use local auth backend: LOCAL_AUTH=true ./start_dev.sh"
echo "Press Ctrl+C to stop all services"
echo "========================================"

# Wait for Ctrl+C
cleanup() {
    echo 'Stopping...'
    [ -n "$AUTH_PID" ] && kill $AUTH_PID 2>/dev/null
    kill $CORE_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

wait
