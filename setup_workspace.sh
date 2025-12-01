#!/bin/bash

# KIKA Desktop - Workspace Setup (Linux/WSL)
# Sets up Python virtual environment and dependencies
#
# For Windows, use: setup_workspace_windows.bat

set -e  # Exit on error

echo "========================================"
echo "KIKA Desktop - Workspace Setup (Linux/WSL)"
echo "========================================"
echo ""

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "[OK] Virtual environment created"
else
    echo "[OK] Virtual environment already exists"
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo ""
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Install backend-auth dependencies
echo "Installing backend-auth dependencies..."
pip install -r backend-auth/requirements.txt --quiet

# Install kika-api dependencies
echo "Installing kika-api dependencies..."
pip install -r kika-api/requirements.txt --quiet

echo "[OK] Python dependencies installed"

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..
echo "[OK] Frontend dependencies installed"

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start development:"
echo "  WSL (browser mode):  ./start_dev.sh"
echo "  With Tauri GUI:      ./start_app.sh"
echo ""
echo "To activate the environment manually:"
echo "  source venv/bin/activate"
echo ""
