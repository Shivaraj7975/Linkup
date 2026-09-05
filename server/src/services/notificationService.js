const { query, pool } = require('../config/db');

// Lazy-load socket helper to prevent circular dependency
const getSocketEmitter = () => {
  try {
    const socketModule = require('../socket');
    return socketModule.emitNotificationToUser;
  } catch (err) {
    return null;
  }
};

/**
 * Opportunistic cleanup: Keep only the most recent `maxKeep` read notifications per user
 */
const cleanupOldNotifications = async (userId, maxKeep = 150) => {
  if (!userId) return;
  try {
    await query(
      `DELETE FROM notifications 
       WHERE user_id = $1 
         AND is_read = TRUE 
         AND id NOT IN (
           SELECT id FROM notifications 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2
         )`,
      [userId, maxKeep]
    );
  } catch (err) {
    // Non-critical background cleanup, ignore error
  }
};

/**
 * Create a single notification for a user
 */
const createNotification = async ({ userId, type, title, message, link = null }) => {
  if (!userId || !type || !title || !message) return null;

  try {
    const res = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, title, message, link, is_read, created_at`,
      [userId, type, title, message, link]
    );
    const notification = res.rows[0];

    // Live Socket.IO notification event to recipient
    const emit = getSocketEmitter();
    if (emit) {
      emit(userId, notification);
    }

    // Opportunistic cleanup
    cleanupOldNotifications(userId).catch(() => {});

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return null;
  }
};

/**
 * Fetch all notifications and unread count for a user (strictly user-scoped)
 */
const getUserNotifications = async (userId, limit = 50) => {
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);

  const listRes = await query(
    `SELECT id, user_id, type, title, message, link, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, safeLimit]
  );

  const countRes = await query(
    `SELECT COUNT(*)::int as unread_count
     FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );

  return {
    notifications: listRes.rows,
    unreadCount: countRes.rows[0]?.unread_count || 0,
  };
};

/**
 * Mark a single notification as read (strictly user-scoped)
 */
const markAsRead = async (notificationId, userId) => {
  const res = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );
  if (res.rows.length === 0) {
    throw new Error('Notification not found or unauthorized.');
  }
  return true;
};

/**
 * Mark all notifications as read for a user (strictly user-scoped)
 */
const markAllAsRead = async (userId) => {
  await query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return true;
};

/**
 * Delete a single notification (strictly user-scoped)
 */
const deleteNotification = async (notificationId, userId) => {
  const res = await query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
    [notificationId, userId]
  );
  if (res.rows.length === 0) {
    throw new Error('Notification not found or unauthorized.');
  }
  return true;
};

/**
 * Clear all notifications for a user (strictly user-scoped)
 */
const clearAllNotifications = async (userId) => {
  await query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
  return true;
};

/**
 * TRIGGER: Notify candidate when join request is ACCEPTED
 */
const notifyAcceptedJoinRequest = async ({ meldId, candidateId, meldTitle }) => {
  return createNotification({
    userId: candidateId,
    type: 'REQUEST_ACCEPTED',
    title: '🎉 Join Request Accepted!',
    message: `Your request to join "${meldTitle}" was accepted!`,
    link: `/melds/${meldId}`,
  });
};

/**
 * TRIGGER: Notify creator when candidate sends a JOIN REQUEST
 */
const notifyNewJoinRequest = async ({ meldId, creatorId, applicantName, meldTitle }) => {
  return createNotification({
    userId: creatorId,
    type: 'NEW_JOIN_REQUEST',
    title: '📩 New Join Request!',
    message: `${applicantName} requested to join "${meldTitle}".`,
    link: `/invitations`,
  });
};

/**
 * TRIGGER: Notify candidate when creator sends an INVITATION
 */
const notifyNewInvitation = async ({ meldId, inviteeId, inviterName, meldTitle }) => {
  return createNotification({
    userId: inviteeId,
    type: 'NEW_INVITATION',
    title: '✉️ New Team Invitation!',
    message: `${inviterName} invited you to join "${meldTitle}".`,
    link: `/invitations`,
  });
};

/**
 * TRIGGER: Notify creator when invitation is ACCEPTED
 */
const notifyAcceptedInvitation = async ({ meldId, creatorId, inviteeName, meldTitle }) => {
  return createNotification({
    userId: creatorId,
    type: 'INVITATION_ACCEPTED',
    title: '🎉 Invitation Accepted!',
    message: `${inviteeName} accepted your invitation to join "${meldTitle}"!`,
    link: `/melds/${meldId}`,
  });
};

/**
 * TRIGGER: Efficient set-based chat notifications with database-level deduplication
 * Uses PostgreSQL partial unique index `idx_notifications_chat_dedup` ON (user_id, type, link) WHERE type = 'NEW_CHAT_MESSAGE'
 */
const notifyNewChatMessage = async ({ meldId, senderId, senderName, activeUserIds = [] }) => {
  try {
    // 1. Fetch MELD info & all active recipients in a single query (avoiding N+1 loops)
    const meldInfoRes = await query(`SELECT title FROM melds WHERE id = $1`, [meldId]);
    if (meldInfoRes.rows.length === 0) return;
    const meldTitle = meldInfoRes.rows[0].title || 'MELD';

    // 2. Fetch all team members and creator who are NOT the sender
    const recipientsRes = await query(
      `SELECT DISTINCT u_id FROM (
         SELECT user_id AS u_id FROM meld_members WHERE meld_id = $1 AND status = 'ACTIVE'
         UNION
         SELECT creator_id AS u_id FROM melds WHERE id = $1
       ) all_members
       WHERE u_id != $2`,
      [meldId, senderId]
    );

    if (recipientsRes.rows.length === 0) return;

    const activeSet = new Set(activeUserIds);
    // Exclude users currently active in the chat room to avoid redundant alerts
    const targetRecipientIds = recipientsRes.rows
      .map((r) => r.u_id)
      .filter((id) => !activeSet.has(id));

    if (targetRecipientIds.length === 0) return;

    const titleText = `💬 New Message in ${meldTitle}`;
    const messageText = `You have a new message in ${meldTitle}.`;
    const link = `/melds/${meldId}?tab=chat`;

    // 3. Batch atomic upsert using unnest() in a single round-trip
    const upsertRes = await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       SELECT unnest($1::uuid[]), 'NEW_CHAT_MESSAGE', $2, $3, $4
       ON CONFLICT (user_id, type, link) WHERE type = 'NEW_CHAT_MESSAGE'
       DO UPDATE SET 
         is_read = FALSE,
         created_at = CURRENT_TIMESTAMP,
         title = EXCLUDED.title,
         message = EXCLUDED.message
       RETURNING id, user_id, type, title, message, link, is_read, created_at`,
      [targetRecipientIds, titleText, messageText, link]
    );

    // 4. Emit live Socket.IO events to recipients
    const emit = getSocketEmitter();
    if (emit) {
      for (const notif of upsertRes.rows) {
        emit(notif.user_id, notif);
      }
    }
  } catch (err) {
    console.error('Error in notifyNewChatMessage:', err.message);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  notifyAcceptedJoinRequest,
  notifyNewJoinRequest,
  notifyNewInvitation,
  notifyAcceptedInvitation,
  notifyNewChatMessage,
};
