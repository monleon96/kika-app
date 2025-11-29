import tempfile
from pathlib import Path
from typing import Tuple, Optional, Dict, Any
from kika.ace.parsers import read_ace
from kika.endf.read_endf import read_endf

def _is_valid_zaid(zaid) -> bool:
    """
    Check if ZAID is valid (not None, not 0, and reasonable value)
    ZAID format: ZZZAAA (Z = atomic number, A = mass number)
    """
    if zaid is None:
        return False
    
    try:
        zaid_int = int(zaid)
        # ZAID should be positive and reasonable (1000 to 999999)
        if zaid_int <= 0 or zaid_int > 999999:
            return False
        
        # Extract Z (atomic number) and A (mass number)
        z = zaid_int // 1000
        a = zaid_int % 1000
        
        # Basic validation: Z should be 1-118 (known elements)
        if z < 1 or z > 118:
            return False
        
        # A should be reasonable (0-400, including metastable states)
        if a > 400:
            return False
        
        return True
    except (ValueError, TypeError):
        return False

def detect_file_type(file_content: str, file_name: str) -> Tuple[Optional[str], float, Dict[str, Any]]:
    """
    Auto-detect file type by trying to parse it
    
    Strategy:
    1. Try reading as ENDF first
    2. Check if ZAID is valid - if yes, it's ENDF
    3. If not valid, try reading as ACE
    4. Check if ZAID is valid - if yes, it's ACE
    5. If neither works, return None
    
    Returns
    -------
    Tuple[Optional[str], float, Dict[str, Any]]
        (file_type, confidence, details)
        file_type: 'endf', 'ace', or None
        confidence: 0.0 to 1.0
        details: Additional metadata from parsing attempt
    """
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.tmp', delete=False, encoding='utf-8') as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        # Try ENDF first
        try:
            endf_obj = read_endf(tmp_path)
            if endf_obj:
                # Check for valid ZAID
                zaid = getattr(endf_obj, 'zaid', None)
                if _is_valid_zaid(zaid):
                    # Additional validation: should have MAT and MF
                    if hasattr(endf_obj, 'mat') and hasattr(endf_obj, 'mf'):
                        return 'endf', 0.95, {
                            'zaid': str(zaid),
                            'isotope': getattr(endf_obj, 'isotope', 'unknown'),
                            'mat': getattr(endf_obj, 'mat', None),
                        }
        except Exception as endf_error:
            pass
        
        # Try ACE if ENDF failed or had invalid ZAID
        try:
            ace_obj = read_ace(tmp_path, debug=False)
            if ace_obj:
                # Check for valid ZAID
                zaid = getattr(ace_obj, 'zaid', None)
                if _is_valid_zaid(zaid):
                    return 'ace', 0.95, {
                        'zaid': str(zaid),
                        'temperature': float(getattr(getattr(ace_obj, 'header', None), 'temperature', 0.0) or 0.0),
                    }
        except Exception as ace_error:
            pass
        
        # Neither format worked
        return None, 0.0, {'error': 'Could not parse as ENDF or ACE'}
    
    finally:
        if tmp_path:
            path_obj = Path(tmp_path)
            if path_obj.exists():
                path_obj.unlink()
