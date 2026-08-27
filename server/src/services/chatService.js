const { query, pool } = require('../config/db');

/**
 * Fetch recent chat messages for a specific meld
 * Enforces a maximum limit (e.g. 50) for V1
 */
const getRecentMessages = async (meldId, limit = 50, beforeTimestamp = null) => {
  let queryStr = `
     SELECT m.id, m.meld_id, m.sender_id, m.content, m.created_at, u.name as sender_name
     FROM meld_messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.meld_id = $1
  `;
  const params = [meldId, limit];

  if (beforeTimestamp) {
    queryStr += ` AND m.created_at < $3`;
    params.push(beforeTimestamp);
  }

  queryStr += ` ORDER BY m.created_at DESC LIMIT $2`;

  const result = await query(queryStr, params);
  return result.rows;
};

/**
 * Save a new message securely to the database
 */
const saveMessage = async (meldId, senderId, content) => {
  const result = await query(
    `WITH inserted AS (
       INSERT INTO meld_messages (meld_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, meld_id, sender_id, content, created_at
     )
     SELECT i.id, i.meld_id, i.sender_id, i.content, i.created_at, u.name as sender_name
     FROM inserted i
     JOIN users u ON i.sender_id = u.id`,
    [meldId, senderId, content]
  );
  
  return result.rows[0];
};

/**
 * Verify if a user is an active member or creator of a Meld
 * (Crucial for IDOR protection and Chat Access)
 */
const isUserAuthorizedForMeldChat = async (meldId, userId) => {
  // Check if they are Creator
  const meldResult = await query(
    `SELECT creator_id FROM melds WHERE id = $1`,
    [meldId]
  );
  if (meldResult.rows.length > 0 && meldResult.rows[0].creator_id === userId) {
    return true;
  }
  
  // Check if they are an active member
  const memberResult = await query(
    `SELECT status FROM meld_members WHERE meld_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
    [meldId, userId]
  );
  
  return memberResult.rows.length > 0;
};

module.exports = {
  getRecentMessages,
  saveMessage,
  isUserAuthorizedForMeldChat,
};
