"""
KIKA FastAPI Server
Simple local server for processing ACE files and generating plots
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import ACEParseRequest, FileTypeDetectionResponse
from .services.detection_service import detect_file_type
from .routers import ace, endf, plot

app = FastAPI(title="KIKA Processing Server", version="1.0.0")

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1420",  # Vite dev server
        "http://localhost:5173",  # Alternative Vite port
        "tauri://localhost",      # Tauri app
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
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/healthz")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

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
