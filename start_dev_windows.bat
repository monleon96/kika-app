@echo off
REM ========================================
REM KIKA Desktop - Windows Development Script
REM Starts the Tauri app in development mode
REM ========================================

echo ========================================
echo KIKA Desktop - Development Mode (Windows)
echo ========================================
echo.

REM Set the project root directory
set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

REM Add Cargo to PATH if not already there
set PATH=%USERPROFILE%\.cargo\bin;%PATH%

REM Check if venv exists
if not exist "venv" (
    echo ERROR: Virtual environment not found.
    echo Run: setup_workspace_windows.bat
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

echo [1/2] Starting KIKA API on http://localhost:8001
start "KIKA API" cmd /k "cd /d "%PROJECT_ROOT%kika-api" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

echo [2/2] Starting Tauri Desktop App...
echo.
echo ========================================
echo Services:
echo   Core API:     http://localhost:8001/docs
echo   Auth API:     https://kika-backend.onrender.com (CLOUD)
echo   Tauri App:    Opens automatically
echo.
echo Close this window or press Ctrl+C to stop.
echo ========================================
echo.

cd /d "%PROJECT_ROOT%frontend"
npm run tauri dev
