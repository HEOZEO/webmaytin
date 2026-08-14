import api from './api';

const cartService = {
  // Lấy cart từ server
  getCart: async () => {
    const res = await api.get('/cart');
    return res.data;
  },

  // Thêm sản phẩm vào cart (server)
  addItem: async (productId, quantity = 1) => {
    const res = await api.post('/cart', { product_id: productId, quantity });
    return res.data;
  },

  // Xóa sản phẩm khỏi cart bằng product_id (server)
  removeItem: async (productId) => {
    const res = await api.delete(`/cart/product/${productId}`);
    return res.data;
  },

  // Cập nhật số lượng bằng product_id
  updateItem: async (productId, quantity) => {
    const res = await api.put(`/cart/product/${productId}`, { quantity });
    return res.data;
  },

  // Merge guest cart với server cart khi login
  mergeCart: async (items) => {
    const res = await api.post('/cart/merge', { items });
    return res.data;
  },

  // Xóa toàn bộ cart (server)
  clearCart: async () => {
    const res = await api.delete('/cart');
    return res.data;
  }
};

export default cartService;
