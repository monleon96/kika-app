#!/bin/bash

# KIKA Development Server (Browser-only, no Tauri GUI)
# Safe for WSL environments without display

set -e

echo "========================================"
echo "KIKA Development Server"
echo "========================================"
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Run ./setup_workspace.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

echo "Starting services..."
echo ""

# Start Backend Auth (port 8000)
echo "[1/3] Starting Auth Backend on http://localhost:8000"
cd backend-auth
uvicorn app:app --host 127.0.0.1 --port 8000 --reload &
AUTH_PID=$!
cd ..

sleep 2

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
echo "  Auth API:     http://localhost:8000/docs"
echo "  Core API:     http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================"

# Wait for Ctrl+C
trap "echo 'Stopping...'; kill $AUTH_PID $CORE_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
