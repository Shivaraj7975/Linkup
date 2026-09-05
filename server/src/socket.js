const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./services/chatService');
const notificationService = require('./services/notificationService');

let io;
// In-memory single-instance presence tracking for active meld chat rooms
// meldId -> Set of userIds currently in the room
const activeMeldUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.replace(/\/$/, '') : (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173'),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication Middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const secret = process.env.NODE_ENV === 'production'
        ? process.env.JWT_SECRET
        : (process.env.JWT_SECRET || 'linkup_jwt_super_secret_key_2026_dev');

      if (!secret) {
        throw new Error('JWT_SECRET is required in production');
      }

      const decoded = jwt.verify(token, secret);
      socket.user = decoded; // attach user to socket
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    // Auto-join personal user room for live in-app notifications
    socket.join(`user:${userId}`);

    // Join a Meld room
    socket.on('join_meld', async (meldId, callback) => {
      try {
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
        const { meldId, content } = data;
        
        if (!meldId || !content || typeof content !== 'string') {
          if (callback) callback({ success: false, message: 'Invalid payload' });
          return;
        }

        const cleanContent = content.trim();
        if (cleanContent.length === 0 || cleanContent.length > 2000) {
          if (callback) callback({ success: false, message: 'Message content length invalid' });
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

const isUserActiveInMeldChat = (meldId, userId) => {
  return activeMeldUsers.has(meldId) && activeMeldUsers.get(meldId).has(userId);
};

module.exports = {
  initSocket,
  getIo,
  emitNotificationToUser,
  isUserActiveInMeldChat,
};
