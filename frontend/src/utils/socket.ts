import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../api/client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
// Socket.io needs the origin, not the /api path
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

let socket: Socket | null = null;
// Defensive guard against double-registration of the core status listeners
// (connect/disconnect/connect_error) if connectSocket() is ever refactored to
// lose its early-return branch for stale sockets. Reset in disconnectSocket()
// so a fresh socket instance gets fresh listeners. App.tsx listeners are
// untouched — only the ones owned by this module are tracked.
let coreListenersAttached = false;

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type StatusListener = (status: SocketStatus, error?: string) => void;
const statusListeners = new Set<StatusListener>();

function notifyStatus(status: SocketStatus, error?: string) {
  statusListeners.forEach((fn) => fn(status, error));
}

export function onSocketStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  // Immediately notify current state
  if (socket?.connected) fn('connected');
  else if (socket) fn('connecting');
  else fn('disconnected');
  return () => { statusListeners.delete(fn); };
}

/**
 * Decode a JWT payload without verification and return its `exp` (unix seconds)
 * if present. Uses built-in `atob` — no crypto validation, we just need to
 * detect expiry locally to avoid silent stuck-connecting states.
 */
function getTokenExp(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(): boolean {
  const exp = getTokenExp(getStoredToken());
  if (exp == null) return false; // unknown — don't treat as expired
  return exp < Date.now() / 1000;
}

/**
 * Signal to the app that the stored JWT has expired and a re-auth is needed.
 * The axios client interceptor already handles 401s by redirecting to /login,
 * but a silent socket `connect_error` would never trigger that path. Emitting
 * a DOM event keeps socket.ts free of store imports while giving the app a
 * hook to react (or let the next HTTP 401 take over naturally).
 */
function signalAuthRequired() {
  console.warn('[socket] JWT expired, re-auth required');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:required'));
  }
}

export function connectSocket(query?: { designation?: string; displayName?: string }): Socket {
  if (socket?.connected) return socket;

  // If we have a stale disconnected socket, reconnect it instead of
  // destroying it — removeAllListeners() would wipe event handlers
  // registered by App.tsx (session:clarity-message, session:task-command, etc.)
  if (socket) {
    notifyStatus('connecting');
    socket.connect();
    return socket;
  }

  notifyStatus('connecting');

  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    query: query || {},
    auth: {
      token: getStoredToken() || undefined,
    },
  });

  if (!coreListenersAttached) {
    socket.on('connect', () => {
      notifyStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      // 'io server disconnect' means the server forced disconnect — don't auto-reconnect
      if (reason === 'io server disconnect') {
        notifyStatus('disconnected');
      } else {
        // Socket.IO will auto-reconnect for transport issues
        notifyStatus('connecting');
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] connection error:', err.message);
      notifyStatus('error', err.message);
      // If the stored token has expired, the server will reject every
      // reconnect attempt silently. Surface it so the app can prompt re-login.
      if (isTokenExpired()) {
        signalAuthRequired();
      }
    });

    coreListenersAttached = true;
  }

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    coreListenersAttached = false;
    notifyStatus('disconnected');
  }
}

export function joinWeekRoom(weekId: string) {
  if (socket?.connected) {
    socket.emit('join:week', weekId);
  }
}

export function leaveWeekRoom(weekId: string) {
  if (socket?.connected) {
    socket.emit('leave:week', weekId);
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Reconnect immediately when browser tab regains focus.
// Browsers throttle backgrounded tabs, causing Socket.IO heartbeats to
// time out and the server to drop the connection. Without this, the socket
// stays in "connecting" state until Socket.IO's exponential backoff fires.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket && !socket.connected) {
      // If the JWT has expired while the tab was idle, reconnect attempts
      // will fail silently on the server side. Signal re-auth instead of
      // spinning in "connecting" forever.
      if (isTokenExpired()) {
        signalAuthRequired();
        return;
      }
      socket.connect();
    }
  });
}
