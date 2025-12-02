import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { WorkspaceFile, FileFilter, FileType } from '../types/file';
import { parseACEFile, parseENDFFile, parseMCNPInputFile, parseMCTALFile } from '../services/kikaService';

/**
 * Generate a unique file ID
 */
function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface FileWorkspaceContextType {
  files: WorkspaceFile[];
  filter: FileFilter;
  isLoading: boolean;
  addFiles: (files: Array<{ name: string; path: string; content: string }>, forceType?: FileType) => Promise<void>;
  updateFileContent: (id: string, content: string) => Promise<void>;
  updateFileType: (id: string, newType: FileType) => Promise<void>;
  removeFile: (id: string) => void;
  renameFile: (id: string, newDisplayName: string) => void;
  clearAll: () => void;
  setFilter: (filter: Partial<FileFilter>) => void;
  getFilteredFiles: () => WorkspaceFile[];
  getFilesByType: (type: FileType) => WorkspaceFile[];
}

const FileWorkspaceContext = createContext<FileWorkspaceContextType | undefined>(undefined);

const DEFAULT_FILTER: FileFilter = {
  type: 'all',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

// Storage key prefix for user-specific file storage
const STORAGE_KEY_PREFIX = 'kika_workspace_';

// Helper to check if current user is a guest
const isGuestUser = (): boolean => {
  const userStr = localStorage.getItem('kika_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.is_guest === true;
    } catch {
      // Ignore parse errors
    }
  }
  return true; // No user = guest
};

// Helper to get storage key for current user (returns null for guests)
const getStorageKey = (): string | null => {
  if (isGuestUser()) {
    return null; // Guest users don't get persistence
  }
  const userStr = localStorage.getItem('kika_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.email) {
        return `${STORAGE_KEY_PREFIX}${user.email}`;
      }
    } catch {
      // Ignore parse errors
    }
  }
  return null;
};

// Serializable version of WorkspaceFile for storage (without content for space efficiency)
interface StoredFileMetadata {
  id: string;
  name: string;
  displayName: string;
  path: string;
  originalPath: string; // Store the original full path for auto-reload (especially for Tauri)
  type: FileType | null;
  status: 'ready' | 'error';
  size: number;
  uploadedAt: string;
  error?: string;
  metadata?: WorkspaceFile['metadata'];
  // Store content hash to detect changes
  contentHash?: string;
}

// Simple hash function for content comparison
const hashContent = (content: string): string => {
  let hash = 0;
  for (let i = 0; i < Math.min(content.length, 10000); i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
};

// Helper to get current user key for tracking changes
const getCurrentUserKey = (): string => {
  const userStr = localStorage.getItem('kika_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.is_guest) return 'guest';
      return user.email || 'unknown';
    } catch {
      // Ignore parse errors
    }
  }
  return 'guest';
};

export const FileWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [filter, setFilterState] = useState<FileFilter>(DEFAULT_FILTER);
  const [isLoading, setIsLoading] = useState(true);
  const currentUserRef = useRef<string>(getCurrentUserKey());

  // Check if running in Tauri
  const isTauri = '__TAURI__' in window;

  // Function to try loading file content from disk (Tauri only)
  const tryLoadFileFromDisk = async (filePath: string): Promise<string | null> => {
    if (!isTauri || !filePath || filePath === '') return null;
    
    try {
      const { readTextFile } = await import('@tauri-apps/api/fs');
      const content = await readTextFile(filePath);
      return content;
    } catch (error) {
      console.warn(`Failed to reload file from disk: ${filePath}`, error);
      return null;
    }
  };

  // Function to load files for current user
  const loadFilesForUser = useCallback(async () => {
    const storageKey = getStorageKey();
    
    // Guest users don't have persistence - start with empty workspace
    if (!storageKey) {
      setFiles([]);
      setIsLoading(false);
      return;
    }
    
    try {
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const storedFiles: StoredFileMetadata[] = JSON.parse(stored);
        
        // Convert stored metadata back to WorkspaceFile format
        // Initially set files with empty content
        const restoredFiles: WorkspaceFile[] = storedFiles.map(sf => ({
          id: sf.id,
          name: sf.name,
          displayName: sf.displayName,
          path: sf.originalPath || sf.path, // Use originalPath if available
          content: '', // Content not stored - will try to reload or show as "needs re-upload" 
          type: sf.type,
          status: sf.status === 'ready' && sf.metadata ? 'ready' : 'error',
          size: sf.size,
          uploadedAt: new Date(sf.uploadedAt),
          error: sf.error,
          metadata: sf.metadata,
        }));

        setFiles(restoredFiles);
        
        // If in Tauri, try to auto-reload file contents from disk
        if (isTauri) {
          for (const sf of storedFiles) {
            const originalPath = sf.originalPath || sf.path;
            if (originalPath && originalPath !== sf.name) {
              const content = await tryLoadFileFromDisk(originalPath);
              if (content) {
                setFiles(prev => prev.map(f => 
                  f.id === sf.id ? { ...f, content, size: new Blob([content]).size } : f
                ));
                console.log(`Auto-reloaded file from disk: ${originalPath}`);
              } else {
                console.warn(`Could not auto-reload file: ${originalPath} - needs re-upload`);
              }
            }
          }
        }
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('Error loading stored files:', error);
      setFiles([]);
    }
    setIsLoading(false);
  }, [isTauri]);

  // Load files on mount
  useEffect(() => {
    setTimeout(loadFilesForUser, 100);
  }, [loadFilesForUser]);

  // Listen for user changes (login/logout) via storage events and polling
  useEffect(() => {
    const checkUserChange = () => {
      const newUserKey = getCurrentUserKey();
      if (newUserKey !== currentUserRef.current) {
        console.log(`User changed from ${currentUserRef.current} to ${newUserKey}`);
        currentUserRef.current = newUserKey;
        // Clear current files and load new user's files
        setFiles([]);
        setIsLoading(true);
        loadFilesForUser();
      }
    };

    // Check on storage events (for cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'kika_user') {
        checkUserChange();
      }
    };

    // Also poll periodically to catch same-tab changes
    const intervalId = setInterval(checkUserChange, 500);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadFilesForUser]);

  // Save files to localStorage whenever they change (only for logged-in users)
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    const saveFiles = () => {
      try {
        const storageKey = getStorageKey();
        
        // Guest users don't get persistence
        if (!storageKey) {
          return;
        }
        
        // Only store metadata for ready files (not content - too large)
        const filesToStore: StoredFileMetadata[] = files
          .filter(f => f.status === 'ready' && f.metadata)
          .map(f => ({
            id: f.id,
            name: f.name,
            displayName: f.displayName,
            path: f.path,
            originalPath: f.path, // Store the original path for auto-reload in Tauri
            type: f.type,
            status: f.status as 'ready' | 'error',
            size: f.size,
            uploadedAt: f.uploadedAt.toISOString(),
            metadata: f.metadata,
            contentHash: hashContent(f.content),
          }));

        if (filesToStore.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(filesToStore));
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error('Error saving files to storage:', error);
      }
    };

    // Debounce saves
    const timeoutId = setTimeout(saveFiles, 500);
    return () => clearTimeout(timeoutId);
  }, [files, isLoading]);

  // Clean up legacy storage
  useEffect(() => {
    const legacyData = localStorage.getItem('workspaceFiles');
    if (legacyData) {
      console.log('Removing legacy workspaceFiles from localStorage');
      localStorage.removeItem('workspaceFiles');
    }
  }, []);

  const parseFile = useCallback(async (file: WorkspaceFile): Promise<WorkspaceFile> => {
    try {
      if (file.type === 'ace') {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'parsing' as const } : f
        ));

        const metadata = await parseACEFile(file.content, file.name);
        
        return {
          ...file,
          status: 'ready',
          metadata,
        };
      } else if (file.type === 'endf') {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'parsing' as const } : f
        ));

        const metadata = await parseENDFFile(file.content, file.name);

        return {
          ...file,
          status: 'ready',
          metadata,
          error: undefined,
        };
      } else if (file.type === 'mcnp-input') {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'parsing' as const } : f
        ));

        const metadata = await parseMCNPInputFile(file.content, file.name);

        return {
          ...file,
          status: 'ready',
          metadata,
          error: undefined,
        };
      } else if (file.type === 'mcnp-mctal') {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'parsing' as const } : f
        ));

        const metadata = await parseMCTALFile(file.content, file.name);

        return {
          ...file,
          status: 'ready',
          metadata,
          error: undefined,
        };
      }
      
      return {
        ...file,
        status: 'ready',
      };
    } catch (error) {
      return {
        ...file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, []);

  const addFiles = useCallback(async (newFiles: Array<{ name: string; path: string; content: string }>, forceType?: FileType) => {
    // forceType is required - files without a type cannot be added
    // The UI should always prompt the user to select a type before calling this function
    if (!forceType) {
      console.error('addFiles called without forceType. File type selection is required.');
      return;
    }

    const workspaceFiles: WorkspaceFile[] = newFiles.map(file => {
      return {
        id: generateFileId(),
        name: file.name,
        displayName: file.name, // Default display name is the original filename
        path: file.path,
        content: file.content,
        type: forceType,
        status: 'pending' as const,
        size: new Blob([file.content]).size,
        uploadedAt: new Date(),
      };
    });

    setFiles(prev => [...prev, ...workspaceFiles]);

    // Parse files asynchronously
    for (const file of workspaceFiles) {
      if (file.type && file.status === 'pending') {
        const parsedFile = await parseFile(file);
        setFiles(prev => prev.map(f => f.id === file.id ? parsedFile : f));
      }
    }
  }, [parseFile]);

  // Update file content (for re-uploading files after session restoration)
  const updateFileContent = useCallback(async (id: string, content: string) => {
    // Find the existing file
    const existingFile = files.find(f => f.id === id);
    if (!existingFile) return;

    // Update the file with new content
    const updatedFile: WorkspaceFile = {
      ...existingFile,
      content,
      size: new Blob([content]).size,
    };

    setFiles(prev => prev.map(f => f.id === id ? updatedFile : f));

    // Re-parse the file if it has a type
    if (updatedFile.type) {
      const parsedFile = await parseFile(updatedFile);
      setFiles(prev => prev.map(f => f.id === id ? parsedFile : f));
    }
  }, [files, parseFile]);

  // Update file type and re-parse (used when initial parsing fails and user wants to try a different type)
  const updateFileType = useCallback(async (id: string, newType: FileType) => {
    // Find the existing file
    const existingFile = files.find(f => f.id === id);
    if (!existingFile) return;

    // Update the file with new type and set to pending
    const updatedFile: WorkspaceFile = {
      ...existingFile,
      type: newType,
      status: 'pending',
      error: undefined,
      metadata: undefined,
    };

    setFiles(prev => prev.map(f => f.id === id ? updatedFile : f));

    // Re-parse the file with the new type
    const parsedFile = await parseFile(updatedFile);
    setFiles(prev => prev.map(f => f.id === id ? parsedFile : f));
  }, [files, parseFile]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const renameFile = useCallback((id: string, newDisplayName: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, displayName: newDisplayName.trim() || f.name } : f
    ));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    // Clear storage for current user (if not guest)
    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, []);

  const setFilter = useCallback((newFilter: Partial<FileFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  const getFilteredFiles = useCallback(() => {
    let filtered = [...files];

    // Apply type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(f => f.type === filter.type);
    }

    // Apply search filter (search in both name and displayName)
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.displayName.toLowerCase().includes(query) ||
        (f.metadata && 'zaid' in f.metadata && f.metadata.zaid?.toLowerCase().includes(query)) ||
        (f.metadata && 'isotope' in f.metadata && f.metadata.isotope?.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filter.sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'date':
          comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
      }

      return filter.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [files, filter]);

  const getFilesByType = useCallback((type: FileType) => {
    return files.filter(f => f.type === type && f.status === 'ready');
  }, [files]);

  const value: FileWorkspaceContextType = {
    files,
    filter,
    isLoading,
    addFiles,
    updateFileContent,
    updateFileType,
    removeFile,
    renameFile,
    clearAll,
    setFilter,
    getFilteredFiles,
    getFilesByType,
  };

  return (
    <FileWorkspaceContext.Provider value={value}>
      {children}
    </FileWorkspaceContext.Provider>
  );
};

export const useFileWorkspace = () => {
  const context = useContext(FileWorkspaceContext);
  if (!context) {
    throw new Error('useFileWorkspace must be used within FileWorkspaceProvider');
  }
  return context;
};
