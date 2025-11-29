# KIKA App

A desktop application for visualizing and analyzing nuclear data files (ACE and ENDF formats).

## Project Structure

*   **`frontend/`**: Desktop application built with Tauri and React.
*   **`backend-auth/`**: Authentication service (FastAPI) - handles user registration, login, and verification.
*   **`backend-core/`**: Core processing service (FastAPI) - interfaces with the KIKA library for nuclear data parsing and plotting.
*   **`docs/`**: Project documentation including the [Frontend Developer Guide](docs/FRONTEND_DEVELOPER_GUIDE.md).
*   **`setup_workspace.sh`**: Script to set up the development environment.
*   **`start_dev.sh`**: Script to start all services for development.

## Setup

1.  **Prerequisites**: 
    - Python 3.12+
    - Node.js 20 LTS (via nvm recommended)
    - Rust (optional, only needed for Tauri desktop builds)

2.  **Environment Setup**:
    Run the setup script to create a virtual environment and install dependencies (including the editable install of the `kika` library).

    ```bash
    ./setup_workspace.sh
    ```

3.  **Install Frontend Dependencies**:
    ```bash
    cd frontend
    npm install
    cd ..
    ```

## Running the Application

### Quick Start (Recommended)

Use the development script to start all services at once:

```bash
./start_dev.sh
```

This starts:
- Auth backend on `http://localhost:8000`
- Core backend on `http://localhost:8001`
- Frontend on `http://localhost:1420`

Open `http://localhost:1420` in your browser to use the application.

### Manual Start (Separate Terminals)

If you prefer to run services individually:

**Terminal 1 - Authentication Backend:**
```bash
source venv/bin/activate
cd backend-auth
uvicorn app:app --reload --port 8000
```

**Terminal 2 - Core Backend:**
```bash
source venv/bin/activate
cd backend-core
uvicorn app.main:app --reload --port 8001
```

**Terminal 3 - Frontend (Browser Mode):**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Frontend (Tauri Desktop Mode):**
```bash
cd frontend
npm run tauri dev
```

> **Note**: Tauri mode requires a display server. For WSL without display, use browser mode.

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
