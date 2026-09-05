import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const SOCKET_URL = rawApiUrl 
  ? rawApiUrl.replace(/\/api\/?$/, '') 
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000');

let globalSocket = null;

export const getSocket = () => {
  const token = localStorage.getItem('meld_token') || localStorage.getItem('linkup_token');
  if (!token) {
    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }
    return null;
  }

  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
  }

  return globalSocket;
};

export const disconnectSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
};
