const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const chatService = require('./services/chatService');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CLIENT_ORIGIN 
        : (process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
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
    console.log(`Socket connected: ${socket.user.id}`);

    // Join a Meld room
    socket.on('join_meld', async (meldId, callback) => {
      try {
        const isAuthorized = await chatService.isUserAuthorizedForMeldChat(meldId, socket.user.id);
        
        if (!isAuthorized) {
          if (callback) callback({ success: false, message: 'Unauthorized access to meld chat' });
          return;
        }

        const roomName = `meld:${meldId}`;
        socket.join(roomName);
        console.log(`User ${socket.user.id} joined room ${roomName}`);
        
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Error in join_meld event:', error);
        if (callback) callback({ success: false, message: 'Server error joining room' });
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
        const isAuthorized = await chatService.isUserAuthorizedForMeldChat(meldId, socket.user.id);
        if (!isAuthorized) {
          if (callback) callback({ success: false, message: 'Unauthorized to send messages to this meld' });
          return;
        }

        // Persist to DB securely
        const savedMessage = await chatService.saveMessage(meldId, socket.user.id, cleanContent);

        // Broadcast to everyone in the room (including sender if desired, or we can use socket.to().emit)
        io.to(`meld:${meldId}`).emit('new_message', savedMessage);
        
        if (callback) callback({ success: true, message: savedMessage });
      } catch (error) {
        console.error('Error in send_message event:', error);
        if (callback) callback({ success: false, message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.id}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIo,
};
