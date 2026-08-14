import React, { useEffect, useState } from 'react';
import {
  Inbox, Search, Trash2, CheckCheck, Reply, Loader2,
  Mail, Phone, Calendar, Filter, ChevronDown, MessageCircle
} from 'lucide-react';
import showToast from '../../utils/toast';
import api from '../../services/api';

const STATUS_BADGE = {
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  read: { label: 'Đã đọc', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  replied: { label: 'Đã phản hồi', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
};

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.get('/contact', { params });
      setMessages(res?.data?.data || []);
      setPagination(res?.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error(err);
      showToast.error('Không thể tải tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleMarkRead = async (msg) => {
    if (msg.status !== 'pending') return;
    try {
      await api.patch(`/contact/${msg.id}/read`);
      load();
      if (selected?.id === msg.id) setSelected({ ...msg, status: 'read' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      showToast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    setSendingReply(true);
    try {
      const res = await api.post(`/contact/${selected.id}/reply`, { reply: replyText });
      showToast.success('Đã gửi phản hồi thành công qua Email & Thông báo!');
      const updated = res?.data?.data || { ...selected, status: 'replied', reply: replyText, replied_at: new Date() };
      setSelected(updated);
      setReplyText('');
      setShowReplyForm(false);
      load();
    } catch (err) {
      console.error(err);
      showToast.error('Gửi phản hồi thất bại');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xoá tin nhắn này vĩnh viễn?')) return;
    try {
      await api.delete(`/contact/${id}`);
      showToast.success('Đã xoá tin nhắn');
      if (selected?.id === id) setSelected(null);
      load();
    } catch (err) {
      showToast.error('Xoá thất bại');
    }
  };

  const handleReplyByExternalEmail = (msg) => {
    const subject = encodeURIComponent(`Re: ${msg.subject || 'Liên hệ từ LaptopStore'}`);
    const body = encodeURIComponent(`Xin chào ${msg.name},\n\nCảm ơn bạn đã liên hệ với LaptopStore.\n\n---\nTin nhắn gốc:\n${msg.message}`);
    window.open(`mailto:${msg.email}?subject=${subject}&body=${body}`);
  };

  const filtered = messages.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [m.name, m.email, m.message, m.subject].some(f => (f || '').toLowerCase().includes(q));
  });

  const counts = {
    all: pagination.total,
    pending: messages.filter(m => m.status === 'pending').length,
    read: messages.filter(m => m.status === 'read').length,
    replied: messages.filter(m => m.status === 'replied').length
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-cyan-400" /> Tin Nhắn Liên Hệ
          </h1>
          <p className="text-slate-400 text-sm mt-1">Tổng: {pagination.total} tin nhắn · {counts.pending} chưa xử lý</p>
        </div>
      </header>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-3 border border-slate-800 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, nội dung..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { v: 'all', label: 'Tất cả' },
            { v: 'pending', label: 'Chờ xử lý' },
            { v: 'read', label: 'Đã đọc' },
            { v: 'replied', label: 'Đã phản hồi' }
          ].map(t => (
            <button
              key={t.v}
              onClick={() => { setStatusFilter(t.v); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === t.v ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="glass-card rounded-2xl p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-slate-400 text-sm">Không có tin nhắn</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filtered.map(m => {
                const status = STATUS_BADGE[m.status] || STATUS_BADGE.pending;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelected(m);
                      setShowReplyForm(false);
                      setReplyText('');
                      if (m.status === 'pending') handleMarkRead(m);
                    }}
                    className={`glass-card rounded-2xl p-4 cursor-pointer transition-all border ${
                      selected?.id === m.id ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate flex-1">{m.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${status.cls} flex-shrink-0`}>{status.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2 truncate">{m.email}</p>
                    <p className="text-xs text-slate-300 line-clamp-2">{m.subject ? `[${m.subject}] ` : ''}{m.message}</p>
                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(m.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-xs font-bold ${page === p ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
                >{p}</button>
              ))}
            </div>
          )}
        </div>

        {/* Detail & Reply Box */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="glass-card rounded-2xl border border-slate-800 p-5 sm:p-6 space-y-4 sticky top-24">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-white truncate">{selected.subject || 'Tin nhắn liên hệ'}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(selected.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold border ${(STATUS_BADGE[selected.status] || STATUS_BADGE.pending).cls}`}>
                  {(STATUS_BADGE[selected.status] || STATUS_BADGE.pending).label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Họ tên</p>
                  <p className="text-sm font-bold text-white truncate">{selected.name}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</p>
                  <a href={`mailto:${selected.email}`} className="text-xs font-bold text-cyan-300 hover:text-cyan-200 truncate block">{selected.email}</a>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <p className="text-[10px] uppercase text-slate-500 font-bold mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> SĐT</p>
                  <p className="text-xs font-bold text-white truncate">{selected.phone || 'Chưa cung cấp SĐT'}</p>
                </div>
              </div>

              {/* Original Customer Message */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase text-slate-500 font-bold">Nội dung câu hỏi từ khách hàng</p>
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Past Reply if exists */}
              {selected.reply && (
                <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
                    <span className="flex items-center gap-1.5"><CheckCheck className="w-4 h-4 text-cyan-400" /> Phản hồi từ Admin:</span>
                    {selected.replied_at && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(selected.replied_at).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-cyan-500/60">
                    {selected.reply}
                  </p>
                </div>
              )}

              {/* Inline Reply Form */}
              {showReplyForm ? (
                <form onSubmit={handleSendReply} className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <Reply className="w-4 h-4" /> Soạn phản hồi gửi tới {selected.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowReplyForm(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Hủy
                    </button>
                  </div>

                  <textarea
                    rows="4"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập nội dung phản hồi của Admin (sẽ tự động gửi Gmail & Thông báo tài khoản cho khách hàng)..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReplyForm(false)}
                      className="px-3 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReply}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-extrabold rounded-xl text-xs hover:opacity-90 disabled:opacity-50"
                    >
                      {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Reply className="w-3.5 h-3.5" />}
                      Gửi Email & Thông Báo
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setShowReplyForm(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 shadow-lg shadow-cyan-500/20"
                  >
                    <Reply className="w-3.5 h-3.5" /> Phản hồi trực tiếp
                  </button>

                  <button
                    onClick={() => handleReplyByExternalEmail(selected)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-800"
                    title="Mở ứng dụng Email mặc định"
                  >
                    <Mail className="w-3.5 h-3.5 text-cyan-400" /> Mở Client Mail
                  </button>

                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs hover:bg-rose-500/30 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xoá
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-slate-800 p-12 text-center">
              <Inbox className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 font-semibold">Chọn một tin nhắn để xem chi tiết</p>
              <p className="text-slate-500 text-xs mt-1">Tin nhắn từ khách hàng sẽ hiển thị ở đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
