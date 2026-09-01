const { pool } = require('./config/database');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE categories ADD COLUMN is_hidden BOOLEAN DEFAULT false;`);
    console.log("Added is_hidden to categories");
  } catch (error) {
    if (error.code === '42701') {
      console.log("Column is_hidden already exists");
    } else {
      console.error(error);
    }
  }
  process.exit(0);
}

migrate();
