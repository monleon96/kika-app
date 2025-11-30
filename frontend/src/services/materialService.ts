/**
 * Material Service
 * 
 * Client for material operations:
 * - Local storage (Tauri filesystem / browser localStorage)
 * - Backend-core processing (conversions, MCNP parsing)
 */

import { KIKA_SERVER_URL } from '../config';
import { readLocalData, writeLocalData } from './localStorageService';
import type {
  Material,
  MaterialData,
  MaterialCreateRequest,
  MaterialUpdateRequest,
  MaterialInfo,
  ParseMCNPResponse,
} from '../types/material';

// Storage key for materials
const MATERIALS_STORAGE_KEY = 'materials';

// ============================================================================
// Local Storage Operations (Tauri filesystem / browser localStorage)
// ============================================================================

/**
 * Get all materials from local storage
 */
export async function getLocalMaterials(): Promise<Material[]> {
  const materials = await readLocalData<Material[]>(MATERIALS_STORAGE_KEY);
  return materials || [];
}

/**
 * Save all materials to local storage
 */
export async function saveLocalMaterials(materials: Material[]): Promise<void> {
  await writeLocalData(MATERIALS_STORAGE_KEY, materials);
}

/**
 * Add a new material to local storage
 */
export async function addLocalMaterial(
  data: MaterialCreateRequest
): Promise<Material> {
  const materials = await getLocalMaterials();
  
  const newMaterial: Material = {
    id: crypto.randomUUID(),
    name: data.name,
    material_id: data.material_id,
    nlib: data.nlib || null,
    plib: data.plib || null,
    ylib: data.ylib || null,
    nuclides: data.nuclides || [],
    density: data.density ?? null,
    density_unit: data.density_unit ?? null,
    temperature: data.temperature ?? null,
    temperature_unit: data.temperature_unit ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  materials.unshift(newMaterial); // Add to beginning
  await saveLocalMaterials(materials);
  
  return newMaterial;
}

/**
 * Update an existing material in local storage
 */
export async function updateLocalMaterial(
  id: string,
  updates: MaterialUpdateRequest
): Promise<Material | null> {
  const materials = await getLocalMaterials();
  const index = materials.findIndex(m => m.id === id);
  
  if (index === -1) return null;
  
  const updatedMaterial: Material = {
    ...materials[index],
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.material_id !== undefined && { material_id: updates.material_id }),
    ...(updates.nlib !== undefined && { nlib: updates.nlib }),
    ...(updates.plib !== undefined && { plib: updates.plib }),
    ...(updates.ylib !== undefined && { ylib: updates.ylib }),
    ...(updates.nuclides !== undefined && { nuclides: updates.nuclides }),
    ...(updates.density !== undefined && { density: updates.density }),
    ...(updates.density_unit !== undefined && { density_unit: updates.density_unit }),
    ...(updates.temperature !== undefined && { temperature: updates.temperature }),
    ...(updates.temperature_unit !== undefined && { temperature_unit: updates.temperature_unit }),
    updated_at: new Date().toISOString(),
  };
  
  materials[index] = updatedMaterial;
  await saveLocalMaterials(materials);
  
  return updatedMaterial;
}

/**
 * Delete a material from local storage
 */
export async function deleteLocalMaterial(id: string): Promise<boolean> {
  const materials = await getLocalMaterials();
  const filtered = materials.filter(m => m.id !== id);
  
  if (filtered.length === materials.length) return false;
  
  await saveLocalMaterials(filtered);
  return true;
}

/**
 * Get a single material by ID
 */
export async function getLocalMaterial(id: string): Promise<Material | null> {
  const materials = await getLocalMaterials();
  return materials.find(m => m.id === id) || null;
}

// ============================================================================
// Backend-Core: Processing Operations
// ============================================================================

/**
 * Parse MCNP input content and extract materials
 */
export async function parseMCNPMaterials(
  fileContent: string, 
  fileName?: string
): Promise<ParseMCNPResponse> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_content: fileContent,
      file_name: fileName || 'input.txt',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to parse MCNP materials');
  }
  
  return response.json();
}

/**
 * Convert material to weight fractions
 */
export async function convertToWeightFractions(material: MaterialData): Promise<MaterialData> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/convert-to-weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to convert to weight fractions');
  }
  
  const result = await response.json();
  return result.material;
}

/**
 * Convert material to atomic fractions
 */
export async function convertToAtomicFractions(material: MaterialData): Promise<MaterialData> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/convert-to-atomic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to convert to atomic fractions');
  }
  
  const result = await response.json();
  return result.material;
}

/**
 * Expand natural elements into isotopes
 */
export async function expandNaturalElements(
  material: MaterialData,
  zaidsToExpand?: number[]
): Promise<MaterialData> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/expand-natural`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material,
      zaids_to_expand: zaidsToExpand,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to expand natural elements');
  }
  
  const result = await response.json();
  return result.material;
}

/**
 * Export material to MCNP format string
 */
export async function exportToMCNP(material: MaterialData): Promise<string> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/to-mcnp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to export to MCNP format');
  }
  
  const result = await response.json();
  return result.mcnp_text;
}

/**
 * Get material analysis/info
 */
export async function getMaterialInfo(material: MaterialData): Promise<MaterialInfo> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ material }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze material');
  }
  
  return response.json();
}

/**
 * Add a nuclide to a material (via backend processing)
 */
export async function addNuclideToMaterial(
  material: MaterialData,
  zaid: number,
  fraction: number,
  library?: string
): Promise<MaterialData> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/add-nuclide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material,
      zaid,
      fraction,
      library,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to add nuclide');
  }
  
  const result = await response.json();
  return result.material;
}

/**
 * Remove a nuclide from a material (via backend processing)
 */
export async function removeNuclideFromMaterial(
  material: MaterialData,
  zaid: number
): Promise<MaterialData> {
  const response = await fetch(`${KIKA_SERVER_URL}/api/materials/remove-nuclide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material,
      zaid,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to remove nuclide');
  }
  
  const result = await response.json();
  return result.material;
}
