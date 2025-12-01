#!/usr/bin/env python
"""
Standalone entry point for running backend-core as a PyInstaller executable.
"""
import sys
import os

# When running as a PyInstaller bundle, add the bundle directory to path
if getattr(sys, 'frozen', False):
    # Running as compiled
    bundle_dir = sys._MEIPASS
    os.chdir(os.path.dirname(sys.executable))
else:
    # Running as script
    bundle_dir = os.path.dirname(os.path.abspath(__file__))

# Add the bundle directory to the Python path
sys.path.insert(0, bundle_dir)

# Set matplotlib backend before any imports
import matplotlib
matplotlib.use('Agg')

import uvicorn
from app.main import app
from pathlib import Path

def setup_logging():
    if sys.platform == "win32":
        app_data = Path(os.environ.get("APPDATA", os.path.expanduser("~"))) / "kika"
    else:
        app_data = Path(os.path.expanduser("~/.local/share/kika"))
    
    app_data.mkdir(parents=True, exist_ok=True)
    log_file = app_data / "backend-core.log"
    
    # Redirect stdout/stderr to log file
    sys.stdout = open(log_file, "a", buffering=1)
    sys.stderr = open(log_file, "a", buffering=1)
    print(f"Logging to {log_file}")

def main():
    """Run the core processing server."""
    # Setup logging if frozen
    if getattr(sys, 'frozen', False):
        try:
            setup_logging()
        except Exception as e:
            pass # Fallback to console if logging setup fails

    port = int(os.environ.get("KIKA_CORE_PORT", "8001"))
    host = os.environ.get("KIKA_CORE_HOST", "127.0.0.1")
    
    print(f"Starting KIKA Core Backend on http://{host}:{port}")
    print("Press Ctrl+C to stop")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True,
    )

if __name__ == "__main__":
    main()
