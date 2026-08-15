import React, { useState, useEffect } from 'react';
import {
  QrCode, Save, Upload, Image as ImageIcon, Loader2,
  CheckCircle, X, Eye, CreditCard, Info, XCircle, CheckCheck,
  ZoomIn, User, Phone, Mail, Calendar, Hash, Wallet, MessageSquare, Download, FileWarning
} from 'lucide-react';
import { adminPaymentService } from '../../services/paymentService';
import showToast from '../../utils/toast';
import { getBackendUrl } from '../../utils/imageHelper';

export default function AdminPayments() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'settings'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [detailRequest, setDetailRequest] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { id, order_id }

  // Settings state
  const [settings, setSettings] = useState({
    bank_name: 'MBBank',
    account_number: '',
    account_holder: '',
    account_content: '',
    instructions: ''
  });
  const [qrPreview, setQrPreview] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);

  // Load requests
  const loadRequests = async (statusFilter = filterStatus, pageNum = page) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await adminPaymentService.getRequests(params);
      setRequests(res?.data || []);
      setTotalPages(res?.pagination?.pages || 1);
      setPendingCount(res?.pendingCount || 0);
    } catch (err) {
      showToast.error('Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  // Load settings
  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await adminPaymentService.getSettings();
      const data = res?.data;
      if (data) {
        setSettings({
          bank_name: data.bank_name || 'MBBank',
          account_number: data.account_number || '',
          account_holder: data.account_holder || '',
          account_content: data.account_content || '',
          instructions: data.instructions || ''
        });
        if (data.qr_image_url) setQrPreview(data.qr_image_url);
      }
    } catch (err) {
      console.error('Load settings error:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') loadRequests();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'requests') loadRequests(filterStatus, page);
  }, [filterStatus, page, limit]);

  // Approve
  const handleApprove = async (id) => {
    if (!window.confirm('Xác nhận duyệt thanh toán này?')) return;
    try {
      await adminPaymentService.approve(id);
      showToast.success('Đã duyệt thanh toán!');
      loadRequests();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Duyệt thất bại');
    }
  };

  // Reject
  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await adminPaymentService.reject(rejectModal.id, rejectModal.reason);
      showToast.success('Đã từ chối. Email thông báo đã gửi đến khách hàng.');
      setRejectModal(null);
      loadRequests();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Từ chối thất bại');
    }
  };

  // Save settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settings.account_number || !settings.account_holder) {
      showToast.error('Vui lòng điền đầy đủ thông tin tài khoản.');
      return;
    }
    const formData = new FormData();
    formData.append('bank_name', settings.bank_name);
    formData.append('account_number', settings.account_number);
    formData.append('account_holder', settings.account_holder);
    formData.append('account_content', settings.account_content || '');
    formData.append('instructions', settings.instructions || '');
    if (settings.qrFile) formData.append('qr_image', settings.qrFile);

    setSettingsLoading(true);
    try {
      await adminPaymentService.updateSettings(formData);
      showToast.success('Đã lưu cài đặt thanh toán!');
      loadSettings();
    } catch (err) {
      showToast.error(err?.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSettingsLoading(false);
    }
  };

  const STATUS_CONFIG = {
    pending:   { label: 'Chờ duyệt',   color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   icon: Loader2 },
    approved:  { label: 'Đã duyệt',    color: 'bg-red-600/20 text-emerald-300 border-red-600/30', icon: CheckCircle },
    rejected:  { label: 'Từ chối',     color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',    icon: XCircle }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-black/80 rounded-none clip-path-rog border border-neutral-800 w-fit">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'requests'
              ? 'bg-red-600 text-white font-bold tracking-widest uppercase'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Yêu Cầu Thanh Toán
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-red-600 text-white font-bold tracking-widest uppercase'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Cài Đặt QR
        </button>
      </div>

      {/* ===== REQUESTS TAB ===== */}
      {activeTab === 'requests' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-400 font-semibold">Lọc:</span>
            {['all', 'pending', 'approved', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterStatus === s
                    ? 'bg-red-600/20 text-red-400 border border-red-600/40'
                    : 'bg-black text-neutral-400 border border-neutral-800 hover:border-slate-700'
                }`}
              >
                {s === 'all' ? 'Tất cả' : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" /></div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-black/50 rounded-none clip-path-rog border border-neutral-800">
              <CreditCard className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-neutral-400 font-semibold">Chưa có yêu cầu thanh toán nào.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {requests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  const billUrl = req.bill_image_url ? (req.bill_image_url.startsWith('data:') ? req.bill_image_url : getBackendUrl(req.bill_image_url)) : null;
                  return (
                    <div
                      key={req.id}
                      className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog overflow-hidden hover:border-red-600/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Bill thumbnail - click to open full preview */}
                        <div className="relative sm:w-44 flex-shrink-0 bg-black/80 border-r border-neutral-800">
                          {billUrl ? (
                            <button
                              onClick={() => setPreviewImage(billUrl)}
                              className="group relative w-full h-44 sm:h-full block"
                              title="Click để xem ảnh lớn"
                            >
                              <img
                                src={billUrl}
                                alt="Bill thanh toán"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement.querySelector('[data-fallback]')?.classList.remove('hidden');
                                  e.currentTarget.parentElement.querySelector('[data-fallback]')?.classList.add('flex');
                                }}
                              />
                              <div data-fallback className="hidden absolute inset-0 flex-col items-center justify-center text-center p-3 text-slate-500 bg-black">
                                <FileWarning className="w-10 h-10 mb-1 text-amber-400" />
                                <span className="text-[10px] font-bold text-amber-300">File không đúng định dạng</span>
                                <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">Click để tải file gốc<br />& liên hệ khách gửi lại</span>
                                <a
                                  href={billUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-1.5 flex items-center gap-1 px-2 py-1 bg-neutral-900 hover:bg-slate-700 text-red-500 rounded text-[10px] font-bold"
                                >
                                  <Download className="w-3 h-3" /> Tải file
                                </a>
                              </div>
                              <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg text-xs font-bold">
                                  <ZoomIn className="w-3.5 h-3.5" /> Xem ảnh lớn
                                </span>
                              </div>
                            </button>
                          ) : (
                            <div className="w-full h-44 sm:h-full flex flex-col items-center justify-center text-slate-600 p-3">
                              <ImageIcon className="w-10 h-10 mb-1" />
                              <span className="text-[10px] text-slate-500">Chưa có ảnh bill</span>
                            </div>
                          )}
                        </div>

                        {/* Info + actions */}
                        <div className="flex-1 p-4 space-y-3 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-red-500 font-bold text-sm">#{req.order_id}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                                  <StatusIcon className="w-3 h-3" />
                                  {cfg.label}
                                </span>
                              </div>
                              <div className="font-bold text-white text-sm truncate">{req.customer_name}</div>
                              <div className="text-[11px] text-slate-500 truncate">{req.customer_email}</div>
                            </div>
                            <button
                              onClick={() => setDetailRequest(req)}
                              className="p-1.5 bg-neutral-900 border border-slate-700 rounded-lg text-neutral-400 hover:text-red-500 hover:border-red-600/40 transition-colors flex-shrink-0"
                              title="Xem chi tiết"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-neutral-400">
                              <Wallet className="w-3 h-3 text-red-500" />
                              <span className="font-bold text-red-400">{formatPrice(req.amount)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-neutral-400">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{new Date(req.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                          </div>

                          {req.status === 'rejected' && req.admin_note && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                              <p className="text-[10px] text-rose-300 line-clamp-2" title={req.admin_note}>
                                <span className="font-bold">Lý do:</span> {req.admin_note}
                              </p>
                            </div>
                          )}

                          {req.status === 'pending' && (
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/15 border border-red-600/40 rounded-lg text-emerald-300 hover:bg-red-600/25 text-xs font-bold transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                              </button>
                              <button
                                onClick={() => setRejectModal({ id: req.id, order_id: req.order_id, reason: '' })}
                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-500/15 border border-rose-500/40 rounded-lg text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Từ chối
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 0 && (
                <div className="flex items-center justify-center gap-3">
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 bg-black border border-neutral-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600 cursor-pointer"
                  >
                    {[10, 20, 50, 100].map(n => (
                      <option key={n} value={n}>{n} / trang</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 bg-black border border-neutral-800 rounded-lg text-sm text-neutral-400 disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="text-sm text-neutral-400">Trang {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 bg-black border border-neutral-800 rounded-lg text-sm text-neutral-400 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl">
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-500" />
                Cài Đặt Thanh Toán QR
              </h2>
              <p className="text-sm text-neutral-400 mt-1">Cấu hình thông tin tài khoản ngân hàng và mã QR để khách hàng thanh toán.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Bank info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Tên ngân hàng</label>
                  <input
                    type="text"
                    value={settings.bank_name}
                    onChange={e => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    required
                    value={settings.account_number}
                    onChange={e => setSettings({ ...settings, account_number: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    required
                    value={settings.account_holder}
                    onChange={e => setSettings({ ...settings, account_holder: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">Nội dung chuyển khoản (tùy chọn)</label>
                  <input
                    type="text"
                    value={settings.account_content}
                    onChange={e => setSettings({ ...settings, account_content: e.target.value })}
                    placeholder="VD: [SĐT] hoặc mã đơn hàng"
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* QR Image */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2">Ảnh Mã QR</label>
                <div className="flex items-start gap-4">
                  {qrPreview && (
                    <div className="relative">
                      <img
                        src={qrPreview.startsWith('data:') ? qrPreview : getBackendUrl(qrPreview)}
                        alt="QR Code"
                        className="w-32 h-32 rounded-none clip-path-rog object-cover bg-white border border-slate-700"
                        onError={e => { e.target.src = ''; setQrPreview(null); }}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-3 bg-black border border-dashed border-slate-700 rounded-none clip-path-rog cursor-pointer hover:border-red-600/60 transition-colors">
                      <Upload className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-neutral-400">
                        {settings.qrFile ? settings.qrFile.name : 'Tải lên ảnh QR mới (JPG, PNG, WEBP, tối đa 5MB)'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            setSettings({ ...settings, qrFile: file });
                            const reader = new FileReader();
                            reader.onload = ev => setQrPreview(ev.target.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">JPG, PNG, WEBP - Tối đa 5MB. Nếu không tải lên, hệ thống sẽ dùng ảnh hiện có.</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1">Hướng dẫn thanh toán (tùy chọn)</label>
                <textarea
                  rows="3"
                  value={settings.instructions}
                  onChange={e => setSettings({ ...settings, instructions: e.target.value })}
                  placeholder="VD: Quý khách vui lòng chuyển khoản đúng số tiền và ghi nội dung chuyển khoản..."
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu Cài Đặt
              </button>
            </form>
          </div>

          {/* Preview */}
          {settings.account_number && (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 space-y-4 mt-6">
              <h3 className="text-sm font-bold text-neutral-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Xem trước thông tin hiển thị cho khách
              </h3>
              <div className="flex items-center gap-4 p-4 rounded-none clip-path-rog bg-white/5 border border-neutral-800">
                {qrPreview && (
                  <img src={qrPreview.startsWith('data:') ? qrPreview : getBackendUrl(qrPreview)} alt="QR" className="w-24 h-24 rounded-none clip-path-rog object-cover bg-white" />
                )}
                <div className="space-y-1 text-sm">
                  <div className="font-bold text-white">{settings.bank_name}</div>
                  <div className="text-neutral-300 font-mono">{settings.account_number}</div>
                  <div className="text-neutral-300">{settings.account_holder}</div>
                  {settings.account_content && (
                    <div className="text-neutral-400 text-xs">Nội dung: {settings.account_content}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal - Full size bill */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-9 h-9 bg-neutral-900 border border-slate-700 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-slate-700 z-10 shadow-xl"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage.startsWith('data:') ? previewImage : getBackendUrl(previewImage)}
              alt="Bill Preview"
              className="w-full max-h-[85vh] object-contain rounded-none clip-path-rog border border-slate-700 shadow-2xl bg-black"
              onError={e => { e.target.src = ''; setPreviewImage(null); }}
            />
            <p className="text-center text-xs text-neutral-400 mt-3 flex items-center justify-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Ảnh bill thanh toán của khách hàng — Click bên ngoài để đóng
            </p>
          </div>
        </div>
      )}

      {/* Detail Modal - Full request info */}
      {detailRequest && (() => {
        const cfg = STATUS_CONFIG[detailRequest.status] || STATUS_CONFIG.pending;
        const StatusIcon = cfg.icon;
        const detailBillUrl = detailRequest.bill_image_url
          ? (detailRequest.bill_image_url.startsWith('data:') ? detailRequest.bill_image_url : getBackendUrl(detailRequest.bill_image_url))
          : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDetailRequest(null)}>
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800 p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-red-500" />
                    Chi Tiết Yêu Cầu Thanh Toán
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-red-500 font-bold text-sm">#{detailRequest.order_id}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDetailRequest(null)} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Bill image large preview */}
                {detailBillUrl ? (
                  <button
                    onClick={() => setPreviewImage(detailBillUrl)}
                    className="block w-full rounded-none clip-path-rog overflow-hidden border border-neutral-800 hover:border-red-600/50 transition-colors group"
                  >
                    <img
                      src={detailBillUrl}
                      alt="Bill"
                      className="w-full max-h-96 object-contain bg-black"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement.querySelector('[data-detail-fallback]')?.classList.remove('hidden');
                        e.currentTarget.parentElement.querySelector('[data-detail-fallback]')?.classList.add('flex');
                      }}
                    />
                    <div data-detail-fallback className="hidden flex-col items-center justify-center text-center p-6 bg-black min-h-[12rem]">
                      <FileWarning className="w-12 h-12 text-amber-400 mb-2" />
                      <span className="text-sm font-bold text-amber-300">File bill không đúng định dạng ảnh</span>
                      <span className="text-xs text-neutral-400 mt-1 mb-3">Có thể khách upload bị lỗi. Hãy yêu cầu khách gửi lại bill mới.</span>
                      <a
                        href={detailBillUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg text-xs font-bold hover:bg-red-500"
                      >
                        <Download className="w-3.5 h-3.5" /> Tải file gốc về máy
                      </a>
                    </div>
                    <div className="bg-black/80 px-3 py-2 text-xs text-neutral-400 flex items-center justify-center gap-1.5 group-hover:text-red-500">
                      <ZoomIn className="w-3.5 h-3.5" /> Click để xem ảnh lớn
                    </div>
                  </button>
                ) : (
                  <div className="p-8 text-center text-slate-500 bg-black/50 rounded-none clip-path-rog border border-dashed border-slate-700">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                    <span className="text-xs">Khách hàng chưa gửi ảnh bill.</span>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <User className="w-3 h-3" /> Khách hàng
                    </div>
                    <div className="font-bold text-white text-sm">{detailRequest.customer_name || '—'}</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <Phone className="w-3 h-3" /> Số điện thoại
                    </div>
                    <div className="font-mono text-white text-sm">{detailRequest.customer_phone || '—'}</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <Mail className="w-3 h-3" /> Email
                    </div>
                    <div className="text-white text-sm truncate">{detailRequest.customer_email || '—'}</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <Hash className="w-3 h-3" /> Mã yêu cầu
                    </div>
                    <div className="font-mono text-white text-sm">#{detailRequest.id}</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <Wallet className="w-3 h-3" /> Số tiền
                    </div>
                    <div className="font-extrabold text-red-400 text-base">{formatPrice(detailRequest.amount)}</div>
                  </div>
                  <div className="p-3 bg-black/60 rounded-none clip-path-rog border border-neutral-800 space-y-1 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wide text-[10px]">
                      <Calendar className="w-3 h-3" /> Thời gian gửi
                    </div>
                    <div className="text-white text-sm">
                      {new Date(detailRequest.created_at).toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Rejection reason if any */}
                {detailRequest.admin_note && (
                  <div className="p-3 rounded-none clip-path-rog bg-rose-500/10 border border-rose-500/30">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-rose-300 mb-1">Lý do từ chối trước đó:</div>
                        <div className="text-xs text-rose-200 leading-snug">{detailRequest.admin_note}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {detailRequest.status === 'pending' && (
                  <div className="flex gap-3 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        setRejectModal({ id: detailRequest.id, order_id: detailRequest.order_id, reason: '' });
                        setDetailRequest(null);
                      }}
                      className="flex-1 py-2.5 bg-rose-500/15 border border-rose-500/40 rounded-none clip-path-rog text-rose-300 hover:bg-rose-500/25 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Từ chối
                    </button>
                    <button
                      onClick={() => handleApprove(detailRequest.id)}
                      className="flex-1 py-2.5 bg-red-600/20 border border-red-600/40 rounded-none clip-path-rog text-emerald-300 hover:bg-red-600/30 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" /> Duyệt thanh toán
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)}>
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Từ Chối Thanh Toán
            </h3>
            <p className="text-sm text-neutral-400">
              Đơn hàng <span className="text-red-500 font-bold">#{rejectModal.order_id}</span> — Vui lòng nhập lý do từ chối để gửi email thông báo cho khách hàng.
            </p>
            <textarea
              rows="3"
              value={rejectModal.reason}
              onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="VD: Số tiền không khớp với đơn hàng, ảnh mờ không rõ..."
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
                onClick={handleReject}
                className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-none clip-path-rog text-sm hover:bg-rose-400 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Từ Chối & Gửi Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
