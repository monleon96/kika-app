#!/bin/bash

# Exit on error
set -e

# Function to kill all background processes on exit
cleanup() {
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and call cleanup
trap cleanup SIGINT

echo "Starting KIKA App..."

# Kill any existing processes on the ports we need
echo "Checking for existing processes..."
pkill -f "uvicorn app.main" 2>/dev/null && echo "Killed existing uvicorn process" || echo "No existing uvicorn process"
pkill -f "npm run tauri" 2>/dev/null && echo "Killed existing Tauri process" || echo "No existing Tauri process"

# Give processes time to clean up
sleep 2

# Activate virtual environment
source venv/bin/activate

# Note: Authentication is now cloud-hosted on Render (https://kika-backend.onrender.com)
# No need to start a local auth backend

# Start Core Backend (local processing server)
echo "Starting Core Backend (Port 8001)..."
cd backend-core
uvicorn app.main:app --reload --port 8001 &
CORE_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend
npm run tauri dev &
FRONTEND_PID=$!
cd ..

echo "All services started."
echo "- Core Backend: http://localhost:8001"
echo "- Auth Backend: https://kika-backend.onrender.com (cloud)"
echo ""
echo "Press Ctrl+C to stop."

# Wait for all processes
wait $CORE_PID $FRONTEND_PID
