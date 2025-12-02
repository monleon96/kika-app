"""Materials router for KIKA backend-core.

Provides endpoints for parsing, converting, and exporting MCNP materials.
"""

from fastapi import APIRouter, HTTPException
from typing import List

from ..models import (
    ParseMCNPRequest,
    ParseMCNPResponse,
    MaterialData,
    NuclideData,
    MaterialConvertRequest,
    MaterialConvertResponse,
    ExpandNaturalRequest,
    MaterialExportRequest,
    MaterialExportResponse,
    MaterialInfoResponse,
    AddNuclideRequest,
    RemoveNuclideRequest,
)
from ..services import material_service


router = APIRouter(prefix="/api/materials", tags=["materials"])


def _material_data_to_dict(data: MaterialData) -> dict:
    """Convert Pydantic MaterialData to dictionary for service layer."""
    return {
        'material_id': data.material_id,
        'fraction_type': data.fraction_type,
        'libs': data.libs,
        'nuclides': [
            {
                'zaid': n.zaid,
                'fraction': n.fraction,
                'libs': n.libs,
            }
            for n in data.nuclides
        ]
    }


def _dict_to_material_data(d: dict) -> MaterialData:
    """Convert dictionary to MaterialData Pydantic model."""
    return MaterialData(
        material_id=d['material_id'],
        fraction_type=d.get('fraction_type', 'ao'),
        libs=d.get('libs', {}),
        nuclides=[
            NuclideData(
                zaid=n['zaid'],
                fraction=n['fraction'],
                libs=n.get('libs', {}),
            )
            for n in d.get('nuclides', [])
        ]
    )


@router.post("/parse", response_model=ParseMCNPResponse)
async def parse_mcnp_materials(request: ParseMCNPRequest):
    """Parse MCNP input content and extract all materials.
    
    Parses material cards (mXXX) from MCNP input files, including:
    - Nuclide ZAIDs and fractions
    - Material-level library specifications (nlib, plib, ylib)
    - Nuclide-specific library suffixes
    """
    try:
        materials_data = material_service.parse_mcnp_materials(request.file_content)
        materials = [_dict_to_material_data(m) for m in materials_data]
        return ParseMCNPResponse(materials=materials, count=len(materials))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse materials: {str(e)}")


@router.post("/convert-to-weight", response_model=MaterialConvertResponse)
async def convert_to_weight_fractions(request: MaterialConvertRequest):
    """Convert material from atomic fractions to weight fractions.
    
    Weight fractions are represented as negative values in MCNP convention.
    If already in weight fractions, returns the material unchanged.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        result = material_service.convert_to_weight_fractions(material_dict)
        return MaterialConvertResponse(material=_dict_to_material_data(result))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Conversion failed: {str(e)}")


@router.post("/convert-to-atomic", response_model=MaterialConvertResponse)
async def convert_to_atomic_fractions(request: MaterialConvertRequest):
    """Convert material from weight fractions to atomic fractions.
    
    Atomic fractions are represented as positive values in MCNP convention.
    If already in atomic fractions, returns the material unchanged.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        result = material_service.convert_to_atomic_fractions(material_dict)
        return MaterialConvertResponse(material=_dict_to_material_data(result))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Conversion failed: {str(e)}")


@router.post("/expand-natural", response_model=MaterialConvertResponse)
async def expand_natural_elements(request: ExpandNaturalRequest):
    """Expand natural elements into their constituent isotopes.
    
    Natural elements have ZAIDs ending in '00' (e.g., 6000 for natural carbon).
    This expands them to specific isotopes based on natural abundance data.
    
    If elements_to_expand is provided (e.g., ['Fe', 'C']), only those specific elements are expanded.
    Otherwise, all natural elements in the material are expanded.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        result = material_service.expand_natural_elements(
            material_dict, 
            elements_to_expand=request.elements_to_expand
        )
        return MaterialConvertResponse(material=_dict_to_material_data(result))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Expansion failed: {str(e)}")


@router.post("/to-mcnp", response_model=MaterialExportResponse)
async def export_to_mcnp(request: MaterialExportRequest):
    """Export material to MCNP input format.
    
    Returns the material formatted as an MCNP material card string,
    ready to be copied into an input file.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        mcnp_text = material_service.to_mcnp_format(material_dict)
        return MaterialExportResponse(mcnp_text=mcnp_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")


@router.post("/info", response_model=MaterialInfoResponse)
async def get_material_info(request: MaterialConvertRequest):
    """Get detailed analysis of a material.
    
    Returns information about the material including:
    - Number of nuclides
    - Fraction type (weight or atomic)
    - Natural elements present
    - Unique chemical elements
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        info = material_service.get_material_info(material_dict)
        return MaterialInfoResponse(**info)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")


@router.post("/add-nuclide", response_model=MaterialConvertResponse)
async def add_nuclide(request: AddNuclideRequest):
    """Add a nuclide to a material.
    
    If the nuclide already exists, updates its library information
    while preserving the existing fraction.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        result = material_service.add_nuclide_to_material(
            material_dict,
            zaid=request.zaid,
            fraction=request.fraction,
            library=request.library
        )
        return MaterialConvertResponse(material=_dict_to_material_data(result))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to add nuclide: {str(e)}")


@router.post("/remove-nuclide", response_model=MaterialConvertResponse)
async def remove_nuclide(request: RemoveNuclideRequest):
    """Remove a nuclide from a material.
    
    Raises 404 if the specified ZAID is not found in the material.
    """
    try:
        material_dict = _material_data_to_dict(request.material)
        result = material_service.remove_nuclide_from_material(
            material_dict,
            zaid=request.zaid
        )
        return MaterialConvertResponse(material=_dict_to_material_data(result))
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to remove nuclide: {str(e)}")
