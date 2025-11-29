#!/bin/bash
# KIKA Build Script
# Builds the complete KIKA application for the current platform
# Requirements: Python 3.12+, Node.js 20+, Rust, and all dependencies installed

set -e

echo "========================================"
echo "KIKA Build Script"
echo "========================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    TARGET_TRIPLE="x86_64-unknown-linux-gnu"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    TARGET_TRIPLE="x86_64-apple-darwin"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="windows"
    TARGET_TRIPLE="x86_64-pc-windows-msvc"
else
    echo "ERROR: Unsupported operating system: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS"
echo "Target triple: $TARGET_TRIPLE"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/src-tauri/tauri.conf.json" ]; then
    echo "ERROR: Please run this script from the kika-app root directory"
    exit 1
fi

# Create output directories
mkdir -p dist/binaries
mkdir -p frontend/src-tauri/binaries

echo "[1/5] Activating Python environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "WARNING: No venv found, using system Python"
fi

echo ""
echo "[2/5] Building Python backends with PyInstaller..."

# Build backend-auth
echo "Building backend-auth..."
pyinstaller backend-auth.spec --clean --noconfirm

# Build backend-core
echo "Building backend-core..."
pyinstaller backend-core.spec --clean --noconfirm

echo ""
echo "[3/5] Copying binaries to Tauri sidecar location..."

# Copy with platform-specific naming for Tauri sidecars
if [ "$OS" == "windows" ]; then
    EXT=".exe"
else
    EXT=""
fi

cp -f "dist/kika-backend-auth${EXT}" "dist/binaries/kika-backend-auth-${TARGET_TRIPLE}${EXT}"
cp -f "dist/kika-backend-core${EXT}" "dist/binaries/kika-backend-core-${TARGET_TRIPLE}${EXT}"

cp -f "dist/binaries/kika-backend-auth-${TARGET_TRIPLE}${EXT}" "frontend/src-tauri/binaries/"
cp -f "dist/binaries/kika-backend-core-${TARGET_TRIPLE}${EXT}" "frontend/src-tauri/binaries/"

echo ""
echo "[4/5] Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "[5/5] Building Tauri application..."
npm run tauri build
cd ..

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Output files:"

if [ "$OS" == "linux" ]; then
    echo "  - DEB: frontend/src-tauri/target/release/bundle/deb/"
    echo "  - AppImage: frontend/src-tauri/target/release/bundle/appimage/"
elif [ "$OS" == "macos" ]; then
    echo "  - DMG: frontend/src-tauri/target/release/bundle/dmg/"
    echo "  - App: frontend/src-tauri/target/release/bundle/macos/"
elif [ "$OS" == "windows" ]; then
    echo "  - MSI Installer: frontend/src-tauri/target/release/bundle/msi/"
    echo "  - NSIS Installer: frontend/src-tauri/target/release/bundle/nsis/"
fi

echo "  - Standalone: frontend/src-tauri/target/release/kika${EXT}"
echo ""
echo "Backend binaries:"
echo "  - dist/binaries/kika-backend-auth-${TARGET_TRIPLE}${EXT}"
echo "  - dist/binaries/kika-backend-core-${TARGET_TRIPLE}${EXT}"
echo ""
