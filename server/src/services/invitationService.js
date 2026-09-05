const { pool, query } = require('../config/db');
const { getLinkupById } = require('./meldService');
const notificationService = require('./notificationService');

/**
 * Invite a user to a Linkup (by Creator)
 */
const inviteUserToLinkup = async (linkupId, inviterId, inviteeId) => {
  // Validate linkup
  const linkup = await getLinkupById(linkupId);
  if (!linkup) throw new Error('Linkup not found.');
  
  if (linkup.creatorId !== inviterId) {
    throw new Error('Only the creator of this MELD can invite members.');
  }

  if (linkup.currentStatus === 'FULL' || linkup.currentStatus === 'CLOSED') {
    throw new Error('Linkup is not open for new members.');
  }

  // Validate invitee
  const invitee = await query(`SELECT id FROM users WHERE id = $1`, [inviteeId]);
  if (invitee.rows.length === 0) throw new Error('Invitee not found.');

  // Check if already a member
  const memberCheck = await query(`SELECT id FROM meld_members WHERE meld_id = $1 AND user_id = $2`, [linkupId, inviteeId]);
  if (memberCheck.rows.length > 0) throw new Error('User is already a member.');

  // Create or update invitation
  const res = await query(
    `INSERT INTO meld_invitations (meld_id, inviter_id, invitee_id, status) 
     VALUES ($1, $2, $3, 'PENDING')
     ON CONFLICT (meld_id, invitee_id) DO UPDATE SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP
     RETURNING id, status`,
    [linkupId, inviterId, inviteeId]
  );

  // Fetch inviter name for notification
  const inviterRes = await query(`SELECT name FROM users WHERE id = $1`, [inviterId]);
  const inviterName = inviterRes.rows[0]?.name || 'A team creator';

  // Trigger notification for candidate
  notificationService.notifyNewInvitation({
    meldId: linkupId,
    inviteeId,
    inviterName,
    meldTitle: linkup.title,
  }).catch((err) => console.error('Notification error in inviteUserToLinkup:', err.message));

  return { success: true, invitationId: res.rows[0].id };
};

/**
 * Get pending invitations & join requests for a user
 */
const getUserInvitations = async (userId) => {
  // 1. Invitations received by this user to join other Melds
  const receivedInvitesRes = await query(
    `SELECT i.id as invitation_id, i.status, i.created_at, 'INVITATION' as type,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.id as inviter_id, u.name as inviter_name, u.username as inviter_username,
            COALESCE(sp.college, 'University Student') as inviter_college,
            COALESCE(sv.status, 'UNVERIFIED') as inviter_verification_status,
            NULL as message
     FROM meld_invitations i
     JOIN melds l ON i.meld_id = l.id
     JOIN users u ON i.inviter_id = u.id
     LEFT JOIN student_profiles sp ON u.id = sp.user_id
     LEFT JOIN student_verifications sv ON u.id = sv.user_id
     WHERE i.invitee_id = $1 AND i.status = 'PENDING'
     ORDER BY i.created_at DESC`,
    [userId]
  );
  
  // 2. Join Requests received by this user (as creator) from candidates
  const receivedRequestsRes = await query(
    `SELECT jr.id as invitation_id, jr.status, jr.created_at, 'JOIN_REQUEST' as type,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.id as inviter_id, u.name as inviter_name, u.username as inviter_username,
            COALESCE(sp.college, 'University Student') as inviter_college,
            COALESCE(sv.status, 'UNVERIFIED') as inviter_verification_status,
            jr.message
     FROM join_requests jr
     JOIN melds l ON jr.meld_id = l.id
     JOIN users u ON jr.user_id = u.id
     LEFT JOIN student_profiles sp ON u.id = sp.user_id
     LEFT JOIN student_verifications sv ON u.id = sv.user_id
     WHERE l.creator_id = $1 AND jr.status = 'PENDING'
     ORDER BY jr.created_at DESC`,
    [userId]
  );

  const received = [...receivedInvitesRes.rows, ...receivedRequestsRes.rows].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  // 3. Invitations sent by this user to candidates
  const sentInvitesRes = await query(
    `SELECT i.id as invitation_id, i.status, i.created_at, 'INVITATION' as type,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.id as invitee_id, u.name as invitee_name, u.username as invitee_username, u.email as invitee_email,
            NULL as message
     FROM meld_invitations i
     JOIN melds l ON i.meld_id = l.id
     JOIN users u ON i.invitee_id = u.id
     WHERE i.inviter_id = $1 AND i.status = 'PENDING'
     ORDER BY i.created_at DESC`,
    [userId]
  );

  // 4. Join Requests sent by this user to other Melds
  const sentRequestsRes = await query(
    `SELECT jr.id as invitation_id, jr.status, jr.created_at, 'JOIN_REQUEST' as type,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.id as invitee_id, u.name as invitee_name, u.username as invitee_username, u.email as invitee_email,
            jr.message
     FROM join_requests jr
     JOIN melds l ON jr.meld_id = l.id
     JOIN users u ON l.creator_id = u.id
     WHERE jr.user_id = $1 AND jr.status = 'PENDING'
     ORDER BY jr.created_at DESC`,
    [userId]
  );

  const sent = [...sentInvitesRes.rows, ...sentRequestsRes.rows].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return {
    received,
    sent,
  };
};

/**
 * Respond to an invitation (ACCEPT or REJECT)
 */
const respondToInvitation = async (invitationId, userId, action) => {
  if (!['ACCEPTED', 'REJECTED'].includes(action)) {
    throw new Error('Invalid action.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get invitation
    const invRes = await client.query(
      `SELECT * FROM meld_invitations WHERE id = $1 AND invitee_id = $2 AND status = 'PENDING'`,
      [invitationId, userId]
    );

    if (invRes.rows.length === 0) {
      throw new Error('Invitation not found or already processed.');
    }

    const invitation = invRes.rows[0];

    // Update invitation status
    await client.query(
      `UPDATE meld_invitations SET status = $1 WHERE id = $2`,
      [action, invitationId]
    );

    if (action === 'ACCEPTED') {
      // Check if full
      const lRes = await client.query(
        `SELECT creator_id, title, max_members, current_status FROM melds WHERE id = $1 FOR UPDATE`,
        [invitation.meld_id]
      );
      
      const linkup = lRes.rows[0];
      if (linkup.current_status !== 'OPEN') {
        throw new Error('Linkup is no longer open.');
      }

      const mRes = await client.query(
        `SELECT COUNT(*)::int as count FROM meld_members WHERE meld_id = $1`,
        [invitation.meld_id]
      );
      const currentCount = mRes.rows[0].count;

      if (currentCount >= linkup.max_members) {
        throw new Error('Linkup has reached its maximum member capacity.');
      }

      // Add to members
      await client.query(
        `INSERT INTO meld_members (meld_id, user_id, role, status)
         VALUES ($1, $2, 'Member', 'ACTIVE')
         ON CONFLICT DO NOTHING`,
        [invitation.meld_id, userId]
      );

      // Check if full now
      if (currentCount + 1 >= linkup.max_members) {
        await client.query(
          `UPDATE melds SET current_status = 'FULL' WHERE id = $1`,
          [invitation.meld_id]
        );
      }
      
      // Also delete any join_requests for this user to this linkup
      await client.query(
        `DELETE FROM join_requests WHERE meld_id = $1 AND user_id = $2`,
        [invitation.meld_id, userId]
      );

      // Fetch invitee name for notification
      const userRes = await client.query(`SELECT name FROM users WHERE id = $1`, [userId]);
      const inviteeName = userRes.rows[0]?.name || 'A candidate';

      await client.query('COMMIT');

      // Trigger notification for creator (non-blocking)
      notificationService.notifyAcceptedInvitation({
        meldId: invitation.meld_id,
        creatorId: linkup.creator_id,
        inviteeName,
        meldTitle: linkup.title,
      }).catch((err) => console.error('Notification error:', err.message));

      return { success: true, message: `Invitation ${action.toLowerCase()}.` };
    }

    await client.query('COMMIT');
    return { success: true, message: `Invitation ${action.toLowerCase()}.` };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  inviteUserToLinkup,
  getUserInvitations,
  respondToInvitation,
};
