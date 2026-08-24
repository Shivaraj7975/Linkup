const { getUserInvitations, respondToInvitation } = require('../services/invitationService');

const getInvitations = async (req, res, next) => {
  try {
    const invitations = await getUserInvitations(req.user.id);
    res.json({ success: true, invitations });
  } catch (error) {
    next(error);
  }
};

const respond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    const result = await respondToInvitation(id, req.user.id, action);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvitations,
  respond,
};
