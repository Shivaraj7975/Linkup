const express = require('express');
const router = express.Router();
const linkupController = require('../controllers/linkupController');
const { authenticateToken } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');

// Public/Filtered Discovery Linkups List
router.get('/linkups', optionalAuth, linkupController.getLinkups);

// Create Linkup (Auth required)
router.post('/linkups', authenticateToken, linkupController.createLinkup);

// Get Single Linkup Details by ID (Optional Auth to check contextual relationship)
router.get('/linkups/:id', optionalAuth, linkupController.getLinkupById);

// Edit Linkup (Auth required, Creator ONLY)
router.put('/linkups/:id', authenticateToken, linkupController.updateLinkup);

// Delete Linkup (Auth required, Creator ONLY)
router.delete('/linkups/:id', authenticateToken, linkupController.deleteLinkup);

// Submit Join Request (Auth required)
router.post('/linkups/:linkupId/join', authenticateToken, linkupController.requestToJoin);

// Get Join Requests for a Linkup (Auth required, Creator ONLY)
router.get('/linkups/:linkupId/requests', authenticateToken, linkupController.getRequests);

// Accept Join Request (Auth required, Creator ONLY)
router.post('/join-requests/:requestId/accept', authenticateToken, linkupController.acceptRequest);

// Reject Join Request (Auth required, Creator ONLY)
router.post('/join-requests/:requestId/reject', authenticateToken, linkupController.rejectRequest);

// Remove Team Member (Auth required, Creator ONLY)
router.delete('/linkups/:linkupId/members/:userId', authenticateToken, linkupController.removeMember);

// Get Ranked AI Candidate Matches for a Linkup (Auth required)
router.get('/linkups/:linkupId/matches', authenticateToken, linkupController.getLinkupMatches);

module.exports = router;
