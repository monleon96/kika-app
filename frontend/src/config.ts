/**
 * Application Configuration
 */

// Backend API URL (Auth server - cloud hosted on Render)
// In dev mode with VITE_BACKEND_URL set, use that (for local testing)
// Otherwise, always use the Render cloud backend
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://kika-backend.onrender.com';

// KIKA Processing Server URL (local Python server for data processing)
// This is ALWAYS local, whether in Tauri (sidecar) or Dev (local process)
export const KIKA_SERVER_URL = import.meta.env.VITE_KIKA_SERVER_URL || 'http://localhost:8001';

// API endpoints
export const API_ENDPOINTS = {
  health: '/healthz',
  login: '/login',
  register: '/register',
  users: '/users',
  verify: '/verify',
  passwordForgot: '/password/forgot',
  passwordReset: '/password/reset',
} as const;

export default {
  BACKEND_URL,
  API_ENDPOINTS,
};
