/**
 * Update and Backend Status Service
 * Handles auto-updates and backend process management
 */

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

interface UpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
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

  // Browser mode - direct fetch
  try {
    const response = await fetch('http://localhost:8000/healthz');
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
