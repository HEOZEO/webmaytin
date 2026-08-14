const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

let isConnected = false;

pool.on('connect', (client) => {
  if (!isConnected) {
    console.log('✅ Pool connected successfully');
    isConnected = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err);
});

// Test connection on startup
const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connection verified at', result.rows[0].now);
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

module.exports = {
  pool,
  connectDatabase
};
