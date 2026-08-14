const { pool } = require('../config/database');

(async () => {
  const client = await pool.connect();
  try {
    // Add nullable username column
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS username VARCHAR(50)
    `);

    // Backfill from email (left part before @) for existing rows
    await client.query(`
      UPDATE users
      SET username = split_part(email, '@', 1)
      WHERE username IS NULL OR username = ''
    `);

    // Promote admin email's username to 'admin'
    await client.query(`
      UPDATE users
      SET username = 'admin'
      WHERE email = 'admin@gmail.com'
    `);

    // Enforce NOT NULL + UNIQUE
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN username SET NOT NULL
    `);

    // Drop existing index if any, then add unique index
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE tablename = 'users' AND indexname = 'users_username_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
        END IF;
      END$$;
    `);

    console.log('Migration: username column added and backfilled.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();