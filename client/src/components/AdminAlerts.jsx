import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Tag, CreditCard, ShoppingCart, Package, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import showToast from '../utils/toast';
import { adminService } from '../services/adminService';
import { Link } from 'react-router-dom';
import { getBackendUrl } from '../utils/imageHelper';

/**
 * AdminAlerts - bell icon dropdown for low stock / expiring coupons / pending payments
 * Polls /api/admin/stats/alerts every 30s (matches backend cache TTL).
 */
export default function AdminAlerts() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previousTotals, setPreviousTotals] = useState({ lowStockCount: 0, expiringCouponsCount: 0, pendingPaymentsCount: 0 });
  const wrapperRef = useRef(null);

  const fetchAlerts = async (silent = true) => {
    if (!silent) setLoading(true);
    try {
      const res = await adminService.getAlerts();
      const next = res?.data || null;
      if (next) {
        // Detect new events by previous counts
        if (silent && previousTotals) {
          if (next.pendingPaymentsCount > previousTotals.pendingPaymentsCount) {
            showToast.info(`Có ${next.pendingPaymentsCount - previousTotals.pendingPaymentsCount} bill chuyển khoản chờ duyệt mới`);
          }
          if (next.expiringCouponsCount > previousTotals.expiringCouponsCount) {
            showToast.warning(`${next.expiringCouponsCount} mã giảm giá sắp hết hạn (≤7 ngày)`);
          }
        }
        setPreviousTotals({
          lowStockCount: next.lowStockCount,
          expiringCouponsCount: next.expiringCouponsCount,
          pendingPaymentsCount: next.pendingPaymentsCount
        });
        setAlerts(next);
      }
    } catch (err) {
      // Silent fail — alerts are best-effort
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchAlerts(false);
    const interval = setInterval(() => fetchAlerts(true), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (open && wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const totalAlerts = alerts
    ? alerts.lowStockCount + alerts.expiringCouponsCount + alerts.pendingPaymentsCount
    : 0;

  const badge = (n) => n > 99 ? '99+' : String(n);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Cảnh báo"
        className="relative p-2 rounded-none clip-path-rog bg-black border border-neutral-800 hover:border-red-600/40 text-neutral-300 transition"
      >
        <Bell className="w-5 h-5" />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge(totalAlerts)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 z-50 rounded-none clip-path-rog bg-black border border-neutral-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-white">Cảnh báo</h3>
              {totalAlerts > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  {totalAlerts}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchAlerts(false)}
              disabled={loading}
              className="p-1 rounded hover:bg-neutral-900 text-neutral-400 hover:text-red-400"
              aria-label="Làm mới"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {!alerts ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" /> : null}
                Đang tải...
              </div>
            ) : totalAlerts === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-600/10 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-emerald-300 font-semibold">Mọi thứ ổn!</p>
                <p className="text-xs text-slate-500">Không có cảnh báo nào.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {/* Section: Pending payments */}
                {alerts.pendingPaymentsCount > 0 && (
                  <Link
                    to="/admin/payments"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 p-4 hover:bg-neutral-900/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">Bill chuyển khoản chờ duyệt</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                          {alerts.pendingPaymentsCount}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">Vào trang Quản lý thanh toán để xét duyệt.</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-2" />
                  </Link>
                )}

                {/* Section: Low stock */}
                {alerts.lowStockCount > 0 && (
                  <Link
                    to="/admin/products"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-neutral-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/15 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">Sắp hết hàng</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                            {alerts.lowStockCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-12 space-y-1.5">
                      {alerts.lowStockProducts.slice(0, 3).map(p => (
                        <div key={p.id} className="flex items-center gap-2 text-xs">
                          <Package className="w-3 h-3 text-slate-500" />
                          <span className="text-neutral-300 truncate flex-1">{p.name}</span>
                          <span className="text-rose-300 font-bold">{p.stock}</span>
                        </div>
                      ))}
                      {alerts.lowStockCount > 3 && (
                        <p className="text-[10px] text-slate-500">+{alerts.lowStockCount - 3} sản phẩm khác</p>
                      )}
                    </div>
                  </Link>
                )}

                {/* Section: Expiring coupons */}
                {alerts.expiringCouponsCount > 0 && (
                  <Link
                    to="/admin/coupons"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-neutral-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-red-600/15 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">Mã giảm giá sắp hết hạn</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600/20 text-purple-300 font-bold">
                            {alerts.expiringCouponsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-12 space-y-1.5">
                      {alerts.expiringCoupons.slice(0, 3).map(c => (
                        <div key={c.id} className="flex items-center gap-2 text-xs">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span className="text-neutral-300 font-mono">{c.code}</span>
                          <span className="text-purple-300 font-bold">-{c.discount_percent}%</span>
                          <span className="ml-auto text-amber-300 text-[10px]">còn {c.days_left || 0} ngày</span>
                        </div>
                      ))}
                      {alerts.expiringCouponsCount > 3 && (
                        <p className="text-[10px] text-slate-500">+{alerts.expiringCouponsCount - 3} mã khác</p>
                      )}
                    </div>
                  </Link>
                )}

                {/* Optional: pending orders summary */}
                {alerts.pendingOrdersCount > 0 && (
                  <Link
                    to="/admin/orders"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 p-4 hover:bg-neutral-900/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-600/15 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">Đơn hàng cần xử lý</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-400 font-bold">
                          {alerts.pendingOrdersCount}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">Đơn đang chờ xác nhận hoặc đã xác nhận.</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-2" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-neutral-800 text-center text-[10px] text-slate-500">
            Cập nhật mỗi 30 giây
          </div>
        </div>
      )}
    </div>
  );
}
