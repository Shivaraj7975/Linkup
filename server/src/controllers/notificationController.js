const notificationService = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const data = await notificationService.getUserNotifications(req.user.id, limit);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notificationService.markAsRead(id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};

const deleteNotif = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notificationService.deleteNotification(id, req.user.id);
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const clearAllNotifs = async (req, res, next) => {
  try {
    await notificationService.clearAllNotifications(req.user.id);
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotif,
  clearAllNotifs,
};
