const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./services/chatService');
const notificationService = require('./services/notificationService');
const { query } = require('./config/db');

let io;
// In-memory single-instance presence tracking for active meld chat rooms
// meldId -> Set of userIds currently in the room
const activeMeldUsers = new Map();

// In-memory per-user sliding window message rate limiter (userId -> Array of timestamps)
const userMessageRateMap = new Map();
const MAX_MESSAGES_PER_WINDOW = 10;
const WINDOW_MS = 5000; // 5 seconds

const checkMessageRateLimit = (userId) => {
  const now = Date.now();
  let timestamps = userMessageRateMap.get(userId) || [];
  // Filter out timestamps outside the sliding window
  timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
  
  if (timestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    userMessageRateMap.set(userId, timestamps);
    return false; // Rate limit exceeded
  }

  timestamps.push(now);
  userMessageRateMap.set(userId, timestamps);
  return true; // Allowed
};

/**
 * Socket.IO handshake authentication.
 * Mirrors the HTTP authenticateToken middleware: verifies the JWT (HS256 only),
 * confirms the user still exists and rejects tokens whose tokenVersion was
 * invalidated by a password reset.
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication error: Token missing'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    let userResult;
    try {
      userResult = await query(
        'SELECT id, COALESCE(token_version, 1) AS token_version FROM users WHERE id = $1',
        [decoded.id]
      );
    } catch (dbErr) {
      // Legacy schema without token_version column (same fallback as HTTP auth middleware)
      if (dbErr.message && dbErr.message.includes('token_version')) {
        userResult = await query('SELECT id FROM users WHERE id = $1', [decoded.id]);
      } else {
        throw dbErr;
      }
    }
    if (userResult.rows.length === 0) {
      return next(new Error('Authentication error: User no longer exists'));
    }

    const dbUser = userResult.rows[0];
    if (
      typeof decoded.tokenVersion === 'number' &&
      typeof dbUser.token_version === 'number' &&
      decoded.tokenVersion < dbUser.token_version
    ) {
      return next(new Error('Authentication error: Session invalidated'));
    }

    socket.user = { ...decoded, id: dbUser.id }; // attach user to socket
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid or expired token'));
  }
};

const initSocket = (server) => {
  const rawOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = new Set(rawOrigins);
  for (const o of rawOrigins) {
    try {
      const url = new URL(o);
      if (url.hostname.startsWith('www.')) {
        allowedOrigins.add(`${url.protocol}//${url.hostname.replace(/^www\./, '')}`);
      } else {
        allowedOrigins.add(`${url.protocol}//www.${url.hostname}`);
      }
    } catch {}
  }

  if (process.env.NODE_ENV === 'production' && allowedOrigins.size === 0) {
    console.error('FATAL SECURITY WARNING: CLIENT_ORIGIN environment variable is not set in production for WebSockets.');
  }

  io = new Server(server, {
    maxHttpBufferSize: 1e5, // 100KB payload limit to prevent buffer exhaustion attacks
    cors: {
      origin: (origin, callback) => {
        if (process.env.NODE_ENV === 'production') {
          if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
          }
          return callback(new Error('Socket CORS blocked'));
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for Socket.IO
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    // Auto-join personal user room for live in-app notifications
    socket.join(`user:${userId}`);

    // Join a Meld room
    socket.on('join_meld', async (meldId, callback) => {
      try {
        if (!meldId || typeof meldId !== 'string') {
          if (callback) callback({ success: false, message: 'Invalid meld ID' });
          return;
        }

        const isAuthorized = await chatService.isUserAuthorizedForMeldChat(meldId, userId);
        
        if (!isAuthorized) {
          if (callback) callback({ success: false, message: 'Unauthorized access to meld chat' });
          return;
        }

        const roomName = `meld:${meldId}`;
        socket.join(roomName);

        // Record user presence in this meld room
        if (!activeMeldUsers.has(meldId)) {
          activeMeldUsers.set(meldId, new Set());
        }
        activeMeldUsers.get(meldId).add(userId);
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Error in join_meld event:', error);
        if (callback) callback({ success: false, message: 'Server error joining room' });
      }
    });

    // Leave a Meld room
    socket.on('leave_meld', (meldId) => {
      if (!meldId || typeof meldId !== 'string') return;
      const roomName = `meld:${meldId}`;
      socket.leave(roomName);
      if (activeMeldUsers.has(meldId)) {
        activeMeldUsers.get(meldId).delete(userId);
        if (activeMeldUsers.get(meldId).size === 0) {
          activeMeldUsers.delete(meldId);
        }
      }
    });

    // Send a message to a Meld room
    socket.on('send_message', async (data, callback) => {
      try {
        if (!data || typeof data !== 'object') {
          if (callback) callback({ success: false, message: 'Invalid payload' });
          return;
        }

        const { meldId, content } = data;
        
        if (!meldId || typeof meldId !== 'string' || !content || typeof content !== 'string') {
          if (callback) callback({ success: false, message: 'Invalid payload structure' });
          return;
        }

        // Apply per-user rate limiting / spam prevention
        if (!checkMessageRateLimit(userId)) {
          if (callback) callback({ success: false, message: 'Message rate limit exceeded. Please slow down.' });
          return;
        }

        const cleanContent = content.trim();
        if (cleanContent.length === 0 || cleanContent.length > 2000) {
          if (callback) callback({ success: false, message: 'Message content must be between 1 and 2000 characters.' });
          return;
        }

        // Verify authorization again before sending (prevents room escape)
        const isAuthorized = await chatService.isUserAuthorizedForMeldChat(meldId, userId);
        if (!isAuthorized) {
          if (callback) callback({ success: false, message: 'Unauthorized to send messages to this meld' });
          return;
        }

        // Persist to DB securely
        const savedMessage = await chatService.saveMessage(meldId, userId, cleanContent);

        // Broadcast to everyone in the room
        io.to(`meld:${meldId}`).emit('new_message', savedMessage);

        // Get currently active user IDs in this chat room to avoid redundant notifications
        const activeUsersInRoom = activeMeldUsers.has(meldId) ? Array.from(activeMeldUsers.get(meldId)) : [];

        // Create in-app notifications for team members (without showing chat content)
        notificationService.notifyNewChatMessage({
          meldId,
          senderId: userId,
          senderName: savedMessage.sender_name,
          activeUserIds: activeUsersInRoom,
        }).catch((err) => console.error('Chat notification error:', err.message));
        
        if (callback) callback({ success: true, message: savedMessage });
      } catch (error) {
        console.error('Error in send_message event:', error);
        if (callback) callback({ success: false, message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      // Remove user from all active meld rooms
      for (const [meldId, users] of activeMeldUsers.entries()) {
        users.delete(userId);
        if (users.size === 0) {
          activeMeldUsers.delete(meldId);
        }
      }
      userMessageRateMap.delete(userId);
    });
  });
};

const getIo = () => {
  return io;
};

const emitNotificationToUser = (userId, notificationData) => {
  if (io && userId) {
    io.to(`user:${userId}`).emit('notification_created', notificationData);
  }
};

/**
 * Force every socket of a user out of a meld chat room (after removal / leaving),
 * so they stop receiving broadcasts for a meld they no longer belong to.
 */
const removeUserFromMeldRoom = (meldId, userId) => {
  if (!meldId || !userId) return;
  if (activeMeldUsers.has(meldId)) {
    activeMeldUsers.get(meldId).delete(userId);
    if (activeMeldUsers.get(meldId).size === 0) {
      activeMeldUsers.delete(meldId);
    }
  }
  if (io) {
    io.in(`user:${userId}`).socketsLeave(`meld:${meldId}`);
  }
};

/**
 * Disconnect all live sockets for a user (after password reset or account deletion).
 */
const disconnectUserSockets = (userId) => {
  if (io && userId) {
    io.in(`user:${userId}`).disconnectSockets(true);
  }
};

const isUserActiveInMeldChat = (meldId, userId) => {
  return activeMeldUsers.has(meldId) && activeMeldUsers.get(meldId).has(userId);
};

module.exports = {
  initSocket,
  getIo,
  emitNotificationToUser,
  isUserActiveInMeldChat,
  checkMessageRateLimit,
  authenticateSocket,
  removeUserFromMeldRoom,
  disconnectUserSockets,
};
