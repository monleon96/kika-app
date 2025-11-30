/**
 * Preset Materials Library
 * 
 * Common materials used in nuclear engineering, ready to be loaded
 * into user's material workspace.
 */

import type { PresetMaterial, PresetCategory } from '../types/material';

/**
 * Collection of preset materials organized by category
 */
export const PRESET_MATERIALS: PresetMaterial[] = [
  // ============================================================================
  // COMMON MATERIALS
  // ============================================================================
  {
    name: 'Light Water (H2O)',
    description: 'Pure light water at standard density',
    category: 'common',
    material_id: 1,
    nuclides: [
      { zaid: 1001, fraction: 2.0, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Heavy Water (D2O)',
    description: 'Deuterium oxide',
    category: 'common',
    material_id: 2,
    nuclides: [
      { zaid: 1002, fraction: 2.0, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Air (Dry)',
    description: 'Dry air at sea level',
    category: 'common',
    material_id: 3,
    nuclides: [
      { zaid: 6000, fraction: 0.000124, nlib: null, plib: null, ylib: null },
      { zaid: 7014, fraction: 0.755268, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 0.231781, nlib: null, plib: null, ylib: null },
      { zaid: 18000, fraction: 0.012827, nlib: null, plib: null, ylib: null },
    ],
  },

  // ============================================================================
  // METALS
  // ============================================================================
  {
    name: 'Iron (Natural)',
    description: 'Natural iron composition',
    category: 'metals',
    material_id: 10,
    nuclides: [
      { zaid: 26000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Aluminum',
    description: 'Pure aluminum',
    category: 'metals',
    material_id: 11,
    nuclides: [
      { zaid: 13027, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Copper (Natural)',
    description: 'Natural copper composition',
    category: 'metals',
    material_id: 12,
    nuclides: [
      { zaid: 29000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Stainless Steel 304',
    description: 'Common austenitic stainless steel (weight fractions)',
    category: 'metals',
    material_id: 13,
    nuclides: [
      { zaid: 6000, fraction: -0.0008, nlib: null, plib: null, ylib: null },
      { zaid: 14000, fraction: -0.01, nlib: null, plib: null, ylib: null },
      { zaid: 15031, fraction: -0.00045, nlib: null, plib: null, ylib: null },
      { zaid: 16000, fraction: -0.0003, nlib: null, plib: null, ylib: null },
      { zaid: 24000, fraction: -0.19, nlib: null, plib: null, ylib: null },
      { zaid: 25055, fraction: -0.02, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.68945, nlib: null, plib: null, ylib: null },
      { zaid: 28000, fraction: -0.09, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Stainless Steel 316',
    description: 'Molybdenum-bearing stainless steel (weight fractions)',
    category: 'metals',
    material_id: 14,
    nuclides: [
      { zaid: 6000, fraction: -0.0008, nlib: null, plib: null, ylib: null },
      { zaid: 14000, fraction: -0.01, nlib: null, plib: null, ylib: null },
      { zaid: 15031, fraction: -0.00045, nlib: null, plib: null, ylib: null },
      { zaid: 16000, fraction: -0.0003, nlib: null, plib: null, ylib: null },
      { zaid: 24000, fraction: -0.17, nlib: null, plib: null, ylib: null },
      { zaid: 25055, fraction: -0.02, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.65145, nlib: null, plib: null, ylib: null },
      { zaid: 28000, fraction: -0.12, nlib: null, plib: null, ylib: null },
      { zaid: 42000, fraction: -0.025, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Zircaloy-4',
    description: 'Zirconium alloy used in fuel cladding (weight fractions)',
    category: 'metals',
    material_id: 15,
    nuclides: [
      { zaid: 24000, fraction: -0.001, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.0021, nlib: null, plib: null, ylib: null },
      { zaid: 40000, fraction: -0.9819, nlib: null, plib: null, ylib: null },
      { zaid: 50000, fraction: -0.015, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Lead (Natural)',
    description: 'Natural lead composition',
    category: 'metals',
    material_id: 16,
    nuclides: [
      { zaid: 82000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Tungsten (Natural)',
    description: 'Natural tungsten composition',
    category: 'metals',
    material_id: 17,
    nuclides: [
      { zaid: 74000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },

  // ============================================================================
  // COMPOUNDS
  // ============================================================================
  {
    name: 'Boron Carbide (B4C)',
    description: 'Boron carbide neutron absorber',
    category: 'compounds',
    material_id: 20,
    nuclides: [
      { zaid: 5000, fraction: 4.0, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Uranium Dioxide (UO2)',
    description: 'UO2 fuel (natural uranium)',
    category: 'compounds',
    material_id: 21,
    nuclides: [
      { zaid: 92000, fraction: 1.0, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 2.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'UO2 (3.5% enriched)',
    description: 'UO2 fuel enriched to 3.5% U-235',
    category: 'compounds',
    material_id: 22,
    nuclides: [
      { zaid: 92235, fraction: 0.035, nlib: null, plib: null, ylib: null },
      { zaid: 92238, fraction: 0.965, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 2.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Silicon Dioxide (SiO2)',
    description: 'Silica / quartz',
    category: 'compounds',
    material_id: 23,
    nuclides: [
      { zaid: 14000, fraction: 1.0, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 2.0, nlib: null, plib: null, ylib: null },
    ],
  },

  // ============================================================================
  // SHIELDING MATERIALS
  // ============================================================================
  {
    name: 'Ordinary Concrete',
    description: 'Standard Portland concrete (weight fractions)',
    category: 'shielding',
    material_id: 30,
    nuclides: [
      { zaid: 1001, fraction: -0.01, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: -0.001, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: -0.529107, nlib: null, plib: null, ylib: null },
      { zaid: 11023, fraction: -0.016, nlib: null, plib: null, ylib: null },
      { zaid: 12000, fraction: -0.002, nlib: null, plib: null, ylib: null },
      { zaid: 13027, fraction: -0.033872, nlib: null, plib: null, ylib: null },
      { zaid: 14000, fraction: -0.337021, nlib: null, plib: null, ylib: null },
      { zaid: 19000, fraction: -0.013, nlib: null, plib: null, ylib: null },
      { zaid: 20000, fraction: -0.044, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.014, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Barite Concrete',
    description: 'High-density barium sulfate concrete for gamma shielding',
    category: 'shielding',
    material_id: 31,
    nuclides: [
      { zaid: 1001, fraction: -0.003585, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: -0.311622, nlib: null, plib: null, ylib: null },
      { zaid: 12000, fraction: -0.001195, nlib: null, plib: null, ylib: null },
      { zaid: 13027, fraction: -0.004183, nlib: null, plib: null, ylib: null },
      { zaid: 14000, fraction: -0.010457, nlib: null, plib: null, ylib: null },
      { zaid: 16000, fraction: -0.107858, nlib: null, plib: null, ylib: null },
      { zaid: 20000, fraction: -0.050194, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.047505, nlib: null, plib: null, ylib: null },
      { zaid: 56000, fraction: -0.463401, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Borated Polyethylene',
    description: 'Polyethylene with 5% boron for neutron shielding',
    category: 'shielding',
    material_id: 32,
    nuclides: [
      { zaid: 1001, fraction: -0.125355, nlib: null, plib: null, ylib: null },
      { zaid: 5010, fraction: -0.01, nlib: null, plib: null, ylib: null },
      { zaid: 5011, fraction: -0.04, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: -0.824645, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Polyethylene (HDPE)',
    description: 'High-density polyethylene for neutron moderation',
    category: 'shielding',
    material_id: 33,
    nuclides: [
      { zaid: 1001, fraction: 2.0, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },

  // ============================================================================
  // BIOLOGICAL MATERIALS
  // ============================================================================
  {
    name: 'Soft Tissue (ICRU)',
    description: 'ICRU standard soft tissue composition',
    category: 'biological',
    material_id: 40,
    nuclides: [
      { zaid: 1001, fraction: -0.104472, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: -0.23219, nlib: null, plib: null, ylib: null },
      { zaid: 7014, fraction: -0.02488, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: -0.630238, nlib: null, plib: null, ylib: null },
      { zaid: 11023, fraction: -0.00113, nlib: null, plib: null, ylib: null },
      { zaid: 12000, fraction: -0.00013, nlib: null, plib: null, ylib: null },
      { zaid: 15031, fraction: -0.00133, nlib: null, plib: null, ylib: null },
      { zaid: 16000, fraction: -0.00199, nlib: null, plib: null, ylib: null },
      { zaid: 17000, fraction: -0.00134, nlib: null, plib: null, ylib: null },
      { zaid: 19000, fraction: -0.00199, nlib: null, plib: null, ylib: null },
      { zaid: 20000, fraction: -0.00023, nlib: null, plib: null, ylib: null },
      { zaid: 26000, fraction: -0.00005, nlib: null, plib: null, ylib: null },
      { zaid: 30000, fraction: -0.00003, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Bone (Cortical)',
    description: 'Cortical bone composition',
    category: 'biological',
    material_id: 41,
    nuclides: [
      { zaid: 1001, fraction: -0.047234, nlib: null, plib: null, ylib: null },
      { zaid: 6000, fraction: -0.144330, nlib: null, plib: null, ylib: null },
      { zaid: 7014, fraction: -0.041990, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: -0.446096, nlib: null, plib: null, ylib: null },
      { zaid: 12000, fraction: -0.002200, nlib: null, plib: null, ylib: null },
      { zaid: 15031, fraction: -0.104970, nlib: null, plib: null, ylib: null },
      { zaid: 16000, fraction: -0.003150, nlib: null, plib: null, ylib: null },
      { zaid: 20000, fraction: -0.209930, nlib: null, plib: null, ylib: null },
      { zaid: 30000, fraction: -0.000100, nlib: null, plib: null, ylib: null },
    ],
  },

  // ============================================================================
  // NUCLEAR FUELS
  // ============================================================================
  {
    name: 'Uranium Metal (Natural)',
    description: 'Metallic natural uranium',
    category: 'fuels',
    material_id: 50,
    nuclides: [
      { zaid: 92000, fraction: 1.0, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Uranium Metal (HEU 93%)',
    description: 'Highly enriched uranium (93% U-235)',
    category: 'fuels',
    material_id: 51,
    nuclides: [
      { zaid: 92235, fraction: 0.93, nlib: null, plib: null, ylib: null },
      { zaid: 92238, fraction: 0.07, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'Plutonium Metal (Weapons Grade)',
    description: 'Weapons-grade plutonium (94% Pu-239)',
    category: 'fuels',
    material_id: 52,
    nuclides: [
      { zaid: 94239, fraction: 0.94, nlib: null, plib: null, ylib: null },
      { zaid: 94240, fraction: 0.06, nlib: null, plib: null, ylib: null },
    ],
  },
  {
    name: 'MOX Fuel (5% Pu)',
    description: 'Mixed oxide fuel with 5% plutonium',
    category: 'fuels',
    material_id: 53,
    nuclides: [
      { zaid: 92238, fraction: 0.95, nlib: null, plib: null, ylib: null },
      { zaid: 94239, fraction: 0.047, nlib: null, plib: null, ylib: null },
      { zaid: 94240, fraction: 0.003, nlib: null, plib: null, ylib: null },
      { zaid: 8016, fraction: 2.0, nlib: null, plib: null, ylib: null },
    ],
  },
];

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<PresetCategory, { label: string; description: string; icon: string }> = {
  common: {
    label: 'Common',
    description: 'Frequently used materials',
    icon: '⭐',
  },
  metals: {
    label: 'Metals & Alloys',
    description: 'Pure metals and alloy compositions',
    icon: '🔧',
  },
  compounds: {
    label: 'Compounds',
    description: 'Chemical compounds and ceramics',
    icon: '🧪',
  },
  shielding: {
    label: 'Shielding',
    description: 'Radiation shielding materials',
    icon: '🛡️',
  },
  biological: {
    label: 'Biological',
    description: 'Biological tissue compositions',
    icon: '🧬',
  },
  fuels: {
    label: 'Nuclear Fuels',
    description: 'Fissile and fertile materials',
    icon: '☢️',
  },
};

/**
 * Get preset materials by category
 */
export function getPresetsByCategory(category: PresetCategory): PresetMaterial[] {
  return PRESET_MATERIALS.filter(m => m.category === category);
}

/**
 * Get all categories
 */
export function getAllCategories(): PresetCategory[] {
  return Object.keys(CATEGORY_INFO) as PresetCategory[];
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): PresetMaterial[] {
  const lowerQuery = query.toLowerCase();
  return PRESET_MATERIALS.filter(
    m => m.name.toLowerCase().includes(lowerQuery) || 
         m.description.toLowerCase().includes(lowerQuery)
  );
}
