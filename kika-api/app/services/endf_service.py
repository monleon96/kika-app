import hashlib
import time
import tempfile
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
from fastapi import HTTPException

from kika.endf.read_endf import read_endf

ENDF_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_MAX_ITEMS = 16

def _generate_file_id(file_content: str) -> str:
    """Create a stable hash for the ACE file content."""
    return hashlib.sha256(file_content.encode('utf-8')).hexdigest()

def _cache_endf_object(file_id: str, file_name: str, endf_obj, info: Dict[str, Any]):
    """Store ENDF object in memory with simple LRU eviction."""
    if len(ENDF_CACHE) >= CACHE_MAX_ITEMS:
        oldest_key = min(ENDF_CACHE.keys(), key=lambda key: ENDF_CACHE[key]['timestamp'])
        ENDF_CACHE.pop(oldest_key, None)
    ENDF_CACHE[file_id] = {
        "endf": endf_obj,
        "file_name": file_name,
        "timestamp": time.time(),
        "info": info,
    }

def _get_cached_endf_entry(file_id: str):
    """Retrieve cached ENDF object if available."""
    entry = ENDF_CACHE.get(file_id)
    if entry:
        entry["timestamp"] = time.time()
    return entry

def clear_endf_cache() -> int:
    """Clear all cached ENDF objects. Returns the number of items cleared."""
    count = len(ENDF_CACHE)
    ENDF_CACHE.clear()
    return count

def _parse_endf_content(file_content: str, file_name: str):
    """Parse ENDF content string into an ENDF object."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.endf', delete=False, encoding='utf-8') as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        endf_obj = read_endf(tmp_path)
        return endf_obj
    finally:
        if tmp_path:
            path_obj = Path(tmp_path)
            if path_obj.exists():
                path_obj.unlink()

def extract_endf_metadata(endf_obj) -> Dict[str, Any]:
    """Convert ENDF object metadata into serializable information."""
    has_mf4 = 4 in getattr(endf_obj, 'mf', {})
    has_mf34 = 34 in getattr(endf_obj, 'mf', {})
    angular_mts: List[int] = []
    uncertainty_mts: List[int] = []
    order_map: Dict[str, int] = {}
    orders_mf4_map: Dict[str, List[int]] = {}
    orders_mf34_map: Dict[str, List[int]] = {}

    if has_mf4:
        mf4 = endf_obj.mf[4]
        angular_mts = sorted(int(mt) for mt in mf4.mt.keys())
        for mt, section in mf4.mt.items():
            max_order = 0
            coeffs = getattr(section, 'legendre_coefficients', None)
            if coeffs:
                lengths = [len(row) for row in coeffs if row]
                if lengths:
                    max_order = max(lengths) - 1  # Subtract 1 because length includes L=0
            if max_order == 0 and hasattr(section, 'num_legendre_coefficients'):
                try:
                    max_order = int(getattr(section, 'num_legendre_coefficients') or 0) - 1
                except Exception:
                    max_order = 0
            order_map[str(int(mt))] = int(max_order)
            # Available orders list for MF4: include L=0 always, then 1..max
            try:
                available = list(range(max(0, int(max_order)) + 1))
            except Exception:
                available = [0]
            orders_mf4_map[str(int(mt))] = available
    if has_mf34:
        mf34 = endf_obj.mf[34]
        uncertainty_mts = sorted(int(mt) for mt in mf34.mt.keys())
        # Extract max order for MF34 (uncertainty data)
        # Determine available orders using MF34 covariance matrices for the specific isotope/MT
        try:
            # Convert MF34 to a combined covariance matrix object
            mf34_obj = mf34
            ang_covmat = mf34_obj.to_ang_covmat() if hasattr(mf34_obj, 'to_ang_covmat') else None
        except Exception:
            ang_covmat = None

        for mt, section in mf34.mt.items():
            mt_key = str(int(mt))
            max_order = 0
            # Default: try to infer max order from section metadata when available
            if hasattr(section, 'legendre_coefficients'):
                coeffs = getattr(section, 'legendre_coefficients', None)
                if coeffs:
                    lengths = [len(row) for row in coeffs if row]
                    if lengths:
                        max_order = max(lengths) - 1
            elif hasattr(section, 'num_legendre_coefficients'):
                try:
                    max_order = int(getattr(section, 'num_legendre_coefficients') or 0) - 1
                except Exception:
                    max_order = 0

            # If covariance object available, compute precise set of L values for this isotope+MT
            available_ls: List[int] = []
            try:
                zaid = getattr(endf_obj, 'zaid', None)
                zaid_int = int(zaid) if zaid is not None else None
                if ang_covmat is not None and zaid_int is not None:
                    filtered = ang_covmat.filter_by_isotope_reaction(zaid_int, int(mt))
                    # legendre_indices property returns a sorted set of available L values
                    available_ls = list(getattr(filtered, 'legendre_indices', []) or [])
            except Exception:
                # Fall back to contiguous range if filtering fails
                available_ls = []

            if available_ls:
                # Ensure L=0 is present (uncertainty of a0 may or may not be in MF34; include if present)
                orders_mf34_map[mt_key] = sorted(set(available_ls))
                max_order = max(max_order, max(available_ls))
            else:
                # Fallback to contiguous range if we couldn't get indices
                orders_mf34_map[mt_key] = list(range(max(0, int(max_order)) + 1))

            # Populate order_map if not already set (keep MF4-derived max if available)
            if mt_key not in order_map:
                order_map[mt_key] = int(max_order)

    zaid = getattr(endf_obj, 'zaid', None)
    return {
        "zaid": str(zaid) if zaid is not None else None,
        "isotope": getattr(endf_obj, 'isotope', None),
        "mat": getattr(endf_obj, 'mat', None),
        "has_mf4": has_mf4,
        "has_mf34": has_mf34,
        "angular_mts": angular_mts,
        "uncertainty_mts": uncertainty_mts,
        "max_legendre_order_by_mt": order_map,
        "available_orders_mf4_by_mt": orders_mf4_map,
        "available_orders_mf34_by_mt": orders_mf34_map,
    }

def load_endf_object(
    file_id: Optional[str],
    file_content: Optional[str],
    file_name: str,
) -> Tuple[str, Any, Dict[str, Any]]:
    """Load ENDF object either from cache or by parsing new content."""
    if file_id:
        cached = _get_cached_endf_entry(file_id)
        if cached:
            return file_id, cached["endf"], cached.get("info", {})
        if not file_content:
            raise HTTPException(status_code=404, detail="ENDF file not found in cache. Please provide file_content.")
    if not file_content:
        raise HTTPException(status_code=400, detail="Either file_id or file_content must be provided.")

    derived_id = _generate_file_id(file_content)
    cached = _get_cached_endf_entry(derived_id)
    if cached:
        return derived_id, cached["endf"], cached.get("info", {})

    endf_obj = _parse_endf_content(file_content, file_name)
    info = extract_endf_metadata(endf_obj)
    _cache_endf_object(derived_id, file_name, endf_obj, info)
    return derived_id, endf_obj, info

def update_endf_cache_filename(file_id: str, file_name: str):
    entry = ENDF_CACHE.get(file_id)
    if entry:
        entry["file_name"] = file_name
