"""
KIKA FastAPI Server
Simple local server for processing ACE files and generating plots
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import ACEParseRequest, FileTypeDetectionResponse
from .services.detection_service import detect_file_type
from .services.ace_service import clear_ace_cache
from .services.endf_service import clear_endf_cache
from .routers import ace, endf, plot

__version__ = "1.0.1"

# Try to get kika library version
try:
    import kika
    KIKA_LIB_VERSION = getattr(kika, '__version__', 'unknown')
except ImportError:
    KIKA_LIB_VERSION = 'not installed'

app = FastAPI(title="KIKA Processing Server", version=__version__)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",  # Vite dev server
        "http://localhost:5173",  # Alternative Vite port
        "http://127.0.0.1:1420",  # Alternative localhost
        "tauri://localhost",      # Tauri app
        "https://tauri.localhost", # Tauri app (HTTPS)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ace.router)
app.include_router(endf.router)
app.include_router(plot.router)

@app.get("/")
async def root():
    return {
        "name": "KIKA Processing Server",
        "version": __version__,
        "status": "running"
    }

@app.get("/healthz")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": __version__,
        "kika_lib_version": KIKA_LIB_VERSION
    }

@app.post("/api/cache/clear")
async def clear_cache():
    """
    Clear all cached ACE and ENDF objects from memory.
    Useful for debugging and forcing re-parsing of files.
    """
    ace_cleared = clear_ace_cache()
    endf_cleared = clear_endf_cache()
    return {
        "status": "success",
        "ace_items_cleared": ace_cleared,
        "endf_items_cleared": endf_cleared,
        "message": f"Cleared {ace_cleared} ACE and {endf_cleared} ENDF cached items"
    }

@app.post("/api/detect-file-type", response_model=FileTypeDetectionResponse)
async def detect_file_type_endpoint(request: ACEParseRequest):
    """
    Auto-detect file type by attempting to parse
    """
    try:
        file_type, confidence, details = detect_file_type(request.file_content, request.file_name)
        return FileTypeDetectionResponse(
            file_type=file_type,
            confidence=confidence,
            details=details
        )
    except Exception as e:
        return FileTypeDetectionResponse(
            file_type=None,
            confidence=0.0,
            details={"error": str(e)}
        )
