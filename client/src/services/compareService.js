import api from './api';

export const compareService = {
  compare: async (ids) => {
    const response = await api.get('/products/compare', { params: { ids: ids.join(',') } });
    return response.data;
  }
};

export default compareService;
