/**
 * Centralized design tokens for LaptopStore.
 * Use this for status/label colors so AdminOrders, CustomerProfile, Checkout, etc.
 * stay consistent across the app.
 */

import {
  Clock, CheckCircle, XCircle, Package, Truck, Box, TruckIcon,
  AlertCircle, RefreshCw, CreditCard, ShieldCheck
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Order status (workflow: pending → confirmed → packing → shipping → delivered)
// ---------------------------------------------------------------------------
export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Chờ xử lý',
    short: 'Chờ',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Clock,
    stepIndex: 0
  },
  confirmed: {
    label: 'Đã xác nhận',
    short: 'Xác nhận',
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    icon: CheckCircle,
    stepIndex: 1
  },
  packing: {
    label: 'Đang đóng gói',
    short: 'Đóng gói',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: Box,
    stepIndex: 2
  },
  shipping: {
    label: 'Đang vận chuyển',
    short: 'Vận chuyển',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    icon: TruckIcon,
    stepIndex: 3
  },
  delivered: {
    label: 'Giao thành công',
    short: 'Hoàn thành',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: Truck,
    stepIndex: 4
  },
  cancelled: {
    label: 'Đã hủy',
    short: 'Hủy',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: XCircle,
    stepIndex: -1
  }
};

// Order steps used for the timeline/stepper UI
export const ORDER_TIMELINE_STEPS = ['pending', 'confirmed', 'packing', 'shipping', 'delivered'];

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
export const PAYMENT_METHOD_LABELS = {
  COD: 'COD - Thanh toán khi nhận hàng',
  cod: 'COD - Thanh toán khi nhận hàng',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng (QR)',
  bank_transfer: 'Chuyển khoản ngân hàng (QR)'
};

export const PAYMENT_STATUS_CONFIG = {
  pending: {
    label: 'Chờ duyệt',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    icon: Clock
  },
  approved: {
    label: 'Đã duyệt',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    icon: CheckCircle
  },
  rejected: {
    label: 'Bị từ chối',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    icon: XCircle
  }
};

// ---------------------------------------------------------------------------
// Reusable color tokens
// ---------------------------------------------------------------------------
export const COLORS = {
  primary: 'cyan',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  info: 'sky'
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
export const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};
