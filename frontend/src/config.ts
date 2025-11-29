/**
 * Application Configuration
 */

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

// Backend API URL
// Use environment variable or default to production backend
// If running in Tauri, default to localhost:8000 (local sidecar)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (isTauri ? 'http://localhost:8000' : 'https://kika-backend.onrender.com');

// KIKA Processing Server URL (local Python server)
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
