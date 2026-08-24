const { pool, query } = require('../config/db');
const { getLinkupById } = require('./linkupService');

/**
 * Invite a user to a Linkup (by Creator)
 */
const inviteUserToLinkup = async (linkupId, inviterId, inviteeId) => {
  // Validate linkup
  const linkup = await getLinkupById(linkupId);
  if (!linkup) throw new Error('Linkup not found.');
  if (linkup.creatorId !== inviterId) throw new Error('Only the creator can invite members.');
  if (linkup.currentStatus === 'FULL' || linkup.currentStatus === 'CLOSED') throw new Error('Linkup is not open for new members.');

  // Validate invitee
  const invitee = await query(`SELECT id FROM users WHERE id = $1`, [inviteeId]);
  if (invitee.rows.length === 0) throw new Error('Invitee not found.');

  // Check if already a member
  const memberCheck = await query(`SELECT id FROM linkup_members WHERE linkup_id = $1 AND user_id = $2`, [linkupId, inviteeId]);
  if (memberCheck.rows.length > 0) throw new Error('User is already a member.');

  // Create or update invitation
  const res = await query(
    `INSERT INTO linkup_invitations (linkup_id, inviter_id, invitee_id, status) 
     VALUES ($1, $2, $3, 'PENDING')
     ON CONFLICT (linkup_id, invitee_id) DO UPDATE SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP
     RETURNING id, status`,
    [linkupId, inviterId, inviteeId]
  );

  return { success: true, invitationId: res.rows[0].id };
};

/**
 * Get pending invitations for a user
 */
const getUserInvitations = async (userId) => {
  const receivedRes = await query(
    `SELECT i.id as invitation_id, i.status, i.created_at,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.name as inviter_name
     FROM linkup_invitations i
     JOIN linkups l ON i.linkup_id = l.id
     JOIN users u ON i.inviter_id = u.id
     WHERE i.invitee_id = $1 AND i.status = 'PENDING'
     ORDER BY i.created_at DESC`,
    [userId]
  );
  
  const sentRes = await query(
    `SELECT i.id as invitation_id, i.status, i.created_at,
            l.id as linkup_id, l.title, l.category, l.description, l.current_status,
            u.name as invitee_name, u.email as invitee_email
     FROM linkup_invitations i
     JOIN linkups l ON i.linkup_id = l.id
     JOIN users u ON i.invitee_id = u.id
     WHERE i.inviter_id = $1 AND i.status = 'PENDING'
     ORDER BY i.created_at DESC`,
    [userId]
  );

  return {
    received: receivedRes.rows,
    sent: sentRes.rows,
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
      `SELECT * FROM linkup_invitations WHERE id = $1 AND invitee_id = $2 AND status = 'PENDING'`,
      [invitationId, userId]
    );

    if (invRes.rows.length === 0) {
      throw new Error('Invitation not found or already processed.');
    }

    const invitation = invRes.rows[0];

    // Update invitation status
    await client.query(
      `UPDATE linkup_invitations SET status = $1 WHERE id = $2`,
      [action, invitationId]
    );

    if (action === 'ACCEPTED') {
      // Check if full
      const lRes = await client.query(
        `SELECT max_members, current_status FROM linkups WHERE id = $1 FOR UPDATE`,
        [invitation.linkup_id]
      );
      
      const linkup = lRes.rows[0];
      if (linkup.current_status !== 'OPEN') {
        throw new Error('Linkup is no longer open.');
      }

      const mRes = await client.query(
        `SELECT COUNT(*)::int as count FROM linkup_members WHERE linkup_id = $1`,
        [invitation.linkup_id]
      );
      const currentCount = mRes.rows[0].count;

      if (currentCount >= linkup.max_members) {
        throw new Error('Linkup has reached its maximum member capacity.');
      }

      // Add to members
      await client.query(
        `INSERT INTO linkup_members (linkup_id, user_id, role, status)
         VALUES ($1, $2, 'Member', 'ACTIVE')
         ON CONFLICT DO NOTHING`,
        [invitation.linkup_id, userId]
      );

      // Check if full now
      if (currentCount + 1 >= linkup.max_members) {
        await client.query(
          `UPDATE linkups SET current_status = 'FULL' WHERE id = $1`,
          [invitation.linkup_id]
        );
      }
      
      // Also delete any join_requests for this user to this linkup
      await client.query(
        `DELETE FROM join_requests WHERE linkup_id = $1 AND user_id = $2`,
        [invitation.linkup_id, userId]
      );
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
