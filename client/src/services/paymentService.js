import api from './api';

const BASE_URL = '/payments';
const ADMIN_URL = '/admin/payments';

export const paymentService = {
  getQRInfo: async () => {
    const res = await api.get(`${BASE_URL}/qr`);
    return res.data;
  },

  uploadBill: async (formData) => {
    // IMPORTANT: do NOT set Content-Type manually — axios will auto-set
    // `multipart/form-data; boundary=...` when given a FormData object.
    // Setting it manually strips the boundary and corrupts the upload.
    const res = await api.post(`${BASE_URL}/upload-bill`, formData);
    return res.data;
  },

  getMyRequests: async () => {
    const res = await api.get(`${BASE_URL}/my-requests`);
    return res.data;
  },

  resendBill: async (formData) => {
    const res = await api.post(`${BASE_URL}/resend-bill`, formData);
    return res.data;
  }
};

export const adminPaymentService = {
  getSettings: async () => {
    const res = await api.get(`${ADMIN_URL}/settings`);
    return res.data;
  },

  updateSettings: async (formData) => {
    // Let axios auto-generate the multipart boundary — do not set manually.
    const res = await api.put(`${ADMIN_URL}/settings`, formData);
    return res.data;
  },

  getRequests: async (params = {}) => {
    const res = await api.get(`${ADMIN_URL}/requests`, { params });
    return res.data;
  },

  getRequest: async (id) => {
    const res = await api.get(`${ADMIN_URL}/requests/${id}`);
    return res.data;
  },

  approve: async (id) => {
    const res = await api.put(`${ADMIN_URL}/requests/${id}/approve`);
    return res.data;
  },

  reject: async (id, reason) => {
    const res = await api.put(`${ADMIN_URL}/requests/${id}/reject`, { reason });
    return res.data;
  }
};

export default paymentService;
