const chatService = require('../services/chatService');

const getMeldMessages = async (req, res) => {
  try {
    const { meldId } = req.params;
    const userId = req.user.id; // from authMiddleware

    // 1. Authorize: only Creator or ACTIVE members can fetch messages
    const isAuthorized = await chatService.isUserAuthorizedForMeldChat(meldId, userId);
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You must be an active member of this Meld to view chat history.',
      });
    }

    // 2. Fetch messages
    const before = req.query.before;
    const messages = await chatService.getRecentMessages(meldId, 50, before);
    
    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    // Generic error to prevent leaking DB info
    return res.status(500).json({
      success: false,
      message: 'Failed to load chat history.',
    });
  }
};

module.exports = {
  getMeldMessages,
};
