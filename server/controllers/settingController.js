const { pool } = require('../config/database');

exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY key ASC');

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query('SELECT * FROM settings WHERE key = $1', [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cài đặt không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body;

    const result = await pool.query(
      'INSERT INTO settings (key, value, description) VALUES ($1, $2, $3) RETURNING *',
      [key, value, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return res.status(400).json({ success: false, message: 'Khóa cài đặt đã tồn tại' });
    }
    console.error('Error creating setting:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const result = await pool.query(
      'UPDATE settings SET value = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE key = $3 RETURNING *',
      [value, description, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cài đặt không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query('DELETE FROM settings WHERE key = $1 RETURNING *', [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cài đặt không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa cài đặt thành công'
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        await client.query(
          `INSERT INTO settings (key, value, description, created_at, updated_at)
           VALUES ($1, $2, '', NOW(), NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }

      await client.query('COMMIT');

      const result = await pool.query('SELECT * FROM settings ORDER BY key ASC');
      const updatedSettings = {};
      result.rows.forEach(row => {
        updatedSettings[row.key] = {
          value: row.value,
          description: row.description,
          id: row.id,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      });

      res.json({
        success: true,
        data: updatedSettings
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};