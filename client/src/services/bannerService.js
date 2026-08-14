import api from './api';

export const bannerService = {
  getAll: async (params = {}) => {
    const response = await api.get('/banners', { params });
    return response.data;
  },

  getActive: async () => {
    const response = await api.get('/banners', { params: { active: true } });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/banners/${id}`);
    return response.data;
  },

  // Admin
  create: async (data) => {
    const response = await api.post('/banners', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/banners/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/banners/${id}`);
    return response.data;
  },

  reorder: async (banners) => {
    const response = await api.put('/banners/reorder', { banners });
    return response.data;
  }
};

export default bannerService;
