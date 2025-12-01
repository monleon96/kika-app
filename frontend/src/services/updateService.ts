/**
 * Update and Backend Status Service
 * Handles auto-updates and backend process management
 */

import { BACKEND_URL, KIKA_SERVER_URL } from '../config';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
}

export interface DiagnosticInfo {
  appVersion: string;
  isTauri: boolean;
  authBackendUrl: string;
  authBackendStatus: 'online' | 'offline' | 'error';
  authBackendError?: string;
  coreBackendUrl: string;
  coreBackendStatus: 'online' | 'offline' | 'error';
  coreBackendError?: string;
  coreBackendVersion?: string;
  kikaLibVersion?: string;
  sidecarStatus?: string;
}

/**
 * Get sidecar status from Tauri
 */
export async function getSidecarStatus(): Promise<string> {
  if (!isTauri) {
    return 'Not running in Tauri';
  }
  
  try {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke<string>('get_sidecar_status');
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : 'Unknown'}`;
  }
}

/**
 * Get comprehensive diagnostic info for debugging
 */
export async function getDiagnosticInfo(): Promise<DiagnosticInfo> {
  const appVersion = await getAppVersion();
  const sidecarStatus = await getSidecarStatus();
  
  let authStatus: 'online' | 'offline' | 'error' = 'offline';
  let authError: string | undefined;
  let coreStatus: 'online' | 'offline' | 'error' = 'offline';
  let coreError: string | undefined;
  let coreVersion: string | undefined;
  
  // Check auth backend using Tauri HTTP client to bypass CORS
  try {
    if (isTauri) {
      const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
      const authResponse = await tauriFetch(`${BACKEND_URL}/healthz`, {
        method: 'GET',
        timeout: 10
      });
      authStatus = authResponse.ok ? 'online' : 'error';
      if (!authResponse.ok) {
        authError = `HTTP ${authResponse.status}`;
      }
    } else {
      const authResponse = await fetch(`${BACKEND_URL}/healthz`, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });
      authStatus = authResponse.ok ? 'online' : 'error';
      if (!authResponse.ok) {
        authError = `HTTP ${authResponse.status}`;
      }
    }
  } catch (e) {
    authStatus = 'error';
    authError = e instanceof Error ? e.message : 'Unknown error';
  }
  
  // Check core backend (local sidecar - no CORS issues)
  let kikaLibVersion: string | undefined;
  try {
    const coreResponse = await fetch(`${KIKA_SERVER_URL}/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (coreResponse.ok) {
      coreStatus = 'online';
      try {
        const data = await coreResponse.json();
        coreVersion = data.version || 'unknown';
        kikaLibVersion = data.kika_lib_version || 'unknown';
      } catch {
        coreVersion = 'unknown';
      }
    } else {
      coreStatus = 'error';
      coreError = `HTTP ${coreResponse.status}`;
    }
  } catch (e) {
    coreStatus = 'error';
    coreError = e instanceof Error ? e.message : 'Unknown error';
  }
  
  return {
    appVersion,
    isTauri,
    authBackendUrl: BACKEND_URL,
    authBackendStatus: authStatus,
    authBackendError: authError,
    coreBackendUrl: KIKA_SERVER_URL,
    coreBackendStatus: coreStatus,
    coreBackendError: coreError,
    coreBackendVersion: coreVersion,
    kikaLibVersion,
    sidecarStatus,
  };
}

/**
 * Check for application updates
 */
export async function checkForUpdates(): Promise<UpdateManifest | null> {
  if (!isTauri) {
    console.log('Updates only available in Tauri');
    return null;
  }

  try {
    const { checkUpdate } = await import('@tauri-apps/api/updater');

    const update = await checkUpdate();
    
    if (update.shouldUpdate && update.manifest) {
      return {
        version: update.manifest.version,
        notes: update.manifest.body || 'New version available',
        pub_date: update.manifest.date || new Date().toISOString(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to check for updates:', error);
    return null;
  }
}

/**
 * Install pending update and restart
 */
export async function installUpdateAndRestart(): Promise<void> {
  if (!isTauri) {
    throw new Error('Updates only available in Tauri');
  }

  const { installUpdate } = await import('@tauri-apps/api/updater');
  const { relaunch } = await import('@tauri-apps/api/process');

  await installUpdate();
  await relaunch();
}

/**
 * Get current application version
 */
export async function getAppVersion(): Promise<string> {
  if (!isTauri) {
    return 'dev';
  }

  try {
    const { invoke } = await import('@tauri-apps/api/tauri');
    return await invoke<string>('get_app_version');
  } catch {
    return 'unknown';
  }
}

/**
 * Start the auth backend sidecar
 */
export async function startAuthBackend(): Promise<string> {
  if (!isTauri) {
    return 'Development mode - start backend manually';
  }

  const { invoke } = await import('@tauri-apps/api/tauri');
  return await invoke<string>('start_auth_backend');
}

/**
 * Start the core backend sidecar
 */
export async function startCoreBackend(): Promise<string> {
  if (!isTauri) {
    return 'Development mode - start backend manually';
  }

  const { invoke } = await import('@tauri-apps/api/tauri');
  return await invoke<string>('start_core_backend');
}

/**
 * Stop all backend processes
 */
export async function stopBackends(): Promise<string> {
  if (!isTauri) {
    return 'Development mode';
  }

  const { invoke } = await import('@tauri-apps/api/tauri');
  return await invoke<string>('stop_backends');
}

/**
 * Check if auth backend is healthy
 */
export async function checkAuthHealth(): Promise<boolean> {
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      return await invoke<boolean>('check_auth_health');
    } catch {
      return false;
    }
  }

  // Browser mode - check the Render server (or localhost for dev)
  const authUrl = import.meta.env.VITE_BACKEND_URL || 'https://kika-backend.onrender.com';
  try {
    const response = await fetch(`${authUrl}/healthz`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if core backend is healthy
 */
export async function checkCoreHealth(): Promise<boolean> {
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      return await invoke<boolean>('check_core_health');
    } catch {
      return false;
    }
  }

  // Browser mode - direct fetch
  try {
    const response = await fetch('http://localhost:8001/healthz');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for backends to be ready
 */
export async function waitForBackends(
  timeoutMs: number = 30000,
  onProgress?: (message: string) => void
): Promise<{ auth: boolean; core: boolean }> {
  const startTime = Date.now();
  const checkInterval = 1000;

  let authReady = false;
  let coreReady = false;

  while (Date.now() - startTime < timeoutMs) {
    if (!authReady) {
      authReady = await checkAuthHealth();
      if (authReady) {
        onProgress?.('Auth backend ready');
      }
    }

    if (!coreReady) {
      coreReady = await checkCoreHealth();
      if (coreReady) {
        onProgress?.('Core backend ready');
      }
    }

    if (authReady && coreReady) {
      return { auth: true, core: true };
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  return { auth: authReady, core: coreReady };
}
