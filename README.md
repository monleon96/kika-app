# KIKA App

A desktop application for visualizing and analyzing nuclear data files (ACE and ENDF formats).

## Project Structure

*   **`frontend/`**: Desktop application built with Tauri and React.
*   **`backend-auth/`**: Authentication service (FastAPI) - handles user registration, login, and verification.
*   **`kika-api/`**: Local API server (FastAPI) - wraps the `kika-nd` library for nuclear data parsing and plotting.
*   **`docs/`**: Project documentation including the [Frontend Developer Guide](docs/FRONTEND_DEVELOPER_GUIDE.md).

## Setup

### Prerequisites
- Python 3.12+
- Node.js 20 LTS
- Rust (required for Tauri desktop builds)

### Windows Setup

```batch
REM Run the setup script
setup_workspace_windows.bat
```

### Linux/WSL Setup

```bash
./setup_workspace.sh
```

## Running the Application

### Windows (Tauri Desktop App - Recommended)

```batch
start_dev_windows.bat
```

This starts:
- Core backend on `http://localhost:8001`
- Tauri Desktop App (opens automatically)
- Auth backend in the cloud (https://kika-backend.onrender.com)

### Linux/WSL (Browser Mode)

```bash
./start_dev.sh
```

This starts:
- Core backend on `http://localhost:8001`
- Frontend on `http://localhost:1420` (browser)
- Auth backend in the cloud

Open `http://localhost:1420` in your browser.

### Linux (Tauri Desktop App)

```bash
./start_app.sh
```

> **Note**: Tauri mode requires a display server. For WSL without display, use `start_dev.sh` for browser mode.

## Building for Distribution

To build KIKA as a standalone Windows/Linux application:

```bash
# Linux/Mac
./build.sh

# Windows (from Command Prompt)
build_windows.bat
```

This creates:
- Windows: NSIS installer (.exe)
- Linux: DEB package and AppImage

See **[Build & Release Guide](docs/BUILD_AND_RELEASE.md)** for detailed instructions.

## System Requirements

### Windows
- Windows 10 or later (64-bit)
- **Corporate Proxy Users**: If behind a corporate proxy, authentication may fail. See [Proxy Configuration](#proxy-configuration-windows) below.

### Linux (AppImage)
- **GLIBC 2.35 or later** required (Ubuntu 22.04+, Fedora 36+, Debian 12+)
- For older distributions (RHEL 8, CentOS 8, Ubuntu 20.04), try running with:
  ```bash
  ./KIKA_*.AppImage --appimage-extract-and-run
  ```
- If that doesn't work, a Docker-based build for older systems is planned for future releases

### Linux (DEB package)
- Debian 12+ or Ubuntu 22.04+

## Proxy Configuration (Windows)

If you're behind a corporate proxy, KIKA may not be able to connect to the authentication server. To fix this:

1. **Copy the template**: Find `scripts/kika_proxy_template.bat` in this repository
2. **Create your launcher**: Copy it to the same folder as `KIKA.exe` and rename it (e.g., `kika_proxy.bat`)
3. **Edit the proxy settings**: Open the `.bat` file and uncomment/edit the appropriate line:
   ```batch
   REM For proxy WITH authentication:
   set "HTTP_PROXY=http://YOUR_USER:YOUR_PASSWORD@proxy.example.com:8080"
   
   REM For proxy WITHOUT authentication:
   set "HTTP_PROXY=http://proxy.example.com:8080"
   ```
4. **Launch KIKA**: Double-click your `.bat` file instead of `KIKA.exe`

## Documentation

- **[Frontend Developer Guide](docs/FRONTEND_DEVELOPER_GUIDE.md)** - Comprehensive guide for new developers
- **[Build & Release Guide](docs/BUILD_AND_RELEASE.md)** - Building and distributing KIKA
- **[Windows Testing Guide](docs/WINDOWS_TESTING.md)** - Testing on Windows from WSL
- **[Plotting System](docs/PLOTTING_SYSTEM.md)** - Hybrid Plotly/Matplotlib architecture
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Technical implementation details
- **[Progress](docs/PROGRESS.md)** - Migration progress and roadmap

## Notes

*   The `kika` library is installed in editable mode from `/home/MONLEON-JUAN/kika`. Changes in that directory will be immediately reflected in `backend-core`.
*   Configuration for the frontend is in `frontend/src/config.ts`.
*   API documentation is available at `http://localhost:8001/docs` when the core backend is running.
