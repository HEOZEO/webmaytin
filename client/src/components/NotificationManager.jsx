import React, { useEffect, useState, useRef } from 'react';
import showToast from '../utils/toast';
import api from '../services/api';

// Polling-based notification manager - lightweight alternative to WebSocket
// Polls backend every 30s for order status changes & system notifications
const POLL_INTERVAL_MS = 30 * 1000;

export default function NotificationManager() {
  const [lastOrderStatuses, setLastOrderStatuses] = useState({});
  const isInitialLoad = useRef(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOrderStatuses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await api.get('/orders/my-orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const orders = res?.data?.orders || res?.orders || res?.data || [];

        if (!isMounted) return;

        if (isInitialLoad.current) {
          const initialMap = {};
          orders.forEach(o => { initialMap[o.id] = o.status; });
          setLastOrderStatuses(initialMap);
          isInitialLoad.current = false;
          return;
        }

        orders.forEach(o => {
          const previousStatus = lastOrderStatuses[o.id];
          if (previousStatus && previousStatus !== o.status) {
            showToast.success(
              `Đơn hàng #${o.id} chuyển sang "${translateStatus(o.status)}"`,
              { duration: 5000, icon: '📦' }
            );
          }
        });

        const newMap = {};
        orders.forEach(o => { newMap[o.id] = o.status; });
        setLastOrderStatuses(newMap);
      } catch (err) {
        // Silent fail - không cần spam toast lỗi mạng
      }
    };

    fetchOrderStatuses();
    const interval = setInterval(fetchOrderStatuses, POLL_INTERVAL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return null;
}

function translateStatus(status) {
  const map = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao hàng',
    delivered: 'Đã giao thành công',
    cancelled: 'Đã hủy'
  };
  return map[status] || status;
}
