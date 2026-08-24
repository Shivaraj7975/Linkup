const express = require('express');
const router = express.Router();
const {
  getSkills,
  getInterests,
  getProfile,
  updateProfile,
  getPublicUserProfile,
  linkCollegeEmailController,
  unlinkCollegeEmailController,
} = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');

// Public reference endpoints
router.get('/skills', getSkills);
router.get('/interests', getInterests);

// Public student profile endpoint for discovery, AI matching & team management
router.get('/users/:userId', getPublicUserProfile);

// Protected profile endpoints
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/profile/link-college-email', authenticateToken, linkCollegeEmailController);
router.delete('/profile/unlink-college-email', authenticateToken, unlinkCollegeEmailController);

module.exports = router;
