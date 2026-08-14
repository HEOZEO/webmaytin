import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import showToast from '../utils/toast';
import { Lock, Eye, EyeOff, Loader2, ArrowRight, Shield, Check, X, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';
import authService from '../services/authService';

const PASSWORD_RULES = [
  { id: 'len', label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
  { id: 'upper', label: '1 chữ HOA (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: '1 chữ thường (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'digit', label: '1 chữ số (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: '1 ký tự đặc biệt (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) }
];

function passwordValid(pw = '') {
  if (!pw || pw.length < 8 || pw.length > 128) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/\d/.test(pw)) return false;
  if (!/[@$!%*?&]/.test(pw)) return false;
  return true;
}

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const pwRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
    } else {
      setTimeout(() => pwRef.current?.focus(), 80);
    }
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Liên kết không hợp lệ hoặc đã hết hạn.');
      return;
    }
    if (!passwordValid(password)) {
      setError('Mật khẩu chưa đáp ứng tất cả yêu cầu bảo mật.');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.resetPassword({ token, password });
      setDone(true);
      showToast.success('Đặt lại mật khẩu thành công!');
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      const msg = err?.data?.message;
      setError(msg || 'Không thể đặt lại mật khẩu. Liên kết có thể đã hết hạn.');
    } finally {
      setSubmitting(false);
    }
  };

  const allValid = passwordValid(password) && password === confirm;

  return (
    <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] rounded-full bg-purple-500/20 blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-[380px] h-[380px] rounded-full bg-cyan-500/20 blur-3xl animate-float-slower" />
      </div>

      <div className="max-w-md mx-auto px-4 py-12 lg:py-16">
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-pink-500/30 blur-2xl opacity-50" />
          <div className="relative glass-card rounded-3xl p-6 sm:p-8 glow-blue border-cyan-500/20 animate-fadeInUp">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Đặt lại mật khẩu</h2>
                <p className="text-xs text-slate-400">Nhập mật khẩu mới cho tài khoản của bạn</p>
              </div>
            </div>

            {done ? (
              <div className="text-center py-6 space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white">Mật khẩu đã được cập nhật!</h3>
                <p className="text-xs text-slate-400">
                  Đang chuyển về trang đăng nhập...
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl text-xs font-medium bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Mật khẩu mới</label>
                  <div className="relative rounded-xl bg-slate-900/80 border border-slate-800 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/15">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      ref={pwRef}
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 py-2.5 pl-10 pr-10 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <div key={rule.id} className={`flex items-center gap-1.5 ${passed ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            <span>{rule.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Xác nhận mật khẩu mới</label>
                  <div className={`relative rounded-xl bg-slate-900/80 border transition-all ${
                    confirm && confirm !== password
                      ? 'border-rose-500/60 ring-1 ring-rose-500/20'
                      : confirm && confirm === password
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/10'
                      : 'border-slate-800'
                  }`}>
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Nhập lại mật khẩu"
                      className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 py-2.5 pl-10 pr-10 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !allValid}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-500 to-sky-500 hover:from-cyan-300 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang cập nhật...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Đặt lại mật khẩu
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>

                <p className="text-center text-xs text-slate-400">
                  <Link to="/login" className="text-cyan-400 hover:underline font-semibold">
                    Quay lại đăng nhập
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}