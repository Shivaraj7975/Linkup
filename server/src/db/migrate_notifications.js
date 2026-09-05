const { pool } = require('../config/db');

async function migrateNotifications() {
  console.log('🔄 Running notifications table & deduplication index migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create notifications table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(255),
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    // 2. Clean up any pre-existing duplicate chat notifications safely before index creation
    const dupCleanRes = await client.query(`
      DELETE FROM notifications n1
      WHERE n1.type = 'NEW_CHAT_MESSAGE' AND EXISTS (
        SELECT 1 FROM notifications n2
        WHERE n2.user_id = n1.user_id
          AND n2.type = 'NEW_CHAT_MESSAGE'
          AND n2.link = n1.link
          AND n2.created_at > n1.created_at
      );
    `);
    if (dupCleanRes.rowCount > 0) {
      console.log(`🧹 Safely deduplicated ${dupCleanRes.rowCount} prior chat notifications.`);
    }

    // 3. Create partial unique index for chat notifications
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_chat_dedup 
      ON notifications (user_id, type, link) 
      WHERE type = 'NEW_CHAT_MESSAGE';
    `);

    await client.query('COMMIT');
    console.log('✅ Notifications table and deduplication index created/verified successfully.');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateNotifications()
    .then(() => {
      console.log('🎉 Migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Migration script terminated with error:', err.message);
      process.exit(1);
    });
}

module.exports = { migrateNotifications };
