import api from './api';

const BASE_URL = '/locations';

export const locationService = {
  getDistricts: async () => {
    const res = await api.get(`${BASE_URL}/districts`);
    return res.data;
  },

  getWards: async (districtId) => {
    const res = await api.get(`${BASE_URL}/wards/${districtId}`);
    return res.data;
  },

  getAllWards: async () => {
    const res = await api.get(`${BASE_URL}/wards`);
    return res.data;
  },

  getShippingFee: async (districtId) => {
    const res = await api.get(`${BASE_URL}/shipping-fee`, { params: { district_id: districtId } });
    return res.data;
  }
};

export default locationService;
