"""Material processing service for KIKA backend-core.

This service integrates with the kika library to parse MCNP materials,
perform conversions, and export to various formats.
"""

import sys
import re
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Add kika to path for local development
kika_path = Path(__file__).resolve().parents[4] / 'kika'
if str(kika_path) not in sys.path:
    sys.path.insert(0, str(kika_path))

from kika.input.material import Materials, Mat, Nuclide
from kika.input.parse_materials import read_material


def parse_mcnp_materials(content: str) -> List[Dict[str, Any]]:
    """Parse MCNP input content and extract all materials.
    
    :param content: MCNP input file content as a string
    :returns: List of material dictionaries with all nuclide data
    """
    lines = content.strip().split('\n')
    materials_data = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip().lower()
        
        # Skip comments and empty lines
        if not line or line.startswith('c '):
            i += 1
            continue
        
        # Check for material card (mXXX)
        if re.match(r'^m\d+', line):
            material, new_index = read_material(lines, i)
            if material:
                materials_data.append(_mat_to_dict(material))
            i = new_index
        else:
            i += 1
    
    return materials_data


def _mat_to_dict(mat: Mat) -> Dict[str, Any]:
    """Convert a Mat object to a serializable dictionary.
    
    :param mat: Material object from kika
    :returns: Dictionary representation of the material
    """
    nuclides = []
    for zaid, nuclide in mat.nuclide.items():
        nuclides.append({
            'zaid': nuclide.zaid,
            'fraction': nuclide.fraction,
            'nlib': nuclide.nlib,
            'plib': nuclide.plib,
            'ylib': nuclide.ylib,
        })
    
    return {
        'material_id': mat.id,
        'nlib': mat.nlib,
        'plib': mat.plib,
        'ylib': mat.ylib,
        'nuclides': nuclides,
    }


def _dict_to_mat(data: Dict[str, Any]) -> Mat:
    """Convert a dictionary to a Mat object.
    
    :param data: Dictionary with material data
    :returns: Mat object
    """
    mat = Mat(
        id=data['material_id'],
        nlib=data.get('nlib'),
        plib=data.get('plib'),
        ylib=data.get('ylib'),
    )
    
    for nuc_data in data.get('nuclides', []):
        mat.nuclide[nuc_data['zaid']] = Nuclide(
            zaid=nuc_data['zaid'],
            fraction=nuc_data['fraction'],
            nlib=nuc_data.get('nlib'),
            plib=nuc_data.get('plib'),
            ylib=nuc_data.get('ylib'),
        )
    
    return mat


def convert_to_weight_fractions(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert material from atomic fractions to weight fractions.
    
    :param data: Material dictionary with atomic fractions
    :returns: Material dictionary with weight fractions (negative values)
    """
    mat = _dict_to_mat(data)
    mat.to_weight_fraction()
    return _mat_to_dict(mat)


def convert_to_atomic_fractions(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert material from weight fractions to atomic fractions.
    
    :param data: Material dictionary with weight fractions
    :returns: Material dictionary with atomic fractions (positive values)
    """
    mat = _dict_to_mat(data)
    mat.to_atomic_fraction()
    return _mat_to_dict(mat)


def expand_natural_elements(
    data: Dict[str, Any], 
    zaids_to_expand: Optional[List[int]] = None
) -> Dict[str, Any]:
    """Expand natural elements into their constituent isotopes.
    
    :param data: Material dictionary
    :param zaids_to_expand: Optional list of specific ZAIDs to expand.
                           If None, expands all natural elements.
    :returns: Material dictionary with expanded isotopes
    """
    mat = _dict_to_mat(data)
    mat.convert_natural_elements(zaid_to_expand=zaids_to_expand)
    return _mat_to_dict(mat)


def to_mcnp_format(data: Dict[str, Any]) -> str:
    """Export material to MCNP input format.
    
    :param data: Material dictionary
    :returns: MCNP formatted material card string
    """
    mat = _dict_to_mat(data)
    return str(mat)


def get_material_info(data: Dict[str, Any]) -> Dict[str, Any]:
    """Get detailed information about a material.
    
    :param data: Material dictionary
    :returns: Dictionary with material analysis
    """
    mat = _dict_to_mat(data)
    
    # Determine fraction type
    is_weight = any(nuc.fraction < 0 for nuc in mat.nuclide.values())
    fraction_type = "weight" if is_weight else "atomic"
    
    # Count natural elements
    natural_elements = [
        zaid for zaid in mat.nuclide.keys() 
        if zaid % 1000 == 0 and zaid > 1000
    ]
    
    # Get unique elements
    elements = set()
    for zaid in mat.nuclide.keys():
        z = zaid // 1000
        if z > 0:
            elements.add(z)
    
    return {
        'material_id': mat.id,
        'nuclide_count': len(mat.nuclide),
        'fraction_type': fraction_type,
        'natural_element_count': len(natural_elements),
        'natural_elements': natural_elements,
        'unique_elements': sorted(list(elements)),
        'has_libraries': bool(mat.nlib or mat.plib or mat.ylib),
    }


def add_nuclide_to_material(
    data: Dict[str, Any],
    zaid: int,
    fraction: float,
    library: Optional[str] = None
) -> Dict[str, Any]:
    """Add a nuclide to a material.
    
    :param data: Material dictionary
    :param zaid: ZAID of nuclide to add
    :param fraction: Atomic or weight fraction
    :param library: Optional specific library
    :returns: Updated material dictionary
    """
    mat = _dict_to_mat(data)
    mat.add_nuclide(zaid=zaid, fraction=fraction, library=library)
    return _mat_to_dict(mat)


def remove_nuclide_from_material(
    data: Dict[str, Any],
    zaid: int
) -> Dict[str, Any]:
    """Remove a nuclide from a material.
    
    :param data: Material dictionary
    :param zaid: ZAID of nuclide to remove
    :returns: Updated material dictionary
    :raises KeyError: If ZAID not found in material
    """
    mat = _dict_to_mat(data)
    if zaid not in mat.nuclide:
        raise KeyError(f"ZAID {zaid} not found in material")
    del mat.nuclide[zaid]
    return _mat_to_dict(mat)
