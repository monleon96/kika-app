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
    libs: Dict[str, str] = {}  # e.g. {'n': '80c', 'p': '04p'}


class MaterialData(BaseModel):
    """Schema for material data"""
    material_id: int
    fraction_type: str = 'ao'  # 'ao' (atomic) or 'wo' (weight)
    libs: Dict[str, str] = {}  # Material-level library defaults
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
    elements_to_expand: Optional[List[str]] = None  # Element symbols like ['Fe', 'C']


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


# ============================================================================
# MCNP Input File Models
# ============================================================================

class MCNPInputParseRequest(BaseModel):
    """Request to parse MCNP input file content"""
    file_content: str
    file_name: str = "input.i"


class MaterialSummary(BaseModel):
    """Brief summary of a material"""
    id: int
    nuclide_count: int
    density: Optional[float] = None


class MaterialNuclideDetail(BaseModel):
    """Nuclide detail for material export"""
    zaid: str
    fraction: float
    nlib: Optional[str] = None
    plib: Optional[str] = None


class MaterialDetail(BaseModel):
    """Detailed material information for import functionality"""
    id: int
    name: str
    nuclide_count: int
    density: Optional[float] = None
    fraction_type: str = "atomic"  # 'atomic' or 'weight'
    nuclides: List[MaterialNuclideDetail] = []


class MCNPInputInfoResponse(BaseModel):
    """Response with MCNP input file information"""
    file_id: str
    material_count: int
    material_ids: List[int]
    pert_count: int
    pert_ids: List[int]
    materials_summary: Dict[int, MaterialSummary]
    materials_detail: Optional[Dict[int, MaterialDetail]] = None


# ============================================================================
# MCTAL File Models
# ============================================================================

class MCTALParseRequest(BaseModel):
    """Request to parse MCTAL file content"""
    file_content: str
    file_name: str = "output.m"


class TallySummary(BaseModel):
    """Brief summary of a tally"""
    id: int
    name: Optional[str] = ""
    n_cells_surfaces: int
    n_energy_bins: int
    has_perturbations: bool
    result: Optional[float] = None
    error: Optional[float] = None


class MCTALInfoResponse(BaseModel):
    """Response with MCTAL file information"""
    file_id: str
    code_name: str
    version: str
    problem_id: str
    nps: int
    tally_count: int
    tally_numbers: List[int]
    npert: int
    tallies_summary: Dict[int, TallySummary]


# ============================================================================
# Sampling Configuration Models
# ============================================================================

class FileEntryRequest(BaseModel):
    """File entry for ACE/ENDF files with covariance pair"""
    id: str
    data_file_path: str
    cov_file_path: str = ""
    zaid: Optional[int] = None


class AdvancedOptionsRequest(BaseModel):
    """Advanced options for covariance matrix fixing"""
    autofix: str = "none"  # 'none', 'soft', 'medium', 'hard'
    high_val_thresh: float = 1.0
    accept_tol: float = -1.0e-4
    remove_blocks: Optional[Dict[int, List[List[int]]]] = None


class SamplingConfigRequest(BaseModel):
    """Base sampling configuration request"""
    type: str  # 'ace', 'endf', 'ace-from-endf'
    num_samples: int = 100
    mt_list: List[int] = []
    sampling_method: str = "sobol"  # 'sobol', 'lhs', 'random'
    decomposition_method: str = "svd"  # 'svd', 'cholesky', 'eigen', 'pca'
    space: str = "log"  # 'log', 'linear'
    seed: Optional[int] = 42
    nprocs: int = 4
    dry_run: bool = False
    verbose: bool = True
    output_dir: str = "."
    
    # ACE perturbation specific
    ace_files: Optional[List[FileEntryRequest]] = None
    xsdir_file: Optional[str] = None
    advanced_options: AdvancedOptionsRequest = AdvancedOptionsRequest()
    
    # ENDF perturbation specific
    endf_files: Optional[List[FileEntryRequest]] = None
    legendre_coeffs: Optional[List[int]] = None
    generate_ace: bool = False
    njoy_exe: Optional[str] = None
    temperatures: Optional[List[float]] = None
    library_name: Optional[str] = None
    njoy_version: str = "NJOY 2016.78"
    
    # ACE from ENDF specific
    root_dir: Optional[str] = None
    zaids: Optional[List[int]] = None
    cov_files: Optional[List[str]] = None


class ACEPerturbationConfigRequest(SamplingConfigRequest):
    """ACE perturbation configuration request"""
    type: str = "ace"
    ace_files: List[FileEntryRequest]
    xsdir_file: str = ""


class ENDFPerturbationConfigRequest(SamplingConfigRequest):
    """ENDF perturbation configuration request"""
    type: str = "endf"
    endf_files: List[FileEntryRequest]
    legendre_coeffs: List[int] = [1, 2, 3]
    generate_ace: bool = False
    njoy_exe: str = ""
    temperatures: List[float] = [300.0]
    library_name: str = "endfb81"
    njoy_version: str = "NJOY 2016.78"
    xsdir_file: str = ""


class ACEFromENDFConfigRequest(SamplingConfigRequest):
    """ACE from ENDF perturbation configuration request"""
    type: str = "ace-from-endf"
    root_dir: str
    temperatures: List[float]
    zaids: List[int]
    cov_files: List[str]


class ValidationResult(BaseModel):
    """Validation result"""
    valid: bool
    errors: List[str] = []
    warnings: List[str] = []


class GeneratedScriptResponse(BaseModel):
    """Response containing generated Python script"""
    script: str
    filename: str
    estimated_runtime: Optional[str] = None


class LogEntryResponse(BaseModel):
    """Log entry for dry run streaming"""
    timestamp: str
    level: str  # 'info', 'warning', 'error', 'debug'
    message: str
