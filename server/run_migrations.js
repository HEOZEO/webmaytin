/**
 * Database Migration Script v2.0
 * Adds security and reliability improvements:
 * 1. idempotency_keys table
 * 2. email_outbox table
 * 3. stock_notifications table
 * 4. order_code column
 * 5. JWT blacklist table
 * 6. Performance indexes
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { pool, connectDatabase } = require('./config/database');

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');

  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  const migrations = [
    // Migration 001: Idempotency Keys Table
    {
      name: 'create_idempotency_keys_table',
      sql: `
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          id SERIAL PRIMARY KEY,
          idempotency_key VARCHAR(64) NOT NULL UNIQUE,
          response_data JSONB,
          response_status INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at ON idempotency_keys(created_at);
        CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key_lookup ON idempotency_keys(idempotency_key, created_at);
      `
    },
    // Migration 002: Email Outbox Table
    {
      name: 'create_email_outbox_table',
      sql: `
        CREATE TABLE IF NOT EXISTS email_outbox (
          id SERIAL PRIMARY KEY,
          to_address VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          body_html TEXT,
          body_text TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          last_attempt_at TIMESTAMP WITH TIME ZONE,
          sent_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          related_order_id INTEGER,
          related_type VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status, attempts, created_at);
      `
    },
    // Migration 003: Stock Notifications Table
    {
      name: 'create_stock_notifications_table',
      sql: `
        CREATE TABLE IF NOT EXISTS stock_notifications (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          is_sent BOOLEAN DEFAULT FALSE,
          sent_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_stock_notifications_product ON stock_notifications(product_id, is_sent, deleted_at);
      `
    },
    // Migration 004: JWT Blacklist Table
    {
      name: 'create_jwt_blacklist_table',
      sql: `
        CREATE TABLE IF NOT EXISTS jwt_blacklist (
          id SERIAL PRIMARY KEY,
          token_jti VARCHAR(255) UNIQUE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_token ON jwt_blacklist(token_hash);
        CREATE INDEX IF NOT EXISTS idx_jwt_blacklist_expires ON jwt_blacklist(expires_at);
      `
    },
    // Migration 005: Refresh Tokens Table
    {
      name: 'create_refresh_tokens_table',
      sql: `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          jti VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          revoked_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, revoked_at);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_jti ON refresh_tokens(jti);
      `
    },
    // Migration 006: Add order_code column to orders
    {
      name: 'add_order_code_to_orders',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'order_code'
          ) THEN
            ALTER TABLE orders ADD COLUMN order_code VARCHAR(50);
          END IF;
        END $$;
      `
    },
    // Migration 007: Performance indexes
    {
      name: 'add_performance_indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, rating DESC);
      `
    }
  ];

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations_v2 (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already applied migrations
  const applied = await pool.query('SELECT name FROM migrations_v2');
  const appliedNames = new Set(applied.rows.map(r => r.name));

  let appliedCount = 0;
  let skippedCount = 0;

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) {
      console.log(`⏭️  Skipping already applied: ${migration.name}`);
      skippedCount++;
      continue;
    }

    console.log(`📦 Applying migration: ${migration.name}`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO migrations_v2 (name) VALUES ($1)',
        [migration.name]
      );
      await client.query('COMMIT');
      console.log(`✅ Applied: ${migration.name}\n`);
      appliedCount++;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to apply migration: ${migration.name}`);
      console.error('Error:', error.message);
    } finally {
      client.release();
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ Migrations complete!`);
  console.log(`   Applied: ${appliedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log('═══════════════════════════════════════════════\n');

  await pool.end();
  process.exit(0);
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
