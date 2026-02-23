import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'lr_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
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

export default client;
