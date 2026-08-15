import React, { useState, useEffect, useRef } from 'react';

import { useNavigate, Link, useLocation } from 'react-router-dom';

import { ShoppingBag, ShoppingCart, Trash2, Plus, Minus, CheckCircle, CreditCard, Truck, Tag, QrCode, ArrowRight, ShieldCheck, MapPin, Loader2, Lock, LogIn, ChevronDown, AlertCircle, Building2, Hash, User as UserIcon, Coins, FileText, Upload } from 'lucide-react';

import showToast from '../utils/toast';

import { useCart } from '../context/CartContext';

import { resolveImage, onImageError, getBackendUrl } from '../utils/imageHelper';

import { useAuth } from '../context/AuthContext';

import orderService from '../services/orderService';

import couponService from '../services/couponService';

import shippingService from '../services/shippingService';

import locationService from '../services/locationService';

import { paymentService } from '../services/paymentService';

import ConfirmDialog from '../components/ConfirmDialog';

import api from '../services/api';



export default function Checkout() {

  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();

  const { user, isAuthenticated } = useAuth();

  const navigate = useNavigate();



  // Yêu cầu đăng nhập trước khi thanh toán - chỉ hiện toast 1 lần

  useEffect(() => {

    if (!isAuthenticated && cart.length > 0) {

      showToast.error('Vui lòng đăng nhập để tiếp tục thanh toán', { id: 'auth-required' });

    }

  }, [isAuthenticated, cart.length]);



  const [formData, setFormData] = useState({

    full_name: user?.full_name || '',

    phone: user?.phone || '',

    email: user?.email || '',

    address: user?.address || '',

    notes: '',

    payment_method: 'COD',

    shipping_method_id: null

  });



  const [couponCode, setCouponCode] = useState('');

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const [couponLoading, setCouponLoading] = useState(false);

  const [couponError, setCouponError] = useState('');

  const [availableCoupons, setAvailableCoupons] = useState([]);

  const [showCouponList, setShowCouponList] = useState(false);



  const [shippingMethods, setShippingMethods] = useState([]);

  const [selectedShipping, setSelectedShipping] = useState(null);



  // Settings state for shipping config

  const [settings, setSettings] = useState({

    shipping_free_threshold: 500000,

    shipping_default_fee: 30000,

    shipping_enabled: true

  });



  // Huế location state

  const [districts, setDistricts] = useState([]);

  const [wards, setWards] = useState([]);

  const [loadingLocations, setLoadingLocations] = useState(true);

  const [selectedDistrict, setSelectedDistrict] = useState('');

  const [selectedWard, setSelectedWard] = useState('');

  const [streetAddress, setStreetAddress] = useState('');



  // Saved addresses state

  const [savedAddresses, setSavedAddresses] = useState([]);

  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const [showAddressList, setShowAddressList] = useState(false);



  const [loading, setLoading] = useState(false);

  const [orderPlaced, setOrderPlaced] = useState(false);

  const [orderId, setOrderId] = useState('');

  const [billSubmitted, setBillSubmitted] = useState(false); // true sau khi upload bill thành công

  const [orderRecipientName, setOrderRecipientName] = useState(''); // lưu tên người nhận để hiển thị



  // Persist order amounts khi reload trang (sau khi đặt hàng thành công)

  const [orderFinalAmount, setOrderFinalAmount] = useState(0);

  const [orderDiscountAmount, setOrderDiscountAmount] = useState(0);

  const [orderShippingFeeAmount, setOrderShippingFeeAmount] = useState(0);

  const [orderPaymentMethod, setOrderPaymentMethod] = useState('COD');



  // QR payment info (loaded from /api/payments/qr after BANK_TRANSFER order is placed)

  const [qrInfo, setQrInfo] = useState(null);

  const [qrLoading, setQrLoading] = useState(false);



  // Bill upload state for BANK_TRANSFER orders

  const [billFile, setBillFile] = useState(null);

  const [billPreview, setBillPreview] = useState(null);

  const [billUploading, setBillUploading] = useState(false);

  const [billUploaded, setBillUploaded] = useState(false);

  const [uploadError, setUploadError] = useState('');

  const billFileRef = useRef(null);



  // Confirm dialog state — replaces window.confirm()

  const [confirmState, setConfirmState] = useState(null);

  const askConfirm = (cfg) => setConfirmState(cfg);

  const closeConfirm = () => setConfirmState(null);



  const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);



  // Hook router để biết URL hiện tại

  const location = useLocation();



  // Khôi phục thông tin order từ sessionStorage khi reload trang (order thành công)

  // CHỈ restore khi URL có ?orderId=... (user vừa đặt đơn và reload), KHÔNG restore khi user

  // vào /checkout thông thường (sẽ gây hiển thị success screen cũ)

  useEffect(() => {

    if (orderPlaced) return; // Chỉ restore khi chưa có order



    const searchParams = new URLSearchParams(location.search);

    const hasOrderIdParam = searchParams.has('orderId');

    if (!hasOrderIdParam) return; // Không có query ?orderId → không restore



    const savedOrder = sessionStorage.getItem('lastOrder');

    if (savedOrder) {

      try {

        const order = JSON.parse(savedOrder);

        // Chỉ khôi phục nếu order được tạo trong vòng 1 giờ

        const orderTime = new Date(order.created_at).getTime();

        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (orderTime > oneHourAgo) {

          setOrderPlaced(true);

          setOrderId(order.id || '');

          setOrderFinalAmount(Number(order.final_amount) || 0);

          setOrderDiscountAmount(Number(order.discount_amount) || 0);

          setOrderShippingFeeAmount(Number(order.shipping_fee) || 0);

          setOrderPaymentMethod(order.payment_method || 'COD');



          // Tải QR info nếu là chuyển khoản

          if (order.payment_method === 'BANK_TRANSFER') {

            setQrLoading(true);

            paymentService.getQRInfo()

              .then(res => setQrInfo(res?.data || null))

              .catch(() => setQrInfo(null))

              .finally(() => setQrLoading(false));

          }

        } else {

          // Order quá cũ, xóa

          sessionStorage.removeItem('lastOrder');

        }

      } catch (e) {

        console.error('Cannot parse saved order:', e);

        sessionStorage.removeItem('lastOrder');

      }

    }

  }, [orderPlaced, location.search]);



  // Load settings for shipping config

  useEffect(() => {

    api.get('/settings')

      .then(res => {

        const data = res?.data?.data || {};

        setSettings({

          shipping_free_threshold: Number(data.shipping_free_threshold?.value) || 500000,

          shipping_default_fee: Number(data.shipping_default_fee?.value) || 30000,

          shipping_enabled: data.shipping_enabled?.value === 'true'

        });

      })

      .catch(err => console.error('Cannot load settings:', err));

  }, []);



  // Load available coupons

  useEffect(() => {

    couponService.getAvailable()

      .then(res => {

        const coupons = res?.data?.coupons || res?.coupons || [];

        setAvailableCoupons(coupons);

      })

      .catch(err => console.error('Cannot load coupons:', err));

  }, []);



  useEffect(() => {

    shippingService.getAll()

      .then(res => {

        const list = res?.data || res?.shippingMethods || res || [];

        const active = list.filter(s => s.is_active !== false);

        setShippingMethods(active);

        if (active.length > 0) {

          setSelectedShipping(active[0]);

          setFormData(prev => ({ ...prev, shipping_method_id: active[0].id }));

        }

      })

      .catch(err => console.error('Cannot load shipping methods:', err));

  }, []);



  // Load Huế districts

  useEffect(() => {

    locationService.getDistricts()

      .then(res => {

        setDistricts(res?.data?.data || res?.data || []);

        setLoadingLocations(false);

      })

      .catch(() => setLoadingLocations(false));

  }, []);



  // Load saved addresses when authenticated

  useEffect(() => {

    if (isAuthenticated) {

      setLoadingAddresses(true);

      api.get('/addresses')

        .then(res => {

          const addresses = res?.data?.data || res?.data || [];

          setSavedAddresses(addresses);

          // Auto-select default address

          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];

          if (defaultAddr) {

            setSelectedDistrict(defaultAddr.district_id?.toString() || '');

            setSelectedWard(defaultAddr.ward_id?.toString() || '');

            setStreetAddress(defaultAddr.address || '');

          }

        })

        .catch(() => setSavedAddresses([]))

        .finally(() => setLoadingAddresses(false));

    }

  }, [isAuthenticated]);



  // Load wards when district changes

  useEffect(() => {

    if (selectedDistrict) {

      locationService.getWards(selectedDistrict)

        .then(res => setWards(res?.data || []))

        .catch(() => setWards([]));

    } else {

      setWards([]);

    }

    setSelectedWard('');

  }, [selectedDistrict]);



  // Get selected district info for shipping fee

  const selectedDistrictInfo = districts.find(d => d.id === Number(selectedDistrict));



  // Calculate shipping fee based on settings and cart total

  const getShippingFee = () => {

    // Check if shipping is enabled

    if (!settings.shipping_enabled) return 0;



    // Free shipping when cart total >= threshold

    if (totalPrice >= settings.shipping_free_threshold) return 0;



    // Use district's shipping_fee if available, otherwise use default

    if (selectedDistrictInfo) {

      return Number(selectedDistrictInfo.shipping_fee);

    }



    return settings.shipping_default_fee;

  };



  const calculatedShippingFee = getShippingFee();



  // Build full shipping address

  const buildShippingAddress = () => {

    const district = selectedDistrictInfo;

    const ward = wards.find(w => w.id === Number(selectedWard));

    const parts = [streetAddress.trim()];

    if (ward) parts.push(ward.name);

    if (district) parts.push(district.name);

    parts.push('Thành phố Huế');

    return parts.join(', ');

  };



  const applyCoupon = async (e) => {

    e?.preventDefault?.();

    if (!couponCode.trim()) {

      setCouponError('Vui lòng nhập mã giảm giá');

      return;

    }

    setCouponLoading(true);

    setCouponError('');

    try {

      const res = await couponService.validate(couponCode.trim(), totalPrice);

      if (res?.success && res?.data?.coupon) {

        setAppliedCoupon(res.data.coupon);

        setCouponError('');

        showToast.success(`Áp dụng mã ${res.data.coupon.code} thành công!`);

      } else {

        setAppliedCoupon(null);

        setCouponError(res?.message || 'Mã giảm giá không hợp lệ');

        showToast.error(res?.message || 'Mã giảm giá không hợp lệ');

      }

    } catch (err) {

      setAppliedCoupon(null);

      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn';

      setCouponError(msg);

      showToast.error(msg);

    } finally {

      setCouponLoading(false);

    }

  };



  const removeCoupon = () => {

    setAppliedCoupon(null);

    setCouponCode('');

    setCouponError('');

  };



  // Bill file selection handler

  const handleBillFileChange = (e) => {

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

    setUploadError('');

    const reader = new FileReader();

    reader.onload = ev => setBillPreview(ev.target.result);

    reader.readAsDataURL(file);

  };



  // Upload bill to server

  const handleUploadBill = async () => {

    if (!billFile || !orderId) return;

    setBillUploading(true);

    setUploadError('');

    const formData = new FormData();

    formData.append('order_id', orderId);

    formData.append('bill_image', billFile);

    try {

      await paymentService.uploadBill(formData);

      setBillUploaded(true);

      setBillSubmitted(true); // chuyển sang giao diện chờ admin duyệt

      setBillFile(null);

      setBillPreview(null);

      showToast.success('�ã gửi bill thành công! Admin sẽ kiểm tra và xác nhận.');

      if (billFileRef.current) billFileRef.current.value = '';

    } catch (err) {

      const errMsg = err?.response?.data?.message || 'Gửi bill thất bại. Vui lòng thử lại.';

      setUploadError(errMsg);

      showToast.error(errMsg);

    } finally {

      setBillUploading(false);

    }

  };



  // Quick apply coupon from available list

  const handleQuickApplyCoupon = async (coupon) => {

    if (appliedCoupon?.code === coupon.code) {

      showToast.info('Mã này đã được áp dụng');

      return;

    }

    setCouponCode(coupon.code);

    setShowCouponList(false);

    try {

      const res = await couponService.validate(coupon.code, totalPrice);

      if (res?.success && res?.data?.coupon) {

        setAppliedCoupon(res.data.coupon);

        setCouponError('');

        showToast.success(`Áp dụng mã ${coupon.code} thành công!`);

      } else {

        setAppliedCoupon(null);

        showToast.error(res?.message || 'Mã giảm giá không hợp lệ');

      }

    } catch (err) {

      setAppliedCoupon(null);

      const msg = err.response?.data?.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn';

      showToast.error(msg);

    }

  };



  // Apply saved address to form

  const applySavedAddress = (addr) => {

    setFormData(prev => ({

      ...prev,

      full_name: addr.full_name || prev.full_name,

      phone: addr.phone || prev.phone

    }));

    setStreetAddress(addr.address || '');

    // Set district and load wards

    if (addr.district_id) {

      setSelectedDistrict(String(addr.district_id));

      locationService.getWards(addr.district_id)

        .then(res => {

          setWards(res?.data || []);

          if (addr.ward_id) {

            setSelectedWard(String(addr.ward_id));

          }

        })

        .catch(() => setWards([]));

    }

    setShowAddressList(false);

    showToast.success('Đã áp dụng địa chỉ');

  };



  const discountAmount = appliedCoupon

    ? Math.min(

        Math.round((totalPrice * appliedCoupon.discount_percent) / 100),

        appliedCoupon.max_discount ? Number(appliedCoupon.max_discount) : Infinity

      )

    : 0;

  const shippingFee = calculatedShippingFee;

  const calculatedFinalPrice = Math.max(0, totalPrice - discountAmount + shippingFee);

  const finalPrice = calculatedFinalPrice;



  const handleShippingChange = (method) => {

    setSelectedShipping(method);

    setFormData(prev => ({ ...prev, shipping_method_id: method.id }));

  };



  // Clear success screen → quay lại form thanh toán để mua thêm

  const continueShopping = () => {

    sessionStorage.removeItem('lastOrder');

    setOrderPlaced(false);

    setOrderId('');

    setOrderFinalAmount(0);

    setOrderDiscountAmount(0);

    setOrderShippingFeeAmount(0);

    setBillFile(null);

    setBillPreview(null);

    setBillUploaded(false);

    setBillSubmitted(false);

    setUploadError('');

    setQrInfo(null);

    setOrderRecipientName('');

  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (cart.length === 0) return;



    if (!isAuthenticated) {

      showToast.error('Vui lòng đăng nhập để đặt hàng');

      navigate('/login', { state: { redirect: '/checkout' } });

      return;

    }



    if (!formData.full_name.trim()) {

      showToast.error('Vui lòng nhập họ và tên');

      return;

    }

    const phoneRaw = formData.phone.replace(/\s/g, '');

    if (!/^(0|\+84)(3|5|7|8|9)\d{8}$/.test(phoneRaw)) {

      showToast.error('Số điện thoại không hợp lệ (VD: 0912345678)');

      return;

    }

    if (!selectedDistrict) {

      showToast.error('Vui lòng chọn Quận/Huyện giao hàng');

      return;

    }

    if (!selectedWard) {

      showToast.error('Vui lòng chọn Phường/Xã giao hàng');

      return;

    }

    if (!streetAddress.trim() || streetAddress.trim().length < 5) {

      showToast.error('Vui lòng nhập địa chỉ giao hàng chi tiết (tối thiểu 5 ký tự)');

      return;

    }



    setLoading(true);

    let createdOrderId = null;

    let orderFinalAmount = finalPrice; // Lưu lại finalPrice trước khi clearCart

    let orderDiscountAmount = discountAmount;

    let orderShippingFee = shippingFee;

    let orderPaymentMethod = formData.payment_method;

    try {

      // Backend sẽ tự lấy giá từ DB. Không gửi price để tránh hack.

      const orderPayload = {

        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),

        shipping_address: buildShippingAddress(),

        phone: phoneRaw,

        email: formData.email || undefined,

        recipient_name: formData.full_name || undefined,

        payment_method: formData.payment_method,

        shipping_method_id: selectedShipping?.id || null,

        district_id: Number(selectedDistrict),

        ward_id: Number(selectedWard),

        coupon_code: appliedCoupon?.code || null,

        notes: formData.notes || null

      };



      const res = await orderService.createOrder(orderPayload);



      // Ưu tiên lấy thông tin từ backend response

      const orderData = res?.data || res || {};

      if (orderData.id) {

        createdOrderId = String(orderData.id);

      } else if (orderData.order?.id) {

        createdOrderId = String(orderData.order.id);

      } else {

        // Fallback: tự tạo mã tạm

        createdOrderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

      }



      // Lấy số tiền từ backend nếu có, không thì dùng tính toán frontend

      if (orderData.final_amount !== undefined) {

        orderFinalAmount = Number(orderData.final_amount);

        orderDiscountAmount = Number(orderData.discount_amount) || 0;

        orderShippingFee = Number(orderData.shipping_fee) || 0;

      }



      // Lưu thông tin order vào sessionStorage để persist khi reload

      const orderInfo = {

        id: createdOrderId,

        final_amount: orderFinalAmount,

        discount_amount: orderDiscountAmount,

        shipping_fee: orderShippingFee,

        payment_method: orderPaymentMethod,

        coupon_code: appliedCoupon?.code || null,

        created_at: new Date().toISOString()

      };

      sessionStorage.setItem('lastOrder', JSON.stringify(orderInfo));



      // Cập nhật state

      setOrderId(createdOrderId);

      setOrderFinalAmount(orderFinalAmount);

      setOrderDiscountAmount(orderDiscountAmount);

      setOrderShippingFeeAmount(orderShippingFee);



      clearCart();

      setOrderPlaced(true);

      showToast.success('Đặt hàng thành công! Mã đơn: #' + createdOrderId);



      // Tự động redirect qua /payment nếu là chuyển khoản

      // (Bỏ qua bước thủ công click "Tôi đã thanh toán" để UX mượt hơn)

      if (formData.payment_method === 'BANK_TRANSFER') {

        setTimeout(() => {

          navigate(`/payment?orderId=${createdOrderId}`);

        }, 1500);

      }



      // Nếu là chuyển khoản, tải thông tin QR từ admin payment_settings

      if (formData.payment_method === 'BANK_TRANSFER') {

        setQrLoading(true);

        paymentService.getQRInfo()

          .then(res => setQrInfo(res?.data || null))

          .catch(() => setQrInfo(null))

          .finally(() => setQrLoading(false));

      }

    } catch (err) {

      console.error('Checkout error:', err);

      const msg = err?.message || err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';

      showToast.error(msg);

    } finally {

      setLoading(false);

    }

  };



  if (orderPlaced) {

    const displayFinalPrice = orderFinalAmount > 0 ? orderFinalAmount : finalPrice;

    const displayPaymentMethod = orderPaymentMethod || formData.payment_method;



    return (
      <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] py-12">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm clip-path-rog p-10 space-y-6 text-center">
            <div className="w-20 h-20 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-600/20">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">

            <h2 className="text-3xl font-extrabold text-slate-900">Đặt Hàng Thành Công!</h2>

            <p className="text-red-500 text-sm font-semibold">Mã đơn hàng: <strong>#{orderId}</strong></p>

          </div>



          <p className="text-slate-700 text-sm leading-relaxed max-w-lg mx-auto">

            Hệ thống đã nhận đơn hàng của bạn. Nhân viên hỗ trợ sẽ gọi xác nhận qua số <strong className="text-slate-900">{formData.phone}</strong> trong vòng 15 phút.

          </p>



          {/* Thông tin thanh toán */}

          <div className="p-4 rounded-none clip-path-rog bg-white/60 border border-slate-200 text-left space-y-2">

            <div className="flex justify-between text-sm">

              <span className="text-slate-600">Tổng tiền:</span>

              <span className="font-bold text-red-500 text-lg">{formatPrice(displayFinalPrice)}</span>

            </div>

            {orderDiscountAmount > 0 && (

              <div className="flex justify-between text-sm">

                <span className="text-slate-600">Đã giảm:</span>

                <span className="text-rose-400">-{formatPrice(orderDiscountAmount)}</span>

              </div>

            )}

            {orderShippingFeeAmount > 0 && (

              <div className="flex justify-between text-sm">

                <span className="text-slate-600">Phí vận chuyển:</span>

                <span className="text-slate-700">{formatPrice(orderShippingFeeAmount)}</span>

              </div>

            )}

          </div>



          {displayPaymentMethod === 'BANK_TRANSFER' && (

            <div className="p-6 rounded-none clip-path-rog bg-gradient-to-br from-slate-900/95 to-slate-950/95 border border-red-600/40 space-y-4 shadow-2xl shadow-red-600/10">

              <div className="flex items-center justify-between text-sm font-bold text-slate-900 border-b border-slate-200 pb-3">

                <span className="flex items-center gap-2">

                  <QrCode className="w-4 h-4 text-red-500" /> Quét Mã QR Thanh Toán

                </span>

                <span className="px-2.5 py-1 bg-red-600/15 text-red-400 rounded-lg text-xs font-extrabold border border-red-600/30">

                  {formatPrice(displayFinalPrice)}

                </span>

              </div>



              {qrLoading ? (

                <div className="flex items-center justify-center py-10 text-xs text-slate-600">

                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải thông tin thanh toán...

                </div>

              ) : (

                <div className="flex flex-col md:flex-row items-stretch gap-5">

                  {/* QR Image - fixed size, never breaks layout */}

                  <div className="flex-shrink-0 mx-auto md:mx-0">

                    <div className="relative w-44 h-44 rounded-none clip-path-rog bg-white p-3 flex items-center justify-center shadow-lg shadow-red-600/20 ring-2 ring-red-600/30">

                      {qrInfo?.qr_image_url ? (

                        <img

                          src={getBackendUrl(qrInfo.qr_image_url)}

                          alt="Mã QR chuyển khoản"

                          className="w-full h-full object-contain"

                          onError={(e) => {

                            e.currentTarget.style.display = 'none';

                            e.currentTarget.nextElementSibling?.classList.remove('hidden');

                          }}

                        />

                      ) : null}

                      <div className={qrInfo?.qr_image_url ? 'hidden w-full h-full flex-col items-center justify-center text-center' : 'w-full h-full flex flex-col items-center justify-center text-center'}>

                        <QrCode className="w-14 h-14 text-slate-700" />

                        <p className="text-[10px] text-slate-600 mt-2 font-bold leading-tight">

                          Admin chưa cập nhật<br />ảnh QR

                        </p>

                      </div>

                    </div>

                    <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">Mở app ngân hàng để quét</p>

                  </div>



                  {/* Info list - structured grid with icons, no raw bullets */}

                  <div className="flex-1 grid grid-cols-1 gap-2 min-w-0">

                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white/80 border border-slate-200 rounded-none clip-path-rog">

                      <Building2 className="w-4 h-4 text-red-500 flex-shrink-0" />

                      <span className="text-[10px] text-slate-600 uppercase tracking-wide font-semibold w-20 flex-shrink-0">Ngân hàng</span>

                      <span className="font-bold text-slate-900 text-sm truncate">{qrInfo?.bank_name || '—'}</span>

                    </div>



                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white/80 border border-slate-200 rounded-none clip-path-rog">

                      <Hash className="w-4 h-4 text-red-500 flex-shrink-0" />

                      <span className="text-[10px] text-slate-600 uppercase tracking-wide font-semibold w-20 flex-shrink-0">Số TK</span>

                      <span className="font-mono font-extrabold text-red-400 text-base tracking-wider whitespace-nowrap truncate">

                        {(qrInfo?.account_number || '—').replace(/[\s\-\/]/g, '')}

                      </span>

                      <button

                        type="button"

                        onClick={() => {

                          const num = (qrInfo?.account_number || '').replace(/[\s\-\/]/g, '');

                          if (num && navigator.clipboard) {

                            navigator.clipboard.writeText(num);

                            showToast.success('Đã sao chép số tài khoản');

                          }

                        }}

                        className="ml-auto text-[10px] text-slate-500 hover:text-red-500 font-semibold flex-shrink-0"

                      >

                        Copy

                      </button>

                    </div>



                    <div className="flex items-center gap-3 px-3 py-2.5 bg-white/80 border border-slate-200 rounded-none clip-path-rog">

                      <UserIcon className="w-4 h-4 text-red-500 flex-shrink-0" />

                      <span className="text-[10px] text-slate-600 uppercase tracking-wide font-semibold w-20 flex-shrink-0">Chủ TK</span>

                      <span className="font-bold text-slate-900 text-sm truncate">{qrInfo?.account_holder || '—'}</span>

                    </div>



                    <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-none clip-path-rog">

                      <Coins className="w-4 h-4 text-amber-400 flex-shrink-0" />

                      <span className="text-[10px] text-amber-300 uppercase tracking-wide font-semibold w-20 flex-shrink-0">Số tiền</span>

                      <span className="font-extrabold text-amber-300 text-base whitespace-nowrap truncate">{formatPrice(displayFinalPrice)}</span>

                    </div>



                    <div className="flex items-center gap-3 px-3 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-none clip-path-rog">

                      <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />

                      <span className="text-[10px] text-rose-300 uppercase tracking-wide font-semibold w-20 flex-shrink-0">Nội dung</span>

                      <span className="font-extrabold text-rose-300 text-sm tracking-wider truncate">{orderId}</span>

                      <button

                        type="button"

                        onClick={() => {

                          if (orderId && navigator.clipboard) {

                            navigator.clipboard.writeText(String(orderId));

                            showToast.success('Đã sao chép nội dung CK');

                          }

                        }}

                        className="ml-auto text-[10px] text-slate-500 hover:text-rose-400 font-semibold flex-shrink-0"

                      >

                        Copy

                      </button>

                    </div>



                    {qrInfo?.instructions && (

                      <div className="flex items-start gap-2 px-3 py-2 rounded-none clip-path-rog bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200">

                        <AlertCircle className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />

                        <span className="leading-snug">{qrInfo.instructions}</span>

                      </div>

                    )}

                  </div>

                </div>

              )}



              <button

                onClick={() => navigate(`/payment?orderId=${orderId}`)}

                className="w-full py-3 bg-gradient-to-r from-red-500 to-red-500 text-slate-900 font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog hover:shadow-lg hover:shadow-red-600/25 transition-all flex items-center justify-center gap-2"

              >

                <CheckCircle className="w-4 h-4" /> Tôi đã thanh toán — Gửi bill xác nhận

              </button>



              {/* Bill upload section - inline for BANK_TRANSFER orders */}

              {displayPaymentMethod === 'BANK_TRANSFER' && !billUploaded && (

                <div className="mt-4 p-4 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/20 space-y-3">

                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">

                    <Upload className="w-4 h-4" /> Tải lên Bill Thanh Toán Ngay

                  </h4>



                  {billPreview ? (

                    <div className="space-y-3">

                      <div className="flex items-center gap-3">

                        <img src={billPreview} alt="Bill Preview" className="w-24 h-24 rounded-none clip-path-rog object-cover border border-slate-700" />

                        <div className="flex-1">

                          <p className="text-xs text-slate-700 font-medium">{billFile?.name}</p>

                          <p className="text-[10px] text-slate-500">{(billFile?.size / 1024).toFixed(1)} KB</p>

                        </div>

                        <button

                          onClick={() => { setBillFile(null); setBillPreview(null); if (billFileRef.current) billFileRef.current.value = ''; }}

                          className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg transition"

                        >

                          <Trash2 className="w-4 h-4" />

                        </button>

                      </div>

                      {uploadError && (

                        <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg">{uploadError}</p>

                      )}

                      <button

                        onClick={handleUploadBill}

                        disabled={billUploading}

                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"

                      >

                        {billUploading ? (

                          <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi bill...</>

                        ) : (

                          <><Upload className="w-4 h-4" /> Gửi Bill Ngay</>

                        )}

                      </button>

                    </div>

                  ) : (

                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-amber-500/30 rounded-none clip-path-rog cursor-pointer hover:border-amber-500/50 transition">

                      <Upload className="w-6 h-6 text-amber-400" />

                      <p className="text-xs text-slate-700 text-center">Tải lên ảnh chụp bill chuyển khoản</p>

                      <p className="text-[10px] text-slate-500">JPG, PNG, WEBP — Tối đa 5MB</p>

                      <input

                        ref={billFileRef}

                        type="file"

                        accept="image/jpeg,image/png,image/webp"

                        className="hidden"

                        onChange={handleBillFileChange}

                      />

                    </label>

                  )}



                  <p className="text-[10px] text-slate-600 text-center">

                    Sau khi gửi bill, admin sẽ xác nhận và cập nhật trạng thái đơn hàng cho bạn.

                  </p>

                </div>

              )}



              {/* Bill uploaded success message */}

              {displayPaymentMethod === 'BANK_TRANSFER' && billUploaded && (

                <div className="mt-4 p-4 rounded-none clip-path-rog bg-red-600/10 border border-red-600/30 flex items-center gap-3">

                  <CheckCircle className="w-6 h-6 text-red-500 flex-shrink-0" />

                  <div>

                    <p className="text-sm font-bold text-emerald-300">Bill đã được gửi!</p>

                    <p className="text-xs text-slate-600 mt-0.5">Admin sẽ xác nhận trong vài phút. Bạn sẽ nhận được thông báo.</p>

                  </div>

                </div>

              )}

            </div>

          )}



          {displayPaymentMethod === 'BANK_TRANSFER' && billSubmitted ? (

            <div className="space-y-5">

              <div className="p-5 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/30 space-y-3 text-left">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">

                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />

                  </div>

                  <div>

                    <p className="text-base font-bold text-amber-300">Đang chờ admin duyệt</p>

                    <p className="text-xs text-slate-600 mt-0.5">Bill của bạn đã được gửi thành công. Vui lòng chờ trong giây lát.</p>

                  </div>

                </div>

                <div className="text-[11px] text-slate-700 bg-white/60 rounded-lg p-2.5 border border-slate-200">

                  <p>• Admin sẽ kiểm tra bill chuyển khoản và xác nhận đơn hàng trong <strong className="text-amber-300">5-15 phút</strong></p>

                  <p className="mt-1">• Bạn sẽ nhận được thông báo khi đơn hàng được duyệt hoặc nếu có vấn đề</p>

                </div>

              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">

                <button
                  type="button"
                  onClick={() => { continueShopping(); navigate('/products'); }}
                  className="flex-1 min-w-[180px] px-6 py-3.5 bg-red-600 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />

                  Tiếp Tục Mua Sắm

                </button>

                <Link

                  to="/profile"

                  className="flex-1 min-w-[180px] px-6 py-3.5 bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-none clip-path-rog hover:bg-neutral-900 hover:border-red-600/50 transition-colors text-center flex items-center justify-center gap-2"

                >

                  <Package className="w-4 h-4" />

                  Xem Lịch Sử Đơn Hàng

                </Link>

              </div>

            </div>

          ) : (
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => { continueShopping(); navigate('/products'); }}
                className="px-6 py-3.5 bg-red-600 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog hover:bg-red-500 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Tiếp Tục Mua Sắm Thêm
              </button>
              <Link to="/profile" className="px-6 py-3.5 bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-none clip-path-rog hover:bg-neutral-900 transition-colors text-center">
                Xem Lịch Sử Đơn Hàng
              </Link>
              <Link to="/" className="px-6 py-3.5 bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-none clip-path-rog hover:bg-neutral-900 transition-colors text-center">
                Về Trang Chủ
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] py-16">
        <div className="max-w-xl mx-auto px-4 text-center space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm clip-path-rog p-10 space-y-4">
            <ShoppingBag className="w-16 h-16 text-neutral-600 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Giỏ Hàng Trống</h2>
            <p className="text-slate-600 text-sm">Bạn chưa chọn sản phẩm máy tính nào vào giỏ hàng.</p>
            <Link to="/products" className="inline-block px-6 py-3 bg-red-600 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog hover:bg-red-500 transition-colors">
              Khám Phá Sản Phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Yêu cầu đăng nhập trước khi thanh toán
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] py-12">
        <div className="max-w-xl mx-auto px-4 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm clip-path-rog p-10 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-none clip-path-rog flex items-center justify-center mx-auto border border-red-600/20">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">Yêu Cầu Đăng Nhập</h2>
              <p className="text-slate-700 text-sm">
                Vui lòng đăng nhập hoặc đăng ký tài khoản để tiến hành thanh toán đơn hàng.
              </p>
            </div>

            <div className="p-4 rounded-none clip-path-rog bg-white/60 border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Sản phẩm trong giỏ:</span>
                <span className="font-bold text-slate-900">{cart.length} món</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Tổng tạm tính:</span>
                <span className="font-bold text-red-500">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                to="/login"
                state={{ redirect: '/checkout' }}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Đăng Nhập / Đăng Ký Để Thanh Toán
              </Link>
              <Link
                to="/products"
                className="block w-full py-2.5 bg-slate-50 border border-slate-300 hover:border-red-600/40 text-slate-700 font-semibold rounded-none clip-path-rog text-sm transition-colors"
              >
                Tiếp Tục Mua Sắm
              </Link>
            </div>

            <p className="text-[10px] text-slate-500 pt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Thông tin của bạn được bảo mật bởi chuẩn SSL 256-bit
            </p>
          </div>
        </div>
      </div>
    );
  }



    return (
      <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pb-20 pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Giỏ Hàng & Thanh Toán</h1>



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        <div className="lg:col-span-7 space-y-6">

          <div className="bg-white border border-slate-200 shadow-sm clip-path-rog rounded-none clip-path-rog p-6 space-y-4">

            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center justify-between">

              <span>Sản Phẩm Trong Giỏ ({cart.length})</span>

              <button onClick={() => navigate('/products')} className="text-xs text-red-500 hover:underline">+ Thêm sản phẩm</button>

            </h2>



            <div className="divide-y divide-slate-200">

              {cart.map(item => (

                <div key={item.id} className="py-4 flex items-center gap-4">

                  <img src={resolveImage(item.image_url)} alt={item.name} className="w-20 h-20 rounded-none clip-path-rog object-cover bg-white" onError={onImageError} />

                  <div className="flex-1 min-w-0">

                    <h3 className="font-semibold text-slate-900 text-sm truncate">{item.name}</h3>

                    <div className="text-xs text-slate-600 mt-1">{item.cpu} • {item.ram}</div>

                    <div className="text-red-500 font-bold text-sm mt-1">{formatPrice(item.price)}</div>

                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg p-1">

                    <button

                      onClick={() => updateQuantity(item.id, item.quantity - 1)}

                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"

                      aria-label="Giảm số lượng"

                      disabled={item.quantity <= 1}

                    >

                      <Minus className="w-4 h-4" />

                    </button>

                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>

                    <button

                      onClick={() => updateQuantity(item.id, item.quantity + 1)}

                      className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30"

                      aria-label="Tăng số lượng"

                      disabled={item.stock && item.quantity >= item.stock}

                    >

                      <Plus className="w-4 h-4" />

                    </button>

                  </div>

                  <button

                    onClick={() => {

                      askConfirm({

                        title: 'Xóa sản phẩm?',

                        message: `Xóa "${item.name}" khỏi giỏ hàng?`,

                        variant: 'danger',

                        confirmText: 'Xóa',

                        onConfirm: () => {

                          removeFromCart(item.id);

                          showToast.success('Đã xóa sản phẩm khỏi giỏ hàng');

                          closeConfirm();

                        }

                      });

                    }}

                    className="p-2 text-slate-500 hover:text-rose-400"

                    aria-label="Xóa sản phẩm"

                  >

                    <Trash2 className="w-5 h-5" />

                  </button>

                </div>

              ))}

            </div>

          </div>



          <div className="bg-white border border-slate-200 shadow-sm clip-path-rog rounded-none clip-path-rog p-5 space-y-3">

            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Tag className="w-4 h-4 text-red-500" /> Mã Giảm Giá Ưu Đãi</h3>



            {appliedCoupon ? (

              <div className="flex items-center justify-between gap-3 p-3 bg-red-600/10 border border-red-600/30 rounded-none clip-path-rog">

                <div>

                  <div className="text-emerald-300 font-bold text-sm flex items-center gap-1.5">

                    <CheckCircle className="w-4 h-4" /> {appliedCoupon.code} (-{appliedCoupon.discount_percent}%)

                  </div>

                  <div className="text-xs text-slate-600 mt-0.5">Đã giảm {formatPrice(discountAmount)}</div>

                </div>

                <button onClick={removeCoupon} className="text-xs text-rose-400 hover:underline">Hủy mã</button>

              </div>

            ) : (

              <>

                <form onSubmit={applyCoupon} className="flex gap-2">

                  <input

                    type="text"

                    placeholder="Nhập mã giảm giá..."

                    value={couponCode}

                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}

                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 uppercase focus:outline-none focus:border-red-600"

                  />

                  <button

                    type="submit"

                    disabled={couponLoading}

                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-slate-900 font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs flex items-center gap-2 transition-colors"

                  >

                    {couponLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Áp Dụng'}

                  </button>

                </form>



                {/* Available coupons button */}

                {availableCoupons.length > 0 && (

                  <button

                    type="button"

                    onClick={() => setShowCouponList(!showCouponList)}

                    className="w-full mt-2 px-4 py-2 border border-dashed border-red-600/40 hover:border-red-600 rounded-none clip-path-rog text-xs text-red-500 flex items-center justify-center gap-2 transition-colors"

                  >

                    <Tag className="w-3.5 h-3.5" />

                    {showCouponList ? 'Ẩn mã giảm giá' : `Xem ${availableCoupons.length} mã giảm giá khả dụng`}

                  </button>

                )}



                {/* Available coupons list */}

                {showCouponList && availableCoupons.length > 0 && (

                  <div className="mt-2 space-y-2">

                    {availableCoupons.map(coupon => {

                      const now = new Date();

                      const isExpired = coupon.expires_at && new Date(coupon.expires_at) < now;

                      const isOutOfUses = coupon.remaining_uses !== undefined && coupon.remaining_uses <= 0;

                      const isDisabled = isExpired || isOutOfUses;



                      return (

                        <div

                          key={coupon.id}

                          className={`relative p-3 rounded-none clip-path-rog border ${

                            isDisabled 

                              ? 'bg-rose-950/20 border-rose-500/40 opacity-60' 

                              : 'bg-neutral-900/50 border-slate-700 hover:border-red-600/50'

                          }`}

                        >

                          {isDisabled && (

                            <div className="absolute inset-0 flex items-center justify-center bg-rose-950/30 rounded-none clip-path-rog z-10">

                              <span className="px-2 py-1 bg-rose-500 text-slate-900 text-[10px] font-bold rounded-full">

                                {isExpired ? 'ĐÃ HẾT HẠN' : 'ĐÃ HẾT LƯỢT DÙNG'}

                              </span>

                            </div>

                          )}

                          <div className="flex items-center justify-between">

                            <div>

                              <div className="flex items-center gap-2">

                                <span className="font-bold text-amber-400 text-sm">{coupon.code}</span>

                                <span className="text-xs text-red-500">-{coupon.discount_percent}%</span>

                              </div>

                              {coupon.min_order_amount > 0 && (

                                <div className="text-[10px] text-slate-600">Đơn tối thiểu {formatPrice(coupon.min_order_amount)}</div>

                              )}

                              {coupon.max_uses > 0 && !isOutOfUses && (

                                <div className="text-[10px] text-slate-600">

                                  Còn {coupon.remaining_uses !== undefined ? coupon.remaining_uses : coupon.max_uses} lượt dùng

                                  {coupon.max_reachable_users && coupon.max_reachable_users > 0 ? (

                                    <span className="text-slate-500"> · ≈ {coupon.max_reachable_users} người có thể dùng</span>

                                  ) : null}

                                </div>

                              )}

                              {coupon.has_unused_slots && coupon.max_reachable_users && (

                                <div className="text-[10px] text-amber-400/80">

                                  ⚠ Còn lượt không user nào dùng được (max_uses không chia hết cho usage_per_user)

                                </div>

                              )}

                            </div>

                            {!isDisabled && (

                              <button

                                type="button"

                                onClick={() => handleQuickApplyCoupon(coupon)}

                                className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-500 text-xs font-bold rounded-lg transition-colors"

                              >

                                Dùng

                              </button>

                            )}

                          </div>

                        </div>

                      );

                    })}

                  </div>

                )}

              </>

            )}



            {couponError && !appliedCoupon && (

              <div className="text-xs text-rose-400">{couponError}</div>

            )}

          </div>



        </div>



        <div className="lg:col-span-5">

          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 shadow-sm clip-path-rog rounded-none clip-path-rog p-6 space-y-5">

            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center justify-between">

              <span className="flex items-center gap-2">

                <MapPin className="w-5 h-5 text-red-500" /> Thông Tin Nhận Hàng

              </span>

              {/* Quick address selection */}

              {savedAddresses.length > 0 && (

                <button

                  type="button"

                  onClick={() => setShowAddressList(!showAddressList)}

                  className="px-3 py-1.5 bg-red-600/10 border border-red-600/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-600/20 transition-colors flex items-center gap-1.5"

                >

                  <MapPin className="w-3.5 h-3.5" />

                  {showAddressList ? 'Ẩn địa chỉ' : `Chọn địa chỉ (${savedAddresses.length})`}

                </button>

              )}

            </h2>



            {/* Saved addresses quick select */}

            {showAddressList && savedAddresses.length > 0 && (

              <div className="p-3 bg-red-600/5 border border-red-600/20 rounded-none clip-path-rog space-y-2">

                <p className="text-xs text-slate-600 font-semibold">Địa chỉ đã lưu - nhấn để chọn nhanh:</p>

                {loadingAddresses ? (

                  <div className="flex items-center gap-2 text-xs text-slate-600">

                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải địa chỉ...

                  </div>

                ) : (

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                    {savedAddresses.map(addr => (

                      <button

                        key={addr.id}

                        type="button"

                        onClick={() => applySavedAddress(addr)}

                        className="p-3 bg-slate-50 border border-slate-300 hover:border-red-600/50 rounded-none clip-path-rog text-left transition-colors"

                      >

                        <div className="flex items-center justify-between">

                          <span className="font-semibold text-slate-900 text-xs">{addr.full_name}</span>

                          {addr.is_default && (

                            <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 text-[9px] font-bold rounded-full">

                              Mặc định

                            </span>

                          )}

                        </div>

                        <p className="text-[10px] text-slate-600 mt-0.5">{addr.phone}</p>

                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">

                          {addr.address}{addr.ward_name ? `, ${addr.ward_name}` : ''}{addr.district_name ? `, ${addr.district_name}` : ''}

                        </p>

                      </button>

                    ))}

                  </div>

                )}

              </div>

            )}



            <div className="space-y-4">

              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và Tên *</label>

                <input

                  type="text" required

                  value={formData.full_name}

                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}

                  placeholder="Nguyễn Văn A"

                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600"

                />

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Điện Thoại *</label>

                  <input

                    type="tel" required

                    value={formData.phone}

                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}

                    placeholder="0912 345 678"

                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600"

                  />

                </div>

                <div>

                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>

                  <input

                    type="email"

                    value={formData.email}

                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}

                    placeholder="email@example.com"

                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600"

                  />

                </div>

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1.5">

                  Tỉnh/Thành phố

                </label>

                <input

                  type="text"

                  value="Thành phố Huế"

                  readOnly

                  className="w-full px-4 py-2.5 bg-neutral-900 border border-slate-700 rounded-none clip-path-rog text-sm text-slate-600 cursor-not-allowed"

                />

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1.5">

                  Quận / Huyện <span className="text-rose-400">*</span>

                </label>

                {loadingLocations ? (

                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-600">

                    <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...

                  </div>

                ) : (

                  <div className="relative">

                    <select

                      value={selectedDistrict}

                      onChange={e => setSelectedDistrict(e.target.value)}

                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600 appearance-none pr-10 cursor-pointer"

                    >

                      <option value="">— Chọn Quận / Huyện —</option>

                      {districts.map(d => (

                        <option key={d.id} value={d.id}>

                          {d.name} ({d.zone === 1 ? 'Nội thành' : d.zone === 2 ? 'Vùng lân cận' : 'Ngoại vi'})

                        </option>

                      ))}

                    </select>

                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />

                  </div>

                )}

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1.5">

                  Phường / Xã <span className="text-rose-400">*</span>

                </label>

                <div className="relative">

                  <select

                    value={selectedWard}

                    onChange={e => setSelectedWard(e.target.value)}

                    disabled={!selectedDistrict}

                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600 appearance-none pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"

                  >

                    <option value="">— Chọn Phường / Xã —</option>

                    {wards.map(w => (

                      <option key={w.id} value={w.id}>{w.name}</option>

                    ))}

                  </select>

                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />

                </div>

                {!selectedDistrict && (

                  <p className="text-[10px] text-slate-500 mt-1">Chọn Quận/Huyện trước</p>

                )}

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1.5">

                  Địa chỉ chi tiết <span className="text-rose-400">*</span>

                </label>

                <input

                  type="text"

                  value={streetAddress}

                  onChange={e => setStreetAddress(e.target.value)}

                  placeholder="VD: 123 Nguyễn Huệ"

                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600"

                />

              </div>



              {/* Shipping fee indicator */}

              {selectedDistrictInfo && (

                <div className="p-3 rounded-none clip-path-rog bg-red-600/10 border border-red-600/20 flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <MapPin className="w-4 h-4 text-red-500" />

                    <span className="text-xs text-slate-700">Phí giao hàng khu vực này:</span>

                  </div>

                  <span className="font-bold text-red-500">{formatPrice(selectedDistrictInfo.shipping_fee)}</span>

                </div>

              )}



              {/* Delivery zone notice */}

              <div className="p-2.5 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">

                <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />

                <p className="text-[10px] text-amber-300">

                  LaptopStore giao hàng trong <strong>TP. Huế và vùng ngoại vi 10km</strong>.

                  Nếu địa chỉ ngoài khu vực, vui lòng{' '}

                  <a href="/contact" className="underline font-semibold">liên hệ hỗ trợ</a>.

                </p>

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi Chú (tùy chọn)</label>

                <textarea

                  rows="2"

                  value={formData.notes}

                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}

                  placeholder="Yêu cầu giao hàng giờ hành chính..."

                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-none clip-path-rog text-sm text-slate-800 focus:outline-none focus:border-red-600"

                />

              </div>



              <div>

                <label className="block text-xs font-semibold text-slate-700 mb-2">Phương Thức Thanh Toán</label>

                <div className="space-y-2">

                  <label className={`flex items-center gap-3 p-3 rounded-none clip-path-rog border cursor-pointer text-xs font-medium ${formData.payment_method === 'COD' ? 'border-red-600 bg-cyan-950/40 text-red-400' : 'border-slate-200 text-slate-600'}`}>

                    <input type="radio" name="payment" value="COD" checked={formData.payment_method === 'COD'} onChange={() => setFormData({ ...formData, payment_method: 'COD' })} className="accent-red-600" />

                    <Truck className="w-4 h-4 text-red-500" />

                    <span>COD (Thanh toán khi nhận hàng)</span>

                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-none clip-path-rog border cursor-pointer text-xs font-medium ${formData.payment_method === 'BANK_TRANSFER' ? 'border-red-600 bg-cyan-950/40 text-red-400' : 'border-slate-200 text-slate-600'}`}>

                    <input type="radio" name="payment" value="BANK_TRANSFER" checked={formData.payment_method === 'BANK_TRANSFER'} onChange={() => setFormData({ ...formData, payment_method: 'BANK_TRANSFER' })} className="accent-red-600" />

                    <CreditCard className="w-4 h-4 text-red-500" />

                    <span>Chuyển Khoản Ngân Hàng Qua Mã QR</span>

                  </label>

                </div>

              </div>

            </div>



            <div className="pt-4 border-t border-slate-200 space-y-2">

              <div className="flex justify-between text-xs text-slate-600">

                <span>Tạm tính:</span>

                <span>{formatPrice(totalPrice)}</span>

              </div>

              {discountAmount > 0 && (

                <div className="flex justify-between text-xs text-rose-400 font-semibold">

                  <span>Giảm giá ({appliedCoupon.discount_percent}%):</span>

                  <span>-{formatPrice(discountAmount)}</span>

                </div>

              )}

              <div className="flex justify-between text-xs text-slate-600">

                <span>Phí vận chuyển:</span>

                <span className={shippingFee === 0 ? 'text-red-500 font-semibold' : ''}>

                  {shippingFee === 0 ? 'MIỄN PHÍ' : formatPrice(shippingFee)}

                </span>

              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">

                <span>Tổng cộng:</span>

                <span className="text-xl text-red-500">{formatPrice(finalPrice)}</span>

              </div>

            </div>



            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black tracking-widest uppercase rounded-none clip-path-rog transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Hàng'}
            </button>



            <p className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">

              <ShieldCheck className="w-3 h-3" /> Thông tin của bạn được bảo mật bởi chuẩn SSL 256-bit

            </p>

          </form>
        </div>
      </div>



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
    </div>
  );
}

