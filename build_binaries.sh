#!/bin/bash
set -e

# Activate venv
source venv/bin/activate

echo "Building Backend Core..."
pyinstaller backend-core.spec --clean

echo "Building Backend Auth..."
pyinstaller backend-auth.spec --clean

echo "Build complete. Executables are in dist/"
