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
  { name: 'Facebook', icon: Facebook, color: 'hover:bg-red-700', link: 'https://facebook.com' },
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
    <div className="min-h-screen bg-[#f4f5f6] relative">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* Hero */}
        <section className="text-center space-y-4 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Liên Hệ Với Chúng Tôi
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-black uppercase tracking-tight">
            Hỗ Trợ <span className="text-red-600">24/7</span>
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Đội ngũ tư vấn viên của LaptopStore luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn.
            Liên hệ ngay để được hỗ trợ nhanh nhất.
          </p>
        </section>

        {/* Quick contact cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <a href="tel:19006789" className="group bg-white border border-neutral-200 p-6 sm:p-8 rounded-xl shadow-sm space-y-4 border-l-4 border-l-red-600 hover:border-red-500 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex p-3 bg-red-50 rounded-lg text-red-600 border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-black uppercase tracking-wide">Hotline Bán Hàng</h3>
            <p className="text-2xl sm:text-3xl font-black text-red-600">1900 6789</p>
            <p className="text-xs text-neutral-500 font-medium">8:00 - 22:00 (Tất cả các ngày)</p>
          </a>

          <a href="mailto:support@laptopstore.com" className="group bg-white border border-neutral-200 p-6 sm:p-8 rounded-xl shadow-sm space-y-4 border-l-4 border-l-red-600 hover:border-red-500 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex p-3 bg-red-50 rounded-lg text-red-600 border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-black uppercase tracking-wide">Email Hỗ Trợ</h3>
            <p className="text-lg sm:text-xl font-bold text-neutral-800 truncate">support@laptopstore.com</p>
            <p className="text-xs text-neutral-500 font-medium">Phản hồi trong vòng 2 giờ làm việc</p>
          </a>

          <div className="group bg-white border border-neutral-200 p-6 sm:p-8 rounded-xl shadow-sm space-y-4 border-l-4 border-l-red-600 hover:border-red-500 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="inline-flex p-3 bg-red-50 rounded-lg text-red-600 border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-black uppercase tracking-wide">Live Chat</h3>
            <p className="text-xl sm:text-2xl font-black text-red-600">8:00 - 22:00</p>
            <p className="text-xs text-neutral-500 font-medium">Hỗ trợ qua Messenger & Zalo OA</p>
          </div>
        </section>

      {/* Form + stores */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-black uppercase tracking-wide border-b border-neutral-200 pb-3 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-600" /> Hệ Thống Cửa Hàng
          </h2>
          <div className="space-y-4">
            {STORE_LOCATIONS.map((loc, idx) => (
              <div key={idx} className="group bg-white border border-neutral-200 p-4 sm:p-5 rounded-lg hover:border-red-300 hover:shadow-sm transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2.5 bg-red-50 rounded-lg text-red-600 border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                    <h3 className="text-sm font-bold text-black">Cửa Hàng {loc.city}</h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">{loc.address}</p>
                    <a href={`tel:${loc.phone.replace(/\s/g, '')}`} className="text-xs text-red-600 font-bold flex items-center gap-1 hover:text-red-500">
                      <Phone className="w-3 h-3" /> {loc.phone}
                    </a>
                    <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {loc.hours}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Socials */}
          <div className="pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Theo dõi chúng tôi</h3>
            <div className="flex gap-3">
              {SOCIALS.map(s => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.name}
                    href={s.link}
                    title={s.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 bg-white border border-neutral-200 rounded-lg text-neutral-600 transition-all duration-300 ${s.color} hover:text-white hover:border-transparent shadow-sm`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* FAQ nhanh */}
          <div className="pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Câu hỏi thường gặp</h3>
            <div className="space-y-3">
              {FAQ_QUICK.map((f, i) => (
                <details key={i} className="group bg-white border border-neutral-200 rounded-lg px-4 py-3 hover:border-red-300 transition-colors shadow-sm">
                  <summary className="text-xs font-bold text-red-600 cursor-pointer list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-red-500 group-open:rotate-45 transition-transform duration-300">+</span>
                  </summary>
                  <p className="text-xs font-medium text-neutral-600 mt-3 leading-relaxed border-t border-neutral-100 pt-2">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white border border-neutral-200 p-6 sm:p-8 lg:p-10 rounded-xl space-y-6 shadow-sm">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-black uppercase tracking-tight">Gửi Tin Nhắn</h2>
              <p className="text-sm font-medium text-neutral-600">Điền form bên dưới, chúng tôi sẽ phản hồi trong vòng 24h qua email</p>
            </div>

            {sent && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 animate-fadeInUp">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-sm text-emerald-700 font-bold">Tin nhắn đã được gửi thành công!</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Mã tin nhắn #{Date.now().toString().slice(-6)} · Theo dõi phản hồi trong email</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block">Họ và Tên *</label>
                  <input
                    type="text" name="name" value={form.name} onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-black font-medium focus:outline-none transition-all duration-300 ${
                      errors.name ? 'border-rose-500' : 'border-neutral-300 focus:border-red-600'
                    }`}
                  />
                  {errors.name && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block">Email *</label>
                  <input
                    type="email" name="email" value={form.email} onChange={handleChange}
                    placeholder="email@example.com"
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-black font-medium focus:outline-none transition-all duration-300 ${
                      errors.email ? 'border-rose-500' : 'border-neutral-300 focus:border-red-600'
                    }`}
                  />
                  {errors.email && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block">Số Điện Thoại</label>
                  <input
                    type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="0912 345 678"
                    className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-black font-medium focus:outline-none transition-all duration-300 ${
                      errors.phone ? 'border-rose-500' : 'border-neutral-300 focus:border-red-600'
                    }`}
                  />
                  {errors.phone && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block">Chủ Đề</label>
                  <select
                    name="subject" value={form.subject} onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-neutral-300 rounded-lg text-sm text-black font-medium focus:outline-none focus:border-red-600 transition-all duration-300"
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
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 block">
                  Tin Nhắn * <span className="text-neutral-400 font-medium tracking-normal">({form.message.length} ký tự)</span>
                </label>
                <textarea
                  rows="5" name="message" value={form.message} onChange={handleChange}
                  placeholder="Nhập nội dung tin nhắn của bạn (ít nhất 10 ký tự)..."
                  className={`w-full px-4 py-3 bg-white border rounded-lg text-sm text-black font-medium focus:outline-none transition-all duration-300 resize-none ${
                    errors.message ? 'border-rose-500' : 'border-neutral-300 focus:border-red-600'
                  }`}
                />
                {errors.message && <p className="text-[10px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.message}</p>}
              </div>

              <button
                type="submit" disabled={sending}
                className="w-full py-4 bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg hover:bg-red-500 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="bg-white border border-neutral-200 rounded-xl mt-8 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">Tin nhắn gần đây</h3>
                <span className="text-[10px] font-bold text-red-600 px-2 py-0.5 border border-red-200 bg-red-50 rounded-md">{myMessages.length} tin nhắn</span>
              </div>
              <div className="divide-y divide-neutral-100">
                {myMessages.map(m => (
                  <div key={m.id} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-black truncate">{m.subject || 'Tin nhắn'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          m.status === 'replied' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          m.status === 'read' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                          'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {m.status === 'replied' ? '✓ Đã phản hồi' : m.status === 'read' ? 'Đã xem' : '⏳ Đang chờ'}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-500 flex-shrink-0">{new Date(m.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-neutral-600 line-clamp-2">{m.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
    </div>
  );
}
