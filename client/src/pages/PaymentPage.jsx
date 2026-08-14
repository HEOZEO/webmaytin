import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode, Upload, Loader2, CheckCircle, Clock,
  XCircle, Eye, X, CreditCard, CheckCheck,
  AlertCircle, RefreshCw, ShoppingBag, Image as ImageIcon,
  ShoppingCart, Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { paymentService } from '../services/paymentService';
import orderService from '../services/orderService';
import { getBackendUrl } from '../utils/imageHelper';
import showToast from '../utils/toast';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const STATUS_CONFIG = {
  pending:  { label: 'Chờ duyệt',   color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   icon: Clock },
  approved: { label: 'Đã xác nhận', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle },
  rejected: { label: 'Bị từ chối',  color: 'bg-rose-500/20 text-rose-300 border-rose-500/30',      icon: XCircle }
};

export default function PaymentPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('orderId');
  const navigate = useNavigate();
  const [qrInfo, setQrInfo] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);

  // Upload state
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [billFile, setBillFile] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // My requests
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Local error state for better UX feedback
  const [uploadError, setUploadError] = useState('');
  // Resend mode: cho phép upload bill mới thay thế bill cũ bị rejected/pending
  const [isResendMode, setIsResendMode] = useState(false);
  // Submitted state: hiển thị màn hình "Đang chờ admin duyệt" sau khi gửi bill thành công
  const [billSubmitted, setBillSubmitted] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState(null);
  const [submittedAmount, setSubmittedAmount] = useState(0);

  // Tìm payment_request hiện tại cho selectedOrder (tránh hiển thị 2 ảnh bill trùng)
  const existingRequest = selectedOrder
    ? myRequests.find(r => r.order_id === selectedOrder.id)
    : null;
  const hasExistingBill = existingRequest && existingRequest.bill_image_url && !isResendMode;
  const canResend = existingRequest && (existingRequest.status === 'rejected' || existingRequest.status === 'pending') && !isResendMode;

  const fileInputRef = useRef();

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);

  // Load QR info
  useEffect(() => {
    paymentService.getQRInfo()
      .then(res => setQrInfo(res?.data))
      .catch(() => {})
      .finally(() => setQrLoading(false));
  }, []);

  // Load orders awaiting payment
  useEffect(() => {
    if (!isAuthenticated) return;
    orderService.getMyOrders()
      .then(res => {
        const list = res?.data || res || [];
        // Filter orders that need bank transfer payment (both pending and confirmed are eligible)
        const pendingOrders = list.filter(o =>
          o.payment_method === 'BANK_TRANSFER'
        );
        setOrders(pendingOrders);

        // Auto-select from URL ?orderId=
        if (orderIdFromUrl) {
          const found = pendingOrders.find(o => String(o.id) === String(orderIdFromUrl));
          if (found) {
            setSelectedOrder(found);
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated, orderIdFromUrl]);

  // Load my payment requests with polling for real-time updates
  const loadMyRequests = () => {
    setRequestsLoading(true);
    paymentService.getMyRequests()
      .then(res => setMyRequests(res?.data || []))
      .catch(() => {})
      .finally(() => setRequestsLoading(false));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadMyRequests();
      // Poll every 10 seconds to check for status updates
      const interval = setInterval(loadMyRequests, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showToast.error('Chỉ chấp nhận file ảnh: JPG, PNG, WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Kích thước ảnh tối đa 5MB');
      return;
    }
    setBillFile(file);
    const reader = new FileReader();
    reader.onload = ev => setBillPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUploadBill = async (e) => {
    e?.preventDefault?.();

    // Clear previous errors
    setUploadError('');

    if (!selectedOrder) {
      setUploadError('Vui lòng chọn đơn hàng cần thanh toán.');
      return;
    }
    if (!billFile) {
      setUploadError('Vui lòng tải lên ảnh bill thanh toán.');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('order_id', selectedOrder.id);
    formData.append('bill_image', billFile);

    try {
      await paymentService.uploadBill(formData);
      showToast.success('Đã gửi bill thành công! Admin sẽ kiểm tra và xác nhận sớm nhất.');
      // Lưu thông tin đơn vừa gửi bill, chuyển sang màn hình "Đang chờ admin duyệt"
      setSubmittedOrderId(selectedOrder?.id || null);
      setSubmittedAmount(selectedOrder?.final_amount || selectedOrder?.total_amount || 0);
      setBillSubmitted(true);
      setBillFile(null);
      setBillPreview(null);
      setSelectedOrder(null);
      setUploadError('');
      setIsResendMode(false);
      loadMyRequests();
      if (fileInputRef.current) fileInputRef.current.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // Extract detailed error message
      const serverMsg = err?.response?.data?.message;
      const statusCode = err?.response?.status;

      let errMsg = 'Gửi bill thất bại. Vui lòng thử lại.';
      if (serverMsg) {
        errMsg = serverMsg;
      } else if (!navigator.onLine) {
        errMsg = 'Mất kết nối internet. Vui lòng kiểm tra lại.';
      } else if (statusCode === 413) {
        errMsg = 'File ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.';
      } else if (statusCode === 401 || statusCode === 403) {
        errMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      } else if (!err?.response) {
        errMsg = 'Không thể kết nối server. Vui lòng thử lại.';
      }

      setUploadError(errMsg);
      showToast.error(errMsg);
    } finally {
      setUploadLoading(false);
    }
  };

  if (billSubmitted) {
    return (
      <div className="max-w-2xl mx-auto my-12 px-4 space-y-6">
        <div className="glass-card p-10 rounded-3xl glow-blue space-y-6 text-center">
          <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30 animate-pulse">
            <Clock className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white">Đang Chờ Admin Duyệt</h2>
            <p className="text-cyan-400 text-sm font-semibold">
              Mã đơn hàng: <strong>#{submittedOrderId}</strong>
            </p>
            {submittedAmount > 0 && (
              <p className="text-slate-300 text-xs">
                Số tiền: <strong className="text-cyan-300">{formatPrice(submittedAmount)}</strong>
              </p>
            )}
          </div>

          <p className="text-slate-300 text-sm leading-relaxed max-w-lg mx-auto">
            Bill thanh toán của bạn đã được gửi thành công. Admin sẽ kiểm tra và xác nhận trong vòng <strong className="text-amber-300">5-15 phút</strong>. Bạn sẽ nhận được thông báo khi đơn hàng được duyệt.
          </p>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
            <p className="text-xs text-amber-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Lưu ý
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Nếu bill hợp lệ, đơn sẽ chuyển sang trạng thái "Đã xác nhận thanh toán" và admin sẽ xử lý đơn hàng.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Nếu bill bị từ chối, bạn có thể gửi lại bill mới tại trang này.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>Mọi cập nhật sẽ được thông báo realtime trong trang Lịch sử đơn hàng.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap pt-2">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="flex-1 min-w-[180px] px-6 py-3.5 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Tiếp Tục Mua Sắm
            </button>
            <Link
              to="/profile"
              className="flex-1 min-w-[180px] px-6 py-3.5 bg-slate-900 border border-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-800 hover:border-cyan-500/50 transition-colors text-center flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              Xem Lịch Sử Đơn Hàng
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setBillSubmitted(false)}
            className="text-xs text-slate-500 hover:text-cyan-400 underline-offset-4 hover:underline"
          >
            ← Quay lại trang thanh toán để gửi bill khác
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-16 px-4 text-center space-y-6">
        <div className="glass-card p-10 rounded-3xl space-y-4">
          <div className="w-16 h-16 bg-cyan-500/10 text-cyan-400 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/30">
            <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Yêu Cầu Đăng Nhập</h2>
          <p className="text-slate-400 text-sm">Vui lòng đăng nhập để truy cập trang thanh toán.</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl">
            Đăng Nhập Ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-cyan-400" />
            Thanh Toán
          </h1>
          <p className="text-slate-400 text-sm mt-1">Quét mã QR để chuyển khoản và tải lên bill xác nhận</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: QR + Upload */}
        <div className="lg:col-span-7 space-y-6">

          {/* QR Info Card */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Thông Tin Thanh Toán
              </h2>
              <button
                onClick={() => {
                  paymentService.getQRInfo().then(res => setQrInfo(res?.data));
                  showToast.success('Đã làm mới thông tin');
                }}
                className="text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Làm mới
              </button>
            </div>

            {qrLoading ? (
              <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div>
            ) : (
              <>
                {/* QR Image */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/5 rounded-2xl border border-slate-800">
                  {qrInfo?.qr_image_url ? (
                    <img
                      src={getBackendUrl(qrInfo.qr_image_url)}
                      alt="QR Code"
                      className="w-48 h-48 rounded-2xl object-contain bg-white p-2"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-2xl bg-slate-800 flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-slate-600" />
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Ngân hàng</span>
                        <span className="font-bold text-white">{qrInfo?.bank_name || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Số tài khoản</span>
                        <span className="font-mono font-bold text-cyan-400 text-lg">{qrInfo?.account_number || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Tên chủ TK</span>
                        <span className="font-semibold text-white">{qrInfo?.account_holder || '—'}</span>
                      </div>
                      {qrInfo?.account_content && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">Nội dung CK</span>
                          <span className="text-amber-400 font-semibold text-sm">{qrInfo.account_content}</span>
                        </div>
                      )}
                    </div>
                    {qrInfo?.instructions && (
                      <p className="text-xs text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                        <AlertCircle className="w-3 h-3 inline mr-1 text-amber-400" />
                        {qrInfo.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount reminder */}
                {selectedOrder && (
                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Số tiền cần chuyển khoản:</span>
                      <span className="text-xl font-bold text-cyan-400">{formatPrice(selectedOrder.final_amount || selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upload Bill Form */}
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              Gửi Bill Thanh Toán
            </h2>

            {/* Select Order */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Chọn đơn hàng cần thanh toán</label>
              {orders.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-slate-400 text-sm font-semibold">Không có đơn hàng chuyển khoản nào cần thanh toán.</p>
                  <p className="text-slate-500 text-xs">Đơn COD sẽ không hiển thị tại đây. Bạn có thể xem đơn hàng trong <Link to="/profile" className="text-cyan-400 hover:underline">Lịch sử đơn hàng</Link>.</p>
                </div>
              ) : (
                <select
                  value={selectedOrder?.id || ''}
                  onChange={e => {
                    const order = orders.find(o => o.id === Number(e.target.value));
                    setSelectedOrder(order || null);
                    setUploadError('');
                    setIsResendMode(false);
                    setBillFile(null);
                    setBillPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">— Chọn đơn hàng —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      Đơn #{o.id} — {formatPrice(o.final_amount || o.total_amount)} — {STATUS_CONFIG[o.status]?.label || o.status}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bill upload - ẩn nếu đã có bill pending/rejected, hiện bill cũ + nút "Gửi lại" */}
            {hasExistingBill && canResend ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Ảnh bill hiện tại {existingRequest.status === 'pending' ? '(đang chờ duyệt)' : '(đã bị từ chối)'}
                </label>
                <div className="relative inline-block">
                  <img
                    src={getBackendUrl(existingRequest.bill_image_url)}
                    alt="Bill hiện tại"
                    className="w-64 h-auto rounded-2xl border border-slate-700 cursor-pointer hover:border-cyan-500 transition-colors"
                    onClick={() => setPreviewImage(getBackendUrl(existingRequest.bill_image_url))}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                {existingRequest.admin_note && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] text-rose-300 font-semibold">Lý do từ chối:</p>
                    <p className="text-xs text-rose-200 mt-0.5">{existingRequest.admin_note}</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    // Cho phép gửi lại bằng cách clear existingRequest hiện tại
                    setBillFile(null);
                    setBillPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    // Đánh dấu resend mode
                    setIsResendMode(true);
                    // Scroll xuống phần upload
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }}
                  className="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl hover:bg-cyan-500/30 flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Gửi lại bill khác
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Ảnh bill thanh toán <span className="text-rose-400">*</span>
                </label>

                {billPreview ? (
                  <div className="relative inline-block">
                    <img src={billPreview} alt="Bill Preview" className="w-64 h-auto rounded-2xl border border-cyan-500/40" />
                    <button
                      onClick={() => { setBillFile(null); setBillPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs text-slate-400 mt-1">{billFile?.name}</p>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-slate-700 rounded-2xl cursor-pointer hover:border-cyan-500/60 transition-colors">
                    <ImageIcon className="w-10 h-10 text-slate-600" />
                    <div className="text-center">
                      <p className="text-sm text-slate-300 font-semibold">Tải lên ảnh chụp màn hình biên lai</p>
                      <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP — Tối đa 5MB</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            )}

            {/* Nếu đã có bill approved → chỉ hiện thông báo */}
            {existingRequest && existingRequest.status === 'approved' && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Đơn hàng này đã được admin duyệt thanh toán. Bạn không thể gửi bill mới.</span>
              </div>
            )}

            {/* Error message */}
            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleUploadBill}
              disabled={uploadLoading || !selectedOrder || !billFile}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-extrabold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi bill...</>
              ) : !selectedOrder ? (
                <><AlertCircle className="w-4 h-4" /> Vui lòng chọn đơn hàng</>
              ) : !billFile ? (
                <><Upload className="w-4 h-4" /> Vui lòng tải lên ảnh bill</>
              ) : (
                <><Upload className="w-4 h-4" /> Gửi Bill Thanh Toán</>
              )}
            </button>

            {/* Progress indicator */}
            {uploadLoading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Đang tải lên...</span>
                  <span>100%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-cyan-400 h-1.5 rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            )}

            <p className="text-[10px] text-center text-slate-500">
              Sau khi gửi, vui lòng chờ admin xác nhận trong vòng 15-30 phút làm việc.
            </p>
          </div>
        </div>

        {/* RIGHT: My Payment Requests */}
        <div className="lg:col-span-5">
          <div className="glass-card rounded-2xl p-6 space-y-5 sticky top-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Yêu Cầu Của Tôi
            </h2>

            {requestsLoading ? (
              <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-400" /></div>
            ) : myRequests.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CreditCard className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-slate-400 text-sm font-semibold">Bạn chưa có yêu cầu thanh toán nào.</p>
                <Link to="/products" className="inline-block text-xs text-cyan-400 hover:underline">
                  Khám phá sản phẩm →
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {myRequests.map(req => {
                  const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={req.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold text-sm">#{req.order_id}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </div>
                        {req.bill_image_url && (
                          <button
                            onClick={() => setPreviewImage(getBackendUrl(req.bill_image_url))}
                            className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Xem bill
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Số tiền:</span>
                        <span className="font-bold text-white">{formatPrice(req.amount)}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Gửi: {new Date(req.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {req.admin_note && (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                          <p className="text-[10px] text-rose-300">
                            <span className="font-bold">Lý do từ chối: </span>{req.admin_note}
                          </p>
                          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Bạn có thể gửi lại bill mới bên trên
                          </p>
                        </div>
                      )}
                      {req.status === 'approved' && (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-[10px] text-emerald-300 font-semibold">
                            Thanh toán đã được xác nhận. Đơn hàng đang được xử lý!
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewImage}
              alt="Bill Preview"
              className="w-full rounded-2xl border border-slate-700 shadow-2xl"
            />
            <p className="text-center text-xs text-slate-500 mt-2">Ảnh bill thanh toán của bạn</p>
          </div>
        </div>
      )}
    </div>
  );
}
