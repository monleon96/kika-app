# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for KIKA Backend Auth Service
Builds a standalone Windows executable
"""

import sys
from pathlib import Path

block_cipher = None

# Get the absolute path to backend-auth directory
backend_auth_dir = Path('backend-auth').resolve()

a = Analysis(
    [str(backend_auth_dir / 'run_server.py')],
    pathex=[str(backend_auth_dir)],
    binaries=[],
    datas=[
        # Include alembic configuration for database migrations
        (str(backend_auth_dir / 'alembic.ini'), '.'),
        (str(backend_auth_dir / 'alembic'), 'alembic'),
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
        # Database drivers
        'asyncpg',
        'psycopg2',
        'psycopg2.extensions',
        'psycopg2._psycopg',
        # SQLAlchemy
        'sqlalchemy.dialects.postgresql',
        'sqlalchemy.dialects.postgresql.asyncpg',
        'sqlalchemy.dialects.postgresql.psycopg2',
        # FastAPI/Pydantic
        'pydantic',
        'pydantic_settings',
        'email_validator',
        'multipart',
        # Encryption
        'passlib.handlers.bcrypt',
        'bcrypt',
        # Other
        'itsdangerous',
        'dotenv',
        'httpx',
        'anyio',
        'sniffio',
        # App modules
        'routers',
        'routers.auth',
        'routers.health',
        'routers.metrics',
        'routers.users',
        'settings',
        'models',
        'schemas',
        'security',
        'db',
        'emailer',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'PIL',
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
    name='kika-backend-auth',
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
