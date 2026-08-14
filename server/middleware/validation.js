const Joi = require('joi');

exports.validateRegister = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Mật khẩu phải có ít nhất 8 ký tự'
    }),
    full_name: Joi.string().min(2).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    address: Joi.string().allow('', null).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().min(3).max(255).optional().allow(''),
    username: Joi.string().min(3).max(255).optional().allow(''),
    password: Joi.string().required(),
    remember: Joi.boolean().optional()
  }).or('email', 'username');

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateProduct = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    brand_id: Joi.number().integer().required(),
    category_id: Joi.number().integer().required(),
    cpu: Joi.string().required(),
    ram: Joi.string().required(),
    storage: Joi.string().required(),
    gpu: Joi.string().required(),
    screen_size: Joi.string().required(),
    weight: Joi.number().positive().required(),
    battery: Joi.number().positive().required(),
    color: Joi.string().required(),
    price: Joi.number().positive().required(),
    stock: Joi.number().integer().min(0).required(),
    image_url: Joi.string().uri().required(),
    description: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateOrder = (req, res, next) => {
  const schema = Joi.object({
    items: Joi.array().items(
      Joi.object({
        product_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().min(1).max(999).required()
      })
    ).min(1).max(50).required(),
    shipping_address: Joi.string().min(10).max(500).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    payment_method: Joi.string().valid('cod', 'COD', 'bank_transfer', 'BANK_TRANSFER').required(),
    coupon_code: Joi.string().min(1).max(50).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null),
    shipping_method_id: Joi.number().integer().positive().optional().allow(null),
    district_id: Joi.number().integer().positive().optional().allow(null),
    ward_id: Joi.number().integer().positive().optional().allow(null),
    full_name: Joi.string().min(2).max(100).optional().allow('', null),
    recipient_name: Joi.string().min(2).max(100).optional().allow('', null),
    email: Joi.string().email().optional().allow('', null)
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateReview = (req, res, next) => {
  const schema = Joi.object({
    product_id: Joi.number().integer().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().min(10).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

// Bổ sung validation cho cart, address, password change, coupon, payment
exports.validateAddToCart = (req, res, next) => {
  const schema = Joi.object({
    product_id: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().min(1).max(999).default(1)
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateUpdateCart = (req, res, next) => {
  const schema = Joi.object({
    quantity: Joi.number().integer().min(1).max(999).required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: 'Số lượng không hợp lệ (1-999)' });
  }
  next();
};

exports.validateAddress = (req, res, next) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
    address: Joi.string().min(5).max(255).required(),
    district_id: Joi.number().integer().optional().allow(null),
    ward_id: Joi.number().integer().optional().allow(null),
    is_default: Joi.boolean().optional()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).max(128).required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateForgotPassword = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: 'Email không hợp lệ' });
  }
  next();
};

exports.validateResetPassword = (req, res, next) => {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(128).required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateCoupon = (req, res, next) => {
  const schema = Joi.object({
    code: Joi.string().min(2).max(50).required(),
    order_total: Joi.number().positive().required()
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,11}$/).allow('', null),
    address: Joi.string().max(255).allow('', null)
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};

exports.validatePaymentUpload = (req, res, next) => {
  const schema = Joi.object({
    order_id: Joi.number().integer().required(),
    amount: Joi.number().positive().required(),
    notes: Joi.string().max(500).optional().allow('', null)
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  next();
};
