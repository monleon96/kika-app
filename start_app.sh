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

# Activate virtual environment
source venv/bin/activate

# Start Authentication Backend
echo "Starting Authentication Backend (Port 8000)..."
cd backend-auth
uvicorn app:app --reload --port 8000 &
AUTH_PID=$!
cd ..

# Start Core Backend
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

echo "All services started. Press Ctrl+C to stop."

# Wait for all processes
wait $AUTH_PID $CORE_PID $FRONTEND_PID
