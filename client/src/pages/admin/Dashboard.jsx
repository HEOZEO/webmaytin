import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package, Users, ShoppingCart, DollarSign, TrendingUp, RefreshCw,
  ArrowUp, ArrowDown, ArrowRight, AlertTriangle, Eye, Star,
  Clock, BarChart3, Calendar, ChevronRight,
  Boxes, Tag, Image as ImageIcon, BellRing, Layers, Target,
  Wallet, MessageCircle, Zap, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import showToast from '../../utils/toast';
import { resolveImage, onImageError } from '../../utils/imageHelper';

const formatPrice = (price) => {
  const val = Number(price);
  if (isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
};

const formatNumber = (n) => {
  const val = Number(n);
  if (isNaN(val)) return '0';
  return new Intl.NumberFormat('vi-VN').format(val);
};

const COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_MAP = {
  pending: { label: 'Chờ xử lý', color: 'amber' },
  processing: { label: 'Đang xử lý', color: 'cyan' },
  confirmed: { label: 'Đã xác nhận', color: 'cyan' },
  packing: { label: 'Đang đóng gói', color: 'cyan' },
  shipping: { label: 'Đang giao', color: 'cyan' },
  delivered: { label: 'Hoàn thành', color: 'emerald' },
  completed: { label: 'Hoàn thành', color: 'emerald' },
  cancelled: { label: 'Đã hủy', color: 'rose' }
};

const STATUS_PILL = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  processing: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  confirmed: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  packing: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  shipping: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  delivered: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  cancelled: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
};

// Fill missing dates with 0 so chart is continuous
// FIX: dùng local time (VN) thay vì toISOString() để tránh lệch ngày khi gần 0h
function fillDateRange(data, startDate, endDate) {
  const filled = [];
  const parseLocal = (s) => {
    const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return new Date(s + 'T00:00:00');
  };
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const cur = parseLocal(startDate);
  const end = parseLocal(endDate);
  const dataMap = {};
  (data || []).forEach(r => {
    const key = (r.day || '').slice(0, 10);
    if (key) dataMap[key] = r;
  });

  while (cur <= end) {
    const dayStr = fmt(cur);
    const existing = dataMap[dayStr];
    filled.push({
      day: dayStr,
      revenue: Number(existing?.revenue || 0),
      order_count: Number(existing?.order_count || 0),
      avg_order_value: Number(existing?.avg_order_value || 0),
      discount_amount: Number(existing?.discount_amount || 0)
    });
    cur.setDate(cur.getDate() + 1);
  }
  return filled;
}

// Custom tooltip component — works reliably across recharts v2/v3
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const rev = payload.find(p => p.dataKey === 'revenue')?.value;
  const ord = payload.find(p => p.dataKey === 'order_count')?.value;
  let labelStr = label;
  try {
    if (label && typeof label === 'string') {
      // Parse "YYYY-MM-DD" an toàn theo local time (VN) để tránh lệch 1 ngày
      const m = label.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        labelStr = `📅 ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      } else {
        const d = new Date(label);
        if (!isNaN(d.getTime())) {
          labelStr = `📅 ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
        }
      }
    }
  } catch {}
  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(51, 65, 85, 0.6)',
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
      color: '#e2e8f0',
      padding: '8px 12px',
      fontSize: 12
    }}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{labelStr}</div>
      {rev != null && (
        <div style={{ color: '#06b6d4', fontWeight: 600 }}>
          💰 {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(rev)}
        </div>
      )}
      {ord != null && (
        <div style={{ color: '#a855f7', fontWeight: 600 }}>
          📦 {Number(ord).toLocaleString('vi-VN')} đơn
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Revenue date range state
  const [revPreset, setRevPreset] = useState('7d'); // '1d' | '7d' | '30d' | 'custom'
  const [revCustomStart, setRevCustomStart] = useState('');
  const [revCustomEnd, setRevCustomEnd] = useState('');

  const getRevDateRange = () => {
    // Dùng local time (VN) để tránh lệch ngày gần 0h
    const end = new Date();
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    if (revPreset === '1d') {
      return { startDate: fmt(end), endDate: fmt(end) };
    }
    if (revPreset === '7d') {
      const start = new Date(end); start.setDate(start.getDate() - 6);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    if (revPreset === '30d') {
      const start = new Date(end); start.setDate(start.getDate() - 29);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    if (revPreset === 'custom' && revCustomStart && revCustomEnd) {
      return { startDate: revCustomStart, endDate: revCustomEnd };
    }
    const start = new Date(end); start.setDate(start.getDate() - 6);
    return { startDate: fmt(start), endDate: fmt(end) };
  };

  const fetchRevenue = useCallback(async () => {
    try {
      const { startDate, endDate } = getRevDateRange();
      const revRes = await api.get('/admin/stats/revenue', {
        params: { startDate, endDate, groupBy: 'day' }
      });
      const rows = Array.isArray(revRes.data?.data) ? revRes.data.data : [];
      // Normalize numeric types — Postgres returns strings for numeric columns
      const normalized = rows.map(r => ({
        day: (r.day || '').slice(0, 10),
        revenue: Number(r.revenue || 0),
        order_count: Number(r.order_count || 0)
      }));
      setRevenueData(normalized);
    } catch (err) {
      console.error('[Dashboard] revenue fetch failed:', err);
    }
  }, [revPreset, revCustomStart, revCustomEnd]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, topRes, ordersRes, catRes, statusRes, lowStockRes] = await Promise.all([
        api.get('/admin/stats/dashboard'),
        api.get('/admin/stats/top-products', { params: { limit: 5 } }),
        api.get('/admin/stats/recent-orders', { params: { limit: 6 } }),
        api.get('/admin/analytics/category-sales', { params: { limit: 8 } }),
        api.get('/admin/analytics/order-status'),
        api.get('/admin/products/low-stock', { params: { threshold: 10 } })
      ]);

      setStats(statsRes.data?.data || {});
      setTopProducts(topRes.data?.data || []);
      setRecentOrders(ordersRes.data?.data || []);
      setCategorySales(catRes.data?.data || []);
      setOrderStatus(statusRes.data?.data || []);
      setLowStock(lowStockRes.data?.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Không thể tải dữ liệu dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchRevenue();
  }, [fetchAll]);

  // Refresh revenue when preset or custom range changes
  useEffect(() => {
    if (!loading) fetchRevenue();
  }, [revPreset, revCustomStart, revCustomEnd]);

  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(() => {
      fetchAll();
      fetchRevenue();
    }, 60_000);
    return () => clearInterval(t);
  }, [fetchAll, fetchRevenue]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const kpis = useMemo(() => {
    if (!stats) return [];
    return [
      {
        key: 'revenue',
        label: 'Tổng Doanh Thu',
        value: formatPrice(stats.totalRevenue),
        sub: stats.revenueGrowth != null
          ? `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth}% so với tháng trước`
          : 'Cập nhật theo thời gian thực',
        subColor: stats.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400',
        icon: Wallet,
        gradient: 'from-cyan-500/30 via-cyan-500/10 to-blue-600/20',
        accent: 'text-cyan-300',
        border: 'border-cyan-500/40',
        iconBg: 'from-cyan-500 to-blue-600',
        trend: stats.revenueGrowth >= 0 ? 'up' : 'down'
      },
      {
        key: 'month',
        label: 'Doanh Thu Tháng',
        value: formatPrice(stats.monthRevenue),
        sub: `${stats.monthOrders || 0} đơn tháng này`,
        subColor: 'text-cyan-300',
        icon: Activity,
        gradient: 'from-teal-500/30 via-teal-500/10 to-emerald-600/20',
        accent: 'text-teal-300',
        border: 'border-teal-500/40',
        iconBg: 'from-teal-500 to-emerald-600'
      },
      {
        key: 'today',
        label: 'Doanh Thu Hôm Nay',
        value: formatPrice(stats.todayRevenue),
        sub: `${stats.todayOrders || 0} đơn hôm nay`,
        subColor: 'text-purple-300',
        icon: Zap,
        gradient: 'from-purple-500/30 via-purple-500/10 to-fuchsia-600/20',
        accent: 'text-purple-300',
        border: 'border-purple-500/40',
        iconBg: 'from-purple-500 to-fuchsia-600'
      },
      {
        key: 'orders',
        label: 'Tổng Đơn Hàng',
        value: formatNumber(stats.totalOrders),
        sub: `${stats.pendingOrders || 0} đơn đang xử lý`,
        subColor: 'text-emerald-300',
        icon: ShoppingCart,
        gradient: 'from-emerald-500/30 via-emerald-500/10 to-teal-600/20',
        accent: 'text-emerald-300',
        border: 'border-emerald-500/40',
        iconBg: 'from-emerald-500 to-teal-600'
      }
    ];
  }, [stats]);

  const secondaryKpis = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'Tổng Khách Hàng',
        value: formatNumber(stats.totalCustomers),
        icon: Users,
        to: '/admin/users',
        color: 'text-purple-300'
      },
      {
        label: 'Tổng Sản Phẩm',
        value: formatNumber(stats.totalProducts),
        icon: Package,
        to: '/admin/products',
        color: 'text-cyan-300'
      },
      {
        label: 'Sắp Hết Hàng',
        value: formatNumber(stats.lowStockCount),
        icon: AlertTriangle,
        to: '/admin/inventory',
        color: stats.lowStockCount > 0 ? 'text-rose-300' : 'text-emerald-300'
      },
      {
        label: 'Đơn Chờ Duyệt',
        value: formatNumber(stats.pendingOrders),
        icon: Clock,
        to: '/admin/orders',
        color: stats.pendingOrders > 0 ? 'text-amber-300' : 'text-emerald-300'
      }
    ];
  }, [stats]);

  const quickLinks = [
    { to: '/admin/products', label: 'Sản phẩm', icon: Package, gradient: 'from-cyan-500 to-blue-600' },
    { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart, gradient: 'from-emerald-500 to-teal-600' },
    { to: '/admin/users', label: 'Khách hàng', icon: Users, gradient: 'from-purple-500 to-fuchsia-600' },
    { to: '/admin/coupons', label: 'Mã giảm giá', icon: Tag, gradient: 'from-amber-500 to-orange-600' },
    { to: '/admin/inventory', label: 'Tồn kho', icon: Boxes, gradient: 'from-rose-500 to-pink-600' },
    { to: '/admin/contacts', label: 'Liên hệ', icon: MessageCircle, gradient: 'from-teal-500 to-cyan-600' },
    { to: '/admin/analytics', label: 'Phân tích', icon: BarChart3, gradient: 'from-slate-500 to-slate-700' }
  ];

  // Render chart with safe guards
  const renderRevenueChart = () => {
    if (!revenueData || revenueData.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
          Chưa có dữ liệu doanh thu
        </div>
      );
    }
    const { startDate, endDate } = getRevDateRange();
    const filledData = fillDateRange(revenueData, startDate, endDate);
    if (!filledData.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
          Chưa có dữ liệu doanh thu
        </div>
      );
    }
    const hasRevenue = filledData.some(r => r.revenue > 0);
    const hasOrders = filledData.some(r => r.order_count > 0);
    return (
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filledData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.85} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.25} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#94a3b8"
              style={{ fontSize: 10 }}
              tickFormatter={(v) => {
                try {
                  const m = typeof v === 'string' && v.match(/^(\d{4})-(\d{2})-(\d{2})/);
                  if (m) {
                    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                  }
                  return v;
                } catch { return v; }
              }}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              stroke="#94a3b8"
              style={{ fontSize: 10 }}
              tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              stroke="#a855f7"
              style={{ fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="circle"
              formatter={(value) => {
                if (value === 'revenue') return <span style={{ color: '#94a3b8' }}>Doanh thu (cột)</span>;
                if (value === 'order_count') return <span style={{ color: '#94a3b8' }}>Số đơn (đường)</span>;
                return value;
              }}
            />
            {hasRevenue && (
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                fill="url(#gradRevenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={42}
                name="revenue"
              />
            )}
            {hasOrders && (
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="order_count"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }}
                name="order_count"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Revenue summary chips
  const revSummary = useMemo(() => {
    if (!revenueData.length) return null;
    const { startDate, endDate } = getRevDateRange();
    const filled = fillDateRange(revenueData, startDate, endDate);
    const totalRev = filled.reduce((s, r) => s + r.revenue, 0);
    const totalOrd = filled.reduce((s, r) => s + r.order_count, 0);
    return { totalRev, totalOrd, days: filled.length };
  }, [revenueData, revPreset, revCustomStart, revCustomEnd]);

  return (
    <div className="space-y-5 sm:space-y-6 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-4 sm:p-6 lg:p-8">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Dashboard · Admin Panel
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white leading-tight">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                {user?.full_name || 'Admin'}
              </span>
              <span className="inline-block ml-1 animate-pulse">👋</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Tổng quan hoạt động của cửa hàng · {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {lastUpdated && (
              <p className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')} · Tự động refresh mỗi 60s
              </p>
            )}
          </div>

          <button
            onClick={() => { fetchAll(); fetchRevenue(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-xl text-xs font-semibold text-slate-200 disabled:opacity-50 transition w-full lg:w-auto justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
          </button>
        </div>
      </div>

      {error && !loading && (
        <div className="glass-card border-rose-500/30 bg-rose-500/10 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-300 font-bold text-sm">Đã có lỗi xảy ra</p>
            <p className="text-rose-400/80 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Cards - 4 columns on lg, 2 on sm, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {(loading || !stats)
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl h-32 animate-pulse" />
            ))
          : kpis.map((k) => {
              const Icon = k.icon;
              const TrendIcon = k.trend === 'up' ? ArrowUp : k.trend === 'down' ? ArrowDown : null;
              return (
                <div
                  key={k.key}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border ${k.border} bg-gradient-to-br ${k.gradient} hover:scale-[1.02] transition-transform duration-200 backdrop-blur-sm`}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-200/90 truncate">
                      {k.label}
                    </span>
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${k.iconBg} flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white truncate" title={k.value}>
                    {k.value}
                  </div>
                  <div className={`text-[11px] sm:text-xs mt-1.5 flex items-center gap-1 ${k.subColor} font-medium`}>
                    {TrendIcon && <TrendIcon className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">{k.sub}</span>
                  </div>
                  <div className={`absolute -bottom-12 -right-12 w-32 h-32 rounded-full opacity-20 blur-3xl bg-gradient-to-br ${k.iconBg}`} />
                </div>
              );
            })}
      </div>

      {/* Secondary KPIs - small chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(loading || !stats)
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl h-20 animate-pulse" />
            ))
          : secondaryKpis.map((s, i) => {
              const Icon = s.icon;
              return (
                <Link
                  key={i}
                  to={s.to}
                  className="glass-card rounded-2xl p-3 sm:p-4 flex items-center gap-3 hover:border-cyan-500/40 transition group"
                >
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform flex-shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold truncate">{s.label}</p>
                    <p className="text-base sm:text-lg font-black text-white truncate">{s.value ?? '—'}</p>
                  </div>
                </Link>
              );
            })}
      </div>

      {/* Quick action tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {quickLinks.map(q => {
          const Icon = q.icon;
          return (
            <Link
              key={q.to + q.label}
              to={q.to}
              className="group glass-card rounded-2xl p-3 sm:p-4 hover:border-cyan-500/50 transition-all"
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${q.gradient} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">{q.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 group-hover:text-cyan-400">
                Truy cập <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row: Revenue (big) + Category (side) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ===== REVENUE CHART ===== */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 lg:col-span-2">
          {/* Header + date filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Doanh Thu Theo Thời Gian
              </h2>
              {revSummary && (
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-[11px] text-cyan-300 font-bold">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(revSummary.totalRev)}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[11px] text-purple-300 font-bold">{revSummary.totalOrd} đơn</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-[11px] text-emerald-300 font-bold">{revSummary.days} ngày</span>
                </div>
              )}
            </div>

            {/* Preset buttons */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {[
                { key: '1d', label: 'Hôm nay' },
                { key: '7d', label: '7 ngày' },
                { key: '30d', label: '30 ngày' },
                { key: 'custom', label: 'Tùy chỉnh' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => setRevPreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    revPreset === p.key
                      ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range inputs */}
          {revPreset === 'custom' && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={revCustomStart}
                  onChange={e => setRevCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-500 text-xs">→</span>
                <input
                  type="date"
                  value={revCustomEnd}
                  onChange={e => setRevCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => { if (revCustomStart && revCustomEnd) fetchRevenue(); }}
                disabled={!revCustomStart || !revCustomEnd}
                className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-bold hover:bg-cyan-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Áp dụng
              </button>
            </div>
          )}

          {/* ComposedChart: Bar (revenue) + Line (order count) */}
          {renderRevenueChart()}
        </div>

        {/* ===== CATEGORY SALES ===== */}
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" /> Doanh số theo danh mục
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {categorySales.length > 0 ? `Top ${categorySales.length} danh mục` : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>

          {categorySales.length > 0 ? (
            <div className="flex flex-col gap-2">
              {categorySales.slice(0, 6).map((cat, i) => {
                const maxRev = Math.max(...categorySales.map(c => Number(c.total_revenue || 0)));
                const pct = maxRev > 0 ? (Number(cat.total_revenue || 0) / maxRev * 100) : 0;
                return (
                  <div key={cat.id || i} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-200 truncate">{cat.name}</span>
                        <span className="text-[11px] font-bold text-slate-300 ml-2 flex-shrink-0">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(cat.total_revenue || 0)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Bottom Row: Top Products + Recent Orders + Side widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Top Products */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 lg:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Top sản phẩm
            </h2>
            <Link to="/admin/analytics" className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
              Tất cả <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] flex-shrink-0 ${
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950' :
                    i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-950' :
                    i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700 text-slate-950' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    #{i + 1}
                  </div>
                  <img src={resolveImage(p.image_url)} onError={onImageError} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-900 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white truncate">{p.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">{p.sold || p.total_sold || 0} đã bán</p>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-cyan-300 truncate">{formatPrice(p.price)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-400" /> Đơn hàng gần đây
            </h2>
            <Link to="/admin/orders" className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1">
              Tất cả <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map(ord => {
                const info = STATUS_MAP[ord.status] || { label: ord.status };
                return (
                  <div key={ord.id} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:border-slate-700 transition">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-300 flex-shrink-0">
                      {ord.customer_initials || 'KH'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-xs font-bold text-white truncate">
                        #{ord.id} · {ord.customer_name || 'Khách'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {ord.product_name || 'Đơn hàng'}
                        {' · '}
                        {new Date(ord.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{formatPrice(ord.amount || ord.final_amount)}</p>
                      <span className={`inline-block text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border font-bold mt-0.5 ${STATUS_PILL[ord.status] || STATUS_PILL.pending}`}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">Chưa có đơn hàng</div>
          )}
        </div>

        {/* Side widgets: Order status + low stock */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <div className="glass-card rounded-2xl p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-rose-400" /> Trạng thái đơn
            </h2>
            {orderStatus.length > 0 ? (
              <div className="space-y-3">
                {orderStatus.map((s, i) => {
                  const info = STATUS_MAP[s.status] || { label: s.status };
                  const colors = ['bg-amber-500', 'bg-cyan-500', 'bg-purple-500', 'bg-emerald-500', 'bg-rose-500'];
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1.5">
                        <span className="text-slate-300 font-semibold">{info.label}</span>
                        <span className="text-slate-400 font-bold">{s.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${Math.min(100, parseFloat(s.percentage) || 0)}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{s.percentage}%</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 sm:p-6 border-amber-500/30">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-3">
              <BellRing className="w-4 h-4 text-amber-400" /> Cảnh báo tồn kho
            </h2>
            {lowStock.length > 0 ? (
              <div className="space-y-2">
                {lowStock.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <img src={resolveImage(p.image_url)} onError={onImageError} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-amber-300">Còn {p.stock} sản phẩm</p>
                    </div>
                  </div>
                ))}
                <Link to="/admin/inventory" className="block text-center text-[10px] sm:text-[11px] text-cyan-400 hover:underline pt-1">
                  Xem tất cả →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-emerald-400 text-center py-2">✓ Tồn kho ổn định</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}