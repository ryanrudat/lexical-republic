import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../api/client';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
// Socket.io needs the origin, not the /api path
const socketUrl = apiBaseUrl.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function connectSocket(query?: { designation?: string; displayName?: string }): Socket {
  if (socket?.connected) return socket;

  socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    query: query || {},
    auth: {
      token: getStoredToken() || undefined,
    },
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
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
