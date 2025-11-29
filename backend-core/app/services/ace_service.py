import hashlib
import time
import tempfile
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
from fastapi import HTTPException

from kika.ace.parsers import read_ace
from kika._utils import MeV_to_kelvin

ACE_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_MAX_ITEMS = 16

def _generate_file_id(file_content: str) -> str:
    """Create a stable hash for the ACE file content."""
    return hashlib.sha256(file_content.encode('utf-8')).hexdigest()

def _cache_ace_object(file_id: str, file_name: str, ace_obj, info: Dict[str, Any]):
    """Store ACE object in memory with simple LRU eviction."""
    if len(ACE_CACHE) >= CACHE_MAX_ITEMS:
        oldest_key = min(ACE_CACHE.keys(), key=lambda key: ACE_CACHE[key]['timestamp'])
        ACE_CACHE.pop(oldest_key, None)
    ACE_CACHE[file_id] = {
        "ace": ace_obj,
        "file_name": file_name,
        "timestamp": time.time(),
        "info": info,
    }

def _get_cached_ace_entry(file_id: str):
    """Retrieve cached ACE object if available."""
    entry = ACE_CACHE.get(file_id)
    if entry:
        entry["timestamp"] = time.time()
    return entry

def _parse_ace_content(file_content: str, file_name: str):
    """Parse ACE content string into an ACE object."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.ace', delete=False, encoding='utf-8') as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        ace_obj = read_ace(tmp_path, debug=True)
        return ace_obj
    finally:
        if tmp_path:
            path_obj = Path(tmp_path)
            if path_obj.exists():
                path_obj.unlink()

def extract_ace_metadata(ace_obj) -> Dict[str, Any]:
    """Convert ACE object properties into serializable metadata."""
    available_raw = getattr(ace_obj, 'mt_numbers', None)
    if available_raw is None:
        available_reactions = []
    else:
        available_reactions = sorted({int(mt) for mt in available_raw})

    angular_reactions: List[int] = []
    has_angular = False
    angular_data = getattr(ace_obj, 'angular_distributions', None)
    if angular_data:
        if hasattr(angular_data, 'get_neutron_reaction_mt_numbers'):
            angular_reactions = angular_data.get_neutron_reaction_mt_numbers() or []
        if getattr(angular_data, 'has_elastic_data', False) and 2 not in angular_reactions:
            angular_reactions = [2] + angular_reactions
        angular_reactions = sorted(set(angular_reactions))
        has_angular = len(angular_reactions) > 0
    temp_kelvin = 0.0
    if getattr(ace_obj, 'header', None) and getattr(ace_obj.header, 'temperature', None):
        temp_mev = float(ace_obj.header.temperature)
        temp_kelvin = MeV_to_kelvin(temp_mev)

    energies = getattr(ace_obj, 'energies', None)
    energy_grid_size = len(energies) if energies is not None else 0

    return {
        "zaid": str(getattr(ace_obj, 'zaid', 'unknown')),
        "atomic_weight_ratio": float(getattr(getattr(ace_obj, 'header', None), 'atomic_weight_ratio', 0.0) or 0.0),
        "temperature": temp_kelvin,
        "available_reactions": available_reactions,
        "angular_reactions": angular_reactions,
        "has_angular_distributions": has_angular,
        "energy_grid_size": energy_grid_size,
    }

def load_ace_object(
    file_id: Optional[str],
    file_content: Optional[str],
    file_name: str,
) -> Tuple[str, Any, Dict[str, Any]]:
    """Load ACE object either from cache or by parsing new content."""
    if file_id:
        cached = _get_cached_ace_entry(file_id)
        if cached:
            return file_id, cached["ace"], cached.get("info", {})
        # If file_id provided but not cached, fall back to file_content if available.
        if not file_content:
            raise HTTPException(status_code=404, detail="ACE file not found in cache. Please provide file_content.")
    if not file_content:
        raise HTTPException(status_code=400, detail="Either file_id or file_content must be provided.")

    derived_id = _generate_file_id(file_content)
    cached = _get_cached_ace_entry(derived_id)
    if cached:
        return derived_id, cached["ace"], cached.get("info", {})

    ace_obj = _parse_ace_content(file_content, file_name)
    info = extract_ace_metadata(ace_obj)
    _cache_ace_object(derived_id, file_name, ace_obj, info)
    return derived_id, ace_obj, info

def update_ace_cache_filename(file_id: str, file_name: str):
    entry = ACE_CACHE.get(file_id)
    if entry:
        entry["file_name"] = file_name
