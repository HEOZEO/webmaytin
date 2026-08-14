import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import cartService from '../services/cartService';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const syncedRef = useRef(false);

  // Sync cart với server khi user login (chỉ chạy 1 lần khi mount)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // Guest user - load từ localStorage
      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch {
        setCart([]);
      }
      syncedRef.current = true;
      return;
    }

    // Logged in user - load từ server, bỏ qua localStorage
    const syncCart = async () => {
      if (syncedRef.current) return;
      syncedRef.current = true;
      setLoading(true);
      
      try {
        // Xóa localStorage guest cart ngay lập tức
        localStorage.removeItem('cart');
        
        // Lấy cart từ server
        const response = await cartService.getCart();
        const serverItems = response?.data?.items || [];
        
        const finalCart = serverItems.map(item => ({
          id: item.product_id,
          cart_item_id: item.cart_id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          stock: item.stock,
          brand_name: item.brand_name,
          category_name: item.category_name,
          cpu: item.cpu,
          ram: item.ram,
          quantity: item.quantity
        }));
        
        setCart(finalCart);
      } catch (err) {
        console.warn('Sync cart failed:', err.message);
        syncedRef.current = false; // Cho phép thử lại nếu lỗi
      } finally {
        setLoading(false);
      }
    };

    syncCart();
  }, []);

  // Persist local cart (chỉ cho guest user)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      try {
        localStorage.setItem('cart', JSON.stringify(cart));
      } catch (err) {
        console.warn('Failed to save cart:', err);
      }
    }
  }, [cart]);

  // Kiểm tra user đã đăng nhập chưa
  const isLoggedIn = () => !!localStorage.getItem('token');

  const addToCart = useCallback(async (product, quantity = 1) => {
    // Guest user - chỉ cập nhật local
    if (!isLoggedIn()) {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...prev, { ...product, quantity }];
      });
      return;
    }

    // Logged in user - chỉ cập nhật server
    try {
      await cartService.addItem(product.id, quantity);
      // Refresh cart từ server để đảm bảo đồng bộ
      const response = await cartService.getCart();
      const serverItems = response?.data?.items || [];
      setCart(serverItems.map(item => ({
        id: item.product_id,
        cart_item_id: item.cart_id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        stock: item.stock,
        brand_name: item.brand_name,
        category_name: item.category_name,
        cpu: item.cpu,
        ram: item.ram,
        quantity: item.quantity
      })));
    } catch (err) {
      console.warn('Failed to sync addToCart to server:', err.message);
    }
  }, []);

  const removeFromCart = useCallback(async (productId) => {
    // Guest user - chỉ cập nhật local
    if (!isLoggedIn()) {
      setCart(prev => prev.filter(item => item.id !== productId));
      return;
    }

    // Logged in user - cập nhật server
    try {
      await cartService.removeItem(productId);
      setCart(prev => prev.filter(item => item.id !== productId));
    } catch (err) {
      console.warn('Failed to sync removeFromCart to server:', err.message);
    }
  }, []);

  const updateQuantity = useCallback(async (productId, quantity) => {
    // Guest user - chỉ cập nhật local
    if (!isLoggedIn()) {
      if (quantity <= 0) {
        setCart(prev => prev.filter(item => item.id !== productId));
      } else {
        setCart(prev =>
          prev.map(item => (item.id === productId ? { ...item, quantity } : item))
        );
      }
      return;
    }

    // Logged in user - cập nhật server
    if (quantity <= 0) {
      try {
        await cartService.removeItem(productId);
        setCart(prev => prev.filter(item => item.id !== productId));
      } catch (err) {
        console.warn('Failed to sync updateQuantity to server:', err.message);
      }
      return;
    }

    try {
      await cartService.updateItem(productId, quantity);
      setCart(prev =>
        prev.map(item => (item.id === productId ? { ...item, quantity } : item))
      );
    } catch (err) {
      console.warn('Failed to sync updateQuantity to server:', err.message);
    }
  }, []);

  const clearCart = useCallback(async () => {
    // Guest user - chỉ cập nhật local
    if (!isLoggedIn()) {
      setCart([]);
      return;
    }

    // Logged in user - cập nhật server
    try {
      await cartService.clearCart();
      setCart([]);
    } catch (err) {
      console.warn('Failed to sync clearCart to server:', err.message);
    }
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price || 0) * (item.quantity || 0), 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      loading
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
};
