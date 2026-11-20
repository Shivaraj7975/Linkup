import { io } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const SOCKET_URL = rawApiUrl 
  ? rawApiUrl.replace(/\/api\/?$/, '') 
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000');

let globalSocket = null;
// Token the current socket authenticated with. If the stored token changes
// (logout + login as another user) the socket must be rebuilt, otherwise the
// new user keeps receiving the previous user's `user:<id>` room events.
let globalSocketToken = null;

export const getSocket = () => {
  const token = localStorage.getItem('meld_token');
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (globalSocket && globalSocketToken !== token) {
    disconnectSocket();
  }

  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    globalSocketToken = token;
  } else if (!globalSocket.connected && !globalSocket.active) {
    // Reuse the same instance (and its listeners) instead of creating a new
    // one while it is still connecting; only kick it if it gave up retrying.
    globalSocket.connect();
  }

  return globalSocket;
};

export const disconnectSocket = () => {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
  globalSocketToken = null;
};
