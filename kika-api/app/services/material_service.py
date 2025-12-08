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

from kika.mcnp.material import MaterialCollection, Material, Nuclide
from kika.mcnp.parse_materials import read_material


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


def _mat_to_dict(mat: Material) -> Dict[str, Any]:
    """Convert a Material object to a serializable dictionary.
    
    :param mat: Material object from kika
    :returns: Dictionary representation of the material
    """
    nuclides = []
    for symbol, nuclide in mat.nuclide.items():
        nuclides.append({
            'zaid': nuclide.zaid,
            'symbol': symbol,
            'fraction': nuclide.fraction,
            'libs': dict(nuclide.libs) if nuclide.libs else {},
        })
    
    return {
        'material_id': mat.id,
        'name': mat.name,
        'fraction_type': mat.fraction_type,  # 'ao' or 'wo'
        'libs': dict(mat.libs) if mat.libs else {},
        'density': mat.density,
        'density_unit': mat.density_unit,
        'temperature': mat.temperature,
        'nuclides': nuclides,
    }


def _dict_to_mat(data: Dict[str, Any]) -> Material:
    """Convert a dictionary to a Material object.
    
    :param data: Dictionary with material data
    :returns: Material object
    """
    # Build nuclides dict keyed by symbol
    nuclides_dict = {}
    for nuc_data in data.get('nuclides', []):
        zaid = nuc_data['zaid']
        # Use symbol if available, otherwise generate from zaid
        symbol = nuc_data.get('symbol')
        if not symbol:
            from kika._utils import zaid_to_symbol
            symbol = zaid_to_symbol(zaid)
        
        nuclides_dict[symbol] = Nuclide(
            zaid=zaid,
            fraction=abs(nuc_data['fraction']),  # Store as positive
            libs=dict(nuc_data.get('libs', {})),
        )
    
    mat = Material(
        id=data['material_id'],
        nuclide=nuclides_dict,
        libs=dict(data.get('libs', {})),
        name=data.get('name'),
        fraction_type=data.get('fraction_type', 'ao'),
        density=data.get('density'),
        density_unit=data.get('density_unit'),
        temperature=data.get('temperature'),
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
    elements_to_expand: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Expand natural elements into their constituent isotopes.
    
    :param data: Material dictionary
    :param elements_to_expand: Optional list of element symbols to expand (e.g., ['Fe', 'C']).
                              If None, expands all natural elements.
    :returns: Material dictionary with expanded isotopes
    """
    mat = _dict_to_mat(data)
    mat.expand_natural_elements(elements=elements_to_expand)
    return _mat_to_dict(mat)


def to_mcnp_format(data: Dict[str, Any]) -> str:
    """Export material to MCNP input format.
    
    :param data: Material dictionary
    :returns: MCNP formatted material card string
    """
    mat = _dict_to_mat(data)
    return mat.to_mcnp()


def get_material_info(data: Dict[str, Any]) -> Dict[str, Any]:
    """Get detailed information about a material.
    
    :param data: Material dictionary
    :returns: Dictionary with material analysis
    """
    mat = _dict_to_mat(data)
    
    # Determine fraction type from material property
    fraction_type = "weight" if mat.is_weight else "atomic"
    
    # Count natural elements
    natural_elements = [
        nuclide.zaid for nuclide in mat.nuclide.values() 
        if nuclide.is_natural
    ]
    
    # Get unique elements
    elements = set()
    for nuclide in mat.nuclide.values():
        z = nuclide.zaid // 1000
        if z > 0:
            elements.add(z)
    
    return {
        'material_id': mat.id,
        'name': mat.name,
        'nuclide_count': len(mat.nuclide),
        'fraction_type': fraction_type,
        'natural_element_count': len(natural_elements),
        'natural_elements': natural_elements,
        'unique_elements': sorted(list(elements)),
        'has_libraries': bool(mat.libs),
        'density': mat.density,
        'density_unit': mat.density_unit,
        'temperature': mat.temperature,
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
    :param library: Optional specific library suffix (e.g., '80c')
    :returns: Updated material dictionary
    """
    mat = _dict_to_mat(data)
    # Use the material's current fraction type
    mat.add_nuclide(nuclide=zaid, fraction=fraction, fraction_type=mat.fraction_type, library=library)
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
    # Convert ZAID to symbol for lookup
    from kika._utils import zaid_to_symbol
    symbol = zaid_to_symbol(zaid)
    if symbol not in mat.nuclide:
        raise KeyError(f"ZAID {zaid} (symbol {symbol}) not found in material")
    del mat.nuclide[symbol]
    return _mat_to_dict(mat)
