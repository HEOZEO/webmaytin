const { pool } = require('../config/database');

exports.getAddresses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              d.name as district_name, d.zone as district_zone, d.shipping_fee,
              w.name as ward_name
       FROM addresses a
       LEFT JOIN districts d ON a.district_id = d.id
       LEFT JOIN wards w ON a.ward_id = w.id
       WHERE a.user_id = $1
       ORDER BY a.is_default DESC, a.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách địa chỉ' });
  }
};

exports.createAddress = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { full_name, phone, address, district_id, ward_id, is_default } = req.body;

    if (!district_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Quận/Huyện' });
    }
    if (!ward_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Phường/Xã' });
    }

    // Verify district and ward exist and match
    const districtCheck = await client.query(
      'SELECT id, name FROM districts WHERE id = $1 FOR UPDATE',
      [Number(district_id)]
    );
    if (districtCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Quận/Huyện không hợp lệ' });
    }

    const wardCheck = await client.query(
      'SELECT id, name, district_id FROM wards WHERE id = $1 AND district_id = $2',
      [Number(ward_id), Number(district_id)]
    );
    if (wardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Phường/Xã không hợp lệ cho Quận/Huyện đã chọn' });
    }

    // If setting as default, clear other defaults atomically
    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1',
        [req.user.id]
      );
    }

    const districtName = districtCheck.rows[0].name;
    const wardName = wardCheck.rows[0].name;

    const result = await client.query(
      `INSERT INTO addresses (user_id, full_name, phone, address, city, district, ward, district_id, ward_id, is_default)
       VALUES ($1, $2, $3, $4, 'TP. Huế', $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, full_name, phone, address, districtName, wardName, Number(district_id), Number(ward_id), !!is_default]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        district_name: districtName,
        ward_name: wardName
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create address error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo địa chỉ' });
  } finally {
    client.release();
  }
};

exports.updateAddress = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { full_name, phone, address, district_id, ward_id, is_default } = req.body;

    const addrId = Number(id);
    if (!Number.isInteger(addrId) || addrId <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ' });
    }

    const checkOwner = await client.query(
      'SELECT id, district_id, ward_id FROM addresses WHERE id = $1 AND user_id = $2',
      [addrId, req.user.id]
    );
    if (checkOwner.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
    }

    const current = checkOwner.rows[0];
    const newDistrictId = district_id != null ? Number(district_id) : current.district_id;
    const newWardId = ward_id != null ? Number(ward_id) : current.ward_id;

    // Validate new district
    const districtCheck = await client.query(
      'SELECT id, name FROM districts WHERE id = $1',
      [newDistrictId]
    );
    if (districtCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Quận/Huyện không hợp lệ' });
    }

    // Validate new ward matches district
    const wardCheck = await client.query(
      'SELECT id, name FROM wards WHERE id = $1 AND district_id = $2',
      [newWardId, newDistrictId]
    );
    if (wardCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Phường/Xã không hợp lệ' });
    }

    if (is_default) {
      await client.query(
        'UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2',
        [req.user.id, addrId]
      );
    }

    const result = await client.query(
      `UPDATE addresses
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           district = $4,
           ward = $5,
           district_id = $6,
           ward_id = $7,
           is_default = COALESCE($8, is_default),
           city = 'TP. Huế'
       WHERE id = $9 RETURNING *`,
      [full_name, phone, address, districtCheck.rows[0].name, wardCheck.rows[0].name, newDistrictId, newWardId, is_default, addrId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        district_name: districtCheck.rows[0].name,
        ward_name: wardCheck.rows[0].name
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật địa chỉ' });
  } finally {
    client.release();
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const addrId = Number(id);
    if (!Number.isInteger(addrId) || addrId <= 0) {
      return res.status(400).json({ success: false, message: 'ID địa ch� không hợp lệ' });
    }

    const result = await pool.query(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [addrId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
    }
    res.json({ success: true, message: '�ã xóa địa chỉ' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa địa chỉ' });
  }
};

exports.setDefaultAddress = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const addrId = Number(id);
    if (!Number.isInteger(addrId) || addrId <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'ID địa chỉ không hợp lệ' });
    }

    const checkOwner = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addrId, req.user.id]
    );
    if (checkOwner.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
    }

    await client.query(
      'UPDATE addresses SET is_default = false WHERE user_id = $1',
      [req.user.id]
    );
    await client.query(
      'UPDATE addresses SET is_default = true WHERE id = $1',
      [addrId]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Đã đặt địa chỉ mặc định' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Set default address error:', error);
    res.status(500).json({ success: false, message: 'Lỗi đặt địa chỉ mặc định' });
  } finally {
    client.release();
  }
};
