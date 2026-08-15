import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Calendar, Download, Loader2, RefreshCw,
  Package, ShoppingCart, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import api from '../../services/api';
import showToast from '../../utils/toast';
import { Link } from 'react-router-dom';
import { resolveImage, onImageError } from '../../utils/imageHelper';

const formatPrice = (v) => {
  const num = Number(v);
  return isNaN(num) ? '0' : new Intl.NumberFormat('vi-VN').format(num);
};

const formatVND = (v) => {
  const num = Number(v);
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num);
};

const COLORS = ['#06b6d4', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

/* ============ Date helpers (local VN time) ============ */
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseYMD = (s) => {
  // Parse "YYYY-MM-DD" an toàn theo local time (VN) — KHÔNG dùng new Date(s) vì sẽ lệch múi giờ
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const daysBetween = (a, b) => {
  const da = parseYMD(a);
  const db = parseYMD(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000) + 1; // inclusive
};

/* ============ GroupBy auto-detect ============ */
// Pick an aggregation level based on the number of days in the range.
// ≤ 31 ngày → day; 32-92 ngày → week; > 92 ngày → month
const autoGroupBy = (startDate, endDate) => {
  const n = daysBetween(startDate, endDate);
  if (n <= 31) return 'day';
  if (n <= 92) return 'week';
  return 'month';
};

const GROUP_OPTIONS = [
  { key: 'day', label: 'Theo Ngày' },
  { key: 'week', label: 'Theo Tuần' },
  { key: 'month', label: 'Theo Tháng' },
];

/* ============ Date presets ============ */
const PRESETS = [
  { key: 'today', label: 'Hôm nay', days: 1 },
  { key: '7d', label: '7 ngày', days: 7 },
  { key: '30d', label: '30 ngày', days: 30 },
  { key: '90d', label: '90 ngày', days: 90 },
  { key: 'this_month', label: 'Tháng này', days: null },
  { key: 'last_month', label: 'Tháng trước', days: null },
  { key: 'custom', label: 'Tùy chỉnh', days: null },
];

const getDateRange = (preset, customStart, customEnd) => {
  const now = new Date();
  if (preset === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: toYMD(start), endDate: toYMD(now) };
  }
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: toYMD(start), endDate: toYMD(end) };
  }
  if (preset === 'custom' && customStart && customEnd) {
    return { startDate: customStart, endDate: customEnd };
  }
  const days = PRESETS.find(p => p.key === preset)?.days || 30;
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toYMD(start), endDate: toYMD(now) };
};

/* ============ Bucket fill (date/week/month) ============ */
// Returns an array of buckets covering [startDate, endDate] (inclusive),
// filling gaps where there is no data with revenue/order_count = 0.
const buildBucketKey = (d, groupBy) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (groupBy === 'day') return `${y}-${m}-${day}`;
  if (groupBy === 'month') return `${y}-${m}`;
  if (groupBy === 'week') {
    // ISO week start (Monday)
    const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
    const ws = new Date(y, d.getMonth(), day - dayOfWeek);
    return `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`;
  }
  return `${y}-${m}-${day}`;
};

const advanceBucket = (d, groupBy) => {
  const n = new Date(d);
  if (groupBy === 'day') n.setDate(n.getDate() + 1);
  else if (groupBy === 'week') n.setDate(n.getDate() + 7);
  else if (groupBy === 'month') n.setMonth(n.getMonth() + 1);
  return n;
};

const fillBuckets = (rows, startDate, endDate, groupBy) => {
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  if (!start || !end) return rows || [];
  const map = new Map();
  (rows || []).forEach(r => {
    const rawKey = (r.period || r.day || '').slice(0, 10);
    if (!rawKey) return;
    // Normalize raw period to the matching bucket start
    const tmp = parseYMD(rawKey.slice(0, 10)) || new Date(rawKey);
    if (isNaN(tmp.getTime())) return;
    const key = buildBucketKey(tmp, groupBy);
    const prev = map.get(key);
    if (prev) {
      prev.revenue += Number(r.revenue || 0);
      prev.order_count += Number(r.order_count || 0);
      prev.discount_amount += Number(r.discount_amount || 0);
    } else {
      map.set(key, {
        period: key,
        revenue: Number(r.revenue || 0),
        order_count: Number(r.order_count || 0),
        discount_amount: Number(r.discount_amount || 0),
      });
    }
  });

  const filled = [];
  let cur = new Date(start);
  // For week grouping: align `cur` to the start of its ISO week so buckets don't drift.
  if (groupBy === 'week') {
    const dayOfWeek = (cur.getDay() + 6) % 7;
    cur.setDate(cur.getDate() - dayOfWeek);
  }
  while (cur <= end) {
    const key = buildBucketKey(cur, groupBy);
    const existing = map.get(key);
    filled.push({
      period: key,
      revenue: existing ? existing.revenue : 0,
      order_count: existing ? existing.order_count : 0,
      discount_amount: existing ? existing.discount_amount : 0,
    });
    cur = advanceBucket(cur, groupBy);
  }
  return filled;
};

/* ============ Label formatting per group ============ */
const formatBucketLabel = (key, groupBy) => {
  if (!key) return '';
  try {
    if (groupBy === 'month') {
      const m = /^(\d{4})-(\d{2})$/.exec(key);
      if (m) return `T${Number(m[2])}/${m[1]}`;
      return key;
    }
    // day or week — both are YYYY-MM-DD
    const d = parseYMD(key);
    if (!d) return key;
    if (groupBy === 'week') {
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} - ${String(end.getDate()).padStart(2,'0')}/${String(end.getMonth()+1).padStart(2,'0')}`;
    }
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return key;
  }
};

const formatBucketLabelLong = (key, groupBy) => {
  if (!key) return '';
  try {
    if (groupBy === 'month') {
      const m = /^(\d{4})-(\d{2})$/.exec(key);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
        return `Tháng ${d.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })}`;
      }
    }
    const d = parseYMD(key);
    if (!d) return key;
    if (groupBy === 'week') {
      const end = new Date(d);
      end.setDate(end.getDate() + 6);
      return `Tuần ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}/${d.getFullYear()}`;
    }
    return `Ngày ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  } catch {
    return key;
  }
};

/* ============ Custom Tooltips ============ */
function RevenueTooltip({ active, payload, label, groupBy }) {
  if (!active || !payload || !payload.length) return null;
  const rev = payload.find(p => p.dataKey === 'revenue')?.value;
  const ord = payload.find(p => p.dataKey === 'order_count')?.value;
  const labelStr = formatBucketLabelLong(label, groupBy);
  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid rgba(51, 65, 85, 0.8)',
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      color: '#e2e8f0',
      padding: '10px 14px',
      fontSize: 12,
      minWidth: 200
    }}>
      <div style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 700, marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
        {labelStr}
      </div>
      {rev != null && (
        <div style={{ color: '#06b6d4', fontWeight: 700, marginBottom: 3 }}>
          💰 Doanh thu: {formatVND(rev)}
        </div>
      )}
      {ord != null && (
        <div style={{ color: '#a855f7', fontWeight: 600 }}>
          📦 Số đơn: {Number(ord).toLocaleString('vi-VN')}
        </div>
      )}
    </div>
  );
}

function CategoryTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      backgroundColor: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid rgba(51, 65, 85, 0.8)',
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      color: '#e2e8f0',
      padding: '8px 12px',
      fontSize: 12
    }}>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#06b6d4', fontWeight: 600 }}>
          💰 {formatVND(p.value)}
        </div>
      ))}
    </div>
  );
}

/* ============ Status color map ============ */
const statusColorMap = {
  pending: '#f59e0b', confirmed: '#06b6d4', packing: '#8b5cf6',
  shipping: '#a855f7', delivered: '#10b981', cancelled: '#ef4444'
};

const statusLabel = (s) => (
  s === 'pending' ? 'Chờ xử lý'
    : s === 'confirmed' ? 'Đã xác nhận'
    : s === 'packing' ? 'Đóng gói'
    : s === 'shipping' ? 'Đang giao'
    : s === 'delivered' ? 'Hoàn thành'
    : s === 'cancelled' ? 'Đã hủy'
    : (s || 'Khác')
);

/* ============ Main component ============ */
export default function AdminAnalytics() {
  const [preset, setPreset] = useState('30d');
  const [groupBy, setGroupBy] = useState('auto'); // 'auto' or 'day' | 'week' | 'month'
  const [dateRange, setDateRange] = useState(() => getDateRange('30d'));
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false); // chỉ re-load biểu đồ doanh thu

  // Summary stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrder, setAvgOrder] = useState(0);

  // Resolve effective groupBy
  const effectiveGroupBy = useMemo(() => {
    if (groupBy !== 'auto') return groupBy;
    return autoGroupBy(dateRange.startDate, dateRange.endDate);
  }, [groupBy, dateRange.startDate, dateRange.endDate]);

  // Validation
  const customDateError = useMemo(() => {
    if (preset !== 'custom') return '';
    if (!customStart || !customEnd) return '';
    const s = parseYMD(customStart);
    const e = parseYMD(customEnd);
    if (!s || !e) return 'Định dạng ngày không hợp lệ';
    if (e < s) return 'Ngày kết thúc phải ≥ ngày bắt đầu';
    const span = Math.round((e - s) / 86400000) + 1;
    if (span > 730) return 'Khoảng thời gian tối đa 2 năm';
    return '';
  }, [preset, customStart, customEnd]);

  // Update dateRange when preset/custom changes
  useEffect(() => {
    if (preset === 'custom') {
      if (customStart && customEnd && !customDateError) {
        setDateRange(getDateRange('custom', customStart, customEnd));
      }
      return;
    }
    setDateRange(getDateRange(preset));
  }, [preset, customStart, customEnd, customDateError]);

  // Load all data on dateRange change
  const loadAll = useCallback(async () => {
    setLoading(true);
    setChartLoading(true);
    try {
      const { startDate, endDate } = dateRange;
      const [revRes, topRes, statusRes, catRes] = await Promise.all([
        api.get('/admin/analytics/revenue', {
          params: { startDate, endDate, groupBy: effectiveGroupBy }
        }),
        api.get('/admin/analytics/top-products', {
          params: { limit: 10, startDate, endDate }
        }),
        api.get('/admin/analytics/order-status', { params: { startDate, endDate } }),
        api.get('/admin/analytics/category-sales', {
          params: { startDate, endDate, limit: 8 }
        }),
      ]);

      const revRows = (revRes.data?.data || []).map(r => ({
        period: (r.period || r.day || '').slice(0, 10),
        revenue: Number(r.revenue || 0),
        order_count: Number(r.order_count || 0),
        discount_amount: Number(r.discount_amount || 0),
        avg_order_value: Number(r.avg_order_value || 0),
      }));
      setRevenueData(revRows);
      setTopProducts(Array.isArray(topRes.data?.data) ? topRes.data.data : []);

      const statusRows = (statusRes.data?.data || []).map(r => ({
        ...r,
        status: r.status,
        count: Number(r.count || 0),
        total_amount: Number(r.total_amount || 0),
        percentage: Number(r.percentage || 0)
      }));
      setOrderStatus(statusRows);

      const catRows = (catRes.data?.data || []).map(r => ({
        ...r,
        name: r.name || r.category_name || 'Khác',
        total_revenue: Number(r.total_revenue || 0)
      }));
      setCategorySales(catRows);

      const totalRev = revRows.reduce((s, r) => s + r.revenue, 0);
      const totalOrd = revRows.reduce((s, r) => s + r.order_count, 0);
      setTotalRevenue(totalRev);
      setTotalOrders(totalOrd);
      setAvgOrder(totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0);
    } catch (err) {
      console.error('Analytics error:', err);
      const msg = err?.response?.data?.message || 'Lỗi tải dữ liệu phân tích';
      showToast.error(msg);
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [dateRange, effectiveGroupBy]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Reload only revenue when groupBy changes (other panels unaffected)
  const reloadRevenueOnly = useCallback(async () => {
    setChartLoading(true);
    try {
      const { startDate, endDate } = dateRange;
      const revRes = await api.get('/admin/analytics/revenue', {
        params: { startDate, endDate, groupBy: effectiveGroupBy }
      });
      const revRows = (revRes.data?.data || []).map(r => ({
        period: (r.period || r.day || '').slice(0, 10),
        revenue: Number(r.revenue || 0),
        order_count: Number(r.order_count || 0),
        discount_amount: Number(r.discount_amount || 0),
        avg_order_value: Number(r.avg_order_value || 0),
      }));
      setRevenueData(revRows);
    } catch (err) {
      console.error('Revenue reload error:', err);
      showToast.error('Lỗi tải lại biểu đồ doanh thu');
    } finally {
      setChartLoading(false);
    }
  }, [dateRange, effectiveGroupBy]);

  useEffect(() => {
    // Khi đổi groupBy thì chỉ cần reload revenue, không cần reload cả 4 API
    reloadRevenueOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveGroupBy]);

  /* ============ Export ============ */
  const handleExportExcel = async () => {
    try {
      showToast.loading('Đang tạo Excel...');
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const revSheet = revenueData.map(r => ({
        'Thời gian': formatBucketLabelLong(r.period, effectiveGroupBy),
        'Doanh thu (VNĐ)': r.revenue,
        'Số đơn hàng': r.order_count,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revSheet), 'DoanhThu');

      const prodSheet = topProducts.map((p, i) => ({
        '#': i + 1,
        'Sản phẩm': p.name,
        'Đã bán': p.total_sold || p.sold || 0,
        'Doanh thu': p.total_revenue || (p.price * (p.total_sold || 0))
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodSheet), 'SanPham');

      const statusSheet = orderStatus.map(s => ({
        'Trạng thái': statusLabel(s.status),
        'Số đơn': s.count,
        'Tổng tiền': s.total_amount,
        'Tỷ lệ %': s.percentage
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusSheet), 'TrangThai');

      XLSX.writeFile(wb, `analytics-${dateRange.startDate}_${dateRange.endDate}.xlsx`);
      showToast.dismiss();
      showToast.success('Đã xuất Excel');
    } catch {
      showToast.dismiss();
      showToast.error('Lỗi xuất file');
    }
  };

  /* ============ Filled data ============ */
  const filledRevenue = useMemo(
    () => fillBuckets(revenueData, dateRange.startDate, dateRange.endDate, effectiveGroupBy),
    [revenueData, dateRange.startDate, dateRange.endDate, effectiveGroupBy]
  );

  // X-axis: smart-skip labels so they don't overlap
  const xAxisTickInterval = useMemo(() => {
    const n = filledRevenue.length;
    if (n <= 14) return 0; // show all
    if (n <= 31) return 2;
    if (n <= 60) return 4;
    if (n <= 100) return 9;
    return Math.max(1, Math.ceil(n / 14));
  }, [filledRevenue.length]);

  /* ============ Sub-components for chart UI ============ */
  const GroupBySelector = (
    <div className="flex items-center gap-1.5 bg-black border border-neutral-800 rounded-none clip-path-rog p-1">
      <button
        onClick={() => setGroupBy('auto')}
        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
          groupBy === 'auto'
            ? 'bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
        }`}
        title="Tự động chọn mức gộp theo khoảng thời gian"
      >
        Tự động
      </button>
      {GROUP_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => setGroupBy(opt.key)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            groupBy === opt.key
              ? 'bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-red-500" />
            Phân Tích & Báo Cáo
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Dữ liệu doanh thu, đơn hàng và sản phẩm bán chạy
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-600/40 text-emerald-300 font-bold rounded-none clip-path-rog text-xs hover:bg-red-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 border border-slate-700 text-neutral-300 font-bold rounded-none clip-path-rog text-xs hover:border-red-600/50 transition disabled:opacity-50"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ===== Date range bar (dùng cho TOÀN BỘ trang) ===== */}
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-4 border border-neutral-800">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-2 text-neutral-300">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase">Khoảng thời gian:</span>
          </div>
          <div className="flex gap-1 bg-black border border-neutral-800 rounded-none clip-path-rog p-1 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => {
                  setPreset(p.key);
                  if (p.key !== 'custom') {
                    setCustomStart('');
                    setCustomEnd('');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  preset === p.key
                    ? 'bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 bg-black border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-red-600 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">→</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-black border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-red-600 focus:outline-none"
              />
              {customDateError && (
                <span className="text-[11px] text-rose-400 font-semibold">⚠ {customDateError}</span>
              )}
            </div>
          )}
          <div className="lg:ml-auto text-[11px] text-neutral-400 font-mono">
            📅 {dateRange.startDate} → {dateRange.endDate}
            <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300">
              {daysBetween(dateRange.startDate, dateRange.endDate)} ngày
            </span>
          </div>
        </div>
      </div>

      {/* ===== KPI summary ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-5 border border-red-600/30 bg-gradient-to-br from-red-600/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-none clip-path-rog bg-red-600/20 border border-red-600/30">
              <DollarSign className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Tổng Doanh Thu</span>
          </div>
          {loading ? (
            <div className="h-8 bg-neutral-900 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-white">{formatVND(totalRevenue)}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-1">
            {dateRange.startDate} → {dateRange.endDate}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-5 border border-red-600/30 bg-gradient-to-br from-red-600/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-none clip-path-rog bg-red-600/20 border border-red-600/30">
              <ShoppingCart className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Tổng Đơn Hàng</span>
          </div>
          {loading ? (
            <div className="h-8 bg-neutral-900 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-white">{totalOrders.toLocaleString()}</p>
          )}
          <p className="text-[11px] text-red-500 mt-1">Đơn đã xử lý</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-5 border border-red-600/30 bg-gradient-to-br from-red-600/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-none clip-path-rog bg-red-600/20 border border-red-600/30">
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Giá Trị TB / Đơn</span>
          </div>
          {loading ? (
            <div className="h-8 bg-neutral-900 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-white">{formatVND(avgOrder)}</p>
          )}
          <p className="text-[11px] text-red-500 mt-1">Mỗi đơn hàng</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-5 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-none clip-path-rog bg-amber-500/20 border border-amber-500/30">
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase">Sản Phẩm Bán Chạy</span>
          </div>
          {loading ? (
            <div className="h-8 bg-neutral-900 rounded-lg animate-pulse" />
          ) : (
            <p className="text-2xl font-black text-white">{topProducts.length}</p>
          )}
          <p className="text-[11px] text-amber-400 mt-1">Top sản phẩm</p>
        </div>
      </div>

      {/* ===== Revenue Chart (with date picker + groupBy on header) ===== */}
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 border border-red-600/20">
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Doanh Thu Theo Ngày
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">
                Biểu đồ cột (doanh thu) + đường (số đơn) · Tổng{' '}
                <span className="text-red-400 font-bold">{formatVND(totalRevenue)}</span>{' '}
                · <span className="text-purple-300 font-bold">{totalOrders}</span> đơn
                {groupBy === 'auto' && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400">
                    Tự động: {effectiveGroupBy === 'day' ? 'Theo Ngày' : effectiveGroupBy === 'week' ? 'Theo Tuần' : 'Theo Tháng'}
                  </span>
                )}
              </p>
            </div>
            {/* Dedicated chart date picker + groupBy */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-black border border-neutral-800 rounded-none clip-path-rog p-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPreset('custom');
                    setCustomStart(v);
                    if (customEnd && v > customEnd) {
                      // auto-clamp end nếu start > end
                      setCustomEnd(v);
                    }
                  }}
                  className="px-2 py-1.5 bg-transparent border-0 text-[11px] text-slate-200 focus:outline-none cursor-pointer"
                />
                <span className="text-slate-500 text-[11px]">→</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPreset('custom');
                    setCustomEnd(v);
                    if (customStart && v < customStart) {
                      setCustomStart(v);
                    }
                  }}
                  className="px-2 py-1.5 bg-transparent border-0 text-[11px] text-slate-200 focus:outline-none cursor-pointer"
                />
              </div>
              {GroupBySelector}
              <button
                onClick={loadAll}
                disabled={chartLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 border border-slate-700 text-neutral-300 font-bold rounded-none clip-path-rog text-[11px] hover:border-red-600/50 transition disabled:opacity-50"
                title="Tải lại biểu đồ"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${chartLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-[340px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filledRevenue.length > 0 ? (
          <div style={{ width: '100%', height: 360 }} className="relative">
            {chartLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] rounded-none clip-path-rog">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={filledRevenue}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                barCategoryGap={effectiveGroupBy === 'day' ? '22%' : '35%'}
              >
                <defs>
                  <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.25} />
                  </linearGradient>
                  <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke="#94a3b8"
                  style={{ fontSize: 11 }}
                  interval={xAxisTickInterval}
                  tickFormatter={(v) => formatBucketLabel(v, effectiveGroupBy)}
                  angle={filledRevenue.length > 20 ? -25 : 0}
                  textAnchor={filledRevenue.length > 20 ? 'end' : 'middle'}
                  height={filledRevenue.length > 20 ? 60 : 30}
                />
                <YAxis
                  yAxisId="revenue"
                  orientation="left"
                  stroke="#94a3b8"
                  style={{ fontSize: 11 }}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  stroke="#a855f7"
                  style={{ fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<RevenueTooltip groupBy={effectiveGroupBy} />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="circle"
                  formatter={(value) => {
                    if (value === 'revenue') return <span style={{ color: '#94a3b8' }}>Doanh thu</span>;
                    if (value === 'order_count') return <span style={{ color: '#94a3b8' }}>Số đơn</span>;
                    return value;
                  }}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  fill="url(#gradCyan)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={effectiveGroupBy === 'day' ? 32 : 48}
                  name="revenue"
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="order_count"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }}
                  name="order_count"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500">
            Chưa có dữ liệu doanh thu trong khoảng thời gian này
          </div>
        )}
      </div>

      {/* ===== Charts row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Pie */}
        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 border border-slate-700">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            Phân Bố Trạng Thái Đơn Hàng
          </h2>
          <p className="text-[11px] text-slate-500 mb-4">Tỷ lệ đơn hàng theo trạng thái</p>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          ) : orderStatus.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={orderStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {orderStatus.map((entry, i) => (
                      <Cell
                        key={entry.status || i}
                        fill={statusColorMap[entry.status] || COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.97)',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: 12,
                      color: '#e2e8f0',
                      fontSize: 12
                    }}
                    formatter={(v, name) => [v, 'Số đơn']}
                    labelFormatter={(l) => statusLabel(l)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {orderStatus.map((s, i) => (
                  <div key={s.status || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColorMap[s.status] || COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-semibold text-neutral-300">
                        {statusLabel(s.status)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white">{s.count}</span>
                      <span className="text-[11px] text-slate-500 ml-1">({s.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu đơn hàng</div>
          )}
        </div>

        {/* Category Sales */}
        <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 border border-slate-700">
          <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-red-500" />
            Doanh Số Theo Danh Mục
          </h2>
          <p className="text-[11px] text-slate-500 mb-4">Top danh mục sản phẩm bán chạy</p>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          ) : categorySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categorySales} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 10 }}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" style={{ fontSize: 10 }} width={80} />
                <Tooltip
                  content={<CategoryTooltip />}
                  cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                />
                <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]}>
                  {categorySales.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* ===== Top Products Table ===== */}
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Top Sản Phẩm Bán Chạy
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              {topProducts.length} sản phẩm trong khoảng thời gian đã chọn
            </p>
          </div>
          <Link
            to="/admin/products"
            className="text-[11px] text-red-500 hover:underline flex items-center gap-1 font-semibold"
          >
            Quản lý sản phẩm →
          </Link>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
          </div>
        ) : topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-slate-500 uppercase">#</th>
                  <th className="text-left py-3 px-3 text-[11px] font-bold text-slate-500 uppercase">Sản Phẩm</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-slate-500 uppercase">Đã Bán</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-slate-500 uppercase">Đơn Hàng</th>
                  <th className="text-right py-3 px-3 text-[11px] font-bold text-slate-500 uppercase">Doanh Thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {topProducts.map((p, i) => (
                  <tr key={p.id} className="hover:bg-black/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-[11px] ${
                        i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold tracking-widest uppercase'
                        : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white font-bold tracking-widest uppercase'
                        : i === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-700 text-white font-bold tracking-widest uppercase'
                        : 'bg-neutral-900 text-neutral-400'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveImage(p.image_url)}
                          onError={onImageError}
                          alt=""
                          className="w-10 h-10 rounded-none clip-path-rog object-cover bg-black border border-slate-700"
                        />
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          <p className="text-[11px] text-slate-500">{p.brand_name} · {p.category_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-red-400">
                      {Number(p.total_sold || p.sold || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-300">
                      {Number(p.order_count || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-300">
                      {formatVND(Number(p.total_revenue || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">Chưa có dữ liệu sản phẩm</div>
        )}
      </div>
    </div>
  );
}