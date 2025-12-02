"""
MCNP Input and MCTAL file parsing service.
"""

import hashlib
import time
import tempfile
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
from fastapi import HTTPException

from kika.input.parse_input import read_mcnp
from kika.mctal.parse_mctal import read_mctal

# Caches for parsed objects
MCNP_INPUT_CACHE: Dict[str, Dict[str, Any]] = {}
MCTAL_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_MAX_ITEMS = 16


def _generate_file_id(file_content: str) -> str:
    """Create a stable hash for file content."""
    return hashlib.sha256(file_content.encode('utf-8')).hexdigest()


# ============================================================================
# MCNP Input File Service
# ============================================================================

def _cache_mcnp_input_object(file_id: str, file_name: str, input_obj, info: Dict[str, Any]):
    """Store MCNP Input object in memory with simple LRU eviction."""
    if len(MCNP_INPUT_CACHE) >= CACHE_MAX_ITEMS:
        oldest_key = min(MCNP_INPUT_CACHE.keys(), key=lambda key: MCNP_INPUT_CACHE[key]['timestamp'])
        MCNP_INPUT_CACHE.pop(oldest_key, None)
    MCNP_INPUT_CACHE[file_id] = {
        "input": input_obj,
        "file_name": file_name,
        "timestamp": time.time(),
        "info": info,
    }


def _get_cached_mcnp_input_entry(file_id: str):
    """Retrieve cached MCNP Input object if available."""
    entry = MCNP_INPUT_CACHE.get(file_id)
    if entry:
        entry["timestamp"] = time.time()
    return entry


def clear_mcnp_input_cache() -> int:
    """Clear all cached MCNP Input objects. Returns the number of items cleared."""
    count = len(MCNP_INPUT_CACHE)
    MCNP_INPUT_CACHE.clear()
    return count


def _parse_mcnp_input_content(file_content: str, file_name: str):
    """Parse MCNP input content string into an Input object."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.i', delete=False, encoding='utf-8') as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        input_obj = read_mcnp(tmp_path)
        return input_obj
    finally:
        if tmp_path:
            path_obj = Path(tmp_path)
            if path_obj.exists():
                path_obj.unlink()


def extract_mcnp_input_metadata(input_obj) -> Dict[str, Any]:
    """Convert MCNP Input object properties into serializable metadata."""
    # Get material info
    materials = input_obj.materials.by_id if hasattr(input_obj, 'materials') else {}
    material_ids = sorted(materials.keys())
    materials_summary = {}
    materials_detail = {}
    
    for mat_id, mat in materials.items():
        nuclide_count = 0
        density = None
        nuclides_list = []
        fraction_type = 'atomic'  # default
        
        if hasattr(mat, 'nuclides'):
            nuclide_count = len(mat.nuclides)
            for nuc in mat.nuclides:
                nuc_data = {
                    "zaid": getattr(nuc, 'zaid', ''),
                    "fraction": getattr(nuc, 'fraction', 0.0),
                }
                # Check for library specifications
                if hasattr(nuc, 'nlib'):
                    nuc_data["nlib"] = nuc.nlib
                if hasattr(nuc, 'plib'):
                    nuc_data["plib"] = nuc.plib
                nuclides_list.append(nuc_data)
                
        if hasattr(mat, 'density'):
            density = mat.density
            
        # Determine fraction type from first nuclide
        if nuclides_list and nuclides_list[0].get('fraction', 0) < 0:
            fraction_type = 'weight'
            
        # Get material name if available (from KIKA extension)
        mat_name = getattr(mat, 'name', None) or f"Material {mat_id}"
            
        materials_summary[mat_id] = {
            "id": mat_id,
            "nuclide_count": nuclide_count,
            "density": density,
        }
        
        materials_detail[mat_id] = {
            "id": mat_id,
            "name": mat_name,
            "nuclide_count": nuclide_count,
            "density": density,
            "fraction_type": fraction_type,
            "nuclides": nuclides_list,
        }
    
    # Get PERT info
    perts = input_obj.perturbation.pert if hasattr(input_obj, 'perturbation') and hasattr(input_obj.perturbation, 'pert') else {}
    pert_ids = sorted(perts.keys())
    
    return {
        "material_count": len(material_ids),
        "material_ids": material_ids,
        "pert_count": len(pert_ids),
        "pert_ids": pert_ids,
        "materials_summary": materials_summary,
        "materials_detail": materials_detail,
    }


def load_mcnp_input_object(
    file_id: Optional[str] = None,
    file_content: Optional[str] = None,
    file_name: str = "input.i"
) -> Tuple[str, Any, Dict[str, Any]]:
    """
    Load or retrieve a cached MCNP Input object.
    
    Returns (file_id, input_obj, info_dict)
    """
    # Try to get from cache first
    if file_id:
        entry = _get_cached_mcnp_input_entry(file_id)
        if entry:
            return file_id, entry["input"], entry["info"]
    
    # Need to parse
    if not file_content:
        raise HTTPException(status_code=400, detail="Must provide file_content or valid file_id")
    
    # Generate ID from content
    generated_id = _generate_file_id(file_content)
    
    # Check cache with generated ID
    entry = _get_cached_mcnp_input_entry(generated_id)
    if entry:
        return generated_id, entry["input"], entry["info"]
    
    # Parse the file
    try:
        input_obj = _parse_mcnp_input_content(file_content, file_name)
        info = extract_mcnp_input_metadata(input_obj)
        _cache_mcnp_input_object(generated_id, file_name, input_obj, info)
        return generated_id, input_obj, info
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing MCNP input file: {str(e)}")


# ============================================================================
# MCTAL File Service
# ============================================================================

def _cache_mctal_object(file_id: str, file_name: str, mctal_obj, info: Dict[str, Any]):
    """Store MCTAL object in memory with simple LRU eviction."""
    if len(MCTAL_CACHE) >= CACHE_MAX_ITEMS:
        oldest_key = min(MCTAL_CACHE.keys(), key=lambda key: MCTAL_CACHE[key]['timestamp'])
        MCTAL_CACHE.pop(oldest_key, None)
    MCTAL_CACHE[file_id] = {
        "mctal": mctal_obj,
        "file_name": file_name,
        "timestamp": time.time(),
        "info": info,
    }


def _get_cached_mctal_entry(file_id: str):
    """Retrieve cached MCTAL object if available."""
    entry = MCTAL_CACHE.get(file_id)
    if entry:
        entry["timestamp"] = time.time()
    return entry


def clear_mctal_cache() -> int:
    """Clear all cached MCTAL objects. Returns the number of items cleared."""
    count = len(MCTAL_CACHE)
    MCTAL_CACHE.clear()
    return count


def _parse_mctal_content(file_content: str, file_name: str):
    """Parse MCTAL content string into an Mctal object."""
    tmp_path = None
    try:
        # Normalize line endings (Windows CRLF -> Unix LF)
        normalized_content = file_content.replace('\r\n', '\n').replace('\r', '\n')
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.m', delete=False, encoding='utf-8', newline='\n') as tmp:
            tmp.write(normalized_content)
            tmp_path = tmp.name
        mctal_obj = read_mctal(tmp_path)
        return mctal_obj
    finally:
        if tmp_path:
            path_obj = Path(tmp_path)
            if path_obj.exists():
                path_obj.unlink()


def extract_mctal_metadata(mctal_obj) -> Dict[str, Any]:
    """Convert MCTAL object properties into serializable metadata."""
    # Basic header info
    code_name = getattr(mctal_obj, 'code_name', 'unknown')
    version = getattr(mctal_obj, 'ver', '')
    problem_id = getattr(mctal_obj, 'problem_id', '')
    nps = getattr(mctal_obj, 'nps', 0)
    npert = getattr(mctal_obj, 'npert', 0)
    
    # Tally info
    tally_numbers = getattr(mctal_obj, 'tally_numbers', [])
    tallies = getattr(mctal_obj, 'tallies', {})
    
    tallies_summary = {}
    for tally_num in tally_numbers:
        tally = tallies.get(tally_num)
        if tally:
            summary = {
                "id": tally_num,
                "name": getattr(tally, 'name', ''),
                "n_cells_surfaces": getattr(tally, 'n_cells_surfaces', 0),
                "n_energy_bins": getattr(tally, 'n_energy_bins', 0),
                "has_perturbations": bool(getattr(tally, 'perturbations', [])),
            }
            # Get total result/error if available
            if hasattr(tally, 'total_result'):
                summary["result"] = tally.total_result
            if hasattr(tally, 'total_error'):
                summary["error"] = tally.total_error
            tallies_summary[tally_num] = summary
    
    return {
        "code_name": code_name,
        "version": version,
        "problem_id": problem_id,
        "nps": nps,
        "tally_count": len(tally_numbers),
        "tally_numbers": tally_numbers,
        "npert": npert,
        "tallies_summary": tallies_summary,
    }


def load_mctal_object(
    file_id: Optional[str] = None,
    file_content: Optional[str] = None,
    file_name: str = "output.m"
) -> Tuple[str, Any, Dict[str, Any]]:
    """
    Load or retrieve a cached MCTAL object.
    
    Returns (file_id, mctal_obj, info_dict)
    """
    # Try to get from cache first
    if file_id:
        entry = _get_cached_mctal_entry(file_id)
        if entry:
            return file_id, entry["mctal"], entry["info"]
    
    # Need to parse
    if not file_content:
        raise HTTPException(status_code=400, detail="Must provide file_content or valid file_id")
    
    # Generate ID from content
    generated_id = _generate_file_id(file_content)
    
    # Check cache with generated ID
    entry = _get_cached_mctal_entry(generated_id)
    if entry:
        return generated_id, entry["mctal"], entry["info"]
    
    # Parse the file
    try:
        mctal_obj = _parse_mctal_content(file_content, file_name)
        info = extract_mctal_metadata(mctal_obj)
        _cache_mctal_object(generated_id, file_name, mctal_obj, info)
        return generated_id, mctal_obj, info
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing MCTAL file: {str(e)}")
