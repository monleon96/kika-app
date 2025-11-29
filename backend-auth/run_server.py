#!/usr/bin/env python
"""
Standalone entry point for running backend-auth as a PyInstaller executable.
"""
import sys
import os
from pathlib import Path
import asyncio

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

# Set default environment variables for desktop app
if "DATABASE_URL" not in os.environ:
    if sys.platform == "win32":
        app_data = Path(os.environ.get("APPDATA", os.path.expanduser("~"))) / "kika"
    else:
        app_data = Path(os.path.expanduser("~/.local/share/kika"))
    
    app_data.mkdir(parents=True, exist_ok=True)
    db_path = app_data / "kika.db"
    
    # Use absolute path for SQLite
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    print(f"Using local database: {os.environ['DATABASE_URL']}")

if "JWT_SECRET" not in os.environ:
    os.environ["JWT_SECRET"] = "local-dev-secret-do-not-use-in-prod-cloud"

if "ADMIN_API_KEY" not in os.environ:
    os.environ["ADMIN_API_KEY"] = "local-admin-key"

import uvicorn
from app import app
from db import engine
from models import Base

def setup_logging():
    if sys.platform == "win32":
        app_data = Path(os.environ.get("APPDATA", os.path.expanduser("~"))) / "kika"
    else:
        app_data = Path(os.path.expanduser("~/.local/share/kika"))
    
    app_data.mkdir(parents=True, exist_ok=True)
    log_file = app_data / "backend-auth.log"
    
    # Redirect stdout/stderr to log file
    sys.stdout = open(log_file, "a", buffering=1)
    sys.stderr = open(log_file, "a", buffering=1)
    print(f"Logging to {log_file}")

async def init_db():
    print("Initializing database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized.")

def main():
    """Run the auth server."""
    # Setup logging if frozen
    if getattr(sys, 'frozen', False):
        try:
            setup_logging()
        except Exception as e:
            pass

    # Run DB init
    try:
        asyncio.run(init_db())
    except Exception as e:
        print(f"Failed to initialize database: {e}")

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
