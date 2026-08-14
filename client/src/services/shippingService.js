import api from './api';

export const shippingService = {
  getAll: async () => {
    const response = await api.get('/shipping-methods');
    return response.data;
  },

  getActive: async () => {
    const response = await api.get('/shipping-methods', { params: { active: true } });
    return response.data;
  }
};

export default shippingService;
