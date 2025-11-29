@echo off
REM KIKA Windows Build Script
REM This script builds the complete KIKA application for Windows distribution
REM Requirements: Python 3.12+, Node.js 20+, Rust, and all dependencies installed

setlocal enabledelayedexpansion

echo ========================================
echo KIKA Windows Build Script
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "frontend\src-tauri\tauri.conf.json" (
    echo ERROR: Please run this script from the kika-app root directory
    exit /b 1
)

REM Create output directories
if not exist "dist\binaries" mkdir dist\binaries

echo [1/5] Activating Python environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo WARNING: No venv found, using system Python
)

echo.
echo [2/5] Building Python backends with PyInstaller...

REM Build backend-auth
echo Building backend-auth...
pyinstaller backend-auth.spec --clean --noconfirm
if errorlevel 1 (
    echo ERROR: Failed to build backend-auth
    exit /b 1
)
copy /Y dist\kika-backend-auth.exe dist\binaries\kika-backend-auth-x86_64-pc-windows-msvc.exe

REM Build backend-core  
echo Building backend-core...
pyinstaller backend-core.spec --clean --noconfirm
if errorlevel 1 (
    echo ERROR: Failed to build backend-core
    exit /b 1
)
copy /Y dist\kika-backend-core.exe dist\binaries\kika-backend-core-x86_64-pc-windows-msvc.exe

echo.
echo [3/5] Copying binaries to Tauri sidecar location...
if not exist "frontend\src-tauri\binaries" mkdir frontend\src-tauri\binaries
copy /Y dist\binaries\kika-backend-auth-x86_64-pc-windows-msvc.exe frontend\src-tauri\binaries\
copy /Y dist\binaries\kika-backend-core-x86_64-pc-windows-msvc.exe frontend\src-tauri\binaries\

echo.
echo [4/5] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install npm dependencies
    cd ..
    exit /b 1
)

echo.
echo [5/5] Building Tauri application...
call npm run tauri build
if errorlevel 1 (
    echo ERROR: Failed to build Tauri application
    cd ..
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Output files:
echo   - MSI Installer: frontend\src-tauri\target\release\bundle\msi\
echo   - NSIS Installer: frontend\src-tauri\target\release\bundle\nsis\
echo   - Standalone EXE: frontend\src-tauri\target\release\kika.exe
echo.
echo Backend binaries:
echo   - dist\binaries\kika-backend-auth-x86_64-pc-windows-msvc.exe
echo   - dist\binaries\kika-backend-core-x86_64-pc-windows-msvc.exe
echo.

endlocal
