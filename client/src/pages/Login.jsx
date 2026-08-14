import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import showToast from '../utils/toast';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Shield,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  Sparkles,
  Award,
  Truck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  MessageCircle,
  PhoneCall,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import Logo from '../components/Logo';

/* ---------- Validators (must match backend rules) ---------- */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

function validateField(name, value, all = {}) {
  switch (name) {
    case 'fullName':
      if (!value.trim()) return 'Vui lòng nhập họ và tên';
      if (value.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
      if (value.trim().length > 60) return 'Họ tên không quá 60 ký tự';
      return null;
    case 'identifier':
      if (!value.trim()) return 'Vui lòng nhập email hoặc tên đăng nhập';
      if (value.includes(' ')) return 'Email/tên đăng nhập không chứa khoảng trắng';
      if (value.includes('@') && !emailRegex.test(value.trim())) {
        return 'Email không đúng định dạng';
      }
      return null;
    case 'email':
      if (!value.trim()) return 'Vui lòng nhập email';
      if (!emailRegex.test(value.trim())) return 'Email không đúng định dạng';
      return null;
    case 'phone':
      if (!value.trim()) return 'Vui lòng nhập số điện thoại';
      if (!phoneRegex.test(value.trim().replace(/\s/g, ''))) {
        return 'Số điện thoại không hợp lệ (VD: 0912345678)';
      }
      return null;
    case 'address':
      if (!value.trim()) return 'Vui lòng nhập địa chỉ';
      if (value.trim().length < 10) return 'Địa chỉ phải có ít nhất 10 ký tự';
      return null;
    case 'password':
      return validatePasswordLive(value);
    case 'confirmPassword':
      if (!value) return 'Vui lòng xác nhận mật khẩu';
      if (value !== all.password) return 'Mật khẩu xác nhận không khớp';
      return null;
    default:
      return null;
  }
}

function validatePasswordLive(pw = '') {
  if (!pw) return 'Vui lòng nhập mật khẩu';
  if (pw.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự';
  if (pw.length > 128) return 'Mật khẩu không quá 128 ký tự';
  if (!/[A-Z]/.test(pw)) return 'Cần ít nhất 1 chữ HOA (A-Z)';
  if (!/[a-z]/.test(pw)) return 'Cần ít nhất 1 chữ thường (a-z)';
  if (!/\d/.test(pw)) return 'Cần ít nhất 1 chữ số (0-9)';
  if (!/[@$!%*?&]/.test(pw)) return 'Cần ít nhất 1 ký tự đặc biệt (@$!%*?&)';
  return null;
}

function passwordStrength(pw = '') {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[@$!%*?&]/.test(pw)) score++;
  return score; // 0-5
}

const STRENGTH_LABELS = ['Rất yếu', 'Yếu', 'Trung bình', 'Khá', 'Mạnh', 'Rất mạnh'];
const STRENGTH_COLORS = [
  'bg-rose-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-emerald-500',
  'bg-emerald-400'
];

const PASSWORD_RULES = [
  { id: 'len', label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
  { id: 'upper', label: '1 chữ HOA (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: '1 chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: '1 chữ số (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: '1 ký tự đặc biệt (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) }
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: Shield,
    title: 'Bảo mật chuẩn quốc tế',
    desc: 'Mật khẩu mã hoá bcrypt, xác thực JWT, khoá tài khoản sau 5 lần sai.'
  },
  {
    icon: Truck,
    title: 'Giao hàng toàn quốc',
    desc: 'Freeship đơn từ 2 triệu · COD linh hoạt · đổi trả 7 ngày.'
  },
  {
    icon: Award,
    title: 'Ưu đãi thành viên',
    desc: 'Tích điểm mọi đơn hàng, nhận voucher sinh nhật và quà tặng riêng.'
  },
  {
    icon: Sparkles,
    title: 'Trải nghiệm mượt mà',
    desc: 'Theo dõi đơn hàng realtime, hỗ trợ 24/7 qua hotline 1900 6789.'
  }
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'

  /* ---------------- Login state ---------------- */
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginAttemptsLeft, setLoginAttemptsLeft] = useState(null);
  const [loginLockedUntil, setLoginLockedUntil] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountLockedByAdmin, setAccountLockedByAdmin] = useState(false);

  /* ---------------- Register state ---------------- */
  const [reg, setReg] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
    accept: false
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [acceptTouched, setAcceptTouched] = useState(false);
  const [regError, setRegError] = useState('');
  const [regStep, setRegStep] = useState('form'); // 'form' | 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [otpValue, setOtpValue] = useState('');

  const toggleMode = (newMode) => {
    setMode(newMode);
  };

  /* ---------------- Forgot password state ---------------- */
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const identifierRef = useRef(null);

  /* Redirect away if already authenticated */
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from || (user?.role === 'admin' || user?.role === 'staff' ? '/admin' : '/');
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state]);

  /* Reset errors when switching modes */
  useEffect(() => {
    setLoginError('');
    setRegError('');
    setRegErrors({});
    setForgotError('');
    setForgotSent(false);
    setAcceptTouched(false);
    setRegStep('form');
    setOtpSent(false);
    setOtpValue('');
    setOtpResendCountdown(0);
    setAccountLockedByAdmin(false);
  }, [mode]);

  /* Auto-focus first field when mode changes */
  useEffect(() => {
    const t = setTimeout(() => {
      if (mode === 'login') identifierRef.current?.focus();
      else if (mode === 'register') document.getElementById('reg-fullName')?.focus();
      else if (mode === 'forgot') document.getElementById('forgot-email')?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [mode]);

  /* Live re-validation on register */
  useEffect(() => {
    if (mode !== 'register') return;
    const newErrors = {};
    Object.keys(touched).forEach((key) => {
      if (touched[key]) {
        const err = validateField(key, reg[key], reg);
        if (err) newErrors[key] = err;
      }
    });
    setRegErrors(newErrors);
  }, [reg, touched, mode]);

  /* OTP countdown */
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const t = setInterval(() => {
      setOtpResendCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [otpResendCountdown]);

  /* OTP input auto-focus */
  useEffect(() => {
    if (regStep === 'otp') {
      const t = setTimeout(() => document.getElementById('otp-input-0')?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [regStep]);

  const regStrength = useMemo(() => passwordStrength(reg.password), [reg.password]);
  const regPasswordOk = reg.password && !validatePasswordLive(reg.password);

  const handleLogin = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setLoginError('');

      const idErr = validateField('identifier', identifier);
      const pwErr = !loginPassword ? 'Vui lòng nhập mật khẩu' : null;
      if (idErr) {
        setLoginError(idErr);
        return;
      }
      if (pwErr) {
        setLoginError(pwErr);
        return;
      }

      setSubmitting(true);
      try {
        const isEmail = identifier.trim().includes('@');
        let res;
        if (isEmail) {
          res = await login({ email: identifier.trim(), password: loginPassword, remember });
        } else {
          res = await login({ username: identifier.trim(), password: loginPassword, remember });
        }
        const loggedInUser = res?.user || res?.data?.user;
        showToast.success(`Chào mừng ${loggedInUser?.full_name || 'bạn'} quay lại!`);
        const redirectTo = location.state?.from || (loggedInUser?.role === 'admin' || loggedInUser?.role === 'staff' ? '/admin' : '/');
        navigate(redirectTo, { replace: true });
      } catch (err) {
        // api.js interceptor trả về object { status, message, data } ở top level
        const data = err?.data || {};
        const status = err?.status;
        // Tài khoản bị admin khoá (is_active=false) — code ACCOUNT_LOCKED, status 403
        if (status === 403 && (data?.code === 'ACCOUNT_LOCKED' || data?.locked === true)) {
          setAccountLockedByAdmin(true);
          setLoginError('');
        } else if (status === 423 || data?.locked) {
          const minutes = Math.ceil((data?.remainingTime || 900) / 60);
          setLoginLockedUntil(Date.now() + (data?.remainingTime || 900) * 1000);
          setLoginError(`Tài khoản tạm khoá. Vui lòng thử lại sau ${minutes} phút.`);
        } else if (typeof data?.attempts === 'number') {
          setLoginAttemptsLeft(Math.max(0, 5 - data.attempts));
          setLoginError(
            data?.message ||
              `Sai thông tin đăng nhập. Bạn còn ${Math.max(0, 5 - data.attempts)} lần thử.`
          );
        } else {
          setLoginError(err?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [identifier, loginPassword, remember, login, navigate, location.state]
  );

  const handleSendOTP = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setRegError('');

      const fields = ['fullName', 'email', 'phone', 'password', 'confirmPassword'];
      const newErrors = {};
      fields.forEach((f) => {
        const err = validateField(f, reg[f], reg);
        if (err) newErrors[f] = err;
      });

      setRegErrors(newErrors);
      setTouched(Object.fromEntries(fields.map((f) => [f, true])));

      if (!reg.accept) {
        setAcceptTouched(true);
        setRegError('Bạn cần đồng ý với Điều khoản dịch vụ & Chính sách bảo mật để tiếp tục.');
        return;
      }

      if (Object.keys(newErrors).length > 0) {
        setRegError('Vui lòng kiểm tra lại các trường được đánh dấu đỏ.');
        return;
      }

      setSubmitting(true);
      try {
        await authService.sendRegisterOTP(reg.email.trim().toLowerCase());
        setOtpSent(true);
        setRegStep('otp');
        setOtpResendCountdown(60);
        showToast.success('Mã xác thực đã được gửi đến email của bạn!');
      } catch (err) {
        const data = err?.data || {};
        if (typeof data?.message === 'string') {
          setRegError(data.message);
          if (data.message.includes('Email')) {
            setRegErrors((prev) => ({ ...prev, email: data.message }));
          }
        } else {
          setRegError('Không thể gửi mã xác thực. Vui lòng thử lại.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [reg]
  );

  const handleResendOTP = useCallback(async () => {
    if (otpResendCountdown > 0) return;
    setSubmitting(true);
    setRegError('');
    try {
      await authService.sendRegisterOTP(reg.email.trim().toLowerCase());
      setOtpResendCountdown(60);
      showToast.success('Mã xác thực mới đã được gửi!');
      } catch (err) {
        const data = err?.data || {};
        setRegError(data?.message || 'Không thể gửi lại mã. Vui lòng thử lại.');
      } finally {
        setSubmitting(false);
      }
  }, [reg.email, otpResendCountdown]);

  const handleVerifyOTP = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setRegError('');

      if (otpValue.trim().length !== 6) {
        setRegError('Vui lòng nhập đủ 6 chữ số của mã xác thực.');
        return;
      }

      setSubmitting(true);
      try {
        await authService.verifyRegisterOTP({
          email: reg.email.trim().toLowerCase(),
          otp_code: otpValue.trim(),
          full_name: reg.fullName.trim(),
          password: reg.password,
          phone: reg.phone.trim().replace(/\s/g, ''),
          remember: true
        });
        showToast.success('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
        // Reset form and go to login
        setReg({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', accept: false });
        setRegErrors({});
        setTouched({});
        setRegError('');
        setRegStep('form');
        setOtpValue('');
        setOtpSent(false);
        toggleMode('login');
      } catch (err) {
        const data = err?.data || {};
        if (typeof data?.message === 'string') {
          setRegError(data.message);
        } else {
          setRegError('Mã xác thực không đúng hoặc đã hết hạn.');
        }
      } finally {
        setSubmitting(false);
      }
    },
    [otpValue, reg, toggleMode]
  );

  const handleOTPInputChange = (index, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const newOtp = otpValue.split('');
    newOtp[index] = cleaned;
    const joined = newOtp.join('');
    setOtpValue(joined);
    if (cleaned && index < 5) {
      document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`)?.focus();
    }
  };

  const handleOTPpaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtpValue(pasted);
    if (pasted.length === 6) {
      document.getElementById('otp-input-5')?.focus();
    }
  };

  const handleForgot = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setForgotError('');

      const err = validateField('email', forgotEmail);
      if (err) {
        setForgotError(err);
        return;
      }

      setSubmitting(true);
      try {
        await authService.forgotPassword(forgotEmail.trim().toLowerCase());
        setForgotSent(true);
        showToast.success('Yêu cầu đã gửi. Vui lòng kiểm tra email của bạn.');
      } catch (err) {
        const data = err?.data || {};
        if (data?.message) setForgotError(data.message);
        else setForgotError('Không thể gửi yêu cầu. Vui lòng thử lại sau.');
      } finally {
        setSubmitting(false);
      }
    },
    [forgotEmail]
  );

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-cyan-500/20 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-[520px] h-[520px] rounded-full bg-purple-500/20 blur-3xl animate-float-slower" />
        <div className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full bg-sky-500/15 blur-3xl animate-float-slowest" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* ====== LEFT: Brand panel ====== */}
          <div className="hidden lg:flex flex-col gap-8 animate-fadeInUp">
            <div className="flex items-center gap-3">
              <Logo size={52} />
              <div>
                <p className="text-[11px] font-bold tracking-[0.3em] text-cyan-400 uppercase">Laptop Store</p>
                <p className="text-xs text-slate-400">High Tech Hub · Since 2020</p>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight">
                Mua laptop chính hãng
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 bg-clip-text text-transparent">
                  Nhanh chóng & an toàn
                </span>
              </h1>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                Đăng nhập để theo dõi đơn hàng, lưu danh sách yêu thích và nhận ưu đãi
                dành riêng cho thành viên Laptop Store.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FEATURE_HIGHLIGHTS.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="glass-card rounded-2xl p-4 space-y-2 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{f.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ====== RIGHT: Auth card ====== */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-sky-500/30 to-purple-500/30 blur-2xl opacity-50" />
            <div className="relative glass-card rounded-3xl p-6 sm:p-8 glow-blue border-cyan-500/20 animate-fadeInUp">
              {/* Tab switcher */}
              <div className="flex p-1 rounded-2xl bg-slate-900/70 border border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => toggleMode('login')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-center ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => toggleMode('register')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all text-center ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Đăng ký
                </button>
              </div>

              {/* Header */}
              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-2">
                  {mode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => toggleMode('login')}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                      aria-label="Quay lại đăng nhập"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                    {mode === 'login' ? <Lock className="w-5 h-5 text-cyan-400" /> : mode === 'register' ? <User className="w-5 h-5 text-cyan-400" /> : <KeyRound className="w-5 h-5 text-cyan-400" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {mode === 'login' && 'Chào mừng bạn quay lại'}
                      {mode === 'register' && 'Tạo tài khoản mới'}
                      {mode === 'forgot' && 'Khôi phục mật khẩu'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {mode === 'login' && 'Đăng nhập để tiếp tục mua sắm'}
                      {mode === 'register' && 'Chỉ mất 30 giây để bắt đầu'}
                      {mode === 'forgot' && 'Nhập email để nhận liên kết đặt lại mật khẩu'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ====================== LOGIN ====================== */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  {accountLockedByAdmin && (
                    <AccountLockedByAdminAlert />
                  )}
                  {loginError && !accountLockedByAdmin && (
                    <AlertBox type="error" message={loginError} attempts={loginAttemptsLeft} />
                  )}

                  <Field
                    label="Email hoặc tên đăng nhập"
                    icon={Mail}
                    type="text"
                    placeholder="admin hoặc email@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    inputRef={identifierRef}
                    autoComplete="username"
                    disabled={submitting || !!loginLockedUntil || accountLockedByAdmin}
                  />

                  <Field
                    label="Mật khẩu"
                    icon={Lock}
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={submitting || !!loginLockedUntil || accountLockedByAdmin}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((v) => !v)}
                        className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />

                  <div className="flex items-center justify-between text-xs">
                    <label className={`flex items-center gap-2 cursor-pointer ${accountLockedByAdmin ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white'}`}>
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={accountLockedByAdmin}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 disabled:opacity-50"
                      />
                      Ghi nhớ đăng nhập
                    </label>
                    {!accountLockedByAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleMode('forgot')}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !!loginLockedUntil || accountLockedByAdmin}
                    className="group relative w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                  >
                    {submitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang xác thực...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Đăng nhập
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </button>

                  {!accountLockedByAdmin && (
                    <p className="text-center text-xs text-slate-400 pt-2">
                      Chưa có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => toggleMode('register')}
                        className="text-cyan-400 font-semibold hover:underline"
                      >
                        Đăng ký ngay
                      </button>
                    </p>
                  )}
                </form>
              )}

              {/* ====================== REGISTER ====================== */}
              {mode === 'register' && (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mb-5">
                    <div className={`flex items-center gap-1.5 ${regStep === 'form' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${regStep === 'form' ? 'bg-cyan-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}>
                        {regStep === 'form' ? '1' : <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-xs font-semibold">
                        {regStep === 'form' ? 'Thông tin' : 'Đã xác thực'}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-slate-800" />
                    <div className={`flex items-center gap-1.5 ${regStep === 'otp' ? 'text-cyan-400' : 'text-slate-600'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${regStep === 'otp' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                        2
                      </div>
                      <span className="text-xs font-semibold">Xác thực</span>
                    </div>
                  </div>

                  {regError && <AlertBox type="error" message={regError} />}

                  {regStep === 'form' ? (
                    /* ====== STEP 1: Fill info & send OTP ====== */
                    <form onSubmit={handleSendOTP} noValidate className="space-y-3.5">
                      <Field
                        id="reg-fullName"
                        label="Họ và tên"
                        icon={User}
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={reg.fullName}
                        onChange={(e) => setReg({ ...reg, fullName: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                        error={regErrors.fullName}
                        autoComplete="name"
                        disabled={submitting}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <Field
                          id="reg-email"
                          label="Email"
                          icon={Mail}
                          type="email"
                          placeholder="email@example.com"
                          value={reg.email}
                          onChange={(e) => setReg({ ...reg, email: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                          error={regErrors.email}
                          autoComplete="email"
                          disabled={submitting}
                        />
                        <Field
                          id="reg-phone"
                          label="Số điện thoại"
                          icon={Phone}
                          type="tel"
                          placeholder="0912 345 678"
                          value={reg.phone}
                          onChange={(e) => setReg({ ...reg, phone: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                          error={regErrors.phone}
                          autoComplete="tel"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <Field
                          id="reg-password"
                          label="Mật khẩu"
                          icon={Lock}
                          type={showRegPassword ? 'text' : 'password'}
                          placeholder="Tối thiểu 8 ký tự"
                          value={reg.password}
                          onChange={(e) => setReg({ ...reg, password: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                          error={regErrors.password}
                          autoComplete="new-password"
                          disabled={submitting}
                          trailing={
                            <button
                              type="button"
                              onClick={() => setShowRegPassword((v) => !v)}
                              className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                              tabIndex={-1}
                            >
                              {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          }
                        />
                        {/* Strength meter */}
                        {reg.password && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-semibold uppercase tracking-wider">Độ mạnh</span>
                              <span className={`font-bold ${STRENGTH_COLORS[regStrength].replace('bg-', 'text-')}`}>
                                {STRENGTH_LABELS[regStrength]}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${STRENGTH_COLORS[regStrength]}`}
                                style={{ width: `${(regStrength / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Rules checklist */}
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                          {PASSWORD_RULES.map((rule) => {
                            const passed = rule.test(reg.password);
                            return (
                              <div
                                key={rule.id}
                                className={`flex items-center gap-1.5 ${passed ? 'text-emerald-400' : 'text-slate-500'}`}
                              >
                                {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                <span>{rule.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Field
                        id="reg-confirm"
                        label="Xác nhận mật khẩu"
                        icon={Shield}
                        type={showRegConfirm ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        value={reg.confirmPassword}
                        onChange={(e) => setReg({ ...reg, confirmPassword: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                        error={regErrors.confirmPassword}
                        success={reg.confirmPassword && reg.confirmPassword === reg.password && regPasswordOk}
                        autoComplete="new-password"
                        disabled={submitting}
                        trailing={
                          <button
                            type="button"
                            onClick={() => setShowRegConfirm((v) => !v)}
                            className="text-slate-500 hover:text-cyan-400 transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                      />

                      {/* Terms acceptance */}
                      <div
                        className="flex items-start gap-2.5 pt-1 cursor-pointer group rounded-xl"
                        onClick={() => {
                          setReg({ ...reg, accept: !reg.accept });
                          setAcceptTouched(true);
                        }}
                      >
                        <div className="relative mt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            id="accept-terms"
                            checked={reg.accept}
                            readOnly
                            className={`w-4 h-4 rounded border transition-all appearance-none cursor-pointer ${
                              reg.accept
                                ? 'bg-cyan-500 border-cyan-500'
                                : acceptTouched && !reg.accept
                                ? 'border-rose-500 bg-rose-500/20'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                            style={{ accentColor: '#06b6d4' }}
                          />
                          {reg.accept && (
                            <Check className="absolute inset-0 w-4 h-4 text-slate-950 m-auto" style={{ width: 10, height: 10 }} />
                          )}
                        </div>
                        <label htmlFor="accept-terms" className="text-[11px] leading-relaxed cursor-pointer group-hover:text-slate-300">
                          <span className={acceptTouched && !reg.accept ? 'text-rose-400' : 'text-slate-400'}>
                            Tôi đồng ý với{' '}
                          </span>
                          <Link to="/page/policy" className="text-cyan-400 hover:underline">
                            Điều khoản dịch vụ
                          </Link>
                          <span className={acceptTouched && !reg.accept ? 'text-rose-400' : 'text-slate-400'}> và </span>
                          <Link to="/page/policy" className="text-cyan-400 hover:underline">
                            Chính sách bảo mật
                          </Link>
                          <span className={acceptTouched && !reg.accept ? 'text-rose-400' : 'text-slate-400'}> của Laptop Store.</span>
                        </label>
                      </div>
                      {acceptTouched && !reg.accept && (
                        <p className="text-[11px] text-rose-400 flex items-center gap-1 -mt-2">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          Bạn cần đồng ý với điều khoản để tiếp tục đăng ký
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="group relative w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 mt-2"
                      >
                        {submitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang gửi mã...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            Nhận mã xác thực
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* ====== STEP 2: Enter OTP ====== */
                    <form onSubmit={handleVerifyOTP} noValidate className="space-y-4">
                      <div className="text-center py-2">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                          <Mail className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white mb-1">Nhập mã xác thực</h3>
                        <p className="text-xs text-slate-400">
                          Mã đã được gửi đến{' '}
                          <span className="text-cyan-300 font-semibold">{reg.email}</span>
                        </p>
                        {otpResendCountdown > 0 && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Gửi lại sau {otpResendCountdown}s
                          </p>
                        )}
                      </div>

                      {/* OTP inputs */}
                      <div className="flex justify-center gap-2" onPaste={handleOTPpaste}>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <input
                            key={i}
                            id={`otp-input-${i}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpValue[i] || ''}
                            onChange={(e) => handleOTPInputChange(i, e.target.value)}
                            onKeyDown={(e) => handleOTPKeyDown(i, e)}
                            disabled={submitting}
                            className="w-11 h-12 text-center text-lg font-bold rounded-xl border bg-slate-900 text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 disabled:opacity-50"
                            style={{
                              borderColor: regError && otpValue.length < 6 ? '#f43f5e' : '#334155',
                              backgroundColor: '#0f172a'
                            }}
                          />
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || otpValue.trim().length !== 6}
                        className="group relative w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                      >
                        {submitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang xác thực...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            Xác thực & Đăng ký
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setRegStep('form');
                            setOtpValue('');
                            setRegError('');
                          }}
                          className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          Quay lại
                        </button>
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={otpResendCountdown > 0 || submitting}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                        >
                          Gửi lại mã
                        </button>
                      </div>
                    </form>
                  )}

                  <p className="text-center text-xs text-slate-400 pt-1">
                    Đã có tài khoản?{' '}
                    <button
                      type="button"
                      onClick={() => toggleMode('login')}
                      className="text-cyan-400 font-semibold hover:underline"
                    >
                      Đăng nhập ngay
                    </button>
                  </p>
                </>
              )}

              {/* ====================== FORGOT PASSWORD ====================== */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgot} noValidate className="space-y-4">
                  {forgotSent ? (
                    <div className="text-center py-6 space-y-3">
                      <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold text-white">Đã gửi email khôi phục!</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Vui lòng kiểm tra hộp thư <strong className="text-cyan-300">{forgotEmail}</strong>.
                        Liên kết đặt lại có hiệu lực trong 1 giờ.
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleMode('login')}
                        className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400"
                      >
                        Quay lại đăng nhập
                      </button>
                    </div>
                  ) : (
                    <>
                      {forgotError && <AlertBox type="error" message={forgotError} />}
                      <Field
                        id="forgot-email"
                        label="Email đăng ký"
                        icon={Mail}
                        type="email"
                        placeholder="email@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        autoComplete="email"
                        disabled={submitting}
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30"
                      >
                        {submitting ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang gửi...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Gửi liên kết khôi phục
                          </span>
                        )}
                      </button>
                      <p className="text-center text-xs text-slate-400">
                        Nhớ mật khẩu rồi?{' '}
                        <button
                          type="button"
                          onClick={() => toggleMode('login')}
                          className="text-cyan-400 font-semibold hover:underline"
                        >
                          Đăng nhập
                        </button>
                      </p>
                    </>
                  )}
                </form>
              )}
            </div>

            {/* Trust badges */}
            <div className="mt-5 flex items-center justify-center gap-5 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                SSL 256-bit
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Bcrypt Hash
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                JWT Auth
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ====================== Reusable bits ====================== */

function Field({
  label,
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  success,
  inputRef,
  disabled,
  trailing,
  autoComplete,
  id
}) {
  const [focused, setFocused] = useState(false);
  const showSuccess = success && !error;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-300">
          {label}
        </label>
      )}
      <div
        className={`relative rounded-xl bg-slate-900/80 border transition-all ${
          error
            ? 'border-rose-500/60 ring-1 ring-rose-500/20'
            : showSuccess
            ? 'border-emerald-500/40 ring-1 ring-emerald-500/10'
            : focused
            ? 'border-cyan-500/60 ring-2 ring-cyan-500/15'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {Icon && (
          <Icon
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              error ? 'text-rose-400' : showSuccess ? 'text-emerald-400' : focused ? 'text-cyan-400' : 'text-slate-500'
            }`}
          />
        )}
        <input
          id={id}
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onFocus={() => setFocused(true)}
          disabled={disabled}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 py-2.5 pl-10 pr-10 outline-none disabled:opacity-60"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {trailing}
          {showSuccess && <Check className="w-4 h-4 text-emerald-400" />}
          {error && <AlertCircle className="w-4 h-4 text-rose-400" />}
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function AlertBox({ type = 'error', message, attempts }) {
  const isError = type === 'error';
  return (
    <div
      className={`p-3 rounded-xl text-xs font-medium border ${
        isError
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
      }`}
    >
      <div className="flex items-start gap-2">
        {isError ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
        <div className="flex-1 space-y-1">
          <p>{message}</p>
          {typeof attempts === 'number' && attempts > 0 && (
            <p className="text-[11px] opacity-80">
              Bạn còn <strong>{attempts}</strong> lần thử trước khi tài khoản bị tạm khoá.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Cảnh báo khi tài khoản bị admin/staff khoá (is_active=false)
function AccountLockedByAdminAlert() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-transparent p-4 space-y-3 animate-fadeInUp">
      {/* Decorative blur */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-rose-500/30">
          <Ban className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-rose-200 flex items-center gap-1.5">
            Tài khoản đã bị khoá
          </h3>
          <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
            Tài khoản của bạn đã bị vô hiệu hoá bởi quản trị viên. Bạn không thể đăng nhập vào hệ thống
            cho đến khi được mở khoá lại. Vui lòng liên hệ bộ phận hỗ trợ để được hỗ trợ nhanh nhất.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative grid grid-cols-2 gap-2 pt-1">
        <Link
          to="/contact"
          className="group flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-[1.02]"
        >
          <MessageCircle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Liên hệ hỗ trợ
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <a
          href="tel:19006789"
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-200 font-bold text-xs hover:border-emerald-500/50 hover:text-emerald-300 transition-all"
        >
          <PhoneCall className="w-4 h-4" />
          Gọi 1900 6789
        </a>
      </div>

      <div className="relative flex items-center gap-1.5 text-[10px] text-rose-300/70 pt-1 border-t border-rose-500/20">
        <Shield className="w-3 h-3 flex-shrink-0" />
        <span>Hotline hỗ trợ: 8:00 - 22:00 (Tất cả các ngày, kể cả Lễ Tết)</span>
      </div>
    </div>
  );
}