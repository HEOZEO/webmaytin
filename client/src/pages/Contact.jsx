import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, MessageSquare, Loader2, CheckCircle, Facebook, Youtube, Instagram, Globe, AlertCircle, Building2, Sparkles } from 'lucide-react';
import showToast from '../utils/toast';
import api from '../services/api';

const STORE_LOCATIONS = [
  {
    city: 'Hà Nội',
    address: 'Số 15 Phố Nhổn, P. Phương Canh, Q. Nam Từ Liêm',
    phone: '0912 345 678',
    hours: '8:00 - 22:00 (Tất cả các ngày)'
  },
  {
    city: 'TP. Hồ Chí Minh',
    address: 'Tầng 8 Toà nhà Handico, P. Mỹ Đình 1, Q. Nam Từ Liêm',
    phone: '0938 999 111',
    hours: '8:00 - 22:00 (Tất cả các ngày)'
  },
  {
    city: 'Đà Nẵng',
    address: 'Số 88 Trần Phú, Q. Hải Châu',
    phone: '0905 678 999',
    hours: '9:00 - 21:00 (Tất cả các ngày)'
  }
];

const SOCIALS = [
  { name: 'Facebook', icon: Facebook, color: 'hover:bg-blue-600', link: 'https://facebook.com' },
  { name: 'YouTube', icon: Youtube, color: 'hover:bg-rose-600', link: 'https://youtube.com' },
  { name: 'Instagram', icon: Instagram, color: 'hover:bg-pink-600', link: 'https://instagram.com' },
  { name: 'Website', icon: Globe, color: 'hover:bg-cyan-600', link: '/' }
];

const FAQ_QUICK = [
  { q: 'Còn hàng không?', a: 'Kiểm tra nhanh tại trang sản phẩm - hiển thị "Còn hàng" hoặc "Hết hàng" real-time.' },
  { q: 'Bảo hành bao lâu?', a: 'Bảo hành chính hãng 12-24 tháng tuỳ model. Hỗ trợ đổi trả 30 ngày đầu.' },
  { q: 'Trả góp 0%?', a: 'Có. Qua thẻ tín dụng Visa, Mastercard, JCB cho đơn từ 3 triệu.' }
];

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [myMessages, setMyMessages] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem('my_contact_messages');
      if (saved) setMyMessages(JSON.parse(saved));
    } catch {}
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';
    if (!form.email.trim()) newErrors.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email không đúng định dạng';
    if (form.phone && !/^[0-9+\-\s()]{8,15}$/.test(form.phone)) newErrors.phone = 'Số điện thoại không hợp lệ';
    if (!form.message.trim()) newErrors.message = 'Vui lòng nhập tin nhắn';
    else if (form.message.trim().length < 10) newErrors.message = 'Tin nhắn phải có ít nhất 10 ký tự';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      const res = await api.post('/contact', form);
      const newMsg = {
        ...form,
        id: res?.data?.data?.id || Date.now(),
        status: 'pending',
        created_at: new Date().toISOString(),
        reply: null
      };
      const updated = [newMsg, ...myMessages].slice(0, 5);
      setMyMessages(updated);
      try {
        localStorage.setItem('my_contact_messages', JSON.stringify(updated));
      } catch {}

      setSent(true);
      showToast.success('Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi trong 24h.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });

      setTimeout(() => setSent(false), 6000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Gửi tin nhắn thất bại. Vui lòng thử lại.';
      showToast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 sm:space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 animate-fadeInUp">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Liên Hệ Với Chúng Tôi
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white">
          Hỗ Trợ <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">24/7</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Đội ngũ tư vấn viên của LaptopStore luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn.
          Liên hệ ngay để được hỗ trợ nhanh nhất.
        </p>
      </section>

      {/* Quick contact cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <a href="tel:19006789" className="glass-card p-5 sm:p-6 rounded-2xl space-y-3 border-l-4 border-cyan-500 hover:border-cyan-400 hover:scale-[1.02] transition-all">
          <div className="inline-flex p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/30">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white">Hotline Bán Hàng</h3>
          <p className="text-xl sm:text-2xl font-black text-cyan-300">1900 6789</p>
          <p className="text-xs text-slate-400">8:00 - 22:00 (Tất cả các ngày, kể cả Lễ Tết)</p>
        </a>

        <a href="mailto:support@laptopstore.com" className="glass-card p-5 sm:p-6 rounded-2xl space-y-3 border-l-4 border-emerald-500 hover:border-emerald-400 hover:scale-[1.02] transition-all">
          <div className="inline-flex p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white">Email Hỗ Trợ</h3>
          <p className="text-base sm:text-lg font-bold text-emerald-300 truncate">support@laptopstore.com</p>
          <p className="text-xs text-slate-400">Phản hồi trong vòng 2 giờ làm việc</p>
        </a>

        <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-3 border-l-4 border-purple-500">
          <div className="inline-flex p-2.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white">Live Chat Trực Tuyến</h3>
          <p className="text-base sm:text-lg font-bold text-purple-300">8:00 - 22:00</p>
          <p className="text-xs text-slate-400">Hỗ trợ qua Messenger & Zalo OA</p>
        </div>
      </section>

      {/* Form + stores */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-400" /> Hệ Thống Cửa Hàng
          </h2>
          <div className="space-y-3">
            {STORE_LOCATIONS.map((loc, idx) => (
              <div key={idx} className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 bg-cyan-500/10 rounded-lg text-cyan-400 border border-cyan-500/30">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="text-sm font-bold text-white">Cửa Hàng {loc.city}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{loc.address}</p>
                    <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="text-xs text-cyan-300 font-bold flex items-center gap-1 hover:text-cyan-200">
                      <Phone className="w-3 h-3" /> {loc.phone}
                    </a>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {loc.hours}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Socials */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Theo dõi chúng tôi</h3>
            <div className="flex gap-2">
              {SOCIALS.map(s => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.link}
                    title={s.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 transition-all ${s.color} hover:text-white hover:border-transparent`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* FAQ nhanh */}
          <div className="pt-4 border-t border-slate-800">
            <h3 className="text-sm font-bold text-white mb-3">Câu hỏi thường gặp</h3>
            <div className="space-y-2">
              {FAQ_QUICK.map((f, i) => (
                <details key={i} className="glass-card rounded-xl border border-slate-800 px-3 py-2">
                  <summary className="text-xs font-semibold text-cyan-300 cursor-pointer list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-slate-500">+</span>
                  </summary>
                  <p className="text-xs text-slate-400 mt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="glass-card p-5 sm:p-6 lg:p-8 rounded-2xl border border-slate-800 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Gửi Tin Nhắn Cho Chúng Tôi</h2>
              <p className="text-xs text-slate-400">Điền form bên dưới, chúng tôi sẽ phản hồi trong vòng 24h qua email</p>
            </div>

            {sent && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 animate-fadeInUp">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-emerald-300 font-bold">Tin nhắn đã được gửi thành công!</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">Mã tin nhắn #{Date.now().toString().slice(-6)} · Bạn có thể theo dõi phản hồi trong email</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Họ và Tên *</label>
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 focus:outline-none transition ${
                      errors.name ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                  {errors.name && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Email *</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 focus:outline-none transition ${
                      errors.email ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                  {errors.email && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Số Điện Thoại</label>
                  <input
                    type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="0912 345 678"
                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 focus:outline-none transition ${
                      errors.phone ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                    }`}
                  />
                  {errors.phone && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Chủ Đề</label>
                  <select
                    name="subject" value={form.subject} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Chọn chủ đề</option>
                    <option value="Tư vấn mua hàng">Tư vấn mua hàng</option>
                    <option value="Bảo hành & Sửa chữa">Bảo hành & Sửa chữa</option>
                    <option value="Đổi trả & Hoàn tiền">Đổi trả & Hoàn tiền</option>
                    <option value="Hợp tác doanh nghiệp">Hợp tác doanh nghiệp</option>
                    <option value="Khiếu nại">Khiếu nại</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Tin Nhắn * <span className="text-slate-500 font-normal">({form.message.length} ký tự)</span>
                </label>
                <textarea
                  rows="5" name="message" value={form.message} onChange={handleChange}
                  placeholder="Nhập nội dung tin nhắn của bạn (ít nhất 10 ký tự)..."
                  className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 focus:outline-none transition resize-none ${
                    errors.message ? 'border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                  }`}
                />
                {errors.message && <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.message}</p>}
              </div>

              <button
                type="submit" disabled={sending}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send className="w-4 h-4" /> Gửi Tin Nhắn</>
                )}
              </button>
            </form>
          </div>

          {/* Lịch sử liên hệ của tôi */}
          {myMessages.length > 0 && (
            <div className="glass-card rounded-2xl border border-slate-800 mt-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Tin nhắn gần đây của bạn</h3>
                <span className="text-[10px] text-slate-500">{myMessages.length} tin nhắn</span>
              </div>
              <div className="divide-y divide-slate-800">
                {myMessages.map(m => (
                  <div key={m.id} className="p-4">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-white truncate">{m.subject || 'Tin nhắn'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          m.status === 'replied' ? 'bg-emerald-500/20 text-emerald-300' :
                          m.status === 'read' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-amber-500/20 text-amber-300'
                        }`}>
                          {m.status === 'replied' ? '✓ Đã phản hồi' : m.status === 'read' ? 'Đã xem' : '⏳ Đang chờ'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">{new Date(m.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{m.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
