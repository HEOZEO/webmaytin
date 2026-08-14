const { pool } = require('../config/database');
const { sanitizeHtml } = require('../utils/sanitizer');
const { logInventoryTransaction } = require('../utils/inventory');
const path = require('path');
const fs = require('fs').promises;

// Get all products with filters and pagination
exports.getProducts = async (req, res) => {
  try {
    const pageNumber = Math.max(1, parseInt(req.query.page || '1', 10));
    const limitNumber = Math.max(1, parseInt(req.query.limit || '10', 10));
    const offset = (pageNumber - 1) * limitNumber;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const brand = req.query.brand || '';
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const stockStatus = req.query.stockStatus || req.query.stock;
    const isActive = req.query.is_active;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = ['ASC', 'DESC'].includes((req.query.sortOrder || 'DESC').toUpperCase()) ? (req.query.sortOrder || 'DESC').toUpperCase() : 'DESC';

    const validSortFields = ['name', 'price', 'stock', 'sold', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    const baseQuery = `
      SELECT 
        p.id, p.name, p.sku, p.price, p.sale_price, p.stock, p.sold, p.image_url, p.color, p.cpu, p.ram, p.storage, p.gpu, p.screen_size, p.description, p.is_active, p.brand_id, p.category_id,
        c.name as category_name,
        b.name as brand_name,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1
    `;

    const filterClauses = [];
    const filterValues = [];

    if (search) {
      filterClauses.push(`(p.name ILIKE $${filterValues.length + 1} OR p.cpu ILIKE $${filterValues.length + 1} OR p.sku ILIKE $${filterValues.length + 1})`);
      filterValues.push(`%${search}%`);
    }

    if (category) {
      filterClauses.push(`c.id = $${filterValues.length + 1}`);
      filterValues.push(category);
    }

    if (brand) {
      filterClauses.push(`b.id = $${filterValues.length + 1}`);
      filterValues.push(brand);
    }

    if (minPrice !== undefined && minPrice !== '' && !isNaN(Number(minPrice))) {
      filterClauses.push(`p.price >= $${filterValues.length + 1}`);
      filterValues.push(Number(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== '' && !isNaN(Number(maxPrice))) {
      filterClauses.push(`p.price <= $${filterValues.length + 1}`);
      filterValues.push(Number(maxPrice));
    }

    if (stockStatus === 'in_stock') {
      filterClauses.push(`p.stock > 10`);
    } else if (stockStatus === 'low_stock') {
      filterClauses.push(`p.stock > 0 AND p.stock <= 10`);
    } else if (stockStatus === 'out_of_stock') {
      filterClauses.push(`p.stock <= 0`);
    }

    if (isActive !== undefined && isActive !== '' && isActive !== 'all') {
      filterClauses.push(`p.is_active = $${filterValues.length + 1}`);
      filterValues.push(isActive === 'true' || isActive === true);
    } else {
      // 'all' means show everything (active + hidden) for admin
      // No filter applied
    }

    const whereClause = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1=1${whereClause}
    `;
    const countResult = await pool.query(countQuery, filterValues);
    const totalCount = parseInt(countResult.rows[0].total || '0', 10);

    const query = `${baseQuery}${whereClause} ORDER BY p.${sortField} ${sortOrder} LIMIT $${filterValues.length + 1} OFFSET $${filterValues.length + 2}`;
    const result = await pool.query(query, [...filterValues, limitNumber, offset]);

    res.json({
      success: true,
      data: result.rows,
      products: result.rows,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNumber)),
        totalItems: totalCount,
        itemsPerPage: limitNumber
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sản phẩm', error: error.message });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE p.id = $1 AND (p.deleted_at IS NULL)`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin sản phẩm', error: error.message });
  }
};

// Auto-generate SKU theo format LAP-{BRAND}-{CAT}-{YYYYMMDD}-{NNNN}
// - BRAND: lấy từ brand name (mapping cố định: DEL/HP/LEN/APP/ASU/ACE/MSI/...)
// - CAT:   lấy từ category name (mapping cố định: OFF/STD/GMG/GRH/BIZ/THN/...)
// - YYYYMMDD: ngày tạo
// - NNNN: random 4 số, nếu trùng thì tăng dần
const SKU_BRAND_CODES = {
  'dell': 'DEL', 'hp': 'HP', 'hewlett': 'HP', 'lenovo': 'LEN',
  'apple': 'APP', 'asus': 'ASU', 'acer': 'ACE', 'msi': 'MSI',
  'microsoft': 'MS', 'samsung': 'SAM', 'lg': 'LG', 'razer': 'RAZ',
};
const SKU_CAT_CODES = {
  'van phong': 'OFF', 'sinh vien': 'STD', 'gaming': 'GMG',
  'do hoa': 'GRH', 'mong nhe': 'THN', 'doanh nhan': 'BIZ',
};

function noDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function skuBrandCode(name) {
  if (!name) return 'GEN';
  const norm = noDiacritics(String(name)).toLowerCase().trim();
  for (const key of Object.keys(SKU_BRAND_CODES)) {
    if (norm === key || norm.startsWith(key + ' ') || norm.startsWith(key + '-')) {
      return SKU_BRAND_CODES[key];
    }
  }
  const clean = noDiacritics(String(name)).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 3) || 'GEN').padEnd(3, 'X');
}
function skuCatCode(name) {
  if (!name) return 'GEN';
  const norm = noDiacritics(String(name)).toLowerCase().trim();
  if (SKU_CAT_CODES[norm]) return SKU_CAT_CODES[norm];
  const clean = noDiacritics(String(name)).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (clean.slice(0, 3) || 'GEN').padEnd(3, 'X');
}

async function generateUniqueSku(client, { brandName, categoryName, provided }) {
  // Nếu user cung cấp SKU thì dùng luôn (sau khi check unique)
  if (provided) {
    const exists = await client.query('SELECT 1 FROM products WHERE sku = $1 LIMIT 1', [provided]);
    if (exists.rows.length === 0) return provided;
    // Nếu trùng thì append random
    return `${provided}-${Date.now().toString().slice(-4)}`;
  }

  const brand = skuBrandCode(brandName);
  const cat = skuCatCode(categoryName);
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

  // Thử random 4 số trước, nếu trùng thì tăng
  for (let attempt = 0; attempt < 20; attempt++) {
    const rand = attempt === 0
      ? String(Math.floor(1000 + Math.random() * 9000))
      : String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `LAP-${brand}-${cat}-${ymd}-${rand}`;
    const exists = await client.query('SELECT 1 FROM products WHERE sku = $1 LIMIT 1', [candidate]);
    if (exists.rows.length === 0) return candidate;
  }
  // Fallback cực hiếm: dùng timestamp
  return `LAP-${brand}-${cat}-${ymd}-${Date.now().toString().slice(-6)}`;
}

// Create product
exports.createProduct = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { name, sku, brand_id, category_id, cpu, ram, storage, gpu, screen_size, weight, battery, color, price, sale_price, stock, image_url, description, is_active } = req.body;

    // Validation
    if (!name || price === undefined || price < 0 || stock === undefined || stock < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên sản phẩm, giá bán và số lượng tồn kho' });
    }

    // Sanitize user input
    const sanitizedDescription = description ? sanitizeHtml(description) : '';

    // Lấy brand/category name để auto-generate SKU
    let brandName = null;
    let categoryName = null;
    if (brand_id) {
      const r = await client.query('SELECT name FROM brands WHERE id = $1', [brand_id]);
      brandName = r.rows[0]?.name || null;
    }
    if (category_id) {
      const r = await client.query('SELECT name FROM categories WHERE id = $1', [category_id]);
      categoryName = r.rows[0]?.name || null;
    }
    const finalSku = await generateUniqueSku(client, {
      brandName,
      categoryName,
      provided: sku || null
    });

    const result = await client.query(
      `INSERT INTO products (name, sku, brand_id, category_id, cpu, ram, storage, gpu, screen_size, weight, battery, color, price, sale_price, stock, image_url, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        name,
        finalSku,
        brand_id || null,
        category_id || null,
        cpu || 'Tiêu chuẩn',
        ram || '8GB',
        storage || '512GB',
        gpu || 'Integrated',
        screen_size || '15.6"',
        weight || 1.8,
        battery || 45,
        color || 'Đen',
        price,
        sale_price || null,
        stock,
        image_url || '',
        sanitizedDescription,
        is_active !== false
      ]
    );

    // Log inventory transaction when available
    await logInventoryTransaction(client, {
      productId: result.rows[0].id,
      quantityChange: stock,
      reason: 'initial_creation',
      adminId: req.user.id,
      previousStock: 0,
      newStock: stock
    });

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: 'Sản phẩm tạo thành công', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo sản phẩm', error: error.message });
  } finally {
    client.release();
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { name, sku, brand_id, category_id, cpu, ram, storage, gpu, screen_size, weight, battery, color, price, sale_price, stock, image_url, description, is_active } = req.body;

    // Get old product data for audit
    const oldResult = await client.query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (oldResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
    }

    const oldProduct = oldResult.rows[0];

    // Sanitize user input
    const sanitizedDescription = description ? sanitizeHtml(description) : undefined;

    const result = await client.query(
      `UPDATE products 
       SET name = COALESCE($2, name),
           sku = COALESCE($3, sku),
           brand_id = COALESCE($4, brand_id),
           category_id = COALESCE($5, category_id),
           cpu = COALESCE($6, cpu),
           ram = COALESCE($7, ram),
           storage = COALESCE($8, storage),
           gpu = COALESCE($9, gpu),
           screen_size = COALESCE($10, screen_size),
           weight = COALESCE($11, weight),
           battery = COALESCE($12, battery),
           color = COALESCE($13, color),
           price = COALESCE($14, price),
           sale_price = $15,
           image_url = COALESCE($16, image_url),
           description = COALESCE($17, description),
           is_active = COALESCE($18, is_active),
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, name, sku, brand_id, category_id, cpu, ram, storage, gpu, screen_size, weight, battery, color, price, sale_price, image_url, sanitizedDescription, is_active]
    );

    // If stock changed, log inventory transaction
    if (stock !== undefined && stock !== oldProduct.stock) {
      const change = stock - oldProduct.stock;
      await logInventoryTransaction(client, {
        productId: id,
        quantityChange: change,
        reason: 'admin_adjustment',
        adminId: req.user.id,
        previousStock: oldProduct.stock,
        newStock: stock,
        notes: `Stock updated from ${oldProduct.stock} to ${stock}`
      });
      
      // Also update stock in products table
      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Sản phẩm cập nhật thành công', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật sản phẩm', error: error.message });
  } finally {
    client.release();
  }
};

// Delete product (Option 1: Hard delete if permanent=true, Option 2: Soft delete / Hide if permanent=false)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const isPermanent = req.query.permanent === 'true' || req.body?.permanent === true;

    if (isPermanent) {
      // Option 1: Hard delete (xóa vĩnh viễn khỏi CSDL)
      const result = await pool.query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
      }
      return res.json({ success: true, message: 'Đã xóa vĩnh viễn sản phẩm khỏi CSDL' });
    } else {
      // Option 2: Ẩn sản phẩm (chỉ set is_active = false, KHÔNG set deleted_at)
      const result = await pool.query(
        `UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
      }

      return res.json({ success: true, message: 'Đã ẩn sản phẩm (sẽ không hiển thị ở trang khách hàng)' });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa sản phẩm', error: error.message });
  }
};

// Restore product (Mở lại sản phẩm đã bị ẩn/xóa mềm)
exports.restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE products SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tìm thấy' });
    }

    res.json({ success: true, message: 'Đã mở lại sản phẩm thành công', data: result.rows[0] });
  } catch (error) {
    console.error('Restore product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khôi phục sản phẩm', error: error.message });
  }
};

// Bulk update stock
exports.bulkUpdateStock = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { updates } = req.body; // Array of { productId, quantity, type, reason, notes }

    if (!Array.isArray(updates) || updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp dữ liệu cập nhật' });
    }

    const results = [];

    for (const update of updates) {
      const { productId, quantity, type, reason, notes } = update;

      // Validate quantity
      const q = Number(quantity);
      if (!Number.isFinite(q) || q < 0 || !Number.isInteger(q)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Số lượng không hợp lệ cho sản phẩm #${productId}: phải là số nguyên >= 0`
        });
      }

      // Atomic: lock row to serialize concurrent updates
      const oldResult = await client.query(
        `SELECT stock FROM products WHERE id = $1 FOR UPDATE`,
        [productId]
      );
      if (oldResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: `Sản phẩm #${productId} không tồn tại`
        });
      }

      const oldStock = oldResult.rows[0].stock;
      let newStock;

      // Xử lý theo type:
      // 'in': Cộng thêm vào kho
      // 'out': Trừ khỏi kho (đảm bảo không âm)
      // 'adjustment': Đặt giá trị tuyệt đối
      if (type === 'in') {
        newStock = oldStock + q;
      } else if (type === 'out') {
        newStock = Math.max(0, oldStock - q);
      } else {
        // 'adjustment' hoặc default - đặt giá trị tuyệt đối
        newStock = q;
      }

      await client.query(
        `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
        [newStock, productId]
      );

      await logInventoryTransaction(client, {
        productId,
        quantityChange: newStock - oldStock,
        reason: reason || type || 'bulk_update',
        adminId: req.user.id,
        previousStock: oldStock,
        newStock: newStock,
        notes: notes || `Stock ${type}: ${oldStock} → ${newStock}`
      });

      results.push({ productId, status: 'success', oldStock, newStock, type });
    }

    // Ghi log activity cho staff/admin đã thực hiện bulk update
    await client.query(
      `INSERT INTO activity_logs (user_id, action, description)
       VALUES ($1, $2, $3)`,
      [
        req.user.id,
        `${req.user.role.toUpperCase()}_BULK_STOCK_UPDATE`,
        `[${req.user.role}] ${req.user.full_name || req.user.email} đã cập nhật tồn kho hàng loạt cho ${results.length} sản phẩm`
      ]
    ).catch(err => console.warn('Activity log error:', err.message));

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Cập nhật ${results.length} sản phẩm thành công`,
      data: results,
      updatedBy: { id: req.user.id, name: req.user.full_name || req.user.email, role: req.user.role }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk update stock error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật tồn kho', error: error.message });
  } finally {
    client.release();
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = req.query.threshold || 10;
    
    const result = await pool.query(
      `SELECT 
        p.id, p.name, p.price, p.stock, p.image_url,
        c.name as category_name,
        b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE p.stock <= $1
       ORDER BY p.stock ASC`,
      [threshold]
    );

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy sản phẩm tồn kho thấp', error: error.message });
  }
};

// Get inventory transaction history
exports.getInventoryHistory = async (req, res) => {
  try {
    const { productId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT it.*, u.full_name as admin_name
      FROM inventory_transactions it
      LEFT JOIN users u ON it.admin_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += ` AND it.product_id = $${params.length + 1}`;
      params.push(productId);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM inventory_transactions ${productId ? `WHERE product_id = $1` : ''}`,
      productId ? [productId] : []
    );

    query += ` ORDER BY it.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
        totalItems: parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy lịch sử tồn kho', error: error.message });
  }
};
