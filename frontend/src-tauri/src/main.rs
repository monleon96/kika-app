// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::sync::Mutex;
use tauri::api::process::{Command, CommandChild};
use tauri::{Manager, State};

// Store backend process handles
struct BackendProcesses {
    auth: Mutex<Option<CommandChild>>,
    core: Mutex<Option<CommandChild>>,
}

// Backend URL configuration
fn get_auth_backend_url() -> String {
    env::var("KIKA_AUTH_URL").unwrap_or_else(|_| "http://127.0.0.1:8000".to_string())
}

fn get_core_backend_url() -> String {
    env::var("KIKA_CORE_URL").unwrap_or_else(|_| "http://127.0.0.1:8001".to_string())
}

// Start the auth backend sidecar
#[tauri::command]
async fn start_auth_backend(state: State<'_, BackendProcesses>) -> Result<String, String> {
    let mut auth_guard = state.auth.lock().map_err(|e| e.to_string())?;
    
    if auth_guard.is_some() {
        return Ok("Auth backend already running".to_string());
    }
    
    // Try to start sidecar (for bundled app)
    let result = Command::new_sidecar("kika-backend-auth")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .spawn();
    
    match result {
        Ok((mut _rx, child)) => {
            *auth_guard = Some(child);
            Ok("Auth backend started".to_string())
        }
        Err(e) => {
            // In development, the backend might be started manually
            Err(format!("Failed to start auth backend: {}. In development mode, start it manually.", e))
        }
    }
}

// Start the core backend sidecar
#[tauri::command]
async fn start_core_backend(state: State<'_, BackendProcesses>) -> Result<String, String> {
    let mut core_guard = state.core.lock().map_err(|e| e.to_string())?;
    
    if core_guard.is_some() {
        return Ok("Core backend already running".to_string());
    }
    
    // Try to start sidecar (for bundled app)
    let result = Command::new_sidecar("kika-backend-core")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .spawn();
    
    match result {
        Ok((mut _rx, child)) => {
            *core_guard = Some(child);
            Ok("Core backend started".to_string())
        }
        Err(e) => {
            Err(format!("Failed to start core backend: {}. In development mode, start it manually.", e))
        }
    }
}

// Stop backend processes
#[tauri::command]
async fn stop_backends(state: State<'_, BackendProcesses>) -> Result<String, String> {
    let mut auth_guard = state.auth.lock().map_err(|e| e.to_string())?;
    let mut core_guard = state.core.lock().map_err(|e| e.to_string())?;
    
    if let Some(child) = auth_guard.take() {
        let _ = child.kill();
    }
    if let Some(child) = core_guard.take() {
        let _ = child.kill();
    }
    
    Ok("Backends stopped".to_string())
}

// Check if auth backend is healthy
#[tauri::command]
async fn check_auth_health() -> Result<bool, String> {
    let url = format!("{}/healthz", get_auth_backend_url());
    
    match reqwest::get(&url).await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

// Check if core backend is healthy
#[tauri::command]
async fn check_core_health() -> Result<bool, String> {
    let url = format!("{}/healthz", get_core_backend_url());
    
    match reqwest::get(&url).await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

// Legacy: check backend health (auth)
#[tauri::command]
async fn check_backend_health() -> Result<bool, String> {
    check_auth_health().await
}

// Call Python API endpoint
#[tauri::command]
async fn call_backend_api(
    endpoint: String,
    method: String,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let backend_url = get_auth_backend_url();
    let url = format!("{}{}", backend_url, endpoint);
    let client = reqwest::Client::new();
    
    let response = match method.as_str() {
        "GET" => client.get(&url).send().await,
        "POST" => {
            let req = client.post(&url);
            if let Some(data) = body {
                req.json(&data).send().await
            } else {
                req.send().await
            }
        }
        _ => return Err("Unsupported HTTP method".to_string()),
    };
    
    match response {
        Ok(resp) => {
            match resp.json::<serde_json::Value>().await {
                Ok(data) => Ok(data),
                Err(e) => Err(format!("Failed to parse response: {}", e)),
            }
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
}

// Read file from local filesystem
#[tauri::command]
async fn read_local_file(path: String) -> Result<String, String> {
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

// Get app version
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .manage(BackendProcesses {
            auth: Mutex::new(None),
            core: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            check_backend_health,
            check_auth_health,
            check_core_health,
            call_backend_api,
            read_local_file,
            start_auth_backend,
            start_core_backend,
            stop_backends,
            get_app_version,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_window("main").unwrap();
                window.open_devtools();
            }
            
            // In production, try to start backends automatically
            #[cfg(not(debug_assertions))]
            {
                let app_handle = app.handle();
                tauri::async_runtime::spawn(async move {
                    // Give the app a moment to initialize
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    
                    // Start backends - errors are logged but don't prevent app from starting
                    if let Err(e) = start_sidecar_backends(&app_handle).await {
                        log::warn!("Could not auto-start backends: {}", e);
                    }
                });
            }
            
            Ok(())
        })
        .on_window_event(|event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event.event() {
                // Stop backends when the window is closed
                let state: State<BackendProcesses> = event.window().state();
                if let Ok(mut auth) = state.auth.lock() {
                    if let Some(child) = auth.take() {
                        let _ = child.kill();
                    }
                }
                if let Ok(mut core) = state.core.lock() {
                    if let Some(child) = core.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(debug_assertions))]
async fn start_sidecar_backends(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::api::process::Command;
    
    // Start auth backend
    if let Ok((_, child)) = Command::new_sidecar("kika-backend-auth")
        .map_err(|e| e.to_string())?
        .spawn()
    {
        let state: State<BackendProcesses> = app.state();
        if let Ok(mut auth) = state.auth.lock() {
            *auth = Some(child);
        }
    }
    
    // Wait for auth to be ready
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    
    // Start core backend
    if let Ok((_, child)) = Command::new_sidecar("kika-backend-core")
        .map_err(|e| e.to_string())?
        .spawn()
    {
        let state: State<BackendProcesses> = app.state();
        if let Ok(mut core) = state.core.lock() {
            *core = Some(child);
        }
    }
    
    Ok(())
}
