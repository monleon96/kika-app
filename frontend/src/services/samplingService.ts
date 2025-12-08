/**
 * Sampling Service
 * 
 * Client-side service for generating sampling scripts and managing dry-run execution
 */

import { KIKA_SERVER_URL } from '../config';
import type {
  SamplingConfig,
  ACEPerturbationConfig,
  ENDFPerturbationConfig,
  ACEFromENDFConfig,
  ValidationResult,
  GeneratedScript,
  LogEntry,
} from '../types/sampling';

/**
 * Generate Python script for ACE perturbation
 */
function generateACEScript(config: ACEPerturbationConfig): string {
  const imports = `import os
import kika
from kika.sampling.ace_perturbation import perturb_ACE_files
`;

  // Generate file path variables
  const aceVars = config.aceFiles.map((f, i) => 
    `ace_${i + 1} = '${f.dataFilePath}'`
  ).join('\n');
  
  const covVars = config.aceFiles.map((f, i) => 
    `cov_${i + 1} = '${f.covFilePath}'`
  ).join('\n');

  const aceList = `acelist = [\n    ${config.aceFiles.map((_, i) => `ace_${i + 1}`).join(',\n    ')}\n]`;
  
  // Generate covariance loading
  const covLoading = `
# Load covariance matrices
covmatlist = []
missing_paths = []
cov_paths = [${config.aceFiles.map((_, i) => `cov_${i + 1}`).join(', ')}]

for cov_path in cov_paths:
    if os.path.exists(cov_path):
        # Auto-detect covariance format (NJOY GENDF or SCALE)
        if cov_path.endswith('.gendf') or 'gendf' in cov_path.lower():
            cov = kika.read_njoy_covmat(cov_path)
        else:
            cov = kika.read_scale_covmat(cov_path)
    else:
        missing_paths.append(cov_path)
        cov = kika.cov.covmat.CovMat()  # Empty covariance
    covmatlist.append(cov)

if missing_paths:
    print("Warning: Following covariance matrix files are missing:")
    for path in missing_paths:
        print(f"  - {path}")
else:
    print("All covariance matrix files are present.")
`;

  // Parameters
  const mtListStr = config.mtList.length === 0 ? '[]' : `[${config.mtList.join(', ')}]`;
  const params = `
# Sampling parameters
mt_numbers   = ${mtListStr}  # Empty list = all available MTs
num_samples  = ${config.numSamples}
output_dir   = "${config.outputDir}"
xsdir_file   = "${config.xsdirFile}" if "${config.xsdirFile}" else None
seed         = ${config.seed === null ? 'None' : config.seed}
nprocs       = ${config.nprocs}
`;

  // Advanced options
  const advOpts = config.advancedOptions;
  const autofixStr = advOpts.autofix === 'none' ? 'None' : `"${advOpts.autofix}"`;
  
  // Generate remove_blocks dict if present
  let removeBlocksStr = 'None';
  if (Object.keys(advOpts.removeBlocks).length > 0) {
    const entries = Object.entries(advOpts.removeBlocks)
      .map(([iso, blocks]) => `    ${iso}: [${blocks.map(b => `(${b[0]}, ${b[1]})`).join(', ')}]`)
      .join(',\n');
    removeBlocksStr = `{\n${entries}\n}`;
  }

  const functionCall = `
# Run perturbation
print(f"Generating {num_samples} perturbed ACE files...")
perturb_ACE_files(
    ace_files            = acelist,
    cov_files            = covmatlist,
    mt_list              = mt_numbers,
    num_samples          = num_samples,
    output_dir           = output_dir,
    xsdir_file           = xsdir_file,
    sampling_method      = '${config.samplingMethod}',
    decomposition_method = '${config.decompositionMethod}',
    space                = '${config.space}',
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = ${config.dryRun ? 'True' : 'False'},
    autofix              = ${autofixStr},
    high_val_thresh      = ${advOpts.highValThresh},
    accept_tol           = ${advOpts.acceptTol},
    remove_blocks        = ${removeBlocksStr},
    verbose              = ${config.verbose ? 'True' : 'False'},
)

print("Done!")
`;

  return `${imports}\n# ACE file paths\n${aceVars}\n\n# Covariance file paths\n${covVars}\n\n${aceList}\n${covLoading}\n${params}\n${functionCall}`;
}

/**
 * Generate Python script for ENDF perturbation
 */
function generateENDFScript(config: ENDFPerturbationConfig): string {
  const imports = `import os
from kika.sampling.endf_perturbation import perturb_ENDF_files
`;

  // Generate file path variables
  const endfVars = config.endfFiles.map((f, i) => 
    `endf_${i + 1} = '${f.dataFilePath}'`
  ).join('\n');

  const endfList = `endf_files = [\n    ${config.endfFiles.map((_, i) => `endf_${i + 1}`).join(',\n    ')}\n]`;

  // MF34 covariance files (optional - can be in ENDF itself)
  let covSection = '';
  const hasCovFiles = config.endfFiles.some(f => f.covFilePath);
  if (hasCovFiles) {
    const covVars = config.endfFiles.map((f, i) => 
      `mf34_cov_${i + 1} = '${f.covFilePath}'`
    ).join('\n');
    const covList = `mf34_cov_files = [\n    ${config.endfFiles.map((_, i) => `mf34_cov_${i + 1}`).join(',\n    ')}\n]`;
    covSection = `\n# MF34 covariance files (optional - if not provided, will use MF34 from ENDF)\n${covVars}\n\n${covList}\n`;
  } else {
    covSection = `\n# No separate MF34 covariance files - will use MF34 section from ENDF files\nmf34_cov_files = None\n`;
  }

  // Parameters
  const mtListStr = config.mtList.length === 0 ? '[]' : `[${config.mtList.join(', ')}]`;
  const legendreStr = `[${config.legendreCoeffs.join(', ')}]`;
  const tempsStr = `[${config.temperatures.join(', ')}]`;

  const params = `
# Sampling parameters
mt_list          = ${mtListStr}  # Empty list = all available MTs
legendre_coeffs  = ${legendreStr}  # Legendre coefficient indices to perturb
num_samples      = ${config.numSamples}
output_dir       = "${config.outputDir}"
seed             = ${config.seed === null ? 'None' : config.seed}
nprocs           = ${config.nprocs}
`;

  // ACE generation options
  const aceGenSection = config.generateAce ? `
# ACE generation options (via NJOY)
generate_ace  = True
njoy_exe      = "${config.njoyExe}"
temperatures  = ${tempsStr}  # Kelvin
library_name  = "${config.libraryName}"
njoy_version  = "${config.njoyVersion}"
xsdir_file    = "${config.xsdirFile}" if "${config.xsdirFile}" else None
` : `
# ACE generation disabled
generate_ace  = False
njoy_exe      = None
temperatures  = None
library_name  = None
njoy_version  = "NJOY 2016.78"
xsdir_file    = None
`;

  const functionCall = `
# Run perturbation
print(f"Generating {num_samples} perturbed ENDF files...")
perturb_ENDF_files(
    endf_files           = endf_files,
    mt_list              = mt_list,
    legendre_coeffs      = legendre_coeffs,
    num_samples          = num_samples,
    mf34_cov_files       = mf34_cov_files,
    space                = '${config.space}',
    decomposition_method = '${config.decompositionMethod}',
    sampling_method      = '${config.samplingMethod}',
    output_dir           = output_dir,
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = ${config.dryRun ? 'True' : 'False'},
    verbose              = ${config.verbose ? 'True' : 'False'},
    generate_ace         = generate_ace,
    njoy_exe             = njoy_exe,
    temperatures         = temperatures,
    library_name         = library_name,
    njoy_version         = njoy_version,
    xsdir_file           = xsdir_file,
)

print("Done!")
`;

  return `${imports}\n# ENDF file paths\n${endfVars}\n\n${endfList}\n${covSection}\n${params}\n${aceGenSection}\n${functionCall}`;
}

/**
 * Generate Python script for ACE perturbation from perturbed ENDF
 */
function generateACEFromENDFScript(config: ACEFromENDFConfig): string {
  const imports = `import os
from kika.sampling.ace_perturbation_separate import perturb_seprate_ACE_files
`;

  // Temperatures and ZAIDs
  const tempsStr = `[${config.temperatures.join(', ')}]`;
  const zaidsStr = `[${config.zaids.join(', ')}]`;
  
  // Covariance files
  const covVars = config.covFiles.map((f, i) => 
    `cov_${i + 1} = '${f}'`
  ).join('\n');
  const covList = `cov_files = [\n    ${config.covFiles.map((_, i) => `cov_${i + 1}`).join(',\n    ')}\n]`;

  // Parameters
  const mtListStr = config.mtList.length === 0 ? '[]' : `[${config.mtList.join(', ')}]`;
  
  const params = `
# Configuration
root_dir     = "${config.rootDir}"
temperatures = ${tempsStr}  # Kelvin
zaids        = ${zaidsStr}
mt_list      = ${mtListStr}  # Empty list = all available MTs
num_samples  = ${config.numSamples}
seed         = ${config.seed === null ? 'None' : config.seed}
nprocs       = ${config.nprocs}
`;

  // Advanced options
  const advOpts = config.advancedOptions;
  const autofixStr = advOpts.autofix === 'none' ? 'None' : `"${advOpts.autofix}"`;
  
  let removeBlocksStr = 'None';
  if (Object.keys(advOpts.removeBlocks).length > 0) {
    const entries = Object.entries(advOpts.removeBlocks)
      .map(([iso, blocks]) => `    ${iso}: [${blocks.map(b => `(${b[0]}, ${b[1]})`).join(', ')}]`)
      .join(',\n');
    removeBlocksStr = `{\n${entries}\n}`;
  }

  const functionCall = `
# Run ACE perturbation on existing perturbed ENDF output structure
print(f"Applying cross-section perturbations to {len(zaids)} isotope(s)...")
perturb_seprate_ACE_files(
    root_dir             = root_dir,
    temperatures         = temperatures,
    zaids                = zaids,
    cov_files            = cov_files,
    mt_list              = mt_list,
    num_samples          = num_samples,
    space                = '${config.space}',
    decomposition_method = '${config.decompositionMethod}',
    sampling_method      = '${config.samplingMethod}',
    seed                 = seed,
    nprocs               = nprocs,
    dry_run              = ${config.dryRun ? 'True' : 'False'},
    autofix              = ${autofixStr},
    high_val_thresh      = ${advOpts.highValThresh},
    accept_tol           = ${advOpts.acceptTol},
    remove_blocks        = ${removeBlocksStr},
    verbose              = ${config.verbose ? 'True' : 'False'},
)

print("Done!")
`;

  return `${imports}\n# Covariance file paths\n${covVars}\n\n${covList}\n${params}\n${functionCall}`;
}

/**
 * Generate Python script based on configuration type
 */
export function generateScript(config: SamplingConfig): GeneratedScript {
  let script: string;
  let filename: string;
  
  switch (config.type) {
    case 'ace':
      script = generateACEScript(config);
      filename = 'run_ace_perturbation.py';
      break;
    case 'endf':
      script = generateENDFScript(config);
      filename = 'run_endf_perturbation.py';
      break;
    case 'ace-from-endf':
      script = generateACEFromENDFScript(config);
      filename = 'run_ace_from_endf_perturbation.py';
      break;
    default:
      throw new Error('Unknown configuration type');
  }

  return {
    script,
    filename,
    estimatedRuntime: estimateRuntime(config),
  };
}

/**
 * Estimate runtime based on configuration
 */
function estimateRuntime(config: SamplingConfig): string {
  let fileCount = 0;
  if (config.type === 'ace') {
    fileCount = config.aceFiles.length;
  } else if (config.type === 'endf') {
    fileCount = config.endfFiles.length;
  } else if (config.type === 'ace-from-endf') {
    fileCount = config.zaids.length;
  }

  const samplesPerMin = config.dryRun ? 1000 : 10; // Much faster for dry run
  const totalOperations = fileCount * config.numSamples;
  const minutes = Math.ceil(totalOperations / samplesPerMin / config.nprocs);

  if (minutes < 1) return '< 1 minute';
  if (minutes < 60) return `~${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `~${hours}h ${remainingMins}m`;
}

/**
 * Validate sampling configuration
 */
export function validateConfig(config: SamplingConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common validations
  if (config.numSamples < 1) {
    errors.push('Number of samples must be at least 1');
  }
  if (config.numSamples > 10000) {
    warnings.push('Large number of samples (>10000) may take very long to process');
  }
  if (config.nprocs < 1) {
    errors.push('Number of processes must be at least 1');
  }
  if (!config.outputDir.trim()) {
    errors.push('Output directory is required');
  }

  // Type-specific validations
  if (config.type === 'ace') {
    if (config.aceFiles.length === 0) {
      errors.push('At least one ACE file is required');
    }
    config.aceFiles.forEach((f, i) => {
      if (!f.dataFilePath.trim()) {
        errors.push(`ACE file ${i + 1}: file path is required`);
      }
      if (!f.covFilePath.trim()) {
        warnings.push(`ACE file ${i + 1}: no covariance file specified`);
      }
    });
  } else if (config.type === 'endf') {
    if (config.endfFiles.length === 0) {
      errors.push('At least one ENDF file is required');
    }
    if (config.legendreCoeffs.length === 0) {
      errors.push('At least one Legendre coefficient must be specified');
    }
    if (config.generateAce) {
      if (!config.njoyExe.trim()) {
        errors.push('NJOY executable path is required when generating ACE files');
      }
      if (config.temperatures.length === 0) {
        errors.push('At least one temperature is required for ACE generation');
      }
      if (!config.libraryName.trim()) {
        errors.push('Library name is required for ACE generation');
      }
    }
  } else if (config.type === 'ace-from-endf') {
    if (!config.rootDir.trim()) {
      errors.push('Root directory (from ENDF perturbation output) is required');
    }
    if (config.zaids.length === 0) {
      errors.push('At least one ZAID is required');
    }
    if (config.temperatures.length === 0) {
      errors.push('At least one temperature is required');
    }
    if (config.covFiles.length === 0) {
      errors.push('At least one covariance file is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate configuration via backend (more comprehensive validation)
 */
export async function validateConfigRemote(config: SamplingConfig): Promise<ValidationResult> {
  try {
    const response = await fetch(`${KIKA_SERVER_URL}/api/sampling/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        errors: [error.detail || 'Validation failed'],
        warnings: [],
      };
    }
    
    return await response.json();
  } catch (error) {
    // Fallback to local validation if server unavailable
    return validateConfig(config);
  }
}

/**
 * Run dry-run locally via backend with SSE log streaming
 */
export async function runDryRun(
  config: SamplingConfig,
  onLog: (log: LogEntry) => void,
  onProgress: (progress: number) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    // Ensure dry_run is true
    const dryRunConfig = { ...config, dryRun: true };
    
    const response = await fetch(`${KIKA_SERVER_URL}/api/sampling/dry-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dryRunConfig),
    });

    if (!response.ok) {
      const error = await response.json();
      onError(error.detail || 'Dry run failed');
      return;
    }

    // Handle SSE streaming
    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'log') {
              onLog(data.entry);
            } else if (data.type === 'progress') {
              onProgress(data.value);
            } else if (data.type === 'complete') {
              onComplete();
            } else if (data.type === 'error') {
              onError(data.message);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Download script as a file
 */
export function downloadScript(script: GeneratedScript): void {
  const blob = new Blob([script.script], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = script.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy script to clipboard
 */
export async function copyScriptToClipboard(script: GeneratedScript): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(script.script);
    return true;
  } catch {
    return false;
  }
}
