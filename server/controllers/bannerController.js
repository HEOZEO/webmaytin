const { pool } = require('../config/database');

exports.getBanners = async (req, res) => {
  try {
    const { active } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (active !== undefined) {
      whereClause = 'WHERE is_active = $1';
      queryParams = [active === 'true'];
    }

    const result = await pool.query(`
      SELECT * FROM banners
      ${whereClause}
      ORDER BY display_order ASC, created_at DESC
    `, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting banners:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.getBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM banners WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting banner:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, subtitle, badge, button_text, image_url, link, display_order = 0, is_active = true } = req.body;

    const result = await pool.query(
      'INSERT INTO banners (title, subtitle, badge, button_text, image_url, link, display_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [title, subtitle || '', badge || '', button_text || 'Xem Ngay', image_url, link || '/products', display_order, is_active !== false]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, badge, button_text, image_url, link, display_order, is_active } = req.body;

    const result = await pool.query(
      'UPDATE banners SET title = $1, subtitle = $2, badge = $3, button_text = $4, image_url = $5, link = $6, display_order = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *',
      [title, subtitle, badge, button_text, image_url, link, display_order, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM banners WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Banner không tồn tại' });
    }

    res.json({
      success: true,
      message: 'Xóa banner thành công'
    });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

exports.updateBannerOrder = async (req, res) => {
  try {
    const { banners } = req.body; // Array of {id, display_order}

    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const banner of banners) {
        await client.query(
          'UPDATE banners SET display_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [banner.display_order, banner.id]
        );
      }

      await client.query('COMMIT');

      // Get updated banners
      const result = await client.query(
        'SELECT * FROM banners ORDER BY display_order ASC, created_at DESC'
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating banner order:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};