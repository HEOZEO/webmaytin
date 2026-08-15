const { pool } = require('../config/database');
const { getCache, setCache, invalidateCache } = require('../utils/cache');

const normalizeListParam = (value) => {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

// Search products with autocomplete (for suggestions)
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    // If no query or empty, return empty array
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchTerm = q.trim();
    
    // Search products by name (case-insensitive)
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.price,
        p.image_url,
        b.name as brand_name,
        p.stock
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE (p.deleted_at IS NULL) AND (p.is_active = true OR p.is_active IS NULL) AND p.name ILIKE $1
      ORDER BY 
        CASE 
          WHEN LOWER(p.name) LIKE LOWER($2) THEN 1
          ELSE 2
        END,
        p.name ASC
      LIMIT 8
    `;
    
    // $1: contains the search term anywhere
    // $2: starts with the search term (higher priority)
    const result = await pool.query(query, [
      `%${searchTerm}%`,
      `${searchTerm}%`
    ]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tìm kiếm sản phẩm'
    });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      brand,
      category,
      min_price,
      max_price,
      cpu,
      ram,
      storage,
      gpu,
      screen_size,
      sort,
      page = 1,
      limit = 12
    } = req.query;

    const cacheKey = JSON.stringify({ search, brand, category, min_price, max_price, cpu, ram, storage, gpu, screen_size, sort, page, limit });
    const cached = getCache('products:list', cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const brandFilters = normalizeListParam(brand);
    const categoryFilters = normalizeListParam(category);
    const cpuFilters = normalizeListParam(cpu);
    const ramFilters = normalizeListParam(ram);
    const storageFilters = normalizeListParam(storage);
    const gpuFilters = normalizeListParam(gpu);
    const screenFilters = normalizeListParam(screen_size);

    // Build WHERE clause once, share params between list query and count query
    const whereParts = [`(p.deleted_at IS NULL)`, `(p.is_active = true OR p.is_active IS NULL)`];
    const filterParams = [];
    let i = 1;

    if (search) {
      whereParts.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`);
      filterParams.push(`%${search}%`);
      i++;
    }
    if (brandFilters.length) {
      const brandIds = brandFilters.map(b => parseInt(b)).filter(b => !isNaN(b));
      if (brandIds.length > 0) {
        whereParts.push(`p.brand_id = ANY($${i}::int[])`);
        filterParams.push(brandIds);
        i++;
      }
    }
    if (categoryFilters.length) {
      const catIds = categoryFilters.map(c => parseInt(c)).filter(c => !isNaN(c));
      if (catIds.length > 0) {
        whereParts.push(`p.category_id = ANY($${i}::int[])`);
        filterParams.push(catIds);
        i++;
      }
    }
    if (min_price) {
      whereParts.push(`p.price >= $${i}`);
      filterParams.push(parseFloat(min_price));
      i++;
    }
    if (max_price) {
      whereParts.push(`p.price <= $${i}`);
      filterParams.push(parseFloat(max_price));
      i++;
    }
    if (cpuFilters.length) {
      whereParts.push(`p.cpu = ANY($${i})`);
      filterParams.push(cpuFilters);
      i++;
    }
    if (ramFilters.length) {
      whereParts.push(`p.ram = ANY($${i})`);
      filterParams.push(ramFilters);
      i++;
    }
    if (storageFilters.length) {
      whereParts.push(`p.storage = ANY($${i})`);
      filterParams.push(storageFilters);
      i++;
    }
    if (gpuFilters.length) {
      whereParts.push(`p.gpu = ANY($${i})`);
      filterParams.push(gpuFilters);
      i++;
    }
    if (screenFilters.length) {
      whereParts.push(`p.screen_size = ANY($${i})`);
      filterParams.push(screenFilters);
      i++;
    }

    const whereClause = whereParts.join(' AND ');

    // Sorting
    let orderBy;
    switch (sort) {
      case 'price_asc': orderBy = 'p.price ASC'; break;
      case 'price_desc': orderBy = 'p.price DESC'; break;
      case 'name_asc': orderBy = 'p.name ASC'; break;
      case 'name_desc': orderBy = 'p.name DESC'; break;
      case 'newest': orderBy = 'p.created_at DESC'; break;
      case 'best_seller': orderBy = 'p.sold DESC'; break;
      default: orderBy = 'p.created_at DESC';
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const listQuery = `
      SELECT p.id, p.name, p.sku, p.price, p.stock, p.image_url, p.description, p.cpu, p.ram, p.storage, p.gpu, p.screen_size, p.brand_id, p.category_id,
             b.name as brand_name, c.name as category_name,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.is_hidden = false
      WHERE ${whereClause}
      GROUP BY p.id, b.name, c.name
      ORDER BY ${orderBy}
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const result = await pool.query(listQuery, [...filterParams, limitNum, offset]);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, filterParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const response = {
      success: true,
      data: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };

    setCache('products:list', cacheKey, response, 30);

    res.json(response);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sản phẩm' });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, b.name as brand_name, c.name as category_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN reviews r ON p.id = r.product_id AND r.is_hidden = false
       WHERE p.id = $1 AND (p.deleted_at IS NULL) AND (p.is_active = true OR p.is_active IS NULL)
       GROUP BY p.id, b.name, c.name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết sản phẩm' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name, brand_id, category_id, cpu, ram, storage, gpu,
      screen_size, weight, battery, color, price, stock, image_url, description
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products 
       (name, brand_id, category_id, cpu, ram, storage, gpu, screen_size, 
        weight, battery, color, price, stock, image_url, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [name, brand_id, category_id, cpu, ram, storage, gpu, screen_size,
       weight, battery, color, price, stock, image_url, description]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'PRODUCT_CREATE', `Tạo sản phẩm mới: ${name}`]
    );

    invalidateCache('products:list');

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi tạo sản phẩm' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, brand_id, category_id, cpu, ram, storage, gpu,
      screen_size, weight, battery, color, price, stock, image_url, description
    } = req.body;

    const result = await pool.query(
      `UPDATE products 
       SET name = $1, brand_id = $2, category_id = $3, cpu = $4, ram = $5, 
           storage = $6, gpu = $7, screen_size = $8, weight = $9, battery = $10, 
           color = $11, price = $12, stock = $13, image_url = $14, description = $15
       WHERE id = $16
       RETURNING *`,
      [name, brand_id, category_id, cpu, ram, storage, gpu, screen_size,
       weight, battery, color, price, stock, image_url, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'PRODUCT_UPDATE', `Cập nhật sản phẩm: ${name}`]
    );

    invalidateCache('products:list');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật sản phẩm' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING name', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, description) VALUES ($1, $2, $3)',
      [req.user.id, 'PRODUCT_DELETE', `Xóa sản phẩm: ${result.rows[0].name}`]
    );

    invalidateCache('products:list');

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xóa sản phẩm' });
  }
};

exports.compareProducts = async (req, res) => {
  try {
    const { ids } = req.query; // Expecting comma-separated IDs

    if (!ids) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ID sản phẩm' });
    }

    const productIds = ids.split(',').map(id => parseInt(id));

    if (productIds.length > 3) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể so sánh tối đa 3 sản phẩm' });
    }

    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.price, p.stock, p.image_url, p.description, p.cpu, p.ram, p.storage, p.gpu, p.screen_size, p.brand_id, p.category_id,
              b.name as brand_name, c.name as category_name,
              COALESCE(AVG(r.rating), 0) as avg_rating,
              COUNT(DISTINCT r.id) as review_count
       FROM products p
       LEFT JOIN brands b ON p.brand_id = b.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN reviews r ON p.id = r.product_id AND r.is_hidden = false
       WHERE (p.deleted_at IS NULL) AND (p.is_active = true OR p.is_active IS NULL)
         AND p.id = ANY($1::int[])
       GROUP BY p.id, b.name, c.name`,
      [productIds]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Compare products error:', error);
    res.status(500).json({ success: false, message: 'Lỗi so sánh sản phẩm' });
  }
};
