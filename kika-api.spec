# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for KIKA API Service
Builds a standalone Windows executable for nuclear data processing
"""

import sys
from pathlib import Path

block_cipher = None

# Get the absolute path to kika-api directory
kika_api_dir = Path('kika-api').resolve()

# Try to find kika library path (for bundling data files if needed)
kika_datas = []

a = Analysis(
    [str(kika_api_dir / 'run_server.py')],
    pathex=[str(kika_api_dir)],
    binaries=[],
    datas=kika_datas + [
        # Include app package
        (str(kika_api_dir / 'app'), 'app'),
    ],
    hiddenimports=[
        # Uvicorn dependencies
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # FastAPI/Pydantic
        'pydantic',
        'fastapi',
        'starlette',
        'multipart',
        # Scientific computing
        'numpy',
        'numpy.core._methods',
        'numpy.lib.format',
        'scipy',
        'scipy.interpolate',
        'scipy.special',
        # Matplotlib
        'matplotlib',
        'matplotlib.backends.backend_agg',
        'matplotlib.figure',
        'matplotlib.pyplot',
        # KIKA library
        'kika',
        'kika.plotting',
        'kika.plotting.plot_builder',
        'kika.ace',
        'kika.endf',
        # App modules
        'app',
        'app.main',
        'app.models',
        'app.routers',
        'app.routers.ace',
        'app.routers.endf',
        'app.routers.plot',
        'app.services',
        'app.services.ace_service',
        'app.services.endf_service',
        'app.services.plot_service',
        'app.services.detection_service',
        # Other
        'anyio',
        'sniffio',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='kika-api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Keep console for logging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path if available
)
