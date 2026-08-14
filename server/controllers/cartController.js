const { pool } = require('../config/database');

exports.getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT c.id as cart_id, c.user_id, c.product_id, c.quantity, c.created_at,
              p.id, p.name, p.price, p.image_url, p.stock, p.brand_id, p.category_id,
              p.is_active, p.deleted_at,
              b.name as brand_name, cat.name as category_name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories cat ON p.category_id = cat.id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [user_id]
    );

    // Lọc các sản phẩm không khả dụng (soft-deleted hoặc inactive)
    const validItems = result.rows.filter(item => item.is_active && !item.deleted_at);
    const total = validItems.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    res.json({
      success: true,
      data: {
        items: validItems,
        total
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy giỏ hàng' });
  }
};

exports.addToCart = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { product_id, quantity = 1 } = req.body;
    const user_id = req.user.id;

    // Validate input
    if (!product_id || !Number.isInteger(Number(product_id))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ (1-999)' });
    }

    // Lock product row để tránh race condition
    const productResult = await client.query(
      `SELECT id, name, stock, is_active, deleted_at FROM products WHERE id = $1 FOR UPDATE`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }

    const product = productResult.rows[0];

    if (product.deleted_at || !product.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Sản phẩm hiện không khả dụng' });
    }

    if (Number(product.stock) < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Không đủ hàng trong kho (còn ${product.stock})` });
    }

    // Check if product already in cart
    const existingItem = await client.query(
      'SELECT * FROM cart WHERE user_id = $1 AND product_id = $2 FOR UPDATE',
      [user_id, product_id]
    );

    if (existingItem.rows.length > 0) {
      const newQuantity = existingItem.rows[0].quantity + qty;

      if (Number(product.stock) < newQuantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Không đủ hàng trong kho (còn ${product.stock}, giỏ đã có ${existingItem.rows[0].quantity})` });
      }

      const result = await client.query(
        'UPDATE cart SET quantity = $1 WHERE id = $2 RETURNING *',
        [newQuantity, existingItem.rows[0].id]
      );

      await client.query('COMMIT');
      return res.json({
        success: true,
        data: result.rows[0]
      });
    }

    // Add new item to cart
    const result = await client.query(
      'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
      [user_id, product_id, qty]
    );

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi thêm vào giỏ hàng' });
  } finally {
    client.release();
  }
};

exports.updateCartItem = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { itemId } = req.params;
    const { quantity } = req.body;
    const user_id = req.user.id;

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ (1-999)' });
    }

    // Check cart item belongs to user
    const cartItem = await client.query(
      `SELECT c.*, p.stock, p.is_active, p.deleted_at, p.name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.id = $1 AND c.user_id = $2 FOR UPDATE`,
      [itemId, user_id]
    );

    if (cartItem.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
    }

    const item = cartItem.rows[0];

    if (item.deleted_at || !item.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Sản phẩm "${item.name}" không khả dụng. Vui lòng xóa khỏi giỏ.` });
    }

    if (Number(item.stock) < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Không đủ hàng trong kho (còn ${item.stock})` });
    }

    const result = await client.query(
      'UPDATE cart SET quantity = $1 WHERE id = $2 RETURNING *',
      [qty, itemId]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật giỏ hàng' });
  } finally {
    client.release();
  }
};

// Cập nhật số lượng bằng product_id
exports.updateCartItemByProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { productId } = req.params;
    const { quantity } = req.body;
    const user_id = req.user.id;

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ (1-999)' });
    }

    const parsedProductId = Number(productId);

    // Check cart item by product_id
    const cartItem = await client.query(
      `SELECT c.*, p.stock, p.is_active, p.deleted_at, p.name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.product_id = $1 AND c.user_id = $2 FOR UPDATE`,
      [parsedProductId, user_id]
    );

    if (cartItem.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
    }

    const item = cartItem.rows[0];

    if (item.deleted_at || !item.is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Sản phẩm "${item.name}" không khả dụng. Vui lòng xóa khỏi giỏ.` });
    }

    if (Number(item.stock) < qty) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Không đủ hàng trong kho (còn ${item.stock})` });
    }

    const result = await client.query(
      'UPDATE cart SET quantity = $1 WHERE id = $2 RETURNING *',
      [qty, item.id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update cart item by product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật giỏ hàng' });
  } finally {
    client.release();
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const user_id = req.user.id;

    const parsedId = Number(itemId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }

    const result = await pool.query(
      'DELETE FROM cart WHERE id = $1 AND user_id = $2 RETURNING id',
      [parsedId, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
    }

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa sản phẩm khỏi giỏ hàng' });
  }
};

// Xóa sản phẩm khỏi cart bằng product_id (dùng cho client sync)
exports.removeFromCartByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const user_id = req.user.id;

    const parsedId = Number(productId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({ success: false, message: 'ID sản phẩm không hợp lệ' });
    }

    const result = await pool.query(
      'DELETE FROM cart WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [user_id, parsedId]
    );

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng'
    });
  } catch (error) {
    console.error('Remove from cart by product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa sản phẩm khỏi giỏ hàng' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    await pool.query('DELETE FROM cart WHERE user_id = $1', [user_id]);

    res.json({
      success: true,
      message: 'Đã xóa toàn bộ giỏ hàng'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa giỏ hàng' });
  }
};

// Merge giỏ hàng guest (localStorage) với user cart khi login
exports.mergeCart = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { items } = req.body; // [{ product_id, quantity }]
    const user_id = req.user.id;

    if (!Array.isArray(items)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Danh sách sản phẩm không hợp lệ' });
    }

    let merged = 0;
    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.quantity);
      if (!productId || !Number.isInteger(qty) || qty <= 0) continue;

      // Lock product
      const productResult = await client.query(
        'SELECT stock, is_active, deleted_at FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );
      if (productResult.rows.length === 0) continue;
      const product = productResult.rows[0];
      if (product.deleted_at || !product.is_active) continue;

      // Check existing
      const existing = await client.query(
        'SELECT id, quantity FROM cart WHERE user_id = $1 AND product_id = $2',
        [user_id, productId]
      );

      if (existing.rows.length > 0) {
        const newQty = Math.min(existing.rows[0].quantity + qty, Number(product.stock));
        await client.query(
          'UPDATE cart SET quantity = $1 WHERE id = $2',
          [newQty, existing.rows[0].id]
        );
      } else {
        const finalQty = Math.min(qty, Number(product.stock));
        await client.query(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)',
          [user_id, productId, finalQty]
        );
      }
      merged++;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Đã hợp nhất ${merged} sản phẩm vào giỏ hàng`, merged });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Merge cart error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hợp nhất giỏ hàng' });
  } finally {
    client.release();
  }
};
