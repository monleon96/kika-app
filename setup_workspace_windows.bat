@echo off
REM ========================================
REM KIKA Desktop - Windows Workspace Setup
REM Sets up Python virtual environment and dependencies
REM ========================================

echo ========================================
echo KIKA Desktop - Workspace Setup (Windows)
echo ========================================
echo.

REM Set the project root directory
set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.12+
    pause
    exit /b 1
)
echo [OK] Python found

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 20 LTS
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Check Rust (optional but recommended for Tauri)
where rustc >nul 2>&1
if errorlevel 1 (
    echo [WARN] Rust not found. Install with: winget install Rustlang.Rustup
    echo        Rust is required for Tauri desktop builds.
) else (
    echo [OK] Rust found
)

echo.
echo Step 1: Creating Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

echo.
echo Step 2: Activating virtual environment and installing dependencies...
call venv\Scripts\activate.bat

echo    - Upgrading pip...
python -m pip install --upgrade pip --quiet

echo    - Installing backend-auth dependencies...
pip install -r backend-auth\requirements.txt --quiet

echo    - Installing kika-api dependencies...
pip install -r kika-api\requirements.txt --quiet

echo [OK] Python dependencies installed

echo.
echo Step 3: Installing frontend dependencies...
cd frontend
call npm install
cd ..
echo [OK] Frontend dependencies installed

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start development:
echo   1. Run: start_dev_windows.bat
echo.
echo This will start:
echo   - Core Backend on http://localhost:8001
echo   - Tauri Desktop App (opens automatically)
echo.
echo Auth Backend runs in the cloud at:
echo   https://kika-backend.onrender.com
echo.
pause
