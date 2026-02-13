import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(query?: { designation?: string; displayName?: string }): Socket {
  if (socket?.connected) return socket;

  socket = io({
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket', 'polling'],
    query: query || {},
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
