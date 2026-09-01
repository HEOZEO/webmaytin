import api from './api';

export const adminService = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats/dashboard');
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get('/admin/stats/alerts');
    return response.data;
  },

  getRecentOrders: async (limit = 10) => {
    const response = await api.get('/admin/stats/recent-orders', { params: { limit } });
    return response.data;
  },

  getTopProducts: async (limit = 10) => {
    const response = await api.get('/admin/stats/top-products', { params: { limit } });
    return response.data;
  },

  getRevenueWeekly: async () => {
    const response = await api.get('/admin/stats/revenue', { params: { groupBy: 'week' } });
    return response.data;
  },

  getRevenueMonthly: async () => {
    const response = await api.get('/admin/stats/revenue', { params: { groupBy: 'month' } });
    return response.data;
  },

  getRevenueByDateRange: async (startDate, endDate, groupBy = 'day') => {
    const response = await api.get('/admin/analytics/revenue', {
      params: { startDate, endDate, groupBy }
    });
    return response.data;
  },

  getTopSellingProducts: async (params = {}) => {
    const response = await api.get('/admin/analytics/top-products', { params });
    return response.data;
  },

  getOrderStatusDistribution: async (params = {}) => {
    const response = await api.get('/admin/analytics/order-status', { params });
    return response.data;
  },

  getCategorySales: async (params = {}) => {
    const response = await api.get('/admin/analytics/category-sales', { params });
    return response.data;
  }
};

export const adminProductService = {
  getAll: async (params = {}) => {
    const response = await api.get('/admin/products', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/products/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/products', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/admin/products/${id}`, data);
    return response.data;
  },

  delete: async (id, permanent = false) => {
    const response = await api.delete(`/admin/products/${id}`, { params: { permanent } });
    return response.data;
  },

  restore: async (id) => {
    const response = await api.put(`/admin/products/${id}/restore`);
    return response.data;
  },

  bulkUpdateStock: async (updates) => {
    const response = await api.post('/admin/products/bulk-stock', { updates });
    return response.data;
  },

  getLowStock: async (threshold = 10) => {
    const response = await api.get('/admin/products/low-stock', { params: { threshold } });
    return response.data;
  },

  getInventoryHistory: async (productId = null, page = 1, limit = 20) => {
    const response = await api.get('/admin/products/inventory-history', {
      params: { productId, page, limit }
    });
    return response.data;
  }
};

export const adminUserService = {
  getAll: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/admin/users/stats');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  toggleStatus: async (id) => {
    const response = await api.put(`/admin/users/${id}/status`);
    return response.data;
  },

  updateRole: async (id, role) => {
    const response = await api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  },

  updateInfo: async (id, data) => {
    const response = await api.put(`/admin/users/${id}/info`, data);
    return response.data;
  },

  unlock: async (id) => {
    const response = await api.post(`/admin/users/${id}/unlock`);
    return response.data;
  },

  getPermissions: async (id) => {
    const response = await api.get(`/admin/users/${id}/permissions`);
    return response.data;
  },

  updatePermissions: async (id, permissions) => {
    const response = await api.put(`/admin/users/${id}/permissions`, { permissions });
    return response.data;
  },

  getDefaultPermissions: async () => {
    const response = await api.get('/admin/users/permissions/default');
    return response.data;
  }
};

export const adminOrderService = {
  getAll: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admin/orders/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/admin/orders/${id}/status`, { status });
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/orders/${id}`);
    return response.data;
  }
};

export const adminReviewService = {
  getAll: async (params = {}) => {
    const response = await api.get('/admin/reviews', { params });
    return response.data;
  },

  toggleVisibility: async (id) => {
    const response = await api.put(`/admin/reviews/${id}/toggle-visibility`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admin/reviews/${id}`);
    return response.data;
  }
};

export const adminCategoryService = {
  getAll: async () => {
    const response = await api.get('/categories/admin');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/categories', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  toggleVisibility: async (id) => {
    const response = await api.put(`/categories/${id}/toggle-visibility`);
    return response.data;
  }
};

export default adminService;
