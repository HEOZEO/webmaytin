const { pool } = require('../config/database');

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings ORDER BY created_at'
    );

    // Convert to object format for easier access
    const settingsObj = {};
    result.rows.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        type: setting.data_type,
        description: setting.description
      };
    });

    res.json({ success: true, data: settingsObj, raw: result.rows });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy cài đặt', error: error.message });
  }
};

// Get single setting
exports.getSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const result = await pool.query(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cài đặt không tìm thấy' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy cài đặt', error: error.message });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let { value } = req.body;

    if (value === undefined || value === null) {
      value = '';
    }

    const result = await pool.query(
      `UPDATE settings SET value = $1, updated_at = NOW() 
       WHERE key = $2 RETURNING *`,
      [value.toString(), key]
    );

    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO settings (key, value, data_type) VALUES ($1, $2, 'string') RETURNING *`,
        [key, value.toString()]
      );
      return res.json({ success: true, message: 'Cập nhật cài đặt thành công', data: insertResult.rows[0] });
    }

    res.json({ success: true, message: 'Cập nhật cài đặt thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật cài đặt', error: error.message });
  }
};

// Bulk update settings
exports.bulkUpdateSettings = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Hỗ trợ cả object { key: value } và array [{ key, value }]
    let { settings } = req.body;

    if (!settings || (typeof settings !== 'object')) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' });
    }

    // Chuyển đổi object thành array nếu cần
    let settingsArray;
    if (Array.isArray(settings)) {
      settingsArray = settings;
    } else {
      // Chuyển object { key: value } thành array [{ key, value }]
      settingsArray = Object.entries(settings).map(([key, value]) => ({ key, value }));
    }

    if (settingsArray.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' });
    }

    const results = [];

    for (const item of settingsArray) {
      const { key, value } = item;
      
      if (!key) continue;
      
      const result = await client.query(
        `UPDATE settings SET value = $1, updated_at = NOW()
         WHERE key = $2 RETURNING *`,
        [value?.toString() || '', key]
      );

      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      } else {
        // If setting doesn't exist, create it
        const insertResult = await client.query(
          `INSERT INTO settings (key, value, data_type) VALUES ($1, $2, 'string') RETURNING *`,
          [key, value?.toString() || '']
        );
        results.push(insertResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, message: `Cập nhật ${results.length} cài đặt thành công`, data: results });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update settings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật cài đặt', error: error.message });
  } finally {
    client.release();
  }
};

// Get store info
exports.getStoreInfo = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM settings WHERE key IN ('store_name', 'store_logo', 'store_description', 'contact_email', 'contact_phone', 'store_address', 'business_hours')`
    );

    const storeInfo = {};
    result.rows.forEach(row => {
      storeInfo[row.key] = row.value;
    });

    res.json({ success: true, data: storeInfo });
  } catch (error) {
    console.error('Get store info error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin cửa hàng', error: error.message });
  }
};

// Update store info
exports.updateStoreInfo = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { store_name, store_logo, store_description, contact_email, contact_phone, store_address, business_hours } = req.body;

    const updates = [
      { key: 'store_name', value: store_name },
      { key: 'store_logo', value: store_logo },
      { key: 'store_description', value: store_description },
      { key: 'contact_email', value: contact_email },
      { key: 'contact_phone', value: contact_phone },
      { key: 'store_address', value: store_address },
      { key: 'business_hours', value: business_hours }
    ];

    for (const { key, value } of updates) {
      if (value !== undefined && value !== null) {
        await client.query(
          `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2`,
          [value.toString(), key]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Cập nhật thông tin cửa hàng thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update store info error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thông tin cửa hàng', error: error.message });
  } finally {
    client.release();
  }
};

// Get notification preferences
exports.getNotificationSettings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM settings WHERE key LIKE 'notification_%'`
    );

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value === 'true';
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy cài đặt thông báo', error: error.message });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const settings = req.body; // Object with notification keys

    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('notification_')) {
        await client.query(
          `UPDATE settings SET value = $1, updated_at = NOW() 
           WHERE key = $2`,
          [value.toString(), key]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Cập nhật cài đặt thông báo thành công' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update notification settings error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật cài đặt thông báo', error: error.message });
  } finally {
    client.release();
  }
};
