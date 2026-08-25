const adminService = require('../services/adminService');

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStats();
    return res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const users = await adminService.getAllUsers(search);
    return res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }
    const deleted = await adminService.deleteUser(userId);
    return res.json({ success: true, message: `User "${deleted.name}" (${deleted.email}) deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (userId === req.user.id && role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own admin role.' });
    }
    const updated = await adminService.updateUserRole(userId, role);
    return res.json({ success: true, user: updated, message: `User role updated to ${role}.` });
  } catch (error) {
    next(error);
  }
};

const updateUserVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const result = await adminService.updateUserVerification(userId, status);
    return res.json({ success: true, result, message: `User verification status updated to ${result.status}.` });
  } catch (error) {
    next(error);
  }
};

const getMelds = async (req, res, next) => {
  try {
    const { search = '', status = '' } = req.query;
    const melds = await adminService.getAllMelds(search, status);
    return res.json({ success: true, melds });
  } catch (error) {
    next(error);
  }
};

const deleteMeld = async (req, res, next) => {
  try {
    const { meldId } = req.params;
    const deleted = await adminService.deleteMeld(meldId);
    return res.json({ success: true, message: `MELD project "${deleted.title}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

const updateMeldStatus = async (req, res, next) => {
  try {
    const { meldId } = req.params;
    const { status } = req.body;
    const updated = await adminService.updateMeldStatus(meldId, status);
    return res.json({ success: true, meld: updated, message: `MELD status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUsers,
  deleteUser,
  updateUserRole,
  updateUserVerification,
  getMelds,
  deleteMeld,
  updateMeldStatus,
};
