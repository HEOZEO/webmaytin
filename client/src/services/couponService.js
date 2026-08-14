import api from './api';

export const couponService = {
  validate: async (code, orderTotal = 0) => {
    const response = await api.post('/coupons/validate', { code, order_total: orderTotal });
    return response.data;
  },

  getAvailable: async () => {
    const response = await api.get('/coupons/available');
    return response.data;
  },

  // User-scoped: các mã đã gán cho user hiện tại, còn dùng được
  getMyCoupons: async () => {
    const response = await api.get('/coupons/my-coupons');
    return response.data;
  },

  // User-scoped: các mã user đã sử dụng
  getMyUsedCoupons: async () => {
    const response = await api.get('/coupons/my-used-coupons');
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/admin/coupons', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/coupons', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/coupons/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.put(`/admin/coupons/${id}/toggle`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/coupons/${id}`);
    return response.data;
  }
};

export default couponService;
