import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, Loader2, Calendar, RefreshCw, Search, Tag, Percent, ShoppingCart, Clock, Users, Info } from 'lucide-react';
import showToast from '../../utils/toast';
import couponService from '../../services/couponService';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatVND, formatDate } from '../../utils/theme';

const EMPTY = {
  code: '', discount_percent: '', max_discount: '', min_order_amount: 0, description: '',
  usage_limit: 100, usage_per_user: '', starts_at: '', expires_at: '', is_active: true, is_public: true
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Server-side pagination + filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (cfg) => setConfirmState(cfg);
  const closeConfirm = () => setConfirmState(null);

  useEffect(() => {
    loadCoupons();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else loadCoupons();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await couponService.getAll(params);
      const items = res?.data || [];
      setCoupons(items);
      setPagination(res?.pagination || { currentPage: 1, totalPages: 1, totalItems: items.length });
    } catch (err) {
      showToast.error('Không thể tải mã giảm giá');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.code.trim()) {
      newErrors.code = 'Vui lòng nhập mã giảm giá';
    } else if (form.code.length < 3) {
      newErrors.code = 'Mã giảm giá phải có ít nhất 3 ký tự';
    }

    if (!form.discount_percent || form.discount_percent <= 0) {
      newErrors.discount_percent = 'Phần trăm giảm giá phải lớn hơn 0';
    } else if (form.discount_percent > 100) {
      newErrors.discount_percent = 'Phần trăm giảm giá không được vượt quá 100%';
    }

    if (form.max_discount && form.max_discount < 0) {
      newErrors.max_discount = 'Số tiền giảm tối đa không được âm';
    }

    if (form.min_order_amount && form.min_order_amount < 0) {
      newErrors.min_order_amount = 'Đơn tối thiểu không được âm';
    }

    if (form.usage_limit && form.usage_limit < 1) {
      newErrors.usage_limit = 'Số lượt dùng phải ít nhất là 1';
    }

    if (form.usage_per_user !== '' && form.usage_per_user != null) {
      const up = Number(form.usage_per_user);
      if (!Number.isInteger(up) || up < 1) {
        newErrors.usage_per_user = 'Phải là số nguyên dương hoặc để trống (không giới hạn)';
      }
    }

    if (form.starts_at && form.expires_at) {
      if (new Date(form.expires_at) <= new Date(form.starts_at)) {
        newErrors.expires_at = 'Ngày hết hạn phải lớn hơn ngày bắt đầu';
      }
    }

    if (form.expires_at && new Date(form.expires_at) <= new Date()) {
      newErrors.expires_at = 'Ngày hết hạn phải lớn hơn ngày hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, starts_at: new Date().toISOString().slice(0, 16) });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c) => {
    const fromVal = c.valid_from || c.starts_at;
    const toVal = c.valid_to || c.expires_at;
    setEditing(c);
    setForm({
      code: c.code || '',
      discount_percent: c.discount_percent || '',
      max_discount: c.max_discount || '',
      min_order_amount: c.min_order_amount || 0,
      description: c.description || '',
      usage_limit: c.max_uses || c.usage_limit || 100,
      usage_per_user: c.usage_per_user ?? '',
      starts_at: fromVal ? new Date(fromVal).toISOString().slice(0, 16) : '',
      expires_at: toVal ? new Date(toVal).toISOString().slice(0, 16) : '',
      is_active: c.is_active !== false,
      is_public: c.is_public !== false
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_percent: Number(form.discount_percent) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        min_order_amount: Number(form.min_order_amount) || 0,
        max_uses: Number(form.usage_limit) || 100,
        // usage_per_user: null = không giới hạn, số = giới hạn/tài khoản
        usage_per_user: form.usage_per_user === '' || form.usage_per_user == null
          ? null
          : Number(form.usage_per_user),
        code: form.code.toUpperCase(),
        is_public: form.is_public === true
      };
      let res;
      if (editing) {
        res = await couponService.update(editing.id, payload);
        showToast.success('Cậpập nhật mã thành công');
      } else {
        res = await couponService.create(payload);
        showToast.success('Thêm mã mới thành công');
      }
      // Hiển thị cảnh báo sức chứa từ backend (nếu có)
      const capacity = res?.data?.capacity;
      if (capacity && capacity.warning) {
        showToast.warning(capacity.warning, { duration: 8000 });
      } else if (capacity && capacity.has_unused_slots && capacity.max_reachable_users) {
        showToast.info(
          `Mã này có thể phục vụ tối đa ${capacity.max_reachable_users} tài khoản.`,
          { duration: 5000 }
        );
      }
      setModalOpen(false);
      loadCoupons();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Lưu mã thất bại');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id) => {
    try {
      await couponService.toggleStatus(id);
      loadCoupons();
      showToast.success('Đã đổi trạng thái mã');
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const handleDelete = (id, code) => {
    askConfirm({
      title: 'Xóa mã giảm giá?',
      message: `Xóa mã "${code}"? Hành động này không thể hoàn tác.`,
      variant: 'danger',
      confirmText: 'Xóa',
      onConfirm: async () => {
        try {
          await couponService.delete(id);
          showToast.success('Đã xóa');
          loadCoupons();
        } catch (err) {
          showToast.error(err.response?.data?.message || 'Lỗi');
        } finally {
          closeConfirm();
        }
      }
    });
  };

  // Helper to get coupon status
  const getCouponStatus = (coupon) => {
    if (coupon.is_active === false) return { label: 'VÔ HIỆU', class: 'bg-slate-700/50 text-neutral-400 border-slate-600' };
    if (coupon.valid_to && new Date(coupon.valid_to) < new Date()) return { label: 'HẾT HẠN', class: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { label: 'ĐANG HOẠT ĐỘNG', class: 'bg-red-600/20 text-emerald-300 border-red-600/30' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Tag className="w-7 h-7 text-red-500" /> Quản Lý Mã Giảm Giá
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Tổng: <span className="text-red-500 font-bold">{pagination.totalItems}</span> mã
            {pagination.totalPages > 1 && <span> • Trang {pagination.currentPage}/{pagination.totalPages}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadCoupons} className="p-2.5 bg-neutral-900 hover:bg-slate-700 text-neutral-300 rounded-none clip-path-rog transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-sm hover:shadow-lg hover:shadow-red-600/25 transition-all">
            <Plus className="w-4 h-4" /> Tạo Mã Mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute ml-3 mt-[14px] text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã code hoặc mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-200 focus:outline-none focus:border-red-600 cursor-pointer"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu</option>
          <option value="expired">Hết hạn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-black/50 text-xs uppercase text-neutral-400">
              <tr>
                <th className="py-4 px-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Mã Code
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" /> Giảm Giá
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Đơn Tối Thiểu
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> Lượt Dùng
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Hạn Sử Dụng
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold">Hiển Thị</th>
                <th className="py-4 px-4 font-semibold">Trạng Thái</th>
                <th className="py-4 px-4 text-right font-semibold">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" />
                    <p className="text-slate-500 text-sm mt-2">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center">
                    <Tag className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                    <p className="text-slate-500">Chưa có mã giảm giá nào</p>
                    <button onClick={openAdd} className="mt-3 text-red-500 text-sm hover:underline">Tạo mã đầu tiên</button>
                  </td>
                </tr>
              ) : coupons.map(c => {
                const status = getCouponStatus(c);
                const usedCount = c.used_count || c.usage_count || 0;
                const maxUses = c.max_uses || c.usage_limit || 100;
                const usagePercent = maxUses > 0 ? Math.min(100, (usedCount / maxUses) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-black/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-red-400 tracking-wider">{c.code}</div>
                      {c.description && <div className="text-xs text-slate-500 mt-1 max-w-[150px] truncate">{c.description}</div>}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-emerald-300 text-lg">-{c.discount_percent}%</span>
                      {c.max_discount && <div className="text-xs text-slate-500">Tối đa: {formatVND(c.max_discount)}</div>}
                    </td>
                    <td className="py-4 px-4 text-sm text-neutral-400">
                      {c.min_order_amount > 0 ? formatVND(c.min_order_amount) : 'Không yêu cầu'}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <span className="text-slate-200 font-medium">{usedCount}</span>
                        <span className="text-slate-500"> / {maxUses === 999999 ? '∞' : maxUses}</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-900 rounded-full mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-red-600'}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      {c.usage_per_user != null && (
                        <div className="text-[10px] text-amber-400 mt-1">
                          <Users className="w-3 h-3 inline mr-0.5" />
                          {c.usage_per_user}/tk
                          {c.max_reachable_users && c.max_reachable_users > 0 ? (
                            <span className="text-slate-500"> · ≈ {c.max_reachable_users} người</span>
                          ) : null}
                        </div>
                      )}
                      {c.has_unused_slots && (
                        <div className="text-[10px] text-rose-400 mt-0.5" title="max_uses không chia hết cho usage_per_user → có lượt lẻ không user nào dùng được">
                          ⚠ Có lượt lẻ
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-neutral-400">
                        {c.valid_to ? (
                          <>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-red-500" />
                              <span>{formatDate(c.valid_to)}</span>
                            </div>
                            {c.valid_from && (
                              <div className="text-xs text-slate-500 mt-1">
                                Từ: {formatDate(c.valid_from)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-red-500">Không giới hạn</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        c.is_public
                          ? 'bg-red-600/20 text-emerald-300 border-red-600/30'
                          : 'bg-slate-700/40 text-neutral-400 border-slate-700'
                      }`}>
                        {c.is_public ? '✓ Công khai' : 'Riêng tư'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button onClick={() => toggleStatus(c.id)} className={`text-[10px] font-bold px-3 py-1 rounded-full border ${status.class} hover:opacity-80 transition-opacity`}>
                        {status.label}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-2 bg-neutral-900 hover:bg-red-600/20 text-red-500 rounded-lg transition-colors" title="Sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.code)} className="p-2 bg-neutral-900 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            « Đầu
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Trước
          </button>
          <div className="px-4 py-2 bg-black border border-neutral-800 rounded-lg">
            <span className="text-sm text-red-400 font-bold">{pagination.currentPage}</span>
            <span className="text-slate-500 text-xs"> / {pagination.totalPages}</span>
          </div>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sau →
          </button>
          <button
            onClick={() => setPage(pagination.totalPages)}
            disabled={page === pagination.totalPages}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:border-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Cuối »
          </button>
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog p-6 rounded-none clip-path-rog w-full max-w-lg space-y-5 border border-red-600/30 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-500" />
                {editing ? 'Chỉnh Sửa Mã Giảm Giá' : 'Tạo Mã Giảm Giá Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-neutral-900 rounded-lg transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Helper Text */}
            <div className="bg-red-600/10 border border-red-600/20 rounded-none clip-path-rog p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">
                {editing ? 'Cập nhật thông tin mã giảm giá bên dưới.' : 'Điền thông tin bên dưới để tạo mã giảm giá mới.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Mã giảm giá */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Mã Giảm Giá <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: WELCOME10, SUMMER2024"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm uppercase tracking-wider ${errors.code ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                />
                {errors.code && <p className="text-xs text-rose-400 mt-1">{errors.code}</p>}
                <p className="text-[10px] text-slate-500 mt-1">Mã sẽ tự động viết hoa</p>
              </div>

              {/* % Giảm và Max giảm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    % Giảm <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 10"
                    min="1"
                    max="100"
                    value={form.discount_percent}
                    onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.discount_percent ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.discount_percent && <p className="text-xs text-rose-400 mt-1">{errors.discount_percent}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Giảm Tối Đa (VND)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 50000"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.max_discount ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.max_discount && <p className="text-xs text-rose-400 mt-1">{errors.max_discount}</p>}
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Mô Tả
                </label>
                <input
                  type="text"
                  placeholder="VD: Giảm 10% cho đơn hàng đầu tiên"
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm focus:border-red-600 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Mô tả ngắn gọn về mã giảm giá</p>
              </div>

              {/* Đơn tối thiểu, Lượt dùng, Lần/tài khoản */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Đơn Hàng Tối Thiểu (VND)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 100000"
                    min="0"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.min_order_amount ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.min_order_amount && <p className="text-xs text-rose-400 mt-1">{errors.min_order_amount}</p>}
                  <p className="text-[10px] text-slate-500 mt-1">Để 0 = không yêu cầu</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Số Lượt Dùng Tối Đa
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 100"
                    min="1"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.usage_limit ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.usage_limit && <p className="text-xs text-rose-400 mt-1">{errors.usage_limit}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Lần Dùng / Tài Khoản
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 3 (để trống = không giới hạn)"
                    min="1"
                    value={form.usage_per_user}
                    onChange={(e) => setForm({ ...form, usage_per_user: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.usage_per_user ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.usage_per_user && <p className="text-xs text-rose-400 mt-1">{errors.usage_per_user}</p>}
                  <p className="text-[10px] text-slate-500 mt-1">Tối đa mỗi tk dùng được</p>
                </div>
              </div>

              {/* Ngày bắt đầu và hết hạn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Ngày Bắt Đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm focus:border-red-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Ngày Hết Hạn <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm ${errors.expires_at ? 'border-rose-500' : 'border-neutral-800 focus:border-red-600'} transition-colors`}
                  />
                  {errors.expires_at && <p className="text-xs text-rose-400 mt-1">{errors.expires_at}</p>}
                </div>
              </div>

              {/* Kích hoạt + Public */}
              <div className="bg-black/50 rounded-none clip-path-rog p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-red-600 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-200 font-medium">Kích hoạt</span>
                    <p className="text-[10px] text-slate-500">Mã có thể sử dụng khi được kích hoạt</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:bg-amber-500 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-all"></div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-200 font-medium">Hiển thị cho khách hàng</span>
                    <p className="text-[10px] text-slate-500">Mã sẽ hiển thị trong trang profile của khách</p>
                  </div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-neutral-900 text-neutral-300 font-semibold rounded-none clip-path-rog text-sm hover:bg-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-sm disabled:opacity-50 flex items-center gap-2 hover:shadow-lg hover:shadow-red-600/25 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Cập Nhật' : 'Tạo Mã'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
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
  );
}
