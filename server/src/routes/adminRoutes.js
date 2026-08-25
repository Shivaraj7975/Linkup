const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

// Apply auth and requireAdmin to all routes in this router
router.use(authenticateToken, requireAdmin);

// Dashboard Overview Stats
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getUsers);
router.delete('/users/:userId', adminController.deleteUser);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.patch('/users/:userId/verify', adminController.updateUserVerification);

// MELD Projects Management
router.get('/melds', adminController.getMelds);
router.delete('/melds/:meldId', adminController.deleteMeld);
router.patch('/melds/:meldId/status', adminController.updateMeldStatus);

module.exports = router;
