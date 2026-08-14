const { pool } = require('../config/database');

// Get messages of currently logged in customer
exports.getMyMessages = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const result = await pool.query(
      'SELECT * FROM contact_messages WHERE email = $1 ORDER BY created_at DESC',
      [userEmail]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get my messages error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy tin nhắn cá nhân' });
  }
};

// Get all contact messages with pagination
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM contact_messages';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM contact_messages';
    if (status) {
      countQuery += ' WHERE status = $1';
    }
    const countResult = await pool.query(countQuery, status ? [status] : []);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy tin nhắn' });
  }
};

// Get single message
exports.getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM contact_messages WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy tin nhắn' });
  }
};

// Create new contact message (public endpoint)
exports.createMessage = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const result = await pool.query(
      'INSERT INTO contact_messages (name, email, phone, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone || null, message]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Gửi tin nhắn thành công' });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ success: false, message: 'Lỗi gửi tin nhắn' });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['read', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
  }
};

// Mark as replied
exports.markAsReplied = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['replied', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }

    res.json({ success: true, data: result.rows[0], message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Mark as replied error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật' });
  }
};

// Reply to message (send email + save reply + notify customer)
exports.replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const adminId = req.user?.id || null;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung phản hồi' });
    }

    const findMsg = await pool.query('SELECT * FROM contact_messages WHERE id = $1', [id]);
    if (findMsg.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin nhắn không tồn tại' });
    }

    const contactMsg = findMsg.rows[0];

    // Update message status and reply content in DB
    const result = await pool.query(
      `UPDATE contact_messages 
       SET reply = $1, status = 'replied', replied_at = NOW(), replied_by = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [reply.trim(), adminId, id]
    );

    const updatedMsg = result.rows[0];

    // Send response email
    try {
      const { sendEmail } = require('../config/email');
      await sendEmail({
        to: contactMsg.email,
        subject: `[LaptopStore] Phản hồi yêu cầu liên hệ: ${contactMsg.subject || 'Câu hỏi của bạn'}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #06b6d4;">Chào ${contactMsg.name},</h2>
            <p>Cảm ơn bạn đã liên hệ với <strong>LaptopStore</strong>. Dưới đây là phản hồi từ đội ngũ hỗ trợ của chúng tôi:</p>
            <div style="background: #f1f5f9; border-left: 4px solid #06b6d4; padding: 15px; margin: 15px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #0f172a;">Nội dung phản hồi:</p>
              <p style="margin-top: 5px; white-space: pre-wrap;">${reply.trim()}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">
              <strong>Tin nhắn gốc của bạn:</strong><br />
              ${contactMsg.message}
            </p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
              LaptopStore Team • Hotline: 1900 1234 • Website: http://localhost:5173
            </p>
          </div>
        `
      });
    } catch (emailErr) {
      console.error('Email notification failed:', emailErr);
    }

    // In-app notification for registered customer
    try {
      const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [contactMsg.email]);
      if (userCheck.rows.length > 0) {
        const userId = userCheck.rows[0].id;
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, link, type) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            'Phản hồi liên hệ từ LaptopStore',
            `Admin đã trả lời câu hỏi của bạn: "${reply.trim().slice(0, 100)}${reply.length > 100 ? '...' : ''}"`,
            '/profile',
            'contact_reply'
          ]
        );
      }
    } catch (notifErr) {
      console.error('In-app notification creation failed:', notifErr);
    }

    res.json({
      success: true,
      data: updatedMsg,
      message: 'Đã gửi phản hồi thành công tới khách hàng'
    });
  } catch (error) {
    console.error('Reply message error:', error);
    res.status(500).json({ success: false, message: 'Lỗi gửi phản hồi' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
    res.json({ success: true, message: 'Xóa tin nhắn thành công' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa tin nhắn' });
  }
};

module.exports = exports;
