import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  User, ShoppingBag, MapPin, Key, Package, Save, Plus, Trash2, ShieldCheck,
  MessageSquare, CheckCheck, Loader2, X, Eye, EyeOff, ChevronRight,
  Clock, Truck, CheckCircle, XCircle, RefreshCw, Edit3, ChevronDown, AlertCircle,
  Upload, XCircle as RejectIcon, Image as ImageIcon, CheckCircle as ApproveIcon, Tag, Copy, Gift,
  Box, TruckIcon, CreditCard, Search, FileWarning
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import authService from '../services/authService';
import orderService from '../services/orderService';
import couponService from '../services/couponService';
import locationService from '../services/locationService';
import paymentService from '../services/paymentService';
import showToast from '../utils/toast';
import { ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, PAYMENT_METHOD_LABELS, formatVND, formatDate, formatDateTime } from '../utils/theme';
import { resolveImage, getBackendUrl, onImageError } from '../utils/imageHelper';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = ORDER_STATUS_CONFIG;
const PAYMENT_LABEL = PAYMENT_METHOD_LABELS;
const TIMELINE_STEPS = ['pending', 'confirmed', 'packing', 'shipping', 'delivered'];
const PAYMENT_REQ_STATUS = PAYMENT_STATUS_CONFIG;

// Component: Upload/gửi lại bill cho đơn hàng BANK_TRANSFER
// ---------------------------------------------------------------------------
// Compact stat card (orders summary header)
// ---------------------------------------------------------------------------
function SummaryStat({ icon: Icon, label, value, color = 'cyan' }) {
  const colorMap = {
    cyan:    'from-red-600/15 to-red-600/0 border-red-600/30 text-red-400',
    amber:   'from-amber-500/15 to-amber-500/0 border-amber-500/30 text-amber-300',
    purple:  'from-red-600/15 to-red-600/0 border-red-600/30 text-purple-300',
    emerald: 'from-red-600/15 to-red-600/0 border-red-600/30 text-emerald-300',
    rose:    'from-rose-500/15 to-rose-500/0 border-rose-500/30 text-rose-300'
  };
  const cls = colorMap[color] || colorMap.cyan;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-none clip-path-rog p-3.5 flex items-center gap-3`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-none clip-path-rog bg-slate-950/40 border border-neutral-800 flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">{label}</p>
        <p className="text-xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination component — smart page numbers with ellipsis for large page counts
// ---------------------------------------------------------------------------
function Pagination({ currentPage, totalPages, onPageChange }) {
  // Tạo mảng số trang hiển thị: nếu totalPages ≤ 7 → hiện hết
  // Ngược lại: 1 ... [cur-1, cur, cur+1] ... totalPages
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set([1, totalPages]);
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i >= 2 && i <= totalPages - 1) pages.add(i);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
      result.push(sorted[i]);
    }
    return result;
  };

  const pageNumbers = getPageNumbers();
  const btnBase = "min-w-[36px] h-9 px-2 inline-flex items-center justify-center text-xs font-bold rounded-lg transition-colors";
  const btnIdle = "bg-neutral-900 hover:bg-slate-700 text-slate-200";
  const btnActive = "bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase shadow-md shadow-red-600/20";
  const btnDisabled = "bg-black text-slate-600 cursor-not-allowed";

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-4 select-none" aria-label="Phân trang đơn hàng">
      <button
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        className={`${btnBase} px-3 ${currentPage <= 1 ? btnDisabled : btnIdle}`}
        aria-label="Trang trước"
      >
        ‹ Trước
      </button>
      {pageNumbers.map((p, idx) =>
        p === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 text-xs">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
          >
            {p}
          </button>
        )
      )}
      <button
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        className={`${btnBase} px-3 ${currentPage >= totalPages ? btnDisabled : btnIdle}`}
        aria-label="Trang sau"
      >
        Sau ›
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Order card with product thumbnails + status timeline
// ---------------------------------------------------------------------------
function CustomerOrderCard({ order, onViewDetail, detailLoading, onCancelled }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const items = Array.isArray(order.items) ? order.items : [];
  const visibleItems = expanded ? items : items.slice(0, 3);
  const moreCount = items.length - visibleItems.length;
  const itemCount = items.length || Number(order.item_count) || 0;

  // Payment status badge
  const paymentInfo = order.payment_info || {
    status: order.bill_status,
    method: order.payment_method,
    bill_status: order.bill_status,
    bill_image_url: order.bill_image_url,
    admin_note: order.admin_note,
    payment_status: order.payment_status,
    paid_at: null
  };
  const isBankTransfer = (order.payment_method || '').toUpperCase() === 'BANK_TRANSFER';

  // Status timeline index
  const currentStepIdx = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog overflow-hidden transition-all hover:border-red-600/30">
      {/* Header row */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Mã đơn</span>
            <span className="text-base font-bold text-red-500">#{order.id}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.color}`}>
            <StatusIcon className="w-3 h-3" /> {cfg.label}
          </span>
          {paymentInfo?.bill_status && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              paymentInfo.bill_status === 'approved'
                ? 'bg-red-600/20 text-emerald-300 border-red-600/30'
                : paymentInfo.bill_status === 'rejected'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {paymentInfo.bill_status === 'approved' ? 'Đã duyệt'
                : paymentInfo.bill_status === 'rejected' ? 'Bị từ chối'
                : paymentInfo.bill_status === 'pending' ? 'Chờ duyệt'
                : paymentInfo.bill_status}
            </span>
          )}
          {!paymentInfo?.bill_status && paymentInfo?.payment_status && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              paymentInfo.payment_status === 'paid'
                ? 'bg-red-600/20 text-emerald-300 border-red-600/30'
                : paymentInfo.payment_status === 'cancelled'
                  ? 'bg-slate-700/40 text-neutral-400 border-slate-700'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {paymentInfo.payment_status === 'paid' ? 'Đã thanh toán'
                : paymentInfo.payment_status === 'pending' ? 'Chờ thanh toán'
                : paymentInfo.payment_status === 'cancelled' ? 'Đã hủy'
                : paymentInfo.payment_status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Tổng cộng</p>
            <p className="text-base sm:text-lg font-black text-red-500">{formatVND(order.final_amount)}</p>
          </div>
          <button
            onClick={onViewDetail}
            disabled={detailLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-600/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-600/20 transition-colors"
          >
            {detailLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Eye className="w-3.5 h-3.5" />}
            Chi tiết
          </button>
        </div>
      </div>

      {/* Date + payment method */}
      <div className="px-4 sm:px-5 py-2 flex items-center justify-between text-xs text-neutral-400 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Đặt ngày {formatDate(order.created_at)} {order.created_at && `• ${new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5" />
          <span>{PAYMENT_LABEL[order.payment_method] || order.payment_method}</span>
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && currentStepIdx >= 0 && (
        <div className="px-4 sm:px-5 py-3 border-b border-neutral-800 bg-black/30">
          <div className="flex items-center gap-1.5">
            {TIMELINE_STEPS.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const stepCfg = STATUS_CONFIG[step];
              const StepIcon = stepCfg.icon;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-red-600 text-white font-bold tracking-widest uppercase ring-4 ring-red-600/20 scale-110'
                          : isPast
                            ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                            : 'bg-neutral-900 text-slate-500 border border-slate-700'
                      }`}
                      title={stepCfg.label}
                    >
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-semibold text-center leading-tight hidden sm:block ${
                      isCurrent ? 'text-red-400' : isPast ? 'text-neutral-400' : 'text-slate-600'
                    }`}>
                      {stepCfg.short}
                    </span>
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all ${
                      idx < currentStepIdx ? 'bg-red-600/50' : 'bg-neutral-900'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="px-4 sm:px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex items-center gap-2 font-semibold">
          <XCircle className="w-4 h-4" /> Đơn hàng đã bị hủy
        </div>
      )}

      {/* Product items */}
      {items.length > 0 ? (
        <div className="p-4 sm:p-5 space-y-2.5">
          {visibleItems.map((item, idx) => (
            <div key={item.id || idx} className="flex items-center gap-3 p-2.5 rounded-none clip-path-rog bg-black/60 hover:bg-black transition-colors">
              <Link
                to={`/products/${item.product_id}`}
                className="flex-shrink-0 w-16 h-16 rounded-lg bg-neutral-900 border border-slate-700 overflow-hidden"
              >
                <img
                  src={item.product_image ? resolveImage(item.product_image) : '/images/fallback/no-image.svg'}
                  alt={item.product_name || 'Sản phẩm'}
                  className="w-full h-full object-cover"
                  onError={onImageError}
                  loading="lazy"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.product_id}`}
                  className="text-sm font-semibold text-white hover:text-red-400 line-clamp-2 transition-colors"
                  title={item.product_name}
                >
                  {item.product_name || `Sản phẩm #${item.product_id}`}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                  <span>Số lượng: <span className="text-red-400 font-bold">{item.quantity}</span></span>
                  <span className="text-slate-700">|</span>
                  <span>{formatVND(item.price)}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Thành tiền</p>
                <p className="text-sm font-bold text-red-500">{formatVND(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
          {moreCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-xs text-red-400 hover:text-cyan-200 font-semibold bg-red-600/5 hover:bg-red-600/10 rounded-none clip-path-rog transition-colors flex items-center justify-center gap-1.5"
            >
              {expanded ? (
                <>Thu gọn <ChevronDown className="w-3.5 h-3.5 rotate-180" /></>
              ) : (
                <>Xem thêm {moreCount} sản phẩm <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-slate-500 italic">
          Đang tải danh sách sản phẩm...
        </div>
      )}

      {/* Footer summary + cancel button */}
      <div className="px-4 sm:px-5 py-3 bg-slate-950/50 border-t border-neutral-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-neutral-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-red-500" />
            <span className="text-white font-bold">{itemCount}</span> sản phẩm
          </span>
          {(order.discount_amount > 0) && (
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-bold">-{formatVND(order.discount_amount)}</span>
            </span>
          )}
          {order.shipping_fee > 0 && (
            <span className="flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-red-500" />
              Ship: <span className="text-white">{formatVND(order.shipping_fee)}</span>
            </span>
          )}
        </div>
        {(order.status === 'pending' || order.status === 'confirmed') && (
          <CancelOrderButton orderId={order.id} onCancelled={onCancelled} />
        )}
      </div>
    </div>
  );
}

// Small inline cancel button with reason modal
function CancelOrderButton({ orderId, onCancelled }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preset, setPreset] = useState('');
  const [customReason, setCustomReason] = useState('');

  const presets = [
    'Đặt nhầm sản phẩm',
    'Tìm được giá tốt hơn ở nơi khác',
    'Thay đổi ý định / không còn nhu cầu',
    'Thời gian giao hàng quá lâu',
    'Sản phẩm không phù hợp',
    'Lý do khác'
  ];

  const handleCancel = async () => {
    const reason = preset === 'Lý do khác' ? customReason.trim() : preset;
    if (!reason) {
      showToast.error('Vui lòng chọn hoặc nhập lý do hủy');
      return;
    }
    setLoading(true);
    try {
      await api.put(`/orders/${orderId}/cancel`, { reason });
      showToast.success(`Đã hủy đơn hàng #${orderId}`);
      onCancelled?.();
      setShowModal(false);
      setPreset('');
      setCustomReason('');
    } catch (err) {
      console.error('[CancelOrder] Error:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Hủy đơn thất bại';
      const errCode = err?.response?.data?.code || err?.code;
      showToast.error(`Hủy đơn thất bại: ${errMsg}${errCode ? ` (${errCode})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-500/20 transition-colors disabled:opacity-50"
      >
        <XCircle className="w-3.5 h-3.5" /> Hủy đơn
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => !loading && setShowModal(false)}>
          <div className="bg-[#0a0a0a] border border-neutral-800 clip-path-rog max-w-md w-full p-8 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-black text-white uppercase tracking-wider leading-tight">Hủy đơn hàng #{orderId}</h3>
              <button onClick={() => setShowModal(false)} disabled={loading} className="text-neutral-500 hover:text-white disabled:opacity-50 mt-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Vui lòng chọn lý do hủy đơn hàng:</p>
            <div className="space-y-2 mt-4">
              {presets.map((p) => (
                <label key={p} className="flex items-center gap-3 p-3 rounded-none clip-path-rog hover:bg-neutral-900/80 cursor-pointer border border-transparent hover:border-rose-500/30 transition-all">
                  <input
                    type="radio"
                    name={`reason-${orderId}`}
                    value={p}
                    checked={preset === p}
                    onChange={(e) => setPreset(e.target.value)}
                    className="accent-rose-500 w-4 h-4"
                  />
                  <span className="text-sm font-bold text-slate-200 uppercase tracking-wide">{p}</span>
                </label>
              ))}
            </div>
            {preset === 'Lý do khác' && (
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="NHẬP LÝ DO CỤ THỂ CỦA BẠN..."
                rows={3}
                className="w-full mt-3 px-4 py-3 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm font-semibold text-slate-100 focus:outline-none focus:border-rose-500 placeholder-neutral-600 uppercase"
              />
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-neutral-900 text-slate-300 rounded-none clip-path-rog hover:bg-neutral-800 hover:text-white text-xs uppercase tracking-widest font-bold disabled:opacity-50 transition-colors border border-neutral-800"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={loading || !preset || (preset === 'Lý do khác' && !customReason.trim())}
                className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-none clip-path-rog hover:bg-rose-500 text-xs uppercase tracking-widest font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-rose-600/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ResendBillForm({ orderId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) { showToast.error('Chỉ chấp nhận ảnh JPG, PNG, WEBP'); return; }
    if (f.size > 5 * 1024 * 1024) { showToast.error('Kích thước tối đa 5MB'); return; }
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { showToast.error('Vui lòng chọn ảnh bill'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('order_id', orderId);
      fd.append('bill_image', file);
      await paymentService.resendBill(fd);
      showToast.success('Đã gửi bill mới! Admin sẽ kiểm tra sớm nhất.');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Gửi bill thất bại');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-[10px] text-neutral-400 font-semibold">Gửi lại bill thanh toán</p>
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-24 rounded-lg border border-red-600/30" />
          <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs">✕</button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-red-600/60 transition-colors">
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] text-neutral-400">Chọn ảnh bill</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        </label>
      )}
      <button type="submit" disabled={!file || uploading} className="w-full py-1.5 bg-amber-500 text-white font-bold tracking-widest uppercase text-xs font-bold rounded-lg hover:bg-amber-400 disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors">
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? 'Đang gửi...' : 'Gửi Bill Mới'}
      </button>
    </form>
  );
}

function OrderDetailModal({ order, onClose }) {
  if (!order) return null;
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const currentIdx = TIMELINE_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  // Derive bill-related status from new API fields:
  // - bill_status comes from payment_requests (pending/approved/rejected)
  // - payment_record_status comes from payments (pending/paid/cancelled/failed)
  const billStatus = order.bill_status || null;
  const recordStatus = order.payment_record_status || null;
  const isBillApproved = billStatus === 'approved' || recordStatus === 'paid';
  const isBillRejected = billStatus === 'rejected';
  const isBillPending = billStatus === 'pending' && !isBillApproved;
  const showBillSection = order.payment_method === 'BANK_TRANSFER' || order.payment_method === 'bank_transfer';

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Chi Tiết Đơn Hàng</h2>
            <p className="text-xs text-neutral-400">#{order.id} • {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-3 rounded-none clip-path-rog bg-black/80 border border-neutral-800">
          <StatusIcon className="w-5 h-5 text-red-500" />
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          <span className="ml-auto text-xs text-neutral-400">
            {new Date(order.created_at).toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="flex items-center gap-1">
            {TIMELINE_STEPS.map((step, idx) => {
              const cfg = STATUS_CONFIG[step];
              const StepIcon = cfg.icon;
              const done = idx <= currentIdx;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      done ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-black border-slate-700 text-slate-500'
                    }`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-semibold text-center leading-tight ${done ? 'text-red-400' : 'text-slate-600'}`}>
                      {cfg.label.split(' ')[0]}
                    </span>
                  </div>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 mx-1 rounded ${idx < currentIdx ? 'bg-red-600/60' : 'bg-neutral-900'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Order Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Người nhận</span>
            <p className="text-sm font-semibold text-white mt-0.5">{order.full_name || order.shipping_name || '—'}</p>
            <p className="text-xs text-neutral-400">{order.phone}</p>
          </div>
          <div className="p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Thanh Toán</span>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm font-semibold text-red-400">{PAYMENT_LABEL[order.payment_method] || order.payment_method}</p>
              {isBillApproved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-emerald-300 border border-red-600/30">
                  <ApproveIcon className="w-3 h-3" /> Đã xác nhận
                </span>
              )}
              {isBillRejected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <RejectIcon className="w-3 h-3" /> Bị từ chối
                </span>
              )}
              {isBillPending && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> Chờ duyệt
                </span>
              )}
              {!billStatus && recordStatus === 'paid' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-emerald-300 border border-red-600/30">
                  <ApproveIcon className="w-3 h-3" /> Đã thanh toán
                </span>
              )}
              {!billStatus && recordStatus === 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/40 text-neutral-300 border border-slate-700">
                  Đã hủy
                </span>
              )}
            </div>
            {order.admin_note && (
              <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] text-rose-300 font-semibold">Lý do từ chối:</p>
                <p className="text-xs text-rose-200 mt-0.5">{order.admin_note}</p>
              </div>
            )}
          </div>

          {/* Bill Image Section - for BANK_TRANSFER orders */}
          {showBillSection && (
            <div className="col-span-2 p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500">Ảnh Bill Thanh Toán</span>
                {billStatus && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    billStatus === 'approved'
                      ? 'bg-red-600/20 text-emerald-300 border-red-600/30'
                      : billStatus === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {billStatus === 'approved' ? 'Đã duyệt' : billStatus === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                  </span>
                )}
              </div>
              {order.bill_image_url ? (
                <div className="mt-2 space-y-2">
                  <div className="relative inline-block">
                    <img
                      src={getBackendUrl(order.bill_image_url)}
                      alt="Bill thanh toán"
                      className="max-w-full h-auto max-h-48 rounded-none clip-path-rog border border-slate-700 cursor-pointer hover:border-red-600 transition-colors"
                      onClick={() => window.open(getBackendUrl(order.bill_image_url), '_blank')}
                      onError={e => {
                        e.target.style.display = 'none';
                        const fb = e.target.parentElement.querySelector('[data-bill-fallback]');
                        if (fb) { fb.classList.remove('hidden'); fb.classList.add('flex'); }
                      }}
                    />
                    <div data-bill-fallback className="hidden flex-col items-center justify-center p-4 bg-amber-500/10 border border-amber-500/30 rounded-none clip-path-rog text-center min-h-[8rem]">
                      <FileWarning className="w-8 h-8 text-amber-400 mb-2" />
                      <p className="text-xs font-bold text-amber-300">Ảnh bill không thể hiển thị</p>
                      <p className="text-[10px] text-neutral-400 mt-1">File có thể đã bị lỗi. Vui lòng upload lại bill.</p>
                      <a href={getBackendUrl(order.bill_image_url)} target="_blank" rel="noreferrer" className="text-[10px] text-red-500 hover:underline mt-1">Mở trong tab mới</a>
                    </div>
                  </div>
                  {!isBillApproved && (
                    <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2">
                      <ResendBillForm orderId={order.id} onSuccess={() => onClose && onClose()} />
                    </div>
                  )}
                </div>
              ) : !isBillApproved ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-neutral-400">Chưa có ảnh bill. Vui lòng tải lên để xác nhận thanh toán.</p>
                  <ResendBillForm orderId={order.id} onSuccess={() => onClose && onClose()} />
                </div>
              ) : (
                <p className="text-xs text-emerald-300 mt-1">Bill thanh toán đã được xác nhận.</p>
              )}
            </div>
          )}
        </div>

        {/* Shipping Address */}
        <div className="p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
          <span className="text-[10px] uppercase font-bold text-slate-500">Địa chỉ giao hàng</span>
          <p className="text-sm text-slate-200 mt-0.5">{order.shipping_address || '—'}</p>
        </div>

        {/* Items */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500">Sản phẩm đã đặt ({items.length})</span>
          <div className="mt-2 divide-y divide-slate-800/60 rounded-none clip-path-rog border border-neutral-800 overflow-hidden">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-black/40">
                <img
                  src={resolveImage(item.product_image || item.image_url)}
                  alt={item.product_name || item.name}
                  className="w-14 h-14 rounded-none clip-path-rog object-cover bg-neutral-900"
                  onError={(e) => { e.currentTarget.src = getBackendUrl('/images/fallback/no-image.svg'); }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.product_name || item.name}</p>
                  <p className="text-xs text-neutral-400">Số lượng: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-500">{formatPrice(item.price * item.quantity)}</p>
                  <p className="text-[11px] text-slate-500">{formatPrice(item.price)} × {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Tạm tính</span>
            <span>{formatPrice(order.total_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-xs text-red-500 font-semibold">
              <span>Giảm giá</span>
              <span>-{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          {order.shipping_fee > 0 && (
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Phí vận chuyển</span>
              <span>{formatPrice(order.shipping_fee)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
            <span>Thành tiền</span>
            <span className="text-red-500">{formatPrice(order.final_amount)}</span>
          </div>
        </div>

        {order.notes && (
          <div className="p-3 rounded-none clip-path-rog bg-black/60 border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-slate-500">Ghi chú</span>
            <p className="text-xs text-neutral-300 mt-1">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AddressFormModal({ address, onSave, onClose, user }) {
  const [form, setForm] = useState({
    full_name: address?.full_name || user?.full_name || '',
    phone: address?.phone || user?.phone || '',
    address: address?.address || '',
    district_id: address?.district_id || '',
    ward_id: address?.ward_id || '',
    is_default: address?.is_default || false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    locationService.getDistricts()
      .then(res => {
        setDistricts(res?.data?.data || res?.data || []);
        if (address?.district_id) {
          setForm(prev => ({ ...prev, district_id: address.district_id }));
          locationService.getWards(address.district_id)
            .then(r => { setWards(r?.data?.data || r?.data || []); setForm(prev => ({ ...prev, ward_id: address.ward_id || '' })); })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLocations(false));
  }, [address?.district_id]);

  useEffect(() => {
    if (form.district_id) {
      locationService.getWards(form.district_id)
        .then(res => setWards(res?.data?.data || res?.data || []))
        .catch(() => setWards([]));
    } else {
      setWards([]);
    }
    setForm(prev => ({ ...prev, ward_id: '' }));
  }, [form.district_id]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Vui lòng nhập tên';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập SĐT';
    else if (!/^[0-9]{10,11}$/.test(form.phone.trim())) e.phone = 'SĐT 10-11 số';
    if (!form.district_id) e.district_id = 'Chọn Quận/Huyện';
    if (!form.ward_id) e.ward_id = 'Chọn Phường/Xã';
    if (!form.address.trim()) e.address = 'Nhập địa chỉ';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      // Convert to numbers before sending
      const payload = {
        ...form,
        district_id: form.district_id ? Number(form.district_id) : null,
        ward_id: form.ward_id ? Number(form.ward_id) : null
      };
      await onSave(payload);
    } finally { setLoading(false); }
  };

  const field = (name, label, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-neutral-400 mb-1">{label}</label>
      <input
        type={type} value={form[name]}
        onChange={e => { setForm({ ...form, [name]: e.target.value }); setErrors({ ...errors, [name]: '' }); }}
        placeholder={placeholder}
        className={`w-full px-3 py-2.5 bg-slate-950 border rounded-none clip-path-rog text-xs text-slate-100 focus:outline-none focus:border-red-600 ${errors[name] ? 'border-rose-500' : 'border-neutral-800'}`}
      />
      {errors[name] && <p className="text-[10px] text-rose-400 mt-0.5">{errors[name]}</p>}
    </div>
  );

  const selectField = (name, label, options, placeholder, errKey) => (
    <div>
      <label className="block text-xs font-semibold text-neutral-400 mb-1">{label}</label>
      <div className="relative">
        <select
          value={form[name]}
          onChange={e => { setForm({ ...form, [name]: e.target.value }); setErrors({ ...errors, [errKey || name]: '' }); }}
          disabled={name === 'ward_id' && !form.district_id}
          className={`w-full px-3 py-2.5 bg-slate-950 border rounded-none clip-path-rog text-xs text-slate-100 focus:outline-none focus:border-red-600 appearance-none pr-8 ${errors[errKey || name] ? 'border-rose-500' : 'border-neutral-800'} ${name === 'ward_id' && !form.district_id ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>
      {errors[errKey || name] && <p className="text-[10px] text-rose-400 mt-0.5">{errors[errKey || name]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {address?.id ? 'Chỉnh Sửa Địa Chỉ' : 'Thêm Địa Chỉ Mới'}
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {field('full_name', 'Tên người nhận', 'text', 'Nguyễn Văn A')}
          {field('phone', 'Số điện thoại', 'tel', '0912 345 678')}
          {loadingLocations ? (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải khu vực...
            </div>
          ) : (
            <>
              {selectField('district_id', 'Quận / Huyện', districts, '— Chọn Quận/Huyện —', 'district_id')}
              {selectField('ward_id', 'Phường / Xã', wards, '— Chọn Phường/Xã —', 'ward_id')}
            </>
          )}
          {field('address', 'Địa chỉ chi tiết (số nhà, đường)', 'text', 'VD: 123 Nguyễn Huệ')}
          <div className="p-2.5 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-300">Giao trong <strong>TP. Huế và vùng ngoại vi 10km</strong>. Ngoài khu vực, <a href="/contact" className="underline font-semibold">liên hệ hỗ trợ</a>.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="accent-red-600 w-4 h-4" />
            <span className="text-xs text-neutral-300 font-semibold">Đặt làm địa chỉ mặc định</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-neutral-900 text-neutral-300 rounded-none clip-path-rog text-xs font-semibold hover:bg-slate-700">Hủy</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Lưu Địa Chỉ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // Default tab is orders
  const [orderList, setOrderList] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressModal, setAddressModal] = useState(null); // null = closed, {id} = edit, {} = add

  // Orders filter and search
  const [orderFilter, setOrderFilter] = useState('all'); // all, pending, confirmed, packing, shipping, delivered, cancelled
  const [orderSearch, setOrderSearch] = useState('');

  // Profile
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password
  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  // Orders pagination
  const [orderPage, setOrderPage] = useState(1);
  const [orderLimit] = useState(10);
  const [orderPagination, setOrderPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });

  const formatPrice = formatVND;

  // Fetch orders with pagination
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await orderService.getMyOrders({ page: orderPage, limit: orderLimit });
      const payload = res?.data || res || {};
      // Backend trả về { success, data: [...orders], pagination: {...} }
      setOrderList(Array.isArray(payload) ? payload : (payload.data || payload.orders || []));
      if (payload.pagination) {
        // Chuẩn hoá về format currentPage/totalPages/totalItems
        const p = payload.pagination;
        setOrderPagination({
          currentPage: p.currentPage || p.page || 1,
          totalPages:   p.totalPages   || p.pages || 1,
          totalItems:   p.totalItems   || p.total || 0
        });
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderPage, orderLimit]);

  // Filtered orders based on search and status filter
  const filteredOrders = orderList.filter(order => {
    // Search filter (by order ID)
    const matchesSearch = orderSearch === '' ||
      String(order.id).toLowerCase().includes(orderSearch.toLowerCase());
    // Status filter
    const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
    return matchesSearch && matchesStatus;
  });

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await api.get('/addresses');
      setAddresses(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  // Fetch available coupons (public coupons visible to all customers)
  const fetchCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const res = await couponService.getAvailable();
      setCoupons(res?.data?.coupons || res?.coupons || []);
    } catch (err) {
      console.error('Failed to load coupons:', err);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  // Reset orderPage khi đổi filter
  useEffect(() => {
    setOrderPage(1);
  }, [orderFilter, orderSearch]);

  // Tab effects
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'addresses') fetchAddresses();
    if (activeTab === 'coupons') fetchCoupons();
  }, [activeTab, fetchOrders, fetchAddresses, fetchCoupons]);

  // Load order detail
  const handleViewOrder = async (orderId) => {
    setOrderDetailLoading(true);
    setSelectedOrderId(orderId);
    try {
      const res = await orderService.getOrderById(orderId);
      setSelectedOrder(res?.data || res);
    } catch (err) {
      showToast.error('Không thể tải chi tiết đơn hàng');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  // Save profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSaved(false);
    try {
      await api.put('/auth/update-profile', {
        full_name: profileData.full_name,
        phone: profileData.phone
      });
      setProfileSaved(true);
      showToast.success('Đã lưu thông tin cá nhân!');
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }
    // Password strength validation: uppercase, lowercase, number, special char
    const pwd = passwordForm.newPassword;
    if (!/[A-Z]/.test(pwd)) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z).' });
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 chữ cái thường (a-z).' });
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9).' });
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...).' });
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      // Auto logout after success
      setTimeout(() => {
        authService.logout();
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err?.response?.data?.message || 'Đổi mật khẩu thất bại.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Add / Edit address
  const handleSaveAddress = async (formData) => {
    try {
      if (addressModal?.id) {
        await api.put(`/addresses/${addressModal.id}`, formData);
        showToast.success('Đã cập nhật địa chỉ!');
      } else {
        await api.post('/addresses', formData);
        showToast.success('Đã thêm địa chỉ mới!');
      }
      setAddressModal(null);
      fetchAddresses();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Lưu địa chỉ thất bại');
      throw err;
    }
  };

  // Delete address
  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await api.delete(`/addresses/${addrId}`);
      showToast.success('Đã xóa địa chỉ');
      fetchAddresses();
    } catch (err) {
      showToast.error('Xóa thất bại');
    }
  };

  // Set default address
  const handleSetDefault = async (addrId) => {
    try {
      await api.put(`/addresses/${addrId}/set-default`);
      showToast.success('Đã đặt làm địa chỉ mặc định');
      fetchAddresses();
    } catch (err) {
      showToast.error('Cập nhật thất bại');
    }
  };

  const PassInput = ({ name, label, value, onChange }) => (
    <div>
      <label className="block text-xs font-semibold text-neutral-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={showPass[name] ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 pr-10"
        />
        <button type="button" onClick={() => setShowPass({ ...showPass, [name]: !showPass[name] })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-500">
          {showPass[name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 relative overflow-hidden">
      {/* Họa tiết ROG Dark Tech Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      {/* Đường chéo ánh sáng ROG */}
      <div className="absolute -bottom-[20%] left-[-10%] w-[50%] h-[150%] bg-gradient-to-r from-red-600/5 via-red-600/5 to-transparent transform skew-x-[25deg] pointer-events-none z-0 border-r-[2px] border-red-500/20 shadow-[10px_0_30px_rgba(255,0,41,0.1)]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <User className="w-7 h-7 text-red-500" />
            Tài Khoản Của Tôi
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            {user?.full_name} • {user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-3">
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-3 space-y-1 sticky top-4">
            {[
              { key: 'orders',    label: 'Lịch Sử Đơn Hàng', icon: ShoppingBag, badge: orderList.length },
              { key: 'coupons',   label: 'Mã Giảm Giá',      icon: Tag,        badge: coupons.length },
              { key: 'addresses', label: 'Sổ Địa Chỉ',       icon: MapPin,      badge: addresses.length },
              { key: 'profile',   label: 'Hồ Sơ Cá Nhân',    icon: User,        badge: null },
              { key: 'security',  label: 'Đổi Mật Khẩu',     icon: Key,         badge: null }
            ].map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-none clip-path-rog text-sm font-semibold transition-all ${
                  activeTab === key
                    ? 'bg-red-600 text-white font-bold tracking-widest uppercase font-bold shadow-lg shadow-red-600/20'
                    : 'text-neutral-300 hover:bg-black'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{label}</span>
                </span>
                {badge !== null && badge > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === key ? 'bg-slate-950/30 text-white font-bold tracking-widest uppercase' : 'bg-neutral-900 text-neutral-400'}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">

          {/* ======= COUPONS TAB ======= */}
          {activeTab === 'coupons' && (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 space-y-5">
              <div className="border-b border-neutral-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-400" /> Mã Giảm Giá
                </h2>
                <p className="text-xs text-neutral-400 mt-1">Sao chép mã và dùng khi đặt hàng</p>
              </div>

              {couponsLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" /></div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-black/50 rounded-none clip-path-rog border border-neutral-800">
                  <Gift className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-neutral-400 font-semibold">Hiện không có mã giảm giá nào khả dụng.</p>
                  <p className="text-xs text-slate-500">Hãy quay lại sau để cập nhật mới!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map((coupon) => {
                    const remaining = (coupon.remaining_uses !== undefined ? coupon.remaining_uses : (coupon.max_uses || 0) - (coupon.used_count || 0));
                    const isExpired = coupon.valid_to && new Date(coupon.valid_to) < new Date();
                    const isValid = !isExpired && (coupon.is_active !== false);
                    
                    return (
                      <div
                        key={coupon.id}
                        className={`relative p-5 rounded-none clip-path-rog bg-gradient-to-br from-amber-500/10 to-red-600/5 border border-amber-500/20 space-y-3 overflow-hidden ${!isValid ? 'opacity-50' : ''}`}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-14 h-14 rounded-none clip-path-rog bg-amber-500/20 border border-amber-500/30">
                            <span className="text-xl font-black text-amber-400">-{coupon.discount_percent}%</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-neutral-400 font-semibold">MÃ GIẢM GIÁ</p>
                              {!isValid && (
                                <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] font-bold rounded">HẾT HẠN</span>
                              )}
                            </div>
                            <p className="font-bold text-white text-lg">{coupon.code}</p>
                            {coupon.description && (
                              <p className="text-xs text-neutral-400 line-clamp-1">{coupon.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-neutral-400">
                          {coupon.min_order_amount > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              Đơn tối thiểu {formatPrice(coupon.min_order_amount)}
                            </div>
                          )}
                          {coupon.max_discount > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              Giảm tối đa {formatPrice(coupon.max_discount)}
                            </div>
                          )}
                          {coupon.usage_per_user != null && coupon.usage_per_user > 0 && (
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${(() => {
                                const limit = coupon.usage_per_user;
                                const used = coupon.user_used_count || 0;
                                const remaining = Math.max(0, limit - used);
                                return remaining > 0 ? 'bg-red-500' : 'bg-rose-400';
                              })()} `} />
                              {(() => {
                                const limit = coupon.usage_per_user;
                                const used = coupon.user_used_count || 0;
                                const remaining = Math.max(0, limit - used);
                                return remaining > 0
                                  ? <span className="text-purple-300">Bạn còn được dùng <strong>{remaining}</strong>/{limit} lần</span>
                                  : <span className="text-rose-400 line-through">Đã dùng hết ({used}/{limit} lần)</span>;
                              })()}
                            </div>
                          )}
                          {coupon.max_uses > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                              <span className="text-neutral-400">
                                Còn <strong className="text-amber-300">{coupon.remaining_uses !== undefined ? coupon.remaining_uses : (coupon.max_uses - (coupon.used_count || 0))}</strong>/{coupon.max_uses} lượt tổng
                                {coupon.max_reachable_users && coupon.max_reachable_users > 0 ? (
                                  <span className="text-slate-500"> · ≈ {coupon.max_reachable_users} người dùng được</span>
                                ) : null}
                              </span>
                            </div>
                          )}
                          {coupon.has_unused_slots && coupon.max_reachable_users && coupon.max_reachable_users > 0 && (
                            <div className="text-[10px] text-amber-400/80 mt-0.5">
                              ⚠ Còn lượt không user nào dùng (max_uses không chia hết cho usage_per_user)
                            </div>
                          )}
                          {coupon.valid_to && (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                              {isExpired ? 'Đã hết hạn' : `Hết hạn: ${new Date(coupon.valid_to).toLocaleDateString('vi-VN')}`}
                            </div>
                          )}
                        </div>

                        {isValid && (() => {
                          const limit = coupon.usage_per_user;
                          const used = coupon.user_used_count || 0;
                          const remaining = limit != null ? Math.max(0, limit - used) : 999;
                          return remaining > 0 ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(coupon.code).then(() => {
                                    showToast.success(`Đã sao chép mã ${coupon.code}!`);
                                  });
                                }}
                                className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold rounded-none clip-path-rog text-xs flex items-center justify-center gap-2 transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" /> Sao Chép
                              </button>
                              <Link
                                to="/checkout"
                                className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 font-bold rounded-none clip-path-rog text-xs flex items-center justify-center gap-2 transition-colors"
                              >
                                Dùng Ngay
                              </Link>
                            </div>
                          ) : (
                            <div className="py-2 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-none clip-path-rog">
                              Bạn đã dùng hết lượt sử dụng mã này
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-4 rounded-none clip-path-rog bg-black/50 border border-neutral-800">
                <p className="text-xs text-neutral-400 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                  <span>Nhập mã giảm giá tại bước thanh toán để được giảm giá. Mỗi mã chỉ áp dụng cho một đơn hàng.</span>
                </p>
              </div>
            </div>
          )}

          {/* ======= ORDERS TAB ======= */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              {/* Header gọn gàng: tiêu đề + tổng quan 1 dòng + search/filter */}
              <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none clip-path-rog bg-red-600/15 border border-red-600/30 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">Lịch Sử Đơn Hàng</h2>
                      <p className="text-[11px] text-slate-500">
                        Tổng <strong className="text-neutral-300">{orderPagination.totalItems || orderList.length}</strong> đơn
                        {orderPagination.totalPages > 1 && (
                          <> · Trang <strong className="text-neutral-300">{orderPage}</strong>/{orderPagination.totalPages}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Tìm theo mã đơn hàng..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                    <div className="relative min-w-[160px]">
                      <select
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value)}
                        className="w-full pl-3 pr-9 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 appearance-none cursor-pointer"
                      >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="packing">Đang đóng gói</option>
                        <option value="shipping">Đang vận chuyển</option>
                        <option value="delivered">Giao thành công</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
              </div>

              {/* Order cards */}
              {ordersLoading ? (
                <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500 mb-2" />
                  <p className="text-xs text-slate-500">Đang tải đơn hàng...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                orderList.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-12 text-center space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-900/60 flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-neutral-300 font-bold text-lg">Bạn chưa có đơn hàng nào.</p>
                    <p className="text-xs text-slate-500">Hãy khám phá các sản phẩm hấp dẫn của chúng tôi!</p>
                    <a href="/products" className="inline-block px-6 py-2.5 bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs hover:shadow-lg hover:shadow-red-600/25 transition-all">
                      Khám Phá Sản Phẩm
                    </a>
                  </div>
                ) : (
                  <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-12 text-center space-y-3">
                    <div className="w-20 h-20 mx-auto rounded-full bg-neutral-900/60 flex items-center justify-center">
                      <X className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-neutral-300 font-bold text-lg">Không tìm thấy đơn hàng nào.</p>
                    <button
                      onClick={() => { setOrderSearch(''); setOrderFilter('all'); }}
                      className="inline-block px-5 py-2.5 bg-neutral-900 text-neutral-300 font-semibold rounded-none clip-path-rog text-xs hover:bg-slate-700"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => (
                    <CustomerOrderCard
                      key={ord.id}
                      order={ord}
                      onViewDetail={() => handleViewOrder(ord.id)}
                      detailLoading={orderDetailLoading && selectedOrderId === ord.id}
                      onCancelled={() => fetchOrders()}
                    />
                  ))}

                  {/* Pagination */}
                  {orderPagination.totalPages > 1 && (
                    <Pagination
                      currentPage={orderPage}
                      totalPages={orderPagination.totalPages}
                      onPageChange={setOrderPage}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======= ADDRESSES TAB ======= */}
          {activeTab === 'addresses' && (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" /> Sổ Địa Chỉ Giao Hàng
                </h2>
                <button
                  onClick={() => setAddressModal({})}
                  className="px-4 py-2 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs flex items-center gap-1.5 hover:bg-red-500"
                >
                  <Plus className="w-4 h-4" /> Thêm Địa Chỉ
                </button>
              </div>

              {addressesLoading ? (
                <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" /></div>
              ) : addresses.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-black/50 rounded-none clip-path-rog border border-neutral-800">
                  <MapPin className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-neutral-400 font-semibold">Chưa có địa chỉ giao hàng nào.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className={`p-5 rounded-none clip-path-rog bg-black/70 border space-y-2 relative ${
                      addr.is_default ? 'border-red-600/40' : 'border-neutral-800'
                    }`}>
                      {addr.is_default && (
                        <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-red-600/20 text-red-400 text-[10px] font-bold rounded-full border border-red-600/30">
                          Mặc Định
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{addr.full_name}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setAddressModal(addr)}
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-neutral-900 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-neutral-900 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-300 font-semibold">{addr.phone}</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {addr.address}{addr.ward_name ? `, ${addr.ward_name}` : ''}{addr.district_name ? `, ${addr.district_name}` : ''}{addr.city ? `, ${addr.city}` : ''}
                      </p>
                      {addr.is_default ? null : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[10px] text-red-500 hover:underline font-semibold"
                        >
                          Đặt làm mặc định
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ======= PROFILE TAB ======= */}
          {activeTab === 'profile' && (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-red-500" /> Thông Tin Cá Nhân
              </h2>

              {profileSaved && (
                <div className="p-3 bg-red-600/10 border border-red-600/30 text-emerald-300 rounded-none clip-path-rog text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Đã lưu thay đổi hồ sơ thành công!
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Họ và Tên</label>
                  <input
                    type="text" required
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Email</label>
                  <input
                    type="email" disabled
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-neutral-800/60 rounded-none clip-path-rog text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Số điện thoại</label>
                  <input
                    type="tel" required
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                  />
                </div>
                <button
                  type="submit" disabled={profileLoading}
                  className="px-6 py-3 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog hover:bg-red-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu Thay Đổi
                </button>
              </form>
            </div>
          )}

          {/* ======= SECURITY TAB ======= */}
          {activeTab === 'security' && (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-neutral-800 pb-3 flex items-center gap-2">
                <Key className="w-5 h-5 text-red-500" /> Đổi Mật Khẩu
              </h2>

              {passwordMsg.text && (
                <div className={`p-3 rounded-none clip-path-rog text-xs font-semibold flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-red-600/10 text-emerald-300 border border-red-600/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <PassInput
                  name="old"
                  label="Mật khẩu hiện tại"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                />
                <PassInput
                  name="new"
                  label="Mật khẩu mới (tối thiểu 8 ký tự)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                />
                <PassInput
                  name="confirm"
                  label="Xác nhận mật khẩu mới"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
                <button
                  type="submit" disabled={passwordLoading}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Cập Nhật Mật Khẩu
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
      {addressModal !== null && (
        <AddressFormModal
          address={addressModal?.id ? addressModal : null}
          onSave={handleSaveAddress}
          onClose={() => setAddressModal(null)}
          user={user}
        />
      )}
      </div>
    </div>
  );
}
