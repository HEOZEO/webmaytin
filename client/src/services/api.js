import axios from 'axios';
import authService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// CSRF token storage
let csrfToken = null;

// Fetch CSRF token from server (uses cookie auth, no body needed)
const fetchCsrfToken = async () => {
  try {
    const r = await fetch(API_URL.replace(/\/api$/, '') + '/api/auth/csrf-token', {
      credentials: 'include'
    });
    if (r.ok) {
      const data = await r.json();
      if (data?.csrfToken) {
        csrfToken = data.csrfToken;
        return true;
      }
    }
  } catch (e) {
    console.warn('[api] Failed to fetch CSRF token:', e);
  }
  return false;
};

const api = axios.create({
  baseURL: API_URL,
  // KHÔNG set Content-Type ở đây — để axios tự detect:
  // - application/json cho object thường
  // - multipart/form-data + boundary cho FormData (kèm file upload)
  // Nếu set Content-Type mặc định, axios sẽ KHÔNG override khi gặp FormData
  // → multipart upload bị corrupt, multer không parse được → req.file undefined → 400
  headers: {},
  timeout: 30000, // 30s timeout
});

// Interceptor to attach Authorization Bearer token and CSRF token
api.interceptors.request.use(
  async (config) => {
    // Attach JWT token if present
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach CSRF token for unsafe methods (POST, PUT, DELETE, PATCH)
    const unsafeMethods = ['post', 'put', 'patch', 'delete'];
    const method = config.method?.toLowerCase();
    if (unsafeMethods.includes(method)) {
      // If no csrfToken yet, try to fetch it on-demand (covers race conditions
      // where user makes first PUT/POST before AuthContext finished initCsrfToken)
      if (!csrfToken) {
        await fetchCsrfToken();
      }
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Set CSRF token from cookie (called on app init for returning users)
export const initCsrfToken = async () => {
  // Read from cookie
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('_csrf_token='));
  if (csrfCookie) {
    const token = csrfCookie.split('=')[1];
    if (token) {
      csrfToken = token;
      return true;
    }
  }
  // Cookie is httpOnly so document.cookie will be empty. Fetch from server.
  return await fetchCsrfToken();
};

// Set CSRF token from cookie (called after login)
export const setCsrfToken = (token) => {
  csrfToken = token;
};

// Get CSRF token
export const getCsrfToken = () => csrfToken;

// Force-clear CSRF token (used when retrying after CSRF failure)
const clearCsrfToken = () => {
  csrfToken = null;
};

// Response interceptor for unified error handling + CSRF retry
api.interceptors.response.use(
  (response) => {
    // Update CSRF token from response header (preferred) or cookie fallback
    const headerToken = response.headers['x-csrf-token'];
    if (headerToken) {
      csrfToken = headerToken;
    } else {
      // Fallback: parse from cookie string
      const cookies = response.config.jar
        ? ''
        : document.cookie || '';
      const match = cookies.match(/_csrf_token=([^;]+)/);
      if (match && match[1]) {
        csrfToken = match[1];
      }
    }

    return response;
  },
  async (error) => {
    // Network error (no response)
    if (!error.response) {
      const networkError = new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // CSRF error handling — try to recover by re-fetching token and retrying ONCE.
    // Only for unsafe methods (POST/PUT/PATCH/DELETE). Avoids full page reload.
    const isCsrfError = error.response.status === 403 &&
      (error.response.data?.code === 'CSRF_INVALID' || error.response.data?.code === 'CSRF_MISSING');
    const originalRequest = error.config;
    const isUnsafeMethod = ['post', 'put', 'patch', 'delete'].includes(
      (originalRequest?.method || '').toLowerCase()
    );

    if (isCsrfError && isUnsafeMethod && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      clearCsrfToken();
      const ok = await fetchCsrfToken();
      if (ok && csrfToken) {
        originalRequest.headers['x-csrf-token'] = csrfToken;
        try {
          return await api(originalRequest);
        } catch (retryErr) {
          // If retry also fails, fall through to normal error handling
          if (!retryErr.response) {
            return Promise.reject(retryErr);
          }
          // Use retried error for final reporting
          error = retryErr;
        }
      }
    }

    // Handle CSRF error on 403 (fallback — reload if recovery failed)
    if (error.response?.status === 403 &&
        (error.response.data?.code === 'CSRF_INVALID' || error.response.data?.code === 'CSRF_MISSING')) {
      window.location.reload();
      return Promise.reject(new Error('CSRF token hết hạn. Trang đang tải lại...'));
    }

    // Auto logout on 401 nhưng KHÔNG xóa cart (giữ lại)
    if (error.response.status === 401) {
      const wasLoggedIn = !!authService.getToken();
      authService.logout();
      if (wasLoggedIn && !window.location.pathname.includes('/login')) {
        // Chỉ redirect khi user đã login trước đó
        window.location.href = '/login?expired=1';
      }
    }

    // Convert error thành object dễ đọc
    const apiError = {
      status: error.response.status,
      message: error.response.data?.message || error.message || 'Có lỗi xảy ra',
      code: error.response.data?.code,
      data: error.response.data,
      isNetworkError: false,
      originalError: error
    };

    return Promise.reject(apiError);
  }
);

export default api;
