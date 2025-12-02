"""
MCNP Input and MCTAL file parsing API router.
"""

from fastapi import APIRouter, HTTPException

from ..models import (
    MCNPInputParseRequest, MCNPInputInfoResponse,
    MCTALParseRequest, MCTALInfoResponse,
)
from ..services.mcnp_service import (
    load_mcnp_input_object,
    load_mctal_object,
    clear_mcnp_input_cache,
    clear_mctal_cache,
)

router = APIRouter(prefix="/api/mcnp", tags=["mcnp"])


# ============================================================================
# MCNP Input File Endpoints
# ============================================================================

@router.post("/input/parse", response_model=MCNPInputInfoResponse)
async def parse_mcnp_input_file(request: MCNPInputParseRequest):
    """
    Parse MCNP input file and return basic information about materials and PERT cards.
    """
    try:
        file_id, input_obj, info = load_mcnp_input_object(
            file_id=None,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        return MCNPInputInfoResponse(file_id=file_id, **info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing MCNP input file: {str(e)}")


# ============================================================================
# MCTAL File Endpoints
# ============================================================================

@router.post("/mctal/parse", response_model=MCTALInfoResponse)
async def parse_mctal_file(request: MCTALParseRequest):
    """
    Parse MCTAL file and return information about tallies and perturbations.
    """
    try:
        file_id, mctal_obj, info = load_mctal_object(
            file_id=None,
            file_content=request.file_content,
            file_name=request.file_name,
        )
        return MCTALInfoResponse(file_id=file_id, **info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing MCTAL file: {str(e)}")


# ============================================================================
# Cache Management
# ============================================================================

@router.post("/cache/clear")
async def clear_mcnp_caches():
    """
    Clear all cached MCNP input and MCTAL objects.
    """
    input_cleared = clear_mcnp_input_cache()
    mctal_cleared = clear_mctal_cache()
    return {
        "status": "success",
        "mcnp_input_items_cleared": input_cleared,
        "mctal_items_cleared": mctal_cleared,
        "message": f"Cleared {input_cleared} MCNP input and {mctal_cleared} MCTAL cached items",
    }
