const express = require('express');
const { getInvitations, respond } = require('../controllers/invitationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getInvitations);
router.post('/:id/respond', respond);

module.exports = router;
