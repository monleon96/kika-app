/**
 * Sampling Configuration Types
 * 
 * Types for nuclear data perturbation sampling configuration
 */

// MT reaction numbers from KIKA constants (excluding Legendre coefficients >= 4000)
export const MT_REACTIONS: Record<number, string> = {
  1: '(n,total)',
  2: '(z,z0) Elastic',
  3: '(z,nonelas.)',
  4: "(z,n') Total Inelastic",
  5: '(z,anything)',
  10: '(z,contin.)',
  11: '(z,2nd)',
  16: '(z,2n)',
  17: '(z,3n)',
  18: '(z,fission)',
  19: '(n,f)',
  20: '(n,nf)',
  21: '(n,2nf)',
  22: '(z,nα)',
  23: '(n,n3α)',
  24: '(z,2nα)',
  25: '(z,3nα)',
  27: '(n,abs)',
  28: '(z,np)',
  29: '(z,n2α)',
  30: '(z,2n2α)',
  32: '(z,nd)',
  33: '(z,nt)',
  34: '(z,n3He)',
  35: '(z,nd2α)',
  36: '(z,nt2α)',
  37: '(z,4n)',
  38: '(n,3nf)',
  41: '(z,2np)',
  42: '(z,3np)',
  44: '(z,n2p)',
  45: '(z,npα)',
  51: "(z,n'1)",
  52: "(z,n'2)",
  53: "(z,n'3)",
  54: "(z,n'4)",
  55: "(z,n'5)",
  56: "(z,n'6)",
  57: "(z,n'7)",
  58: "(z,n'8)",
  59: "(z,n'9)",
  60: "(z,n'10)",
  61: "(z,n'11)",
  62: "(z,n'12)",
  63: "(z,n'13)",
  64: "(z,n'14)",
  65: "(z,n'15)",
  66: "(z,n'16)",
  67: "(z,n'17)",
  68: "(z,n'18)",
  69: "(z,n'19)",
  70: "(z,n'20)",
  71: "(z,n'21)",
  72: "(z,n'22)",
  73: "(z,n'23)",
  74: "(z,n'24)",
  75: "(z,n'25)",
  76: "(z,n'26)",
  77: "(z,n'27)",
  78: "(z,n'28)",
  79: "(z,n'29)",
  80: "(z,n'30)",
  81: "(z,n'31)",
  82: "(z,n'32)",
  83: "(z,n'33)",
  84: "(z,n'34)",
  85: "(z,n'35)",
  86: "(z,n'36)",
  87: "(z,n'37)",
  88: "(z,n'38)",
  89: "(z,n'39)",
  90: "(z,n'40)",
  91: "(z,n'c)",
  101: '(n,disap)',
  102: '(z,γ) Radiative Capture',
  103: '(z,p)',
  104: '(z,d)',
  105: '(z,t)',
  106: '(z,3He)',
  107: '(z,α)',
  108: '(z,2α)',
  109: '(z,3α)',
  111: '(z,2p)',
  112: '(z,pα)',
  113: '(z,t2α)',
  114: '(z,d2α)',
  115: '(z,pd)',
  116: '(z,pt)',
  117: '(z,dα)',
};

// MT Groups for additive selection - clicking groups accumulates MT numbers
export interface MTGroup {
  name: string;
  description: string;
  mts: number[];
  color: string;
}

export const MT_GROUPS: MTGroup[] = [
  {
    name: 'All Available',
    description: 'All MT numbers in covariance (empty selection)',
    mts: [],
    color: '#667eea',
  },
  {
    name: 'Elastic',
    description: 'Elastic scattering',
    mts: [2],
    color: '#10b981',
  },
  {
    name: 'Inelastic (Total)',
    description: 'Total inelastic - perturbs all levels 51-91',
    mts: [4],
    color: '#f59e0b',
  },
  {
    name: 'Inelastic (Levels)',
    description: 'Specific inelastic levels 51-91',
    mts: Array.from({ length: 41 }, (_, i) => i + 51), // 51-91
    color: '#fb923c',
  },
  {
    name: 'Radiative Capture',
    description: '(n,γ) reaction',
    mts: [102],
    color: '#8b5cf6',
  },
  {
    name: 'Fission',
    description: 'All fission reactions',
    mts: [18, 19, 20, 21, 38],
    color: '#ef4444',
  },
  {
    name: '(n,2n)',
    description: 'Two neutron emission',
    mts: [16],
    color: '#06b6d4',
  },
  {
    name: '(n,p)',
    description: 'Proton production - perturbs all levels 600-649',
    mts: [103],
    color: '#ec4899',
  },
  {
    name: '(n,d)',
    description: 'Deuteron production - perturbs all levels 650-699',
    mts: [104],
    color: '#14b8a6',
  },
  {
    name: '(n,t)',
    description: 'Triton production - perturbs all levels 700-749',
    mts: [105],
    color: '#f97316',
  },
  {
    name: '(n,3He)',
    description: 'Helium-3 production - perturbs all levels 750-799',
    mts: [106],
    color: '#84cc16',
  },
  {
    name: '(n,α)',
    description: 'Alpha production - perturbs all levels 800-849',
    mts: [107],
    color: '#a855f7',
  },
];

export type SamplingMethod = 'sobol' | 'lhs' | 'random';
export type DecompositionMethod = 'svd' | 'cholesky' | 'eigen' | 'pca';
export type SamplingSpace = 'log' | 'linear';
export type AutofixLevel = 'none' | 'soft' | 'medium' | 'hard';

// File entry for ACE/ENDF files with their covariance pairs
export interface FileEntry {
  id: string;
  dataFilePath: string;
  covFilePath: string;
  // For ACE from ENDF, we need ZAID
  zaid?: number;
}

// Base configuration shared across all perturbation types
export interface BaseSamplingConfig {
  numSamples: number;
  mtList: number[];
  samplingMethod: SamplingMethod;
  decompositionMethod: DecompositionMethod;
  space: SamplingSpace;
  seed: number | null;
  nprocs: number;
  dryRun: boolean;
  verbose: boolean;
  outputDir: string;
}

// Advanced options for covariance matrix fixing
export interface AdvancedOptions {
  autofix: AutofixLevel;
  highValThresh: number;
  acceptTol: number;
  removeBlocks: Record<number, [number, number][]>; // isotope -> [(mt1, mt2), ...]
}

// ACE Perturbation specific config
export interface ACEPerturbationConfig extends BaseSamplingConfig {
  type: 'ace';
  aceFiles: FileEntry[];
  xsdirFile: string;
  advancedOptions: AdvancedOptions;
}

// ENDF Perturbation specific config (angular distributions)
export interface ENDFPerturbationConfig extends BaseSamplingConfig {
  type: 'endf';
  endfFiles: FileEntry[];
  legendreCoeffs: number[];
  // ACE generation options
  generateAce: boolean;
  njoyExe: string;
  temperatures: number[];
  libraryName: string;
  njoyVersion: string;
  xsdirFile: string;
}

// ACE from perturbed ENDF config
export interface ACEFromENDFConfig extends BaseSamplingConfig {
  type: 'ace-from-endf';
  rootDir: string;
  temperatures: number[];
  zaids: number[];
  covFiles: string[];
  advancedOptions: AdvancedOptions;
}

export type SamplingConfig = ACEPerturbationConfig | ENDFPerturbationConfig | ACEFromENDFConfig;

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Script generation result
export interface GeneratedScript {
  script: string;
  filename: string;
  estimatedRuntime?: string;
}

// Dry run status
export interface DryRunStatus {
  running: boolean;
  progress: number;
  currentIsotope?: string;
  logs: LogEntry[];
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

// Default configurations
export const DEFAULT_ACE_CONFIG: Omit<ACEPerturbationConfig, 'aceFiles'> = {
  type: 'ace',
  numSamples: 100,
  mtList: [],
  samplingMethod: 'sobol',
  decompositionMethod: 'svd',
  space: 'log',
  seed: 42,
  nprocs: 4,
  dryRun: false,
  verbose: true,
  outputDir: './perturbed_ace',
  xsdirFile: '',
  advancedOptions: {
    autofix: 'none',
    highValThresh: 1.0,
    acceptTol: -1.0e-4,
    removeBlocks: {},
  },
};

export const DEFAULT_ENDF_CONFIG: Omit<ENDFPerturbationConfig, 'endfFiles'> = {
  type: 'endf',
  numSamples: 100,
  mtList: [2],
  legendreCoeffs: [1, 2, 3],
  samplingMethod: 'sobol',
  decompositionMethod: 'svd',
  space: 'linear',
  seed: 42,
  nprocs: 4,
  dryRun: false,
  verbose: true,
  outputDir: './perturbed_endf',
  generateAce: false,
  njoyExe: '',
  temperatures: [300.0],
  libraryName: 'endfb81',
  njoyVersion: 'NJOY 2016.78',
  xsdirFile: '',
};

export const DEFAULT_ACE_FROM_ENDF_CONFIG: Omit<ACEFromENDFConfig, 'rootDir' | 'zaids' | 'covFiles'> = {
  type: 'ace-from-endf',
  numSamples: 100,
  mtList: [],
  temperatures: [300.0],
  samplingMethod: 'sobol',
  decompositionMethod: 'svd',
  space: 'log',
  seed: 42,
  nprocs: 4,
  dryRun: false,
  verbose: true,
  outputDir: '',
  advancedOptions: {
    autofix: 'none',
    highValThresh: 1.0,
    acceptTol: -1.0e-4,
    removeBlocks: {},
  },
};
