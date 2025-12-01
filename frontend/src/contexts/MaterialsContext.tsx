/**
 * Materials Context
 * 
 * Manages the state of user materials stored locally on the device.
 * Uses Tauri filesystem API for desktop app, localStorage for web.
 */

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react';
import {
  getLocalMaterials,
  addLocalMaterial,
  updateLocalMaterial,
  deleteLocalMaterial,
  convertToWeightFractions,
  convertToAtomicFractions,
  expandNaturalElements,
  exportToMCNP,
  getMaterialInfo,
} from '../services/materialService';
import type {
  Material,
  MaterialData,
  MaterialCreateRequest,
  MaterialUpdateRequest,
  MaterialInfo,
} from '../types/material';

interface MaterialsContextType {
  // State
  materials: Material[];
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  refreshMaterials: () => Promise<void>;
  addMaterial: (data: MaterialCreateRequest) => Promise<Material>;
  saveMaterial: (id: string, data: MaterialUpdateRequest) => Promise<Material>;
  removeMaterial: (id: string) => Promise<void>;
  
  // Processing operations (modifies local state, requires save to persist)
  convertMaterialToWeight: (id: string) => Promise<void>;
  convertMaterialToAtomic: (id: string) => Promise<void>;
  expandMaterialNaturalElements: (id: string, zaids?: number[]) => Promise<void>;
  
  // Export operations
  getMaterialMCNP: (id: string) => Promise<string>;
  getMaterialAnalysis: (id: string) => Promise<MaterialInfo>;
  
  // Local editing state (for unsaved changes)
  editingMaterial: Material | null;
  setEditingMaterial: (material: Material | null) => void;
  updateEditingMaterial: (updates: Partial<MaterialData>) => void;
  saveEditingMaterial: () => Promise<Material | null>;
  discardEditingChanges: () => void;
}

const MaterialsContext = createContext<MaterialsContextType | null>(null);

export const useMaterials = () => {
  const context = useContext(MaterialsContext);
  if (!context) {
    throw new Error('useMaterials must be used within MaterialsProvider');
  }
  return context;
};

interface MaterialsProviderProps {
  children: ReactNode;
}

export const MaterialsProvider: React.FC<MaterialsProviderProps> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Load materials on mount
  const refreshMaterials = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const localMaterials = await getLocalMaterials();
      setMaterials(localMaterials);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load materials';
      setError(message);
      console.error('Failed to load materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMaterials();
  }, [refreshMaterials]);

  // Add a new material
  const addMaterial = useCallback(async (data: MaterialCreateRequest): Promise<Material> => {
    setError(null);
    
    try {
      const newMaterial = await addLocalMaterial(data);
      setMaterials(prev => [newMaterial, ...prev]);
      return newMaterial;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create material';
      setError(message);
      throw err;
    }
  }, []);

  // Save/update a material
  const saveMaterial = useCallback(async (
    id: string, 
    data: MaterialUpdateRequest
  ): Promise<Material> => {
    setError(null);
    
    try {
      const result = await updateLocalMaterial(id, data);
      if (!result) throw new Error('Material not found');
      
      setMaterials(prev => prev.map(m => m.id === id ? result : m));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update material';
      setError(message);
      throw err;
    }
  }, []);

  // Remove a material
  const removeMaterial = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await deleteLocalMaterial(id);
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete material';
      setError(message);
      throw err;
    }
  }, []);

  // Convert material to weight fractions
  const convertMaterialToWeight = useCallback(async (id: string): Promise<void> => {
    // Wait for materials to load
    if (isLoading) {
      throw new Error('Materials are still loading. Please wait.');
    }
    
    const material = materials.find(m => m.id === id);
    if (!material) throw new Error('Material not found');
    
    const materialData: MaterialData = {
      material_id: material.material_id,
      nlib: material.nlib,
      plib: material.plib,
      ylib: material.ylib,
      nuclides: material.nuclides,
    };
    
    const converted = await convertToWeightFractions(materialData);
    
    // Update in state and persist
    await saveMaterial(id, {
      nuclides: converted.nuclides,
    });
  }, [materials, saveMaterial]);

  // Convert material to atomic fractions
  const convertMaterialToAtomic = useCallback(async (id: string): Promise<void> => {
    if (isLoading) {
      throw new Error('Materials are still loading. Please wait.');
    }
    
    const material = materials.find(m => m.id === id);
    if (!material) throw new Error('Material not found');
    
    const materialData: MaterialData = {
      material_id: material.material_id,
      nlib: material.nlib,
      plib: material.plib,
      ylib: material.ylib,
      nuclides: material.nuclides,
    };
    
    const converted = await convertToAtomicFractions(materialData);
    
    await saveMaterial(id, {
      nuclides: converted.nuclides,
    });
  }, [materials, saveMaterial, isLoading]);

  // Expand natural elements
  const expandMaterialNaturalElements = useCallback(async (
    id: string, 
    zaids?: number[]
  ): Promise<void> => {
    if (isLoading) {
      throw new Error('Materials are still loading. Please wait.');
    }
    
    const material = materials.find(m => m.id === id);
    if (!material) throw new Error('Material not found');
    
    const materialData: MaterialData = {
      material_id: material.material_id,
      nlib: material.nlib,
      plib: material.plib,
      ylib: material.ylib,
      nuclides: material.nuclides,
    };
    
    const expanded = await expandNaturalElements(materialData, zaids);
    
    await saveMaterial(id, {
      nuclides: expanded.nuclides,
    });
  }, [materials, saveMaterial, isLoading]);

  // Get MCNP formatted output
  const getMaterialMCNP = useCallback(async (id: string): Promise<string> => {
    if (isLoading) {
      throw new Error('Materials are still loading. Please wait.');
    }
    
    const material = materials.find(m => m.id === id);
    if (!material) throw new Error('Material not found');
    
    const materialData: MaterialData = {
      material_id: material.material_id,
      nlib: material.nlib,
      plib: material.plib,
      ylib: material.ylib,
      nuclides: material.nuclides,
    };
    
    return exportToMCNP(materialData);
  }, [materials, isLoading]);

  // Get material analysis
  const getMaterialAnalysis = useCallback(async (id: string): Promise<MaterialInfo> => {
    if (isLoading) {
      throw new Error('Materials are still loading. Please wait.');
    }
    
    const material = materials.find(m => m.id === id);
    if (!material) throw new Error('Material not found');
    
    const materialData: MaterialData = {
      material_id: material.material_id,
      nlib: material.nlib,
      plib: material.plib,
      ylib: material.ylib,
      nuclides: material.nuclides,
    };
    
    return getMaterialInfo(materialData);
  }, [materials, isLoading]);

  // Update editing material locally (without saving)
  const updateEditingMaterial = useCallback((updates: Partial<MaterialData>) => {
    if (!editingMaterial) return;
    
    setEditingMaterial(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ...updates,
        updated_at: new Date().toISOString(),
      };
    });
  }, [editingMaterial]);

  // Save editing material to storage
  const saveEditingMaterial = useCallback(async (): Promise<Material | null> => {
    if (!editingMaterial) return null;
    
    const updates: MaterialUpdateRequest = {
      name: editingMaterial.name,
      material_id: editingMaterial.material_id,
      nlib: editingMaterial.nlib,
      plib: editingMaterial.plib,
      ylib: editingMaterial.ylib,
      nuclides: editingMaterial.nuclides,
    };
    
    const saved = await saveMaterial(editingMaterial.id, updates);
    setEditingMaterial(null);
    return saved;
  }, [editingMaterial, saveMaterial]);

  // Discard editing changes
  const discardEditingChanges = useCallback(() => {
    setEditingMaterial(null);
  }, []);

  const value: MaterialsContextType = {
    materials,
    isLoading,
    error,
    refreshMaterials,
    addMaterial,
    saveMaterial,
    removeMaterial,
    convertMaterialToWeight,
    convertMaterialToAtomic,
    expandMaterialNaturalElements,
    getMaterialMCNP,
    getMaterialAnalysis,
    editingMaterial,
    setEditingMaterial,
    updateEditingMaterial,
    saveEditingMaterial,
    discardEditingChanges,
  };

  return (
    <MaterialsContext.Provider value={value}>
      {children}
    </MaterialsContext.Provider>
  );
};
