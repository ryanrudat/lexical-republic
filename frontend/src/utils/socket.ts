import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../api/client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
// Socket.io needs the origin, not the /api path
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

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
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
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
      socket.connect();
    }
  });
}
