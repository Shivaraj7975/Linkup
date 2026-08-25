const express = require('express');
const router = express.Router();
const meldController = require('../controllers/meldController');
const { authenticateToken } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optionalAuth');

// Public/Filtered Discovery Melds List
router.get('/melds', optionalAuth, meldController.getLinkups);
router.get('/linkups', optionalAuth, meldController.getLinkups);

// Create Meld (Auth required)
router.post('/melds', authenticateToken, meldController.createLinkup);
router.post('/linkups', authenticateToken, meldController.createLinkup);

// Get Single Meld Details by ID
router.get('/melds/:id', optionalAuth, meldController.getLinkupById);
router.get('/linkups/:id', optionalAuth, meldController.getLinkupById);

// Edit Meld (Auth required, Creator ONLY)
router.put('/melds/:id', authenticateToken, meldController.updateLinkup);
router.put('/linkups/:id', authenticateToken, meldController.updateLinkup);

// Delete Meld (Auth required, Creator ONLY)
router.delete('/melds/:id', authenticateToken, meldController.deleteLinkup);
router.delete('/linkups/:id', authenticateToken, meldController.deleteLinkup);

// Submit Join Request (Auth required)
router.post('/melds/:linkupId/join', authenticateToken, meldController.requestToJoin);
router.post('/linkups/:linkupId/join', authenticateToken, meldController.requestToJoin);

// Get Join Requests for a Meld (Auth required, Creator ONLY)
router.get('/melds/:linkupId/requests', authenticateToken, meldController.getRequests);
router.get('/linkups/:linkupId/requests', authenticateToken, meldController.getRequests);

// Accept Join Request (Auth required, Creator ONLY)
router.post('/join-requests/:requestId/accept', authenticateToken, meldController.acceptRequest);

// Reject Join Request (Auth required, Creator ONLY)
router.post('/join-requests/:requestId/reject', authenticateToken, meldController.rejectRequest);

// Remove Team Member (Auth required, Creator ONLY)
router.delete('/melds/:linkupId/members/:userId', authenticateToken, meldController.removeMember);
router.delete('/linkups/:linkupId/members/:userId', authenticateToken, meldController.removeMember);

// Get Ranked AI Candidate Matches for a Meld (Auth required)
router.get('/melds/:linkupId/matches', authenticateToken, meldController.getLinkupMatches);
router.get('/linkups/:linkupId/matches', authenticateToken, meldController.getLinkupMatches);

// Invite a user to a Meld (Auth required, Creator ONLY)
router.post('/melds/:linkupId/invite', authenticateToken, meldController.inviteUser);
router.post('/linkups/:linkupId/invite', authenticateToken, meldController.inviteUser);

// Leave a Meld (Auth required, Member ONLY)
router.post('/melds/:linkupId/leave', authenticateToken, meldController.leaveLinkupHandler);
router.post('/linkups/:linkupId/leave', authenticateToken, meldController.leaveLinkupHandler);

module.exports = router;
