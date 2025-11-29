@echo off
REM ============================================================
REM  KIKA – Proxy launcher template (Windows, no admin needed)
REM 
REM  How to use this file:
REM    1. Copy this file and rename it, e.g. kika_proxy.bat
REM    2. Edit the PROXY SETTINGS section with your own details.
REM    3. Double–click your .bat to start KIKA with proxy enabled.
REM 
REM  IMPORTANT:
REM    - Do NOT commit your real username/password to the repository.
REM    - Keep the version in git with placeholders only.
REM ============================================================

REM === Path to the KIKA executable (relative to this .bat) ===
set "KIKA_EXE=KIKA.exe"

REM ============================================================
REM  PROXY SETTINGS (edit this section for your environment)
REM ============================================================

REM Example 1: Proxy WITH username/password
REM   Replace YOUR_USER, YOUR_PASSWORD, proxy.example.com, 8080
REM   Remove "REM " at the beginning of the line to activate it.
REM set "HTTP_PROXY=http://YOUR_USER:YOUR_PASSWORD@proxy.example.com:8080"

REM Example 2: Proxy WITHOUT authentication
REM   Remove "REM " at the beginning of the line to activate it.
REM set "HTTP_PROXY=http://proxy.example.com:8080"

REM If you enabled one of the lines above, HTTPS_PROXY will reuse it:
set "HTTPS_PROXY=%HTTP_PROXY%"

REM Some libraries look at lowercase variants:
set "http_proxy=%HTTP_PROXY%"
set "https_proxy=%HTTP_PROXY%"

REM ============================================================
REM  NO_PROXY: hosts that should bypass the proxy (optional)
REM  Add internal hosts or services that must be accessed directly.
REM ============================================================
set "NO_PROXY=localhost,127.0.0.1"
set "no_proxy=%NO_PROXY%"

REM ============================================================
REM  Launch KIKA
REM ============================================================
REM Change to the folder where this .bat lives, so KIKA_EXE is found
cd /d "%~dp0"

REM Start the app; remove "start" if you prefer the console to stay attached
start "" "%KIKA_EXE%"
