import api, { setCsrfToken } from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const data = response.data;
    if (data?.token) {
      const remember = data.remember !== false;
      const target = remember ? localStorage : sessionStorage;
      target.setItem('token', data.token);
      const user = data.user || data.data;
      if (user) target.setItem('user', JSON.stringify(user));
      localStorage.setItem('remember', remember ? '1' : '0');

      // Fetch CSRF token after successful login (GET request sets the cookie)
      try {
        await api.get('/auth/csrf-token');
      } catch (e) {
        // CSRF endpoint may not exist, try to get from cookie directly
        const cookies = document.cookie.split(';');
        const csrfCookie = cookies.find(c => c.trim().startsWith('_csrf_token='));
        if (csrfCookie) {
          const token = csrfCookie.split('=')[1];
          if (token) setCsrfToken(token);
        }
      }
    }
    return data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async ({ token, password }) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  sendRegisterOTP: async (email) => {
    const response = await api.post('/auth/send-otp', { email });
    return response.data;
  },

  verifyRegisterOTP: async ({ email, otp_code, full_name, password, phone, remember = true }) => {
    const response = await api.post('/auth/verify-otp', { email, otp_code, full_name, password, phone });
    const data = response.data;
    if (data?.token) {
      const target = remember ? localStorage : sessionStorage;
      target.setItem('token', data.token);
      const user = data.user || data.data;
      if (user) target.setItem('user', JSON.stringify(user));
      localStorage.setItem('remember', remember ? '1' : '0');

      // Fetch CSRF token after successful login
      try {
        await api.get('/auth/csrf-token');
      } catch (e) {
        const cookies = document.cookie.split(';');
        const csrfCookie = cookies.find(c => c.trim().startsWith('_csrf_token='));
        if (csrfCookie) {
          const token = csrfCookie.split('=')[1];
          if (token) setCsrfToken(token);
        }
      }
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('remember');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
};

// Helper: lấy token từ localStorage HOẶC sessionStorage (tuỳ remember)
authService.getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export default authService;