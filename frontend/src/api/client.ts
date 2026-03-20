import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'lr_token';

// Migration: clear stale localStorage token from before sessionStorage switch.
// Without this, the old token could leak into cookie-based auth and cause role
// confusion (e.g. student tab inheriting a teacher session).
try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Backend origin for resolving relative upload paths (e.g. /uploads/briefings/uuid.mp4)
// In dev: empty (relative paths work via Vite proxy)
// In prod: full backend URL (different domain from frontend)
const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

export function resolveUploadUrl(path: string): string {
  if (!path) return path;
  // Already absolute URL — return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Relative /uploads path — prepend backend origin
  if (path.startsWith('/uploads')) return `${backendOrigin}${path}`;
  // API path (e.g. /api/dictionary/welcome-video) — prepend backend origin
  if (path.startsWith('/api/')) return `${backendOrigin}${path}`;
  return path;
}

const client = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token to every request (fixes Safari third-party cookie blocking)
client.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (expired/invalid session) — clear stale token and redirect to login.
// Excludes /auth endpoints: login 401 = bad credentials (handled by Login component),
// /auth/me 401 = unauthenticated (handled by studentStore.refresh → React Router).
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';
      const isAuthEndpoint = url.startsWith('/auth/') || url.startsWith('/api/auth/');
      if (!isAuthEndpoint) {
        clearStoredToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default client;
