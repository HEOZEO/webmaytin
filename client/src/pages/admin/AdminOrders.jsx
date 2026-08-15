import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Loader2, Search, Download, ChevronDown, ChevronUp, Package, Trash2, Eye, X,
  MapPin, CreditCard, FileText, Clock, Plus, User, Phone, Mail, ShoppingCart,
  Truck, CheckCircle, XCircle, Box, TruckIcon, Image as ImageIcon, AlertCircle,
  Filter, TrendingUp, DollarSign, ShoppingBag, ArrowUpDown, RefreshCw,
  Calendar, BarChart3, Layers, EyeOff, Inbox, BadgeDollarSign
} from 'lucide-react';
import showToast from '../../utils/toast';
import api from '../../services/api';
import { adminOrderService, adminProductService } from '../../services/adminService';
import { adminPaymentService } from '../../services/paymentService';
import { resolveImage, onImageError, getBackendUrl } from '../../utils/imageHelper';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/admin/Pagination';
import { useAuth } from '../../context/AuthContext';
import { Can, usePermission } from '../../hooks/usePermission';

// =====================================================
// CONSTANTS
// =====================================================
const STATUS_STEPS = [
  { key: 'pending',   label: 'Chờ xử lý',     short: 'Chờ',       icon: Clock },
  { key: 'confirmed', label: 'Đã xác nhận',   short: 'Xác nhận',  icon: CheckCircle },
  { key: 'packing',   label: 'Đóng gói',       short: 'Đóng gói',  icon: Box },
  { key: 'shipping',  label: 'Đang giao',     short: 'Giao',      icon: TruckIcon },
  { key: 'delivered', label: 'Hoàn thành',    short: 'Xong',      icon: Truck }
];

const STATUS_MAP = {
  pending:   { label: 'Chờ xử lý',  short: 'Chờ',     cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40',          icon: Clock,       color: 'amber' },
  confirmed: { label: 'Đã xác nhận', short: 'Xác nhận', cls: 'bg-red-600/20 text-red-400 border-red-600/40',             icon: CheckCircle, color: 'cyan' },
  packing:   { label: 'Đóng gói',    short: 'Đóng gói', cls: 'bg-red-600/20 text-blue-300 border-red-600/40',              icon: Box,         color: 'blue' },
  shipping:  { label: 'Đang giao',   short: 'Giao',     cls: 'bg-red-600/20 text-purple-300 border-red-600/40',        icon: TruckIcon,   color: 'purple' },
  delivered: { label: 'Hoàn thành',  short: 'Xong',     cls: 'bg-red-600/20 text-emerald-300 border-red-600/40',     icon: Truck,       color: 'emerald' },
  cancelled: { label: 'Đã hủy',      short: 'Hủy',      cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',              icon: XCircle,     color: 'rose' }
};

const PAYMENT_METHOD_MAP = {
  COD: 'COD',
  cod: 'COD',
  BANK_TRANSFER: 'Chuyển khoản',
  bank_transfer: 'Chuyển khoản',
  vnpay: 'VNPay',
  momo: 'MoMo'
};

const PAYMENT_STATUS_MAP = {
  pending:   { label: 'Chờ thanh toán',  cls: 'bg-amber-500/20  text-amber-300  border-amber-500/40',  short: 'Chờ TT' },
  paid:      { label: 'Đã thanh toán',   cls: 'bg-red-600/20 text-emerald-300 border-red-600/40', short: 'Đã TT' },
  completed: { label: 'Hoàn thành',      cls: 'bg-red-600/20 text-emerald-300 border-red-600/40', short: 'Xong' },
  approved:  { label: 'Đã duyệt',       cls: 'bg-red-600/20 text-emerald-300 border-red-600/40', short: 'Duyệt' },
  cancelled: { label: 'Đã hủy',          cls: 'bg-rose-500/20   text-rose-300   border-rose-500/40',    short: 'Hủy TT' },
  rejected:  { label: 'Bị từ chối',     cls: 'bg-rose-500/20   text-rose-300   border-rose-500/40',    short: 'Từ chối' },
  failed:    { label: 'Thất bại',        cls: 'bg-rose-500/20   text-rose-300   border-rose-500/40',    short: 'Lỗi' }
};

const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Chờ xử lý' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'packing',   label: 'Đóng gói' },
  { value: 'shipping',  label: 'Đang giao' },
  { value: 'delivered', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' }
];

// =====================================================
// SMALL UI COMPONENTS
// =====================================================
function StatCard({ icon: Icon, label, value, sublabel, color = 'cyan', loading }) {
  const colorMap = {
    cyan:    'from-red-600/15 via-red-600/5 to-transparent border-red-600/30 text-red-400',
    amber:   'from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 text-amber-300',
    emerald: 'from-red-600/15 via-red-600/5 to-transparent border-red-600/30 text-emerald-300',
    rose:    'from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/30 text-rose-300',
    purple:  'from-red-600/15 via-red-600/5 to-transparent border-red-600/30 text-purple-300'
  };
  const cls = colorMap[color] || colorMap.cyan;
  return (
    <div className={`relative bg-gradient-to-br ${cls} border rounded-none clip-path-rog p-4 overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
      <div className="flex items-start justify-between relative">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">{label}</p>
          {loading ? (
            <div className="h-7 w-16 bg-slate-700/50 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-black text-white mt-1 truncate">{value}</p>
          )}
          {sublabel && <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>}
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-none clip-path-rog bg-slate-950/40 border border-neutral-800 flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status];
  if (!cfg) return <span className="px-2 py-1 text-[10px] rounded-full bg-slate-700 text-neutral-300 border border-slate-600">{status}</span>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.short}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const cfg = PAYMENT_STATUS_MAP[status] || PAYMENT_STATUS_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cfg.cls}`}>
      {cfg.short}
    </span>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="py-3 px-4"><div className="h-4 w-12 bg-neutral-900 rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-32 bg-neutral-900 rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-neutral-900 rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-neutral-900 rounded" /></td>
      <td className="py-3 px-4"><div className="h-6 w-16 bg-neutral-900 rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-6 w-16 bg-neutral-900 rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-neutral-900 rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-neutral-900 rounded ml-auto" /></td>
    </tr>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function AdminOrders() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { hasPermission } = usePermission();
  // Staff có thể: tạo + xác nhận + sửa + huỷ đơn (theo permission cấu hình)
  // Admin: full quyền
  const canDeleteOrder = isAdmin || hasPermission('orders.delete');
  const canExport = isAdmin || hasPermission('orders.export');
  const canCreateOrder = isAdmin || hasPermission('orders.create');
  const canUpdateStatus = isAdmin || hasPermission('orders.update_status');
  const canCancelOrder = isAdmin || hasPermission('orders.cancel');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [sortBy, setSortBy] = useState({ key: 'id', dir: 'desc' });
  const [expanded, setExpanded] = useState(null);

  // Server-side pagination (mặc định 10 đơn/trang)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 });

  // Polling interval for real-time updates
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Reset page khi đổi page size
  useEffect(() => {
    setPage(1);
  }, [limit]);

  // Stats
  const [stats, setStats] = useState({
    total: 0, pending: 0, confirmed: 0, shipping: 0, delivered: 0, cancelled: 0,
    revenue: 0, todayRevenue: 0, todayOrders: 0, pendingPayments: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bill preview modal
  const [billPreview, setBillPreview] = useState(null);

  // Reject payment modal
  const [rejectModal, setRejectModal] = useState(null);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (cfg) => setConfirmState(cfg);
  const closeConfirm = () => setConfirmState(null);

  // Create order modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    shipping_address: '',
    payment_method: 'cod',
    notes: ''
  });

  // =====================================================
  // EFFECTS
  // =====================================================
  useEffect(() => {
    loadOrders();
    loadStats();
  }, [page, statusFilter, paymentFilter, paymentStatusFilter, dateRange.from, dateRange.to]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else { loadOrders(); loadStats(); }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // =====================================================
  // HELPERS
  // =====================================================
  const formatPrice = useCallback((p) => {
    const n = Number(p) || 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }, []);

  const formatShortDate = useCallback((dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }, []);

  const getNextStatuses = useCallback((currentStatus) => {
    const nextMap = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['packing', 'cancelled'],
      packing: ['shipping', 'cancelled'],
      shipping: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };
    return nextMap[currentStatus] || [];
  }, []);

  const getCurrentStepIndex = useCallback((status) => {
    return STATUS_STEPS.findIndex(s => s.key === status);
  }, []);

  // =====================================================
  // API CALLS
  // =====================================================
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        ...(statusFilter        ? { status: statusFilter }        : {}),
        ...(paymentFilter       ? { paymentMethod: paymentFilter } : {}),
        ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
        ...(search              ? { search }                      : {}),
        ...(dateRange.from      ? { startDate: dateRange.from }   : {}),
        ...(dateRange.to        ? { endDate: dateRange.to }       : {})
      };
      const res = await adminOrderService.getAll(params);
      setOrders(Array.isArray(res?.data) ? res.data : []);
      setPagination(res?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: limit });
    } catch (err) {
      console.error(err);
      showToast.error('Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, paymentFilter, paymentStatusFilter, search, dateRange.from, dateRange.to]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Use admin stats endpoint - returns aggregate counts
      const res = await api.get('/admin/stats/dashboard');
      const d = res?.data?.data || res?.data || {};

      // Also fetch pending payments count
      let pendingPayments = 0;
      try {
        const paymentRes = await api.get('/admin/payments/requests?status=pending&limit=1');
        pendingPayments = paymentRes?.data?.pendingCount || 0;
      } catch (e) {}

      setStats({
        // Backend returns totalOrders/pendingOrders but not per-status breakdown
        // So we render cards using list-derived stats for status-specific values
        total:        Number(d.totalOrders ?? d.total_orders ?? 0),
        pending:      Number(d.pendingOrders ?? d.pending_orders ?? 0),
        revenue:      Number(d.totalRevenue ?? d.total_revenue ?? 0),
        todayRevenue: Number(d.todayRevenue ?? d.today_revenue ?? 0),
        todayOrders:  Number(d.todayOrders ?? d.today_orders ?? 0),
        pendingPayments
      });
    } catch (err) {
      // Stats endpoint may not exist - silently fall back to deriving from list
      console.warn('Stats endpoint unavailable, will use list-derived stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Auto-refresh orders every 15 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadOrders, loadStats]);

  // =====================================================
  // HANDLERS
  // =====================================================
  const updateStatus = async (orderId, newStatus) => {
    try {
      await adminOrderService.updateStatus(orderId, newStatus);
      showToast.success(`Đã chuyển sang "${STATUS_MAP[newStatus]?.label || newStatus}"`);
      loadOrders();
      loadStats();
      if (showDetailModal && selectedOrder?.id === orderId) {
        handleViewDetail(orderId);
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const handleApproveCOD = async (orderId) => {
    askConfirm({
      title: 'Xác nhận thu tiền COD?',
      message: 'Đánh dấu đơn hàng này đã thu tiền mặt thành công.',
      confirmText: 'Xác nhận',
      onConfirm: async () => {
        try {
          await api.put(`/admin/orders/${orderId}/approve-cod`);
          showToast.success('Đã xác nhận thu tiền COD!');
          closeConfirm();
          if (showDetailModal && selectedOrder?.id === orderId) handleViewDetail(orderId);
          loadOrders();
          loadStats();
        } catch (err) {
          showToast.error(err?.response?.data?.message || 'Xác nhận thất bại');
          closeConfirm();
        }
      }
    });
  };

  const handleApprovePayment = async (requestId) => {
    try {
      await adminPaymentService.approve(requestId);
      showToast.success('Đã duyệt thanh toán thành công!');
      if (showDetailModal && selectedOrder?.id) handleViewDetail(selectedOrder.id);
      loadOrders();
      loadStats();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  const handleRejectPayment = (requestId, orderId) => {
    setRejectModal({ requestId, orderId, reason: '' });
  };

  const submitRejectPayment = async () => {
    if (!rejectModal) return;
    if (!rejectModal.reason.trim()) {
      showToast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await adminPaymentService.reject(rejectModal.requestId, rejectModal.reason);
      showToast.success('Đã từ chối thanh toán');
      setRejectModal(null);
      if (showDetailModal && selectedOrder?.id) handleViewDetail(selectedOrder.id);
      loadOrders();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Từ chối thất bại');
    }
  };

  const handleDeleteOrder = (orderId) => {
    askConfirm({
      title: 'Xóa đơn hàng?',
      message: `Bạn có chắc muốn xóa đơn hàng #${orderId}? Hành động này không thể hoàn tác.`,
      variant: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          await adminOrderService.delete(orderId);
          showToast.success('Đã xóa đơn hàng');
          // Nếu đây là item cuối cùng trên trang hiện tại (và không phải trang 1) → lùi 1 trang
          if (orders.length === 1 && page > 1) {
            setPage(p => p - 1);
          } else {
            loadOrders();
          }
          loadStats();
          closeConfirm();
        } catch (err) {
          showToast.error(err.response?.data?.message || 'Xóa đơn hàng thất bại');
          closeConfirm();
        }
      }
    });
  };

  const handleViewDetail = async (orderId) => {
    setShowDetailModal(true);
    setSelectedOrder(null);
    setDetailLoading(true);
    try {
      const res = await adminOrderService.getById(orderId);
      const order = res?.data?.data || res?.data || res;
      setSelectedOrder(order);
    } catch (err) {
      console.error(err);
      showToast.error('Không thể tải chi tiết đơn hàng');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // =====================================================
  // SORTING
  // =====================================================
  const sortedOrders = useMemo(() => {
    if (!sortBy.key) return orders;
    const arr = [...orders];
    arr.sort((a, b) => {
      let va = a[sortBy.key];
      let vb = b[sortBy.key];
      if (sortBy.key === 'final_amount' || sortBy.key === 'total_amount') {
        va = Number(va) || 0; vb = Number(vb) || 0;
      }
      if (sortBy.key === 'created_at') {
        va = new Date(va).getTime(); vb = new Date(vb).getTime();
      }
      if (typeof va === 'string') { va = va?.toLowerCase() || ''; vb = vb?.toLowerCase() || ''; }
      if (va < vb) return sortBy.dir === 'asc' ? -1 : 1;
      if (va > vb) return sortBy.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [orders, sortBy]);

  const handleSort = (key) => {
    setSortBy(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ colKey }) => {
    if (sortBy.key !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortBy.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-red-500" /> : <ChevronDown className="w-3 h-3 text-red-500" />;
  };

  // =====================================================
  // DERIVED STATS (fallback from list if endpoint unavailable)
  // =====================================================
  const listDerivedStats = useMemo(() => {
    const acc = { pending: 0, confirmed: 0, packing: 0, shipping: 0, delivered: 0, cancelled: 0, revenue: 0 };
    orders.forEach(o => {
      if (acc[o.status] !== undefined) acc[o.status]++;
      if (['confirmed', 'packing', 'shipping', 'delivered'].includes(o.status)) {
        acc.revenue += Number(o.final_amount) || 0;
      }
    });
    return acc;
  }, [orders]);

  const finalStats = useMemo(() => {
    const total = stats.total || pagination.totalItems || 0;
    return {
      total,
      // Prefer backend stats (which count all orders) for total/pending,
      // fall back to list-derived for per-status when backend doesn't provide
      pending:   stats.pending   || listDerivedStats.pending,
      confirmed:                     listDerivedStats.confirmed,
      shipping:                      listDerivedStats.shipping,
      delivered:                     listDerivedStats.delivered,
      cancelled:                     listDerivedStats.cancelled,
      revenue:   stats.revenue   || listDerivedStats.revenue,
      todayRevenue: stats.todayRevenue,
      todayOrders:  stats.todayOrders,
      pendingPayments: stats.pendingPayments || 0
    };
  }, [stats, listDerivedStats, pagination.totalItems]);

  // =====================================================
  // EXPORT EXCEL
  // =====================================================
  const exportExcel = async () => {
    try {
      showToast.loading('Đang tạo file Excel...');
      const XLSX = await import('xlsx');
      const rows = sortedOrders.map(o => ({
        'Mã đơn':     `#${o.id}`,
        'Khách hàng': o.full_name || o.customer_name || '—',
        'SĐT':        o.phone || o.user_phone || '—',
        'Email':      o.email || '—',
        'Địa chỉ':    o.shipping_address || '—',
        'Tổng tiền':  Number(o.total_amount) || 0,
        'Phí ship':   Number(o.shipping_fee) || 0,
        'Giảm giá':   Number(o.discount_amount) || 0,
        'Thành tiền': Number(o.final_amount) || Number(o.total_amount) || 0,
        'Trạng thái': (STATUS_MAP[o.status] || {}).label || o.status,
        'Thanh toán': PAYMENT_METHOD_MAP[o.payment_method] || o.payment_method || 'COD',
        'TT thanh toán': (PAYMENT_STATUS_MAP[o.payment_status] || {}).label || o.payment_status || '—',
        'Ngày đặt':   new Date(o.created_at).toLocaleString('vi-VN')
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DonHang');
      XLSX.writeFile(wb, `orders-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast.dismiss();
      showToast.success(`Đã xuất ${rows.length} đơn hàng`);
    } catch (err) {
      showToast.dismiss();
      showToast.error('Lỗi xuất file');
    }
  };

  // =====================================================
  // CREATE ORDER (kept for staff use)
  // =====================================================
  const openCreateModal = async () => {
    setShowCreateModal(true);
    setCreateLoading(true);
    setOrderItems([]);
    setFormData({
      customer_name: '', customer_phone: '', customer_email: '',
      shipping_address: '', payment_method: 'cod', notes: ''
    });
    try {
      const res = await adminProductService.getAll({ limit: 100 });
      setProducts(res?.data?.products || res?.products || res?.data || []);
    } catch (err) {
      showToast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setCreateLoading(false);
    }
  };

  const addOrderItem = (product) => {
    const existing = orderItems.find(i => i.product_id === product.id);
    if (existing) {
      setOrderItems(orderItems.map(i =>
        i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setOrderItems([...orderItems, {
        product_id: product.id, name: product.name, price: product.price,
        quantity: 1, stock: product.stock, image_url: product.image_url
      }]);
    }
  };

  const updateItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(i => i.product_id !== productId));
    } else {
      setOrderItems(orderItems.map(i => i.product_id === productId ? { ...i, quantity } : i));
    }
  };

  const removeOrderItem = (productId) => {
    setOrderItems(orderItems.filter(i => i.product_id !== productId));
  };

  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    return { subtotal, shippingFee: 0, discount: 0, total: subtotal };
  };

  const handleCreateOrder = async () => {
    const errors = [];
    if (!formData.customer_phone?.trim()) errors.push('Số điện thoại là bắt buộc');
    else if (!/^[0-9]{9,11}$/.test(formData.customer_phone.replace(/\s/g, ''))) errors.push('SĐT không hợp lệ');
    if (orderItems.length === 0) errors.push('Chưa có sản phẩm nào trong đơn');
    for (const item of orderItems) {
      if (item.quantity > item.stock) errors.push(`"${item.name}" chỉ còn ${item.stock}`);
    }
    if (errors.length > 0) { showToast.error(errors[0]); return; }

    setCreateLoading(true);
    try {
      await api.post('/admin/orders', {
        ...formData,
        items: orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
      });
      showToast.success('Tạo đơn hàng thành công');
      setShowCreateModal(false);
      loadOrders();
      loadStats();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Tạo đơn hàng thất bại');
    } finally {
      setCreateLoading(false);
    }
  };

  const orderTotal = calculateOrderTotal();
  const hasFilters = !!(statusFilter || paymentFilter || paymentStatusFilter || search || dateRange.from || dateRange.to);
  const clearFilters = () => {
    setStatusFilter(''); setPaymentFilter(''); setPaymentStatusFilter('');
    setSearch(''); setDateRange({ from: '', to: '' });
    setPage(1);
  };

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="space-y-5">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-red-500" />
            Quản Lý Đơn Hàng
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Tổng cộng <span className="text-red-500 font-bold">{pagination.totalItems}</span> đơn hàng
            {pagination.totalPages > 1 && (
              <span> • Trang <span className="text-red-500 font-bold">{pagination.currentPage}</span>/{pagination.totalPages}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { loadOrders(); loadStats(); }}
            className="p-2 bg-neutral-900 hover:bg-slate-700 text-neutral-300 rounded-lg transition"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreateOrder && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo đơn
            </button>
          )}
          {canExport && (
            <button
              onClick={exportExcel}
              disabled={sortedOrders.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-600/40 text-emerald-300 font-semibold rounded-lg text-xs hover:bg-red-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Excel
            </button>
          )}
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          icon={Inbox} label="Tổng đơn" value={finalStats.total}
          sublabel="Tất cả trạng thái" color="cyan" loading={statsLoading}
        />
        <StatCard
          icon={Clock} label="Chờ xử lý" value={finalStats.pending}
          sublabel="Cần duyệt" color="amber" loading={statsLoading}
        />
        <StatCard
          icon={BadgeDollarSign} label="Bill CK" value={finalStats.pendingPayments}
          sublabel="Chờ duyệt TT" color="amber" loading={statsLoading}
        />
        <StatCard
          icon={CheckCircle} label="Đã xác nhận" value={finalStats.confirmed}
          sublabel="Đang chuẩn bị" color="cyan" loading={statsLoading}
        />
        <StatCard
          icon={TruckIcon} label="Đang giao" value={finalStats.shipping}
          sublabel="Trên đường" color="purple" loading={statsLoading}
        />
        <StatCard
          icon={TrendingUp} label="Hoàn thành" value={finalStats.delivered}
          sublabel="Thành công" color="emerald" loading={statsLoading}
        />
        <StatCard
          icon={DollarSign} label="Doanh thu" value={formatPrice(finalStats.revenue)}
          sublabel="Đã hoàn thành" color="emerald" loading={statsLoading}
        />
      </div>

      {/* ===== FILTERS ===== */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog p-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-red-500" />
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wide">Bộ lọc</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Xóa bộ lọc
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm mã đơn, tên, SĐT, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-600 transition"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-200 focus:outline-none focus:border-red-600"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {/* Payment method filter */}
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-200 focus:outline-none focus:border-red-600"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="COD">COD</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
          </select>
          {/* Payment status filter */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-200 focus:outline-none focus:border-red-600"
          >
            <option value="">Tất cả TT</option>
            <option value="pending">Chờ thanh toán</option>
            <option value="paid">Đã thanh toán</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          {/* Date range - quick filter */}
          <div className="flex gap-1">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => { setDateRange(r => ({ ...r, from: e.target.value })); setPage(1); }}
              className="flex-1 px-2 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-200 focus:outline-none focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* ===== ORDERS TABLE ===== */}
      <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-red-600/30 rounded-none clip-path-rog p-4 overflow-x-auto transition-all duration-300">
        {loading && orders.length === 0 ? (
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-[10px] uppercase text-neutral-400 border-b border-red-600/30 bg-gradient-to-r from-red-600/10 to-transparent">
              <tr>
                <th className="py-3 px-4">Mã Đơn</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4">SĐT</th>
                <th className="py-3 px-4">Thành Tiền</th>
                <th className="py-3 px-4">Thanh Toán</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ngày Đặt</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        ) : sortedOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-none clip-path-rog bg-neutral-900/50 flex items-center justify-center">
              <Inbox className="w-10 h-10 text-slate-600" />
            </div>
            <div>
              <p className="text-white font-semibold">Không có đơn hàng nào</p>
              <p className="text-xs text-slate-500 mt-1">
                {hasFilters ? 'Thử điều chỉnh bộ lọc để xem kết quả khác' : 'Khi có đơn hàng mới, chúng sẽ hiển thị ở đây'}
              </p>
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-600/30 transition"
              >
                <X className="w-3.5 h-3.5" /> Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="text-[10px] uppercase text-neutral-400 border-b border-red-600/30 bg-gradient-to-r from-red-600/10 to-transparent">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-red-400 transition select-none" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1.5">Mã Đơn <SortIcon colKey="id" /></div>
                </th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4">SĐT</th>
                <th className="py-3 px-4 cursor-pointer hover:text-red-400 transition select-none" onClick={() => handleSort('final_amount')}>
                  <div className="flex items-center gap-1.5">Thành Tiền <SortIcon colKey="final_amount" /></div>
                </th>
                <th className="py-3 px-4">Thanh Toán</th>
                <th className="py-3 px-4 cursor-pointer hover:text-red-400 transition select-none" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">Trạng Thái <SortIcon colKey="status" /></div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-red-400 transition select-none" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center gap-1.5">Ngày Đặt <SortIcon colKey="created_at" /></div>
                </th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedOrders.map(ord => {
                const statusInfo = STATUS_MAP[ord.status] || { label: ord.status, cls: 'bg-slate-700 text-neutral-300', color: 'slate' };
                const nextStatuses = getNextStatuses(ord.status);
                const paymentInfo = PAYMENT_STATUS_MAP[ord.payment_status] || PAYMENT_STATUS_MAP.pending;
                const isBankTransfer = (ord.payment_method || '').toUpperCase() === 'BANK_TRANSFER';
                const isCOD = (ord.payment_method || '').toUpperCase() === 'COD';
                const customerName = ord.full_name || ord.customer_name || null;
                const customerInitials = customerName ? customerName.trim().charAt(0).toUpperCase() : '?';
                const customerPhone = ord.phone || ord.user_phone || '—';
                const finalAmount = Number(ord.final_amount) || Number(ord.total_amount) || 0;
                return (
                  <React.Fragment key={ord.id}>
                    <tr className="hover:bg-black/40 transition-colors group">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setExpanded(expanded === ord.id ? null : ord.id)}
                          className="flex items-center gap-1.5 hover:underline"
                        >
                          <span className="font-bold text-red-400">#{ord.id}</span>
                          {expanded === ord.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                            customerName
                              ? 'bg-gradient-to-br from-red-600 to-red-600'
                              : 'bg-slate-700 text-neutral-400'
                          }`}>
                            {customerInitials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate max-w-[160px]" title={customerName || '—'}>
                              {customerName || <span className="text-slate-500 italic">Khách vãng lai</span>}
                            </p>
                            {ord.email && <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{ord.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-400 whitespace-nowrap">{customerPhone}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-red-500">{formatPrice(finalAmount)}</p>
                        {Number(ord.discount_amount) > 0 && (
                          <p className="text-[10px] text-red-500">-{formatPrice(ord.discount_amount)}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-[10px] text-neutral-300 font-semibold">
                            {PAYMENT_METHOD_MAP[ord.payment_method] || ord.payment_method || 'COD'}
                          </span>
                          {paymentInfo && <PaymentStatusBadge status={ord.payment_status} />}
                          {isBankTransfer && ord.bill_image_url && (
                            <span className="text-[9px] text-red-400 flex items-center gap-0.5" title="Khách đã gửi bill">
                              <ImageIcon className="w-2.5 h-2.5" /> Bill
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-neutral-400 whitespace-nowrap">
                        {formatShortDate(ord.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetail(ord.id)}
                            title="Xem chi tiết"
                            className="p-1.5 bg-neutral-900 hover:bg-red-600/20 text-red-500 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {nextStatuses.length > 0 && canUpdateStatus && (
                            <select
                              value=""
                              onChange={(e) => e.target.value && updateStatus(ord.id, e.target.value)}
                              className="px-2 py-1 bg-black border border-neutral-800 rounded-lg text-xs text-slate-200 focus:border-red-600 cursor-pointer"
                              title="Chuyển trạng thái"
                            >
                              <option value="">Chuyển →</option>
                              {nextStatuses.map(s => (
                                <option key={s} value={s}>{(STATUS_MAP[s] || {}).label}</option>
                              ))}
                            </select>
                          )}
                          {ord.status === 'pending' && canDeleteOrder && (
                            <button
                              onClick={() => handleDeleteOrder(ord.id)}
                              title="Xóa đơn hàng"
                              className="p-1.5 bg-neutral-900 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded === ord.id && (
                      <tr className="bg-slate-950/50">
                        <td colSpan="8" className="p-4">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-slate-500">Địa chỉ:</span>
                                <p className="text-white font-medium mt-0.5">{ord.shipping_address || 'Nhận tại cửa hàng'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Phương thức TT:</span>
                                <p className="text-red-400 font-bold mt-0.5">{PAYMENT_METHOD_MAP[ord.payment_method] || ord.payment_method || 'COD'}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Phí vận chuyển:</span>
                                <p className="text-white mt-0.5">{formatPrice(ord.shipping_fee)}</p>
                              </div>
                              <div>
                                <span className="text-slate-500">Giảm giá:</span>
                                <p className="text-rose-300 mt-0.5">-{formatPrice(ord.discount_amount)}</p>
                              </div>
                              {ord.notes && (
                                <div className="sm:col-span-2 lg:col-span-4">
                                  <span className="text-slate-500">Ghi chú:</span>
                                  <p className="text-neutral-300 italic mt-0.5">{ord.notes}</p>
                                </div>
                              )}
                            </div>
                            {ord.items && ord.items.length > 0 && (
                              <div className="border-t border-neutral-800 pt-3">
                                <h4 className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5 text-red-500" /> Sản phẩm ({ord.items.length}):
                                </h4>
                                <div className="space-y-1.5">
                                  {ord.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-xs text-neutral-300 bg-black p-2.5 rounded-none clip-path-rog border border-neutral-800">
                                      <span>{item.product_name || item.name || 'Sản phẩm'} <span className="text-slate-500">x{item.quantity}</span></span>
                                      <span className="text-red-400 font-bold">{formatPrice(item.price * item.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== PAGINATION ===== */}
      {pagination.totalPages > 0 && (
        <Pagination
          page={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={setPage}
          onLimitChange={setLimit}
          itemLabel="đơn hàng"
          limitOptions={[10, 20, 50, 100]}
        />
      )}

      {/* ===== ORDER DETAIL MODAL ===== */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-black border border-slate-700 rounded-none clip-path-rog w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-neutral-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                Chi Tiết Đơn Hàng #{selectedOrder?.id || '...'}
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                </div>
              ) : selectedOrder ? (
                <div className="space-y-6">
                  {/* Order Progress Stepper */}
                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-4">Tiến trình đơn hàng</h3>
                    <div className="flex items-center justify-between overflow-x-auto">
                      {STATUS_STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const currentIdx = getCurrentStepIndex(selectedOrder.status);
                        const isCompleted = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        const isCancelled = selectedOrder.status === 'cancelled';
                        return (
                          <div key={step.key} className="flex items-center flex-shrink-0">
                            <div className={`flex flex-col items-center ${isCompleted && !isCancelled ? 'text-red-500' : 'text-slate-500'}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                isCurrent ? 'border-red-500 bg-red-600/20' : isCompleted && !isCancelled ? 'border-red-500/50 bg-slate-700' : 'border-slate-600 bg-neutral-900'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] mt-1 font-medium whitespace-nowrap">{step.short}</span>
                            </div>
                            {idx < STATUS_STEPS.length - 1 && (
                              <div className={`w-12 h-0.5 mx-1 ${idx < currentIdx && !isCancelled ? 'bg-red-500' : 'bg-slate-600'}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Info & Customer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Thông tin đơn hàng
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Mã đơn:</span>
                          <span className="text-red-400 font-bold">#{selectedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Ngày đặt:</span>
                          <span className="text-white">{formatDate(selectedOrder.created_at)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400">Trạng thái:</span>
                          <StatusBadge status={selectedOrder.status} />
                        </div>
                        {selectedOrder.notes && (
                          <div className="pt-2 border-t border-slate-700">
                            <span className="text-neutral-400 text-xs">Ghi chú:</span>
                            <p className="text-neutral-300 text-xs mt-1 italic">{selectedOrder.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Địa chỉ giao hàng
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-neutral-400">Khách hàng:</span>
                          <p className="text-white font-medium">{selectedOrder.full_name || selectedOrder.customer_name || '—'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">Email:</span>
                          <p className="text-white">{selectedOrder.email || '—'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">SĐT:</span>
                          <p className="text-white">{selectedOrder.phone || '—'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">Địa chỉ:</span>
                          <p className="text-white">{selectedOrder.shipping_address || 'Nhận tại cửa hàng'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Thông tin thanh toán
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Phương thức:</span>
                        <span className="text-red-400 font-bold">{PAYMENT_METHOD_MAP[selectedOrder.payment_method] || selectedOrder.payment_method || 'COD'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Trạng thái TT:</span>
                        <PaymentStatusBadge status={selectedOrder.payment_status} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Tổng tiền sản phẩm:</span>
                        <span className="text-white">{formatPrice(selectedOrder.total_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Phí vận chuyển:</span>
                        <span className="text-white">{formatPrice(selectedOrder.shipping_fee || 0)}</span>
                      </div>
                      {Number(selectedOrder.discount_amount) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Giảm giá:</span>
                          <span className="text-rose-300">-{formatPrice(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-white font-bold">Thành tiền:</span>
                        <span className="text-red-500 font-bold text-lg">{formatPrice(selectedOrder.final_amount || selectedOrder.total_amount)}</span>
                      </div>
                      {/* COD payment approval panel */}
                      {(selectedOrder.payment_method || '').toUpperCase() === 'COD' && selectedOrder.payment_status === 'pending' && (
                        <div className="pt-3 mt-2 border-t border-slate-700">
                          <div className="flex items-center gap-2 p-2.5 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/20 mb-2">
                            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span className="text-xs text-amber-300">Thanh toán COD — đang chờ duyệt</span>
                          </div>
                          <button
                            onClick={() => handleApproveCOD(selectedOrder.id)}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-600/40 text-emerald-300 font-bold rounded-none clip-path-rog text-xs hover:bg-red-600/30 transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Xác nhận đã nhận tiền (COD)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bill Payment Panel - chỉ hiện với đơn BANK_TRANSFER */}
                  {(selectedOrder.payment_method || '').toUpperCase() === 'BANK_TRANSFER' && (
                    <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Bill Thanh Toán Chuyển Khoản
                      </h3>
                      {selectedOrder.payment_request?.bill_image_url ? (
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-start gap-4">
                            <img
                              src={getBackendUrl(selectedOrder.payment_request.bill_image_url)}
                              alt="Bill"
                              className="w-40 h-40 rounded-none clip-path-rog border border-slate-700 object-cover bg-black cursor-pointer hover:border-red-600"
                              onClick={() => setBillPreview(selectedOrder.payment_request.bill_image_url)}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="flex-1 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-400">Trạng thái bill:</span>
                                <PaymentStatusBadge status={selectedOrder.payment_request.status} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-400">Số tiền:</span>
                                <span className="text-red-400 font-bold">{formatPrice(selectedOrder.payment_request.amount)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-neutral-400">Gửi lúc:</span>
                                <span className="text-white">{formatDate(selectedOrder.payment_request.created_at)}</span>
                              </div>
                              {selectedOrder.payment_request.admin_note && (
                                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                  <p className="text-[10px] text-rose-300 font-semibold">Lý do từ chối:</p>
                                  <p className="text-xs text-rose-200 mt-0.5">{selectedOrder.payment_request.admin_note}</p>
                                </div>
                              )}
                              {selectedOrder.payment_request.status === 'pending' && (
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => handleApprovePayment(selectedOrder.payment_request.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-600/40 text-emerald-300 font-bold rounded-none clip-path-rog text-xs hover:bg-red-600/30 transition"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleRejectPayment(selectedOrder.payment_request.id, selectedOrder.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold rounded-none clip-path-rog text-xs hover:bg-rose-500/30 transition"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-black/60 rounded-none clip-path-rog border border-dashed border-slate-700">
                          <AlertCircle className="w-6 h-6 mx-auto text-amber-400 mb-2" />
                          <p className="text-xs text-neutral-400">Khách hàng chưa gửi ảnh bill thanh toán.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                      <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Sản phẩm ({selectedOrder.items.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-black rounded-none clip-path-rog border border-slate-700">
                            {item.image_url && (
                              <img src={resolveImage(item.image_url)} onError={onImageError} alt={item.product_name || item.name} className="w-16 h-16 object-cover rounded-lg" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white">{item.product_name || item.name || 'Sản phẩm'}</h4>
                              {item.cpu && item.ram && <p className="text-xs text-neutral-400 mt-0.5">{item.cpu} / {item.ram}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-white font-bold">{formatPrice(item.price)}</p>
                              <p className="text-xs text-neutral-400">x{item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-slate-500 py-8">Không có dữ liệu</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 bg-neutral-900/50 flex justify-end gap-2">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CREATE ORDER MODAL ===== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-black border border-slate-700 rounded-none clip-path-rog w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-neutral-900/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                Tạo Đơn Hàng Mới
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-700 rounded-lg transition">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Thông tin khách hàng
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-neutral-400">SĐT *</label>
                        <input
                          type="text"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600"
                          placeholder="0912 345 678"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Tên khách hàng</label>
                        <input
                          type="text"
                          value={formData.customer_name}
                          onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600"
                          placeholder="Nguyễn Văn A"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Email</label>
                        <input
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600"
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Địa chỉ giao hàng</label>
                        <input
                          type="text"
                          value={formData.shipping_address}
                          onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600"
                          placeholder="123 Đường ABC, Phường X, TP Huế"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Phương thức thanh toán</label>
                        <select
                          value={formData.payment_method}
                          onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600"
                        >
                          <option value="cod">COD - Tiền mặt</option>
                          <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-neutral-400">Ghi chú</label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          className="w-full mt-1 px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-600 resize-none"
                          rows={2}
                          placeholder="Ghi chú đơn hàng..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" /> Chọn sản phẩm
                    </h3>
                    {createLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {products.filter(p => p.stock > 0 && p.is_active && !p.deleted_at).map(product => (
                          <div key={product.id} className="flex items-center justify-between p-2 bg-black rounded-lg border border-slate-700 hover:border-red-600/50 transition">
                            <div className="flex items-center gap-2">
                              {product.image_url && (
                                <img src={resolveImage(product.image_url)} onError={onImageError} alt={product.name} className="w-10 h-10 object-cover rounded" />
                              )}
                              <div>
                                <p className="text-sm text-white font-medium">{product.name}</p>
                                <p className="text-[10px] text-neutral-400">{formatPrice(product.price)} | Kho: {product.stock}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => addOrderItem(product)}
                              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold transition"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Sản phẩm đã chọn ({orderItems.length})
                    </h3>
                    {orderItems.length === 0 ? (
                      <p className="text-center text-slate-500 py-4 text-sm">Chưa có sản phẩm nào</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {orderItems.map(item => (
                          <div key={item.product_id} className="flex items-center justify-between p-2 bg-black rounded-lg border border-slate-700">
                            <div className="flex-1">
                              <p className="text-sm text-white">{item.name}</p>
                              <p className="text-[10px] text-red-500">{formatPrice(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)} className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs">-</button>
                              <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)} disabled={item.quantity >= item.stock} className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded text-white text-xs disabled:opacity-50">+</button>
                              <button onClick={() => removeOrderItem(item.product_id)} className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-neutral-900/50 rounded-none clip-path-rog p-4 border border-slate-700">
                    <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3">Tổng kết</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Tổng sản phẩm:</span>
                        <span className="text-white">{orderItems.length} sản phẩm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Tổng tiền:</span>
                        <span className="text-white">{formatPrice(orderTotal.subtotal)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-white font-bold">Thành tiền:</span>
                        <span className="text-red-500 font-bold text-lg">{formatPrice(orderTotal.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 bg-neutral-900/50 flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition">
                Hủy
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={createLoading || !formData.customer_phone || orderItems.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-cyan-600 text-white rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? 'Đang xử lý...' : 'Tạo đơn hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BILL PREVIEW MODAL ===== */}
      {billPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setBillPreview(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setBillPreview(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-neutral-900 border border-slate-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={getBackendUrl(billPreview)}
              alt="Bill Preview"
              className="w-full rounded-none clip-path-rog border border-slate-700 shadow-2xl"
            />
            <p className="text-center text-xs text-slate-500 mt-2">Ảnh bill thanh toán của khách hàng</p>
          </div>
        </div>
      )}

      {/* ===== REJECT PAYMENT MODAL ===== */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Từ Chối Thanh Toán
            </h3>
            <p className="text-sm text-neutral-400">
              Đơn hàng <span className="text-red-500 font-bold">#{rejectModal.orderId}</span> — Nhập lý do từ chối (sẽ gửi email cho khách).
            </p>
            <textarea
              rows="3"
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="VD: Số tiền không khớp, ảnh mờ..."
              className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-rose-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 bg-neutral-900 text-neutral-300 rounded-none clip-path-rog text-sm font-semibold hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                onClick={submitRejectPayment}
                disabled={!rejectModal.reason.trim()}
                className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-none clip-path-rog text-sm hover:bg-rose-400 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" /> Từ Chối & Gửi Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CONFIRM DIALOG ===== */}
      {confirmState && (
        <ConfirmDialog
          open={Boolean(confirmState)}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant || 'danger'}
          confirmText={confirmState.confirmText || 'Xác nhận'}
          cancelText={confirmState.cancelText || 'Hủy'}
          onConfirm={confirmState.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}