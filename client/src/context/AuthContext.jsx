import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import api, { initCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync user across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        try {
          setUser(e.key === 'user' ? JSON.parse(e.newValue || 'null') : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      // Initialize CSRF token from cookie OR fetch from server (for returning users who are logged in)
      await initCsrfToken();

      const token = authService.getToken();
      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const data = await authService.getCurrentUser();
        if (!isMounted) return;
        const currentUser = data?.user || data?.data;
        if (currentUser) {
          setUser(currentUser);
          // Lưu vào đúng nơi tuỳ remember để giữ đồng bộ
          const remember = localStorage.getItem('remember') !== '0';
          const target = remember ? localStorage : sessionStorage;
          target.setItem('user', JSON.stringify(currentUser));

          // Try to refresh CSRF token for logged-in users
          try {
            await api.get('/auth/csrf-token');
          } catch (csrfErr) {
            // CSRF refresh is best-effort, don't fail auth
          }
        } else {
          throw new Error('Invalid user payload');
        }
      } catch (error) {
        if (!isMounted) return;
        // Token invalid or expired — clean up silently
        authService.logout();
        setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    const currentUser = data.user || data.data;
    if (currentUser) {
      setUser(currentUser);
      const remember = data.remember !== false;
      const target = remember ? localStorage : sessionStorage;
      target.setItem('user', JSON.stringify(currentUser));
    }
    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await authService.register(userData);
    return data;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      const remember = localStorage.getItem('remember') !== '0';
      const target = remember ? localStorage : sessionStorage;
      target.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const isStaffOrAdmin = isAdmin || isStaff;

  /**
   * Kiểm tra user hiện tại có permission cụ thể không.
   * Admin luôn true.
   * Customer/staff không có permission → false.
   *
   * @param {string} permKey VD: 'products.view', 'orders.update_status'
   * @returns {boolean}
   */
  const hasPermission = useCallback((permKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'staff') return false;

    const perms = user.permissions || {};
    if (perms.all === true) return true;

    const parts = permKey.split('.');
    let cur = perms;
    for (const part of parts) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return false;
      cur = cur[part];
    }
    return cur === true;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        login,
        register,
        logout,
        loading,
        isAuthenticated,
        isAdmin,
        isStaff,
        isStaffOrAdmin,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};