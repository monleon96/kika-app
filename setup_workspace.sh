#!/bin/bash

# Exit on error
set -e

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install backend-auth dependencies
echo "Installing backend-auth dependencies..."
pip install -r backend-auth/requirements.txt

# Install backend-core dependencies
echo "Installing backend-core dependencies..."
pip install -r backend-core/requirements.txt

# Install kika in editable mode
if [ -d "/home/MONLEON-JUAN/kika" ]; then
    echo "Installing kika in editable mode..."
    pip install -e /home/MONLEON-JUAN/kika
else
    echo "Warning: /home/MONLEON-JUAN/kika not found. Skipping editable install."
fi

echo "Setup complete. To activate the environment, run: source venv/bin/activate"
