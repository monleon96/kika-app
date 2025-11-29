# KIKA Build & Release Guide

This document explains how to build KIKA for distribution and set up automatic updates.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building for Windows](#building-for-windows)
3. [Building for Linux](#building-for-linux)
4. [Setting Up Auto-Updates](#setting-up-auto-updates)
5. [Creating a Release](#creating-a-release)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### All Platforms

- **Python 3.12+** with pip
- **Node.js 20 LTS**
- **Rust** (latest stable)
- **PyInstaller**: `pip install pyinstaller`

### Windows Specific

- **Visual Studio Build Tools** (for Rust compilation)
- **WebView2** runtime (usually pre-installed on Windows 10/11)

### Linux Specific

```bash
# Ubuntu/Debian
sudo apt-get install -y \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
```

---

## Building for Windows

### Quick Build (Recommended)

1. Open Command Prompt as Administrator
2. Navigate to the `kika-app` directory
3. Run:

```batch
build_windows.bat
```

### Manual Build

```batch
REM 1. Activate Python environment
call venv\Scripts\activate

REM 2. Build Python backends
pyinstaller backend-auth.spec --clean --noconfirm
pyinstaller backend-core.spec --clean --noconfirm

REM 3. Copy backends to Tauri sidecar location
mkdir frontend\src-tauri\binaries
copy dist\kika-backend-auth.exe frontend\src-tauri\binaries\kika-backend-auth-x86_64-pc-windows-msvc.exe
copy dist\kika-backend-core.exe frontend\src-tauri\binaries\kika-backend-core-x86_64-pc-windows-msvc.exe

REM 4. Build Tauri application
cd frontend
npm install
npm run tauri build
```

### Output Files

After building, you'll find:

| File | Location |
|------|----------|
| MSI Installer | `frontend/src-tauri/target/release/bundle/msi/KIKA_x.x.x_x64_en-US.msi` |
| NSIS Installer | `frontend/src-tauri/target/release/bundle/nsis/KIKA_x.x.x_x64-setup.exe` |
| Standalone EXE | `frontend/src-tauri/target/release/kika.exe` |

---

## Building for Linux

### Quick Build

```bash
chmod +x build.sh
./build.sh
```

### Output Files

| File | Location |
|------|----------|
| DEB Package | `frontend/src-tauri/target/release/bundle/deb/kika_x.x.x_amd64.deb` |
| AppImage | `frontend/src-tauri/target/release/bundle/appimage/kika_x.x.x_amd64.AppImage` |

---

## Setting Up Auto-Updates

KIKA uses Tauri's built-in updater which checks GitHub Releases for new versions.

### 1. Generate Signing Keys

```bash
chmod +x scripts/generate_signing_keys.sh
./scripts/generate_signing_keys.sh
```

This creates:
- `tauri-signing-key` (private key - **KEEP SECRET**)
- `tauri-signing-key.pub` (public key)

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `TAURI_PRIVATE_KEY`: Contents of `tauri-signing-key` file
- `TAURI_KEY_PASSWORD`: Password if you set one (optional)

### 3. Update Public Key in tauri.conf.json

Edit `frontend/src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/monleon96/kika-app/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 4. How Updates Work

1. On startup, KIKA checks the `latest.json` file in GitHub Releases
2. If a newer version exists, user sees an update notification
3. User clicks "Install & Restart"
4. The app downloads the update, verifies the signature, and restarts

---

## Creating a Release

### Step-by-Step Release Process

**1. Make sure all changes are on develop and tested:**
```bash
git checkout develop
git pull origin develop
```

**2. Update the version number** in `frontend/src-tauri/tauri.conf.json`:
```json
{
  "package": {
    "version": "0.2.0"  // Change this
  }
}
```

**3. Also update** `frontend/package.json`:
```json
{
  "version": "0.2.0"  // Match the version
}
```

**4. Commit the version bump:**
```bash
git add -A
git commit -m "chore: bump version to 0.2.0"
git push origin develop
```

**5. Merge to main:**
```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

**6. Create and push a tag (THIS triggers the automated build):**
```bash
git tag v0.2.0
git push origin v0.2.0
```

**7. Watch the build:**
- Go to: `https://github.com/monleon96/kika-app/actions`
- Click on the running workflow to see progress
- Build takes ~10-15 minutes

**8. Publish the release:**
- Go to: `https://github.com/monleon96/kika-app/releases`
- Find the draft release created by the workflow
- Edit it, add release notes describing what's new
- Click "Publish release"

**9. Go back to develop for future work:**
```bash
git checkout develop
```

### What Happens Automatically

When you push a tag like `v0.2.0`:
1. GitHub Actions starts building on Windows and Linux
2. PyInstaller bundles the Python backends into `.exe` files
3. Tauri builds the complete app with the backends included
4. Everything gets signed with your private key
5. A draft release is created with all the installers
6. `latest.json` is generated for auto-updates

### Manual Release (if GitHub Actions fails)

1. Build for your platform (see above)

2. Create `latest.json`:
   ```json
   {
     "version": "0.2.0",
     "notes": "What's new in this release",
     "pub_date": "2024-01-15T12:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "SIGNATURE_FROM_BUILD",
         "url": "https://github.com/monleon96/kika-app/releases/download/v0.2.0/KIKA_0.2.0_x64-setup.nsis.zip"
       },
       "linux-x86_64": {
         "signature": "SIGNATURE_FROM_BUILD",
         "url": "https://github.com/monleon96/kika-app/releases/download/v0.2.0/kika_0.2.0_amd64.AppImage.tar.gz"
       }
     }
   }
   ```

3. Upload to GitHub Releases:
   - The installer files
   - `latest.json`

---

## Architecture

### How the Bundled App Works

```
KIKA.exe (Tauri)
    │
    ├── Launches kika-backend-auth.exe (sidecar)
    │       └── Auth API on localhost:8000
    │
    ├── Launches kika-backend-core.exe (sidecar)
    │       └── Core API on localhost:8001
    │
    └── WebView shows React frontend
            └── Connects to localhost:8000 and :8001
```

The Tauri app automatically:
- Starts both Python backends on app launch
- Stops them when the app closes
- Shows connection status in the UI

### File Structure

```
KIKA/
├── KIKA.exe                    # Main Tauri executable
├── kika-backend-auth.exe       # Auth backend (PyInstaller bundle)
├── kika-backend-core.exe       # Core backend (PyInstaller bundle)
└── resources/                  # Static assets
```

---

## Troubleshooting

### PyInstaller Build Fails

**"ModuleNotFoundError"**
- Add the missing module to `hiddenimports` in the `.spec` file

**"Failed to execute script"**
- Run with console enabled to see errors
- Check that all data files are included in `datas`

### Tauri Build Fails

**"sidecar not found"**
- Ensure binaries are in `frontend/src-tauri/binaries/`
- Check naming: `name-{target_triple}.exe`
  - Windows: `kika-backend-auth-x86_64-pc-windows-msvc.exe`
  - Linux: `kika-backend-auth-x86_64-unknown-linux-gnu`

**"cargo build failed"**
- Run `rustup update`
- Check Cargo.toml for syntax errors

### Backend Won't Start

1. Run the backend manually to see errors:
   ```bash
   ./dist/kika-backend-core.exe
   ```

2. Check if ports 8000/8001 are already in use:
   ```bash
   netstat -ano | findstr :8000
   ```

3. Ensure the `kika` library is properly bundled (for core backend)

### Update Not Working

1. Verify `latest.json` is accessible:
   ```bash
   curl https://github.com/monleon96/kika-app/releases/latest/download/latest.json
   ```

2. Check that the version in `latest.json` is higher than current

3. Verify the signature matches the public key in `tauri.conf.json`

---

## Version Checklist

Before releasing a new version:

- [ ] Update version in `frontend/src-tauri/tauri.conf.json`
- [ ] Update version in `frontend/package.json`
- [ ] Test the build locally
- [ ] Test the update mechanism with a test release
- [ ] Write release notes
- [ ] Create and push git tag
- [ ] Verify GitHub Actions completes successfully
- [ ] Test the published installer
