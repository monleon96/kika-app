from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class ACEParseRequest(BaseModel):
    """Request to parse ACE file content"""
    file_content: str
    file_name: str

class FileTypeDetectionResponse(BaseModel):
    """Response for file type auto-detection"""
    file_type: Optional[str]  # 'ace', 'endf', or None if unknown
    confidence: float  # 0.0 to 1.0
    details: Optional[Dict[str, Any]] = None

class PlotRequest(BaseModel):
    """Request to generate plot from ACE data"""
    file_content: Optional[str] = None
    file_name: str
    plot_type: str  # 'xs' or 'angular'
    mt_number: Optional[int] = None  # Reaction MT number
    energy: Optional[float] = None  # Energy for angular distributions (MeV)
    energy_min: Optional[float] = None
    energy_max: Optional[float] = None
    file_id: Optional[str] = None

class ACEInfoResponse(BaseModel):
    """Response with ACE file information"""
    file_id: str
    zaid: str
    atomic_weight_ratio: float
    temperature: float
    available_reactions: List[int]
    angular_reactions: List[int]
    has_angular_distributions: bool
    energy_grid_size: int

class PlotResponse(BaseModel):
    """Response with base64 encoded plot image"""
    image_base64: str
    format: str = "png"

class SeriesRequest(BaseModel):
    """Request to retrieve raw data arrays for a single series"""
    file_id: Optional[str] = None
    file_content: Optional[str] = None
    file_name: str
    plot_type: str  # 'xs' or 'angular'
    mt_number: int
    energy: Optional[float] = None

class SeriesResponse(BaseModel):
    """Response containing raw data for client-side plotting"""
    series_id: str
    label: str
    x: List[float]
    y: List[float]
    x_unit: str
    y_unit: str
    metadata: Dict[str, Any]
    suggested: Dict[str, Any]

class MatplotlibExportRequest(BaseModel):
    """Request to export plot using Matplotlib with full customization"""
    series: List[Dict[str, Any]]  # List of series configurations
    figure_settings: Dict[str, Any]  # Figure size, labels, scales, etc.
    style: str = "publication"  # 'default', 'publication', 'presentation', 'dark'
    export_format: str = "png"  # 'png', 'pdf', 'svg'
    dpi: int = 300

class MatplotlibExportResponse(BaseModel):
    """Response with high-quality Matplotlib export"""
    image_base64: str
    format: str
    width_px: int
    height_px: int
    dpi: int

class ENDFParseRequest(BaseModel):
    """Request to parse ENDF file content"""
    file_content: str
    file_name: str

class ENDFInfoResponse(BaseModel):
    """Response with ENDF file information"""
    file_id: str
    zaid: Optional[str] = None
    isotope: Optional[str] = None
    mat: Optional[int] = None
    has_mf4: bool = False
    has_mf34: bool = False
    angular_mts: List[int] = []
    uncertainty_mts: List[int] = []
    max_legendre_order_by_mt: Dict[str, int] = {}
    available_orders_mf4_by_mt: Dict[str, List[int]] = {}
    available_orders_mf34_by_mt: Dict[str, List[int]] = {}

class ENDFSeriesRequest(BaseModel):
    """Request for ENDF plotting data"""
    file_id: Optional[str] = None
    file_content: Optional[str] = None


# ============================================================================
# Materials Models
# ============================================================================

class NuclideData(BaseModel):
    """Schema for a single nuclide in a material"""
    zaid: int
    fraction: float
    nlib: Optional[str] = None
    plib: Optional[str] = None
    ylib: Optional[str] = None


class MaterialData(BaseModel):
    """Schema for material data"""
    material_id: int
    nlib: Optional[str] = None
    plib: Optional[str] = None
    ylib: Optional[str] = None
    nuclides: List[NuclideData] = []


class ParseMCNPRequest(BaseModel):
    """Request to parse MCNP materials from input content"""
    file_content: str
    file_name: Optional[str] = "input.txt"


class ParseMCNPResponse(BaseModel):
    """Response with parsed materials"""
    materials: List[MaterialData]
    count: int


class MaterialConvertRequest(BaseModel):
    """Request to convert material fractions"""
    material: MaterialData


class MaterialConvertResponse(BaseModel):
    """Response with converted material"""
    material: MaterialData


class ExpandNaturalRequest(BaseModel):
    """Request to expand natural elements in a material"""
    material: MaterialData
    zaids_to_expand: Optional[List[int]] = None


class MaterialExportRequest(BaseModel):
    """Request to export material to MCNP format"""
    material: MaterialData


class MaterialExportResponse(BaseModel):
    """Response with MCNP formatted string"""
    mcnp_text: str


class MaterialInfoResponse(BaseModel):
    """Response with material analysis"""
    material_id: int
    nuclide_count: int
    fraction_type: str  # 'weight' or 'atomic'
    natural_element_count: int
    natural_elements: List[int]
    unique_elements: List[int]
    has_libraries: bool


class AddNuclideRequest(BaseModel):
    """Request to add a nuclide to a material"""
    material: MaterialData
    zaid: int
    fraction: float
    library: Optional[str] = None


class RemoveNuclideRequest(BaseModel):
    """Request to remove a nuclide from a material"""
    material: MaterialData
    zaid: int
    file_name: str
    data_type: str  # 'angular' or 'uncertainty'
    mt_number: int
    order: int = 1
    include_uncertainty: bool = False
    sigma: float = 1.0

class ENDFUncertaintyPayload(BaseModel):
    """Uncertainty envelope for ENDF angular data"""
    lower: List[float]
    upper: List[float]
    sigma: float
    label: Optional[str] = None
    kind: str = "absolute"

class ENDFSeriesResponse(BaseModel):
    """Response containing ENDF plotting data"""
    series_id: str
    label: str
    x: List[float]
    y: List[float]
    x_unit: str
    y_unit: str
    plot_style: str = "line"
    line_shape: Optional[str] = None
    metadata: Dict[str, Any]
    suggested: Dict[str, Any]
    uncertainty: Optional[ENDFUncertaintyPayload] = None

class ENDFSeriesExportConfig(BaseModel):
    """Series configuration for ENDF Matplotlib export"""
    file_id: Optional[str] = None
    file_content: Optional[str] = None
    file_name: str
    data_type: str  # 'angular' or 'uncertainty'
    mt_number: int
    order: int
    include_uncertainty: bool = False
    sigma: float = 1.0
    color: Optional[str] = None
    lineWidth: Optional[float] = None
    lineStyle: Optional[str] = None
    showMarkers: bool = False
    markerSymbol: Optional[str] = None
    markerSize: Optional[float] = None
    labelMode: Optional[str] = None
    customLabel: Optional[str] = None

class ENDFMatplotlibExportRequest(BaseModel):
    """Matplotlib export request for ENDF data"""
    series: List[ENDFSeriesExportConfig]
    figure_settings: Dict[str, Any]
    style: str = "publication"
    export_format: str = "png"
    dpi: int = 300
