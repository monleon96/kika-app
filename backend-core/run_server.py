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

def main():
    """Run the core processing server."""
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
