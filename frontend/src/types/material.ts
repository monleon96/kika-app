/**
 * Material types for MCNP material management
 */

/**
 * Represents a single nuclide in a material
 */
export interface Nuclide {
  zaid: number;
  fraction: number;
  nlib?: string | null;
  plib?: string | null;
  ylib?: string | null;
}

/**
 * Density unit types
 */
export type DensityUnit = 'g/cm3' | 'atoms/barn-cm';

/**
 * Temperature unit types
 */
export type TemperatureUnit = 'K' | 'MeV';

/**
 * Material data structure (matches backend schema)
 */
export interface MaterialData {
  material_id: number;
  nlib?: string | null;
  plib?: string | null;
  ylib?: string | null;
  nuclides: Nuclide[];
  density?: number | null;
  density_unit?: DensityUnit | null;
  temperature?: number | null;
  temperature_unit?: TemperatureUnit | null;
}

/**
 * Full material with user metadata (from backend-auth)
 */
export interface Material {
  id: string;
  name: string;
  material_id: number;
  nlib?: string | null;
  plib?: string | null;
  ylib?: string | null;
  nuclides: Nuclide[];
  density?: number | null;
  density_unit?: DensityUnit | null;
  temperature?: number | null;
  temperature_unit?: TemperatureUnit | null;
  created_at: string;
  updated_at: string;
}

/**
 * Preset material (comes with the app)
 */
export interface PresetMaterial extends MaterialData {
  name: string;
  description: string;
  category: PresetCategory;
}

/**
 * Categories for preset materials
 */
export type PresetCategory = 
  | 'common'
  | 'metals'
  | 'compounds'
  | 'shielding'
  | 'biological'
  | 'fuels';

/**
 * Material analysis info (from backend-core)
 */
export interface MaterialInfo {
  material_id: number;
  nuclide_count: number;
  fraction_type: 'weight' | 'atomic';
  natural_element_count: number;
  natural_elements: number[];
  unique_elements: number[];
  has_libraries: boolean;
}

/**
 * Request to create a new material
 */
export interface MaterialCreateRequest {
  name: string;
  material_id: number;
  nlib?: string | null;
  plib?: string | null;
  ylib?: string | null;
  nuclides: Nuclide[];
  density?: number | null;
  density_unit?: DensityUnit | null;
  temperature?: number | null;
  temperature_unit?: TemperatureUnit | null;
}

/**
 * Request to update an existing material
 */
export interface MaterialUpdateRequest {
  name?: string;
  material_id?: number;
  nlib?: string | null;
  plib?: string | null;
  ylib?: string | null;
  nuclides?: Nuclide[];
  density?: number | null;
  density_unit?: DensityUnit | null;
  temperature?: number | null;
  temperature_unit?: TemperatureUnit | null;
}

/**
 * Response from listing materials
 */
export interface MaterialListResponse {
  items: Material[];
  count: number;
}

/**
 * Parse MCNP request
 */
export interface ParseMCNPRequest {
  file_content: string;
  file_name?: string;
}

/**
 * Parse MCNP response
 */
export interface ParseMCNPResponse {
  materials: MaterialData[];
  count: number;
}

/**
 * ZAID element information
 */
export interface ElementInfo {
  z: number;
  symbol: string;
  name: string;
  mass_number?: number;
}

/**
 * Get element info from ZAID
 */
export function getElementFromZaid(zaid: number): ElementInfo | null {
  const z = Math.floor(zaid / 1000);
  const a = zaid % 1000;
  
  const element = ELEMENT_DATA[z];
  if (!element) return null;
  
  return {
    z,
    symbol: element.symbol,
    name: element.name,
    mass_number: a > 0 ? a : undefined,
  };
}

/**
 * Format ZAID for display (e.g., "1001" -> "H-1", "6000" -> "nat-C")
 */
export function formatZaid(zaid: number): string {
  const z = Math.floor(zaid / 1000);
  const a = zaid % 1000;
  
  const element = ELEMENT_DATA[z];
  if (!element) return zaid.toString();
  
  if (a === 0) {
    return `nat-${element.symbol}`;
  }
  return `${element.symbol}-${a}`;
}

/**
 * Check if a ZAID represents a natural element
 */
export function isNaturalElement(zaid: number): boolean {
  return zaid % 1000 === 0 && zaid > 1000;
}

/**
 * Element periodic table data
 */
export const ELEMENT_DATA: Record<number, { symbol: string; name: string }> = {
  1: { symbol: 'H', name: 'Hydrogen' },
  2: { symbol: 'He', name: 'Helium' },
  3: { symbol: 'Li', name: 'Lithium' },
  4: { symbol: 'Be', name: 'Beryllium' },
  5: { symbol: 'B', name: 'Boron' },
  6: { symbol: 'C', name: 'Carbon' },
  7: { symbol: 'N', name: 'Nitrogen' },
  8: { symbol: 'O', name: 'Oxygen' },
  9: { symbol: 'F', name: 'Fluorine' },
  10: { symbol: 'Ne', name: 'Neon' },
  11: { symbol: 'Na', name: 'Sodium' },
  12: { symbol: 'Mg', name: 'Magnesium' },
  13: { symbol: 'Al', name: 'Aluminum' },
  14: { symbol: 'Si', name: 'Silicon' },
  15: { symbol: 'P', name: 'Phosphorus' },
  16: { symbol: 'S', name: 'Sulfur' },
  17: { symbol: 'Cl', name: 'Chlorine' },
  18: { symbol: 'Ar', name: 'Argon' },
  19: { symbol: 'K', name: 'Potassium' },
  20: { symbol: 'Ca', name: 'Calcium' },
  21: { symbol: 'Sc', name: 'Scandium' },
  22: { symbol: 'Ti', name: 'Titanium' },
  23: { symbol: 'V', name: 'Vanadium' },
  24: { symbol: 'Cr', name: 'Chromium' },
  25: { symbol: 'Mn', name: 'Manganese' },
  26: { symbol: 'Fe', name: 'Iron' },
  27: { symbol: 'Co', name: 'Cobalt' },
  28: { symbol: 'Ni', name: 'Nickel' },
  29: { symbol: 'Cu', name: 'Copper' },
  30: { symbol: 'Zn', name: 'Zinc' },
  31: { symbol: 'Ga', name: 'Gallium' },
  32: { symbol: 'Ge', name: 'Germanium' },
  33: { symbol: 'As', name: 'Arsenic' },
  34: { symbol: 'Se', name: 'Selenium' },
  35: { symbol: 'Br', name: 'Bromine' },
  36: { symbol: 'Kr', name: 'Krypton' },
  37: { symbol: 'Rb', name: 'Rubidium' },
  38: { symbol: 'Sr', name: 'Strontium' },
  39: { symbol: 'Y', name: 'Yttrium' },
  40: { symbol: 'Zr', name: 'Zirconium' },
  41: { symbol: 'Nb', name: 'Niobium' },
  42: { symbol: 'Mo', name: 'Molybdenum' },
  43: { symbol: 'Tc', name: 'Technetium' },
  44: { symbol: 'Ru', name: 'Ruthenium' },
  45: { symbol: 'Rh', name: 'Rhodium' },
  46: { symbol: 'Pd', name: 'Palladium' },
  47: { symbol: 'Ag', name: 'Silver' },
  48: { symbol: 'Cd', name: 'Cadmium' },
  49: { symbol: 'In', name: 'Indium' },
  50: { symbol: 'Sn', name: 'Tin' },
  51: { symbol: 'Sb', name: 'Antimony' },
  52: { symbol: 'Te', name: 'Tellurium' },
  53: { symbol: 'I', name: 'Iodine' },
  54: { symbol: 'Xe', name: 'Xenon' },
  55: { symbol: 'Cs', name: 'Cesium' },
  56: { symbol: 'Ba', name: 'Barium' },
  57: { symbol: 'La', name: 'Lanthanum' },
  58: { symbol: 'Ce', name: 'Cerium' },
  59: { symbol: 'Pr', name: 'Praseodymium' },
  60: { symbol: 'Nd', name: 'Neodymium' },
  61: { symbol: 'Pm', name: 'Promethium' },
  62: { symbol: 'Sm', name: 'Samarium' },
  63: { symbol: 'Eu', name: 'Europium' },
  64: { symbol: 'Gd', name: 'Gadolinium' },
  65: { symbol: 'Tb', name: 'Terbium' },
  66: { symbol: 'Dy', name: 'Dysprosium' },
  67: { symbol: 'Ho', name: 'Holmium' },
  68: { symbol: 'Er', name: 'Erbium' },
  69: { symbol: 'Tm', name: 'Thulium' },
  70: { symbol: 'Yb', name: 'Ytterbium' },
  71: { symbol: 'Lu', name: 'Lutetium' },
  72: { symbol: 'Hf', name: 'Hafnium' },
  73: { symbol: 'Ta', name: 'Tantalum' },
  74: { symbol: 'W', name: 'Tungsten' },
  75: { symbol: 'Re', name: 'Rhenium' },
  76: { symbol: 'Os', name: 'Osmium' },
  77: { symbol: 'Ir', name: 'Iridium' },
  78: { symbol: 'Pt', name: 'Platinum' },
  79: { symbol: 'Au', name: 'Gold' },
  80: { symbol: 'Hg', name: 'Mercury' },
  81: { symbol: 'Tl', name: 'Thallium' },
  82: { symbol: 'Pb', name: 'Lead' },
  83: { symbol: 'Bi', name: 'Bismuth' },
  84: { symbol: 'Po', name: 'Polonium' },
  85: { symbol: 'At', name: 'Astatine' },
  86: { symbol: 'Rn', name: 'Radon' },
  87: { symbol: 'Fr', name: 'Francium' },
  88: { symbol: 'Ra', name: 'Radium' },
  89: { symbol: 'Ac', name: 'Actinium' },
  90: { symbol: 'Th', name: 'Thorium' },
  91: { symbol: 'Pa', name: 'Protactinium' },
  92: { symbol: 'U', name: 'Uranium' },
  93: { symbol: 'Np', name: 'Neptunium' },
  94: { symbol: 'Pu', name: 'Plutonium' },
  95: { symbol: 'Am', name: 'Americium' },
  96: { symbol: 'Cm', name: 'Curium' },
  97: { symbol: 'Bk', name: 'Berkelium' },
  98: { symbol: 'Cf', name: 'Californium' },
  99: { symbol: 'Es', name: 'Einsteinium' },
  100: { symbol: 'Fm', name: 'Fermium' },
};

// ============================================================================
// Unit Conversion Constants and Functions
// ============================================================================

/**
 * Boltzmann constant in eV/K
 */
export const BOLTZMANN_EV_K = 8.617333262e-5; // eV/K

/**
 * Avogadro's number
 */
export const AVOGADRO = 6.02214076e23;

/**
 * Convert temperature between units
 * @param value Temperature value
 * @param from Source unit
 * @param to Target unit
 * @returns Converted temperature
 */
export function convertTemperature(
  value: number,
  from: TemperatureUnit,
  to: TemperatureUnit
): number {
  if (from === to) return value;
  
  // K to MeV: T_MeV = T_K * k_B (convert eV to MeV)
  if (from === 'K' && to === 'MeV') {
    return value * BOLTZMANN_EV_K * 1e-6;
  }
  
  // MeV to K: T_K = T_MeV / k_B (convert MeV to eV first)
  if (from === 'MeV' && to === 'K') {
    return value * 1e6 / BOLTZMANN_EV_K;
  }
  
  return value;
}

/**
 * Convert density between g/cm³ and atoms/barn-cm
 * Note: This requires knowing the average atomic mass of the material.
 * The formula is: ρ(atoms/barn-cm) = ρ(g/cm³) * N_A / A * 1e-24
 * where N_A is Avogadro's number and A is the average atomic mass
 * 
 * @param value Density value
 * @param from Source unit
 * @param to Target unit
 * @param avgAtomicMass Average atomic mass in g/mol (required for conversion)
 * @returns Converted density, or null if cannot convert
 */
export function convertDensity(
  value: number,
  from: DensityUnit,
  to: DensityUnit,
  avgAtomicMass?: number
): number | null {
  if (from === to) return value;
  
  if (!avgAtomicMass || avgAtomicMass <= 0) {
    return null; // Cannot convert without knowing average atomic mass
  }
  
  // g/cm³ to atoms/barn-cm
  if (from === 'g/cm3' && to === 'atoms/barn-cm') {
    // ρ(atoms/barn-cm) = ρ(g/cm³) * N_A / A * 1e-24
    return value * AVOGADRO / avgAtomicMass * 1e-24;
  }
  
  // atoms/barn-cm to g/cm³
  if (from === 'atoms/barn-cm' && to === 'g/cm3') {
    // ρ(g/cm³) = ρ(atoms/barn-cm) * A / N_A * 1e24
    return value * avgAtomicMass / AVOGADRO * 1e24;
  }
  
  return value;
}

/**
 * Normalize material fractions so they sum to 1.0 (or -1.0 for weight fractions)
 * @param nuclides Array of nuclides with fractions
 * @returns New array with normalized fractions
 */
export function normalizeFractions(nuclides: Nuclide[]): Nuclide[] {
  if (nuclides.length === 0) return [];
  
  // Determine if weight fractions (negative) or atomic (positive)
  const isWeight = nuclides.some(n => n.fraction < 0);
  
  // Calculate sum of absolute values
  const sum = nuclides.reduce((acc, n) => acc + Math.abs(n.fraction), 0);
  
  if (sum === 0) return nuclides;
  
  // Normalize
  return nuclides.map(n => ({
    ...n,
    fraction: isWeight 
      ? -Math.abs(n.fraction) / sum 
      : Math.abs(n.fraction) / sum,
  }));
}
