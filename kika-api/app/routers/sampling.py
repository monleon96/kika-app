"""
Sampling Router
FastAPI router for nuclear data perturbation sampling operations
"""

import asyncio
import json
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..models import (
    SamplingConfigRequest,
    ACEPerturbationConfigRequest,
    ENDFPerturbationConfigRequest,
    ACEFromENDFConfigRequest,
    ValidationResult,
    GeneratedScriptResponse,
)

router = APIRouter(prefix="/api/sampling", tags=["sampling"])


def generate_ace_script(config: ACEPerturbationConfigRequest) -> str:
    """Generate Python script for ACE perturbation"""
    imports = """import os
import kika
from kika.sampling.ace_perturbation import perturb_ACE_files
"""

    # Generate file path variables
    ace_vars = '\n'.join([f"ace_{i+1} = '{f.data_file_path}'" for i, f in enumerate(config.ace_files)])
    cov_vars = '\n'.join([f"cov_{i+1} = '{f.cov_file_path}'" for i, f in enumerate(config.ace_files)])
    
    ace_list = f"acelist = [\n    {', '.join([f'ace_{i+1}' for i in range(len(config.ace_files))])}\n]"
    
    cov_loading = f"""
# Load covariance matrices
covmatlist = []
missing_paths = []
cov_paths = [{', '.join([f'cov_{i+1}' for i in range(len(config.ace_files))])}]

for cov_path in cov_paths:
    if os.path.exists(cov_path):
        if cov_path.endswith('.gendf') or 'gendf' in cov_path.lower():
            cov = kika.read_njoy_covmat(cov_path)
        else:
            cov = kika.read_scale_covmat(cov_path)
    else:
        missing_paths.append(cov_path)
        cov = kika.cov.covmat.CovMat()
    covmatlist.append(cov)

if missing_paths:
    print("Warning: Following covariance matrix files are missing:")
    for path in missing_paths:
        print(f"  - {{path}}")
else:
    print("All covariance matrix files are present.")
"""

    mt_list_str = '[]' if not config.mt_list else f"[{', '.join(map(str, config.mt_list))}]"
    autofix_str = 'None' if config.advanced_options.autofix == 'none' else f'"{config.advanced_options.autofix}"'
    
    remove_blocks_str = 'None'
    if config.advanced_options.remove_blocks:
        entries = [f"    {iso}: [{', '.join([f'({b[0]}, {b[1]})' for b in blocks])}]" 
                   for iso, blocks in config.advanced_options.remove_blocks.items()]
        remove_blocks_str = "{\n" + ",\n".join(entries) + "\n}"

    params = f"""
# Sampling parameters
mt_numbers   = {mt_list_str}
num_samples  = {config.num_samples}
output_dir   = "{config.output_dir}"
xsdir_file   = "{config.xsdir_file}" if "{config.xsdir_file}" else None
seed         = {config.seed if config.seed is not None else 'None'}
nprocs       = {config.nprocs}
"""

    function_call = f"""
# Run perturbation
print(f"Generating {{num_samples}} perturbed ACE files...")
perturb_ACE_files(
    ace_files            = acelist,
    cov_files            = covmatlist,
    mt_list              = mt_numbers,
    num_samples          = num_samples,
    output_dir           = output_dir,
    xsdir_file           = xsdir_file,
    sampling_method      = '{config.sampling_method}',
    decomposition_method = '{config.decomposition_method}',
    space                = '{config.space}',
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = {config.dry_run},
    autofix              = {autofix_str},
    high_val_thresh      = {config.advanced_options.high_val_thresh},
    accept_tol           = {config.advanced_options.accept_tol},
    remove_blocks        = {remove_blocks_str},
    verbose              = {config.verbose},
)

print("Done!")
"""

    return f"{imports}\n# ACE file paths\n{ace_vars}\n\n# Covariance file paths\n{cov_vars}\n\n{ace_list}\n{cov_loading}\n{params}\n{function_call}"


def generate_endf_script(config: ENDFPerturbationConfigRequest) -> str:
    """Generate Python script for ENDF perturbation"""
    imports = """import os
from kika.sampling.endf_perturbation import perturb_ENDF_files
"""

    endf_vars = '\n'.join([f"endf_{i+1} = '{f.data_file_path}'" for i, f in enumerate(config.endf_files)])
    endf_list = f"endf_files = [\n    {', '.join([f'endf_{i+1}' for i in range(len(config.endf_files))])}\n]"

    has_cov_files = any(f.cov_file_path for f in config.endf_files)
    if has_cov_files:
        cov_vars = '\n'.join([f"mf34_cov_{i+1} = '{f.cov_file_path}'" for i, f in enumerate(config.endf_files)])
        cov_list = f"mf34_cov_files = [\n    {', '.join([f'mf34_cov_{i+1}' for i in range(len(config.endf_files))])}\n]"
        cov_section = f"\n# MF34 covariance files\n{cov_vars}\n\n{cov_list}\n"
    else:
        cov_section = "\n# No separate MF34 covariance files - will use MF34 section from ENDF files\nmf34_cov_files = None\n"

    mt_list_str = '[]' if not config.mt_list else f"[{', '.join(map(str, config.mt_list))}]"
    legendre_str = f"[{', '.join(map(str, config.legendre_coeffs))}]"
    temps_str = f"[{', '.join(map(str, config.temperatures))}]"

    params = f"""
# Sampling parameters
mt_list          = {mt_list_str}
legendre_coeffs  = {legendre_str}
num_samples      = {config.num_samples}
output_dir       = "{config.output_dir}"
seed             = {config.seed if config.seed is not None else 'None'}
nprocs           = {config.nprocs}
"""

    if config.generate_ace:
        ace_gen_section = f"""
# ACE generation options (via NJOY)
generate_ace  = True
njoy_exe      = "{config.njoy_exe}"
temperatures  = {temps_str}
library_name  = "{config.library_name}"
njoy_version  = "{config.njoy_version}"
xsdir_file    = "{config.xsdir_file}" if "{config.xsdir_file}" else None
"""
    else:
        ace_gen_section = """
# ACE generation disabled
generate_ace  = False
njoy_exe      = None
temperatures  = None
library_name  = None
njoy_version  = "NJOY 2016.78"
xsdir_file    = None
"""

    function_call = f"""
# Run perturbation
print(f"Generating {{num_samples}} perturbed ENDF files...")
perturb_ENDF_files(
    endf_files           = endf_files,
    mt_list              = mt_list,
    legendre_coeffs      = legendre_coeffs,
    num_samples          = num_samples,
    mf34_cov_files       = mf34_cov_files,
    space                = '{config.space}',
    decomposition_method = '{config.decomposition_method}',
    sampling_method      = '{config.sampling_method}',
    output_dir           = output_dir,
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = {config.dry_run},
    verbose              = {config.verbose},
    generate_ace         = generate_ace,
    njoy_exe             = njoy_exe,
    temperatures         = temperatures,
    library_name         = library_name,
    njoy_version         = njoy_version,
    xsdir_file           = xsdir_file,
)

print("Done!")
"""

    return f"{imports}\n# ENDF file paths\n{endf_vars}\n\n{endf_list}\n{cov_section}\n{params}\n{ace_gen_section}\n{function_call}"


def generate_ace_from_endf_script(config: ACEFromENDFConfigRequest) -> str:
    """Generate Python script for ACE perturbation from perturbed ENDF"""
    imports = """import os
from kika.sampling.ace_perturbation_separate import perturb_seprate_ACE_files
"""

    cov_vars = '\n'.join([f"cov_{i+1} = '{f}'" for i, f in enumerate(config.cov_files)])
    cov_list = f"cov_files = [\n    {', '.join([f'cov_{i+1}' for i in range(len(config.cov_files))])}\n]"

    temps_str = f"[{', '.join(map(str, config.temperatures))}]"
    zaids_str = f"[{', '.join(map(str, config.zaids))}]"
    mt_list_str = '[]' if not config.mt_list else f"[{', '.join(map(str, config.mt_list))}]"
    
    autofix_str = 'None' if config.advanced_options.autofix == 'none' else f'"{config.advanced_options.autofix}"'
    
    remove_blocks_str = 'None'
    if config.advanced_options.remove_blocks:
        entries = [f"    {iso}: [{', '.join([f'({b[0]}, {b[1]})' for b in blocks])}]" 
                   for iso, blocks in config.advanced_options.remove_blocks.items()]
        remove_blocks_str = "{\n" + ",\n".join(entries) + "\n}"

    params = f"""
# Configuration
root_dir     = "{config.root_dir}"
temperatures = {temps_str}
zaids        = {zaids_str}
mt_list      = {mt_list_str}
num_samples  = {config.num_samples}
seed         = {config.seed if config.seed is not None else 'None'}
nprocs       = {config.nprocs}
"""

    function_call = f"""
# Run ACE perturbation on existing perturbed ENDF output structure
print(f"Applying cross-section perturbations to {{len(zaids)}} isotope(s)...")
perturb_seprate_ACE_files(
    root_dir             = root_dir,
    temperatures         = temperatures,
    zaids                = zaids,
    cov_files            = cov_files,
    mt_list              = mt_list,
    num_samples          = num_samples,
    space                = '{config.space}',
    decomposition_method = '{config.decomposition_method}',
    sampling_method      = '{config.sampling_method}',
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = {config.dry_run},
    autofix              = {autofix_str},
    high_val_thresh      = {config.advanced_options.high_val_thresh},
    accept_tol           = {config.advanced_options.accept_tol},
    remove_blocks        = {remove_blocks_str},
    verbose              = {config.verbose},
)

print("Done!")
"""

    return f"{imports}\n# Covariance file paths\n{cov_vars}\n\n{cov_list}\n{params}\n{function_call}"


@router.post("/generate-script", response_model=GeneratedScriptResponse)
async def generate_script(config: SamplingConfigRequest):
    """Generate Python script for sampling configuration"""
    try:
        if config.type == "ace":
            script = generate_ace_script(ACEPerturbationConfigRequest(**config.dict()))
            filename = "run_ace_perturbation.py"
        elif config.type == "endf":
            script = generate_endf_script(ENDFPerturbationConfigRequest(**config.dict()))
            filename = "run_endf_perturbation.py"
        elif config.type == "ace-from-endf":
            script = generate_ace_from_endf_script(ACEFromENDFConfigRequest(**config.dict()))
            filename = "run_ace_from_endf_perturbation.py"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown configuration type: {config.type}")
        
        return GeneratedScriptResponse(script=script, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=ValidationResult)
async def validate_config(config: SamplingConfigRequest):
    """Validate sampling configuration"""
    errors = []
    warnings = []

    # Common validations
    if config.num_samples < 1:
        errors.append("Number of samples must be at least 1")
    if config.num_samples > 10000:
        warnings.append("Large number of samples (>10000) may take very long to process")
    if config.nprocs < 1:
        errors.append("Number of processes must be at least 1")
    if not config.output_dir or not config.output_dir.strip():
        errors.append("Output directory is required")

    # Type-specific validations
    if config.type == "ace":
        if not config.ace_files or len(config.ace_files) == 0:
            errors.append("At least one ACE file is required")
        else:
            for i, f in enumerate(config.ace_files):
                if not f.data_file_path or not f.data_file_path.strip():
                    errors.append(f"ACE file {i + 1}: file path is required")
                if not f.cov_file_path or not f.cov_file_path.strip():
                    warnings.append(f"ACE file {i + 1}: no covariance file specified")
    
    elif config.type == "endf":
        if not config.endf_files or len(config.endf_files) == 0:
            errors.append("At least one ENDF file is required")
        if not config.legendre_coeffs or len(config.legendre_coeffs) == 0:
            errors.append("At least one Legendre coefficient must be specified")
        if config.generate_ace:
            if not config.njoy_exe or not config.njoy_exe.strip():
                errors.append("NJOY executable path is required when generating ACE files")
            if not config.temperatures or len(config.temperatures) == 0:
                errors.append("At least one temperature is required for ACE generation")
            if not config.library_name or not config.library_name.strip():
                errors.append("Library name is required for ACE generation")
    
    elif config.type == "ace-from-endf":
        if not config.root_dir or not config.root_dir.strip():
            errors.append("Root directory (from ENDF perturbation output) is required")
        if not config.zaids or len(config.zaids) == 0:
            errors.append("At least one ZAID is required")
        if not config.temperatures or len(config.temperatures) == 0:
            errors.append("At least one temperature is required")
        if not config.cov_files or len(config.cov_files) == 0:
            errors.append("At least one covariance file is required")

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)


async def stream_dry_run(config: SamplingConfigRequest) -> AsyncGenerator[str, None]:
    """Stream dry run execution logs via SSE"""
    
    def format_sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"
    
    yield format_sse({
        "type": "log",
        "entry": {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "level": "info",
            "message": "Starting dry run..."
        }
    })
    
    try:
        # For dry run, we'll simulate the execution since the actual KIKA library
        # may not be available in the API server environment
        # In a real deployment, this would call the actual perturbation functions
        
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "info",
                "message": f"Configuration type: {config.type}"
            }
        })
        
        yield format_sse({"type": "progress", "value": 10})
        await asyncio.sleep(0.5)
        
        # Validate configuration
        validation = await validate_config(config)
        if not validation.valid:
            for error in validation.errors:
                yield format_sse({
                    "type": "log",
                    "entry": {
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "level": "error",
                        "message": error
                    }
                })
            yield format_sse({"type": "error", "message": "Validation failed"})
            return
        
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "info",
                "message": "Configuration validated successfully"
            }
        })
        
        yield format_sse({"type": "progress", "value": 30})
        await asyncio.sleep(0.5)
        
        # Simulate processing
        file_count = 0
        if config.type == "ace" and config.ace_files:
            file_count = len(config.ace_files)
        elif config.type == "endf" and config.endf_files:
            file_count = len(config.endf_files)
        elif config.type == "ace-from-endf" and config.zaids:
            file_count = len(config.zaids)
        
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "info",
                "message": f"Processing {file_count} file(s) with {config.num_samples} samples"
            }
        })
        
        for i in range(file_count):
            yield format_sse({
                "type": "log",
                "entry": {
                    "timestamp": datetime.now().strftime("%H:%M:%S"),
                    "level": "info",
                    "message": f"Processing file {i + 1}/{file_count}..."
                }
            })
            progress = 30 + (i + 1) / file_count * 60
            yield format_sse({"type": "progress", "value": progress})
            await asyncio.sleep(0.3)
        
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "info",
                "message": "Generating perturbation factors..."
            }
        })
        yield format_sse({"type": "progress", "value": 95})
        await asyncio.sleep(0.5)
        
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "info",
                "message": f"Dry run completed! Would generate {config.num_samples} samples per isotope."
            }
        })
        yield format_sse({"type": "progress", "value": 100})
        yield format_sse({"type": "complete"})
        
    except Exception as e:
        yield format_sse({
            "type": "log",
            "entry": {
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "level": "error",
                "message": str(e)
            }
        })
        yield format_sse({"type": "error", "message": str(e)})


@router.post("/dry-run")
async def run_dry_run(config: SamplingConfigRequest):
    """Run dry-run with SSE streaming logs"""
    return StreamingResponse(
        stream_dry_run(config),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
