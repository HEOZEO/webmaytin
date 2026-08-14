const { pool } = require('./config/database');

(async () => {
  try {
    const key = 'test_key';
    const value = 'test_value';

    const insertResult = await pool.query(
      `INSERT INTO settings (key, value, data_type) VALUES ($1, $2, 'string') RETURNING *`,
      [key, value.toString()]
    );
    console.log(insertResult.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
