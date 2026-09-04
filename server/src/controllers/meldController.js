const linkupService = require('../services/meldService');

/**
 * POST /api/linkups
 * Create a new Linkup
 */
const createLinkup = async (req, res, next) => {
  try {
    const { title, description, category, requiredSkills, maxMembers, commitmentLevel, projectDuration } = req.body;

    if (!title || !description || !category || !commitmentLevel || !projectDuration) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, commitmentLevel, and projectDuration.',
      });
    }

    const createdLinkup = await linkupService.createLinkup(req.user.id, {
      title,
      description,
      category,
      requiredSkills,
      maxMembers: maxMembers || 4,
      commitmentLevel,
      projectDuration,
    });

    return res.status(201).json({
      success: true,
      message: 'MELD created successfully!',
      meld: createdLinkup,
      linkup: createdLinkup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/linkups
 * Get/Search Linkups
 */
const getLinkups = async (req, res, next) => {
  try {
    const { category, skill, status, search, college, availability, creatorId, memberUserId } = req.query;
    const linkups = await linkupService.getLinkups({ category, skill, status, search, college, availability, creatorId, memberUserId });
    return res.json({
      success: true,
      count: linkups.length,
      melds: linkups,
      linkups,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/linkups/:id
 * Get detailed single Linkup by ID
 */
const getLinkupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;

    const linkup = await linkupService.getLinkupById(id, currentUserId);
    if (!linkup) {
      return res.status(404).json({
        success: false,
        message: 'MELD not found.',
      });
    }

    return res.json({
      success: true,
      meld: linkup,
      linkup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/linkups/:id
 * Update Linkup (Creator ONLY)
 */
const updateLinkup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedLinkup = await linkupService.updateLinkup(id, req.user.id, req.body);
    return res.json({
      success: true,
      message: 'MELD updated successfully!',
      meld: updatedLinkup,
      linkup: updatedLinkup,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * DELETE /api/linkups/:id
 * Delete Linkup (Creator ONLY)
 */
const deleteLinkup = async (req, res, next) => {
  try {
    const { id } = req.params;
    await linkupService.deleteLinkup(id, req.user.id);
    return res.json({
      success: true,
      message: 'Linkup deleted successfully.',
    });
  } catch (error) {
    if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/linkups/:linkupId/join
 * Submit Join Request
 */
const requestToJoin = async (req, res, next) => {
  try {
    const { linkupId } = req.params;
    const { message } = req.body;

    const request = await linkupService.createJoinRequest(linkupId, req.user.id, message);
    return res.status(201).json({
      success: true,
      message: 'Join request submitted successfully!',
      request,
    });
  } catch (error) {
    if (
      error.message.includes('own Linkup') ||
      error.message.includes('already a member') ||
      error.message.includes('already submitted') ||
      error.message.includes('maximum capacity') ||
      error.message.includes('currently')
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/linkups/:linkupId/requests
 * View Join Requests (Creator ONLY)
 */
const getRequests = async (req, res, next) => {
  try {
    const { linkupId } = req.params;
    const requests = await linkupService.getLinkupRequests(linkupId, req.user.id);
    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/join-requests/:requestId/accept
 * Accept Join Request (Creator ONLY)
 */
const acceptRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await linkupService.acceptJoinRequest(requestId, req.user.id);
    return res.json({
      success: true,
      message: 'Candidate accepted into team!',
      result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message.includes('capacity') || error.message.includes('already been accepted')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/join-requests/:requestId/reject
 * Reject Join Request (Creator ONLY)
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await linkupService.rejectJoinRequest(requestId, req.user.id);
    return res.json({
      success: true,
      message: 'Join request rejected.',
      result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * DELETE /api/linkups/:linkupId/members/:userId
 * Remove Team Member (Creator ONLY)
 */
const removeMember = async (req, res, next) => {
  try {
    const { linkupId, userId } = req.params;
    const result = await linkupService.removeTeamMember(linkupId, userId, req.user.id);
    return res.json({
      success: true,
      message: 'Team member removed successfully.',
      result,
    });
  } catch (error) {
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    if (error.message.includes('not found') || error.message.includes('cannot remove')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/linkups/:linkupId/matches
 * Get ranked AI candidate matches for a Linkup
 */
const getLinkupMatches = async (req, res, next) => {
  try {
    const { linkupId } = req.params;
    const currentUserId = req.user ? req.user.id : null;
    const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';

    const matchResults = await linkupService.getMatchesForLinkup(linkupId, currentUserId, forceRefresh);

    return res.status(200).json({
      success: true,
      ...matchResults,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const inviteUser = async (req, res, next) => {
  try {
    const { linkupId } = req.params;
    const { inviteeId } = req.body;
    const { inviteUserToLinkup } = require('../services/invitationService');
    const result = await inviteUserToLinkup(linkupId, req.user.id, inviteeId);
    return res.json({ success: true, message: 'Invitation sent.', ...result });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('already a member') || error.message.includes('not open')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const leaveLinkupHandler = async (req, res, next) => {
  try {
    const { linkupId } = req.params;
    const result = await linkupService.leaveLinkup(linkupId, req.user.id);
    return res.json({ success: true, message: 'You have left the Linkup.', ...result });
  } catch (error) {
    if (error.message.includes('not a member') || error.message.includes('Creators cannot leave')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/user/join-requests
 * View all Join Requests sent by the current user
 */
const getMyJoinRequests = async (req, res, next) => {
  try {
    const requests = await linkupService.getMySentJoinRequests(req.user.id);
    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/join-requests/:requestId
 * Cancel a pending join request sent by the current user
 */
const cancelJoinRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const result = await linkupService.cancelMyJoinRequest(requestId, req.user.id);
    return res.json({
      success: true,
      message: 'Join request cancelled successfully.',
      result,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('cannot be cancelled')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  createLinkup,
  getLinkups,
  getLinkupById,
  updateLinkup,
  deleteLinkup,
  requestToJoin,
  getRequests,
  acceptRequest,
  rejectRequest,
  removeMember,
  getLinkupMatches,
  inviteUser,
  leaveLinkupHandler,
  getMyJoinRequests,
  cancelJoinRequest,
};
