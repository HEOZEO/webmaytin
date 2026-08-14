// Generate a JWT directly for test user (skip password check)
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
  { id: 22, email: 'levietphong1900@gmail.com', role: 'customer' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('JWT for user 22 (valid 7 days):');
console.log(token);
