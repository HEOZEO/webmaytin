import React, { useEffect, useState } from 'react';
import { adminReviewService } from '../../services/adminService';
import showToast from '../../utils/toast';
import { 
  Loader2, Search, MessageSquare, Trash2, Eye, EyeOff, 
  Star, MessageCircle, X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export default function AdminReviews() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [busyId, setBusyId] = useState(null);
  
  // Confirm dialog state
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (cfg) => setConfirmState(cfg);
  const closeConfirm = () => setConfirmState(null);

  useEffect(() => {
    loadReviews();
  }, [page, limit]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadReviews();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await adminReviewService.getAll({ page, limit, search });
      setReviews(res?.data || []);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      showToast.error('Không thể tải danh sách đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (id) => {
    if (!isAdmin) return showToast.error('Bạn không có quyền thực hiện chức năng này');
    
    setBusyId(id);
    try {
      const res = await adminReviewService.toggleVisibility(id);
      showToast.success(res.message || 'Cập nhật trạng thái thành công');
      setReviews(reviews.map(r => r.id === id ? { ...r, is_hidden: res.is_hidden } : r));
    } catch (err) {
      showToast.error('Lỗi khi cập nhật trạng thái đánh giá');
    } finally {
      setBusyId(null);
    }
  };

  const deleteReview = (id) => {
    if (!isAdmin) return showToast.error('Bạn không có quyền thực hiện chức năng này');
    
    askConfirm({
      title: 'Xóa đánh giá?',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá này? Hành động này không thể hoàn tác.',
      variant: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        setBusyId(id);
        try {
          await adminReviewService.delete(id);
          showToast.success('Đã xóa đánh giá thành công');
          loadReviews();
        } catch (err) {
          showToast.error('Xóa đánh giá thất bại');
        } finally {
          setBusyId(null);
          closeConfirm();
        }
      }
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-3 h-3 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-700'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <div className="w-10 h-10 clip-path-rog bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            Quản Lý Đánh Giá
          </h1>
          <p className="text-neutral-400 text-sm mt-1.5 ml-[50px]">
            {pagination.totalItems} đánh giá từ khách hàng
          </p>
        </div>
        <button
          onClick={loadReviews}
          disabled={loading}
          className="p-2.5 bg-neutral-900 border border-neutral-800 clip-path-rog text-neutral-400 hover:text-red-400 hover:border-red-600/50 transition disabled:opacity-50"
          title="Làm mới"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên KH, tên sản phẩm hoặc nội dung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 clip-path-rog text-xs text-slate-100 focus:outline-none focus:border-red-600 transition"
          />
        </div>
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2.5 bg-black border border-neutral-800 clip-path-rog text-xs text-slate-200 focus:border-red-600 appearance-none cursor-pointer"
        >
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-red-600/30 clip-path-rog p-4 overflow-x-auto transition-all duration-300">
        <table className="w-full text-left text-sm text-neutral-300">
          <thead className="text-[10px] uppercase text-neutral-400 border-b border-red-600/30 bg-gradient-to-r from-red-600/10 to-transparent">
            <tr>
              <th className="py-3 px-4">Người Đánh Giá</th>
              <th className="py-3 px-4 min-w-[200px]">Sản Phẩm</th>
              <th className="py-3 px-4 min-w-[300px]">Nội Dung</th>
              <th className="py-3 px-4 text-center">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Ngày Đăng</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && reviews.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" /></td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-slate-500">
                <MessageCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                Không tìm thấy đánh giá nào
              </td></tr>
            ) : reviews.map(review => (
              <tr key={review.id} className={`hover:bg-black/40 transition ${review.is_hidden ? 'opacity-60' : ''}`}>
                <td className="py-4 px-4">
                  <div className="font-semibold text-white truncate max-w-[150px]">{review.user_name}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{review.user_email}</div>
                </td>
                <td className="py-4 px-4">
                  <p className="text-xs text-neutral-300 line-clamp-2">{review.product_name}</p>
                </td>
                <td className="py-4 px-4">
                  <div className="mb-1">{renderStars(review.rating)}</div>
                  <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                    "{review.comment}"
                  </p>
                </td>
                <td className="py-4 px-4 text-center">
                  {review.is_hidden ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                      <EyeOff className="w-2.5 h-2.5" /> Bị ẩn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 text-emerald-300 border border-red-600/30 text-[10px] font-bold">
                      <Eye className="w-2.5 h-2.5" /> Hiển thị
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-right text-xs text-neutral-400 font-mono">
                  {new Date(review.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleVisibility(review.id)}
                      disabled={busyId === review.id}
                      className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                        review.is_hidden 
                          ? 'bg-emerald-900/30 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-800/40' 
                          : 'bg-amber-900/30 border border-amber-800/60 text-amber-300 hover:bg-amber-800/40'
                      }`}
                      title={review.is_hidden ? 'Hiện đánh giá' : 'Ẩn đánh giá'}
                    >
                      {review.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteReview(review.id)}
                      disabled={busyId === review.id}
                      className="p-1.5 bg-neutral-900/50 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/20 text-rose-400 rounded-lg transition disabled:opacity-50"
                      title="Xoá vĩnh viễn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-400">
        <div>
          Trang <span className="text-red-400 font-bold">{pagination.currentPage || page}</span> / {pagination.totalPages || 1}
          <span className="ml-2 text-slate-500">({pagination.totalItems || 0} đánh giá)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-black border border-neutral-800 rounded-lg disabled:opacity-40 hover:border-red-600 hover:text-red-400 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trước
          </button>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
            disabled={page >= (pagination.totalPages || 1)}
            className="px-3 py-1.5 bg-black border border-neutral-800 rounded-lg disabled:opacity-40 hover:border-red-600 hover:text-red-400 flex items-center gap-1 transition"
          >
            Sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {confirmState && (
        <ConfirmDialog
          isOpen={!!confirmState}
          onClose={closeConfirm}
          onConfirm={confirmState.onConfirm}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmText={confirmState.confirmText}
        />
      )}
    </div>
  );
}
