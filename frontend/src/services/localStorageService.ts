/**
 * Local Storage Service
 * 
 * Unified storage abstraction for both Tauri (filesystem) and web (localStorage).
 * In Tauri mode, stores data in the app's data directory.
 * In web mode, uses browser localStorage as fallback.
 */

const isTauri = '__TAURI__' in window;

// Storage directory name within app data
const STORAGE_DIR = 'user-data';

/**
 * Get the full path for a storage file in Tauri mode
 */
async function getStoragePath(filename: string): Promise<string> {
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const appData = await appDataDir();
  return join(appData, STORAGE_DIR, filename);
}

/**
 * Ensure the storage directory exists in Tauri mode
 */
async function ensureStorageDir(): Promise<void> {
  if (!isTauri) return;
  
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const { createDir, exists } = await import('@tauri-apps/api/fs');
  
  const appData = await appDataDir();
  const storageDir = await join(appData, STORAGE_DIR);
  
  const dirExists = await exists(storageDir);
  if (!dirExists) {
    await createDir(storageDir, { recursive: true });
  }
}

/**
 * Read data from local storage
 * @param key The storage key (becomes filename.json in Tauri)
 * @returns The parsed data or null if not found
 */
export async function readLocalData<T>(key: string): Promise<T | null> {
  try {
    if (isTauri) {
      const { readTextFile } = await import('@tauri-apps/api/fs');
      const { exists } = await import('@tauri-apps/api/fs');
      
      const filePath = await getStoragePath(`${key}.json`);
      const fileExists = await exists(filePath);
      
      if (!fileExists) {
        return null;
      }
      
      const content = await readTextFile(filePath);
      return JSON.parse(content) as T;
    } else {
      // Web fallback: localStorage
      const data = localStorage.getItem(`kika-${key}`);
      if (!data) return null;
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading local data for key "${key}":`, error);
    return null;
  }
}

/**
 * Write data to local storage
 * @param key The storage key (becomes filename.json in Tauri)
 * @param data The data to store
 */
export async function writeLocalData<T>(key: string, data: T): Promise<void> {
  try {
    if (isTauri) {
      await ensureStorageDir();
      
      const { writeTextFile } = await import('@tauri-apps/api/fs');
      const filePath = await getStoragePath(`${key}.json`);
      
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
    } else {
      // Web fallback: localStorage
      localStorage.setItem(`kika-${key}`, JSON.stringify(data));
    }
  } catch (error) {
    console.error(`Error writing local data for key "${key}":`, error);
    throw error;
  }
}

/**
 * Delete data from local storage
 * @param key The storage key
 */
export async function deleteLocalData(key: string): Promise<void> {
  try {
    if (isTauri) {
      const { removeFile, exists } = await import('@tauri-apps/api/fs');
      const filePath = await getStoragePath(`${key}.json`);
      
      const fileExists = await exists(filePath);
      if (fileExists) {
        await removeFile(filePath);
      }
    } else {
      // Web fallback: localStorage
      localStorage.removeItem(`kika-${key}`);
    }
  } catch (error) {
    console.error(`Error deleting local data for key "${key}":`, error);
    throw error;
  }
}

/**
 * Check if data exists in local storage
 * @param key The storage key
 */
export async function existsLocalData(key: string): Promise<boolean> {
  try {
    if (isTauri) {
      const { exists } = await import('@tauri-apps/api/fs');
      const filePath = await getStoragePath(`${key}.json`);
      return exists(filePath);
    } else {
      return localStorage.getItem(`kika-${key}`) !== null;
    }
  } catch (error) {
    console.error(`Error checking local data for key "${key}":`, error);
    return false;
  }
}

/**
 * Get the storage location info (for debugging/display)
 */
export async function getStorageInfo(): Promise<{ type: string; location: string }> {
  if (isTauri) {
    const { appDataDir, join } = await import('@tauri-apps/api/path');
    const appData = await appDataDir();
    const storageDir = await join(appData, STORAGE_DIR);
    return { type: 'filesystem', location: storageDir };
  } else {
    return { type: 'localStorage', location: 'Browser localStorage' };
  }
}
