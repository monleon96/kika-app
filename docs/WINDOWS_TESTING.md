# Testing KIKA on Windows

Since you're developing in WSL but want to test on Windows, here's how to do it.

## Option 1: Build on Windows Directly (Recommended for Testing)

The easiest approach is to clone/copy the project to your Windows filesystem and build there.

### Step 1: Copy Project to Windows

From WSL:
```bash
# Copy to Windows (adjust the path to your Windows user folder)
cp -r /home/MONLEON-JUAN/kika-app /mnt/c/Users/YOUR_WINDOWS_USER/kika-app
```

Or clone directly on Windows:
```batch
cd C:\Users\YOUR_WINDOWS_USER
git clone https://github.com/monleon96/kika-app.git
```

### Step 2: Install Prerequisites on Windows

1. **Python 3.12+**: Download from [python.org](https://www.python.org/downloads/)
   - ✅ Check "Add Python to PATH" during install

2. **Node.js 20 LTS**: Download from [nodejs.org](https://nodejs.org/)

3. **Rust**: Download from [rustup.rs](https://rustup.rs/)

4. **Visual Studio Build Tools**: 
   - Download from [Visual Studio Downloads](https://visualstudio.microsoft.com/downloads/)
   - Install "Desktop development with C++"

### Step 3: Set Up Environment on Windows

Open PowerShell as Administrator:

```powershell
cd C:\Users\YOUR_WINDOWS_USER\kika-app

# Create Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r backend-auth\requirements.txt
pip install -r backend-core\requirements.txt

# Install kika library (if you have it locally, otherwise skip)
# pip install -e C:\path\to\kika

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 4: Build

```batch
.\build_windows.bat
```

### Step 5: Test the App

The installers will be in:
- `frontend\src-tauri\target\release\bundle\nsis\KIKA_0.1.0_x64-setup.exe`
- `frontend\src-tauri\target\release\bundle\msi\KIKA_0.1.0_x64_en-US.msi`

---

## Option 2: Cross-Compile from WSL (Advanced)

Cross-compiling for Windows from Linux requires additional setup.

### Install Windows Target

```bash
rustup target add x86_64-pc-windows-msvc
```

### Install Cross-Compilation Tools

```bash
# This requires Wine and mingw-w64
sudo apt install wine64 mingw-w64
```

**Note**: Cross-compiling PyInstaller executables from Linux to Windows is complex and not recommended. It's much easier to build natively on Windows.

---

## Option 3: Quick Test (Dev Mode without Building)

If you just want to test the app quickly without building:

### On Windows:

1. Install Python and Node.js (see above)

2. Start backends manually:
```powershell
# Terminal 1: Auth backend
cd C:\Users\YOUR_WINDOWS_USER\kika-app\backend-auth
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000

# Terminal 2: Core backend  
cd C:\Users\YOUR_WINDOWS_USER\kika-app\backend-core
..\backend-auth\venv\Scripts\Activate.ps1  # Reuse venv
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8001

# Terminal 3: Frontend
cd C:\Users\YOUR_WINDOWS_USER\kika-app\frontend
npm install
npm run dev
```

3. Open `http://localhost:1420` in browser

---

## Testing the Auto-Update System

To test updates:

1. Build version 0.1.0 and install it
2. Increment version to 0.2.0 in `tauri.conf.json`
3. Build version 0.2.0
4. Create a GitHub release with `latest.json`
5. Run the installed 0.1.0 version - it should detect the update

### Local Update Testing

You can test the update mechanism locally by:

1. Serving `latest.json` from a local server
2. Temporarily changing the update endpoint in `tauri.conf.json`:
   ```json
   "endpoints": ["http://localhost:3000/latest.json"]
   ```

3. Run a simple server:
   ```bash
   python -m http.server 3000
   ```

---

## Troubleshooting Windows Build

### "Python not found"
- Reinstall Python with "Add to PATH" checked
- Or manually add to PATH: `C:\Users\YOU\AppData\Local\Programs\Python\Python312`

### "npm not found"
- Restart your terminal after installing Node.js

### "cargo build failed"
- Install Visual Studio Build Tools
- Run: `rustup update`

### "WebView2 not found"
- Windows 10/11 usually has it pre-installed
- Download from: https://developer.microsoft.com/microsoft-edge/webview2/
