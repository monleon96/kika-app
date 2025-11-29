#!/usr/bin/env python
"""
Standalone entry point for running backend-auth as a PyInstaller executable.
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

import uvicorn
from app import app

def main():
    """Run the auth server."""
    port = int(os.environ.get("KIKA_AUTH_PORT", "8000"))
    host = os.environ.get("KIKA_AUTH_HOST", "127.0.0.1")
    
    print(f"Starting KIKA Auth Backend on http://{host}:{port}")
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
