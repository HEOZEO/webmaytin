import React, { useEffect, useState } from 'react';
import { adminCategoryService } from '../../services/adminService';
import showToast from '../../utils/toast';
import { 
  Loader2, Search, Edit, Plus, FolderTree, RefreshCw, X, Eye, EyeOff
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { usePermission } from '../../hooks/usePermission';

export default function AdminCategories() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { hasPermission } = usePermission();
  
  const canCreate = isAdmin || hasPermission('categories.create');
  const canUpdate = isAdmin || hasPermission('categories.update');
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState(null);
  const askConfirm = (cfg) => setConfirmState(cfg);
  const closeConfirm = () => setConfirmState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await adminCategoryService.getAll();
      setCategories(res?.data || []);
    } catch (err) {
      showToast.error('Không thể tải danh sách danh mục');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return showToast.error('Vui lòng nhập tên danh mục');
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await adminCategoryService.update(editingCategory.id, formData);
        showToast.success('Cập nhật danh mục thành công');
      } else {
        await adminCategoryService.create(formData);
        showToast.success('Thêm danh mục mới thành công');
      }
      handleCloseModal();
      loadCategories();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu danh mục');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (category) => {
    if (!canUpdate) return showToast.error('Bạn không có quyền thực hiện chức năng này');
    
    setBusyId(category.id);
    try {
      const res = await adminCategoryService.toggleVisibility(category.id);
      showToast.success(res.message || 'Cập nhật trạng thái thành công');
      setCategories(categories.map(c => c.id === category.id ? { ...c, is_hidden: res.is_hidden } : c));
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setBusyId(null);
    }
  };

  // Lọc categories
  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <div className="w-10 h-10 clip-path-rog bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-600/20">
              <FolderTree className="w-5 h-5 text-white" />
            </div>
            Quản Lý Danh Mục
          </h1>
          <p className="text-neutral-400 text-sm mt-1.5 ml-[50px]">
            {categories.length} danh mục sản phẩm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadCategories}
            disabled={loading}
            className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog text-neutral-400 hover:text-red-400 hover:border-red-600/50 transition disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {canCreate && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-widest rounded-none clip-path-rog transition"
            >
              <Plus className="w-4 h-4" />
              Thêm Mới
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm danh mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100 focus:outline-none focus:border-red-600 transition"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 hover:border-red-600/30 rounded-none clip-path-rog p-4 overflow-x-auto transition-all duration-300">
        <table className="w-full text-left text-sm text-neutral-300">
          <thead className="text-[10px] uppercase text-neutral-400 border-b border-red-600/30 bg-gradient-to-r from-red-600/10 to-transparent">
            <tr>
              <th className="py-3 px-4">Tên Danh Mục</th>
              <th className="py-3 px-4">Mô Tả</th>
              <th className="py-3 px-4 text-center">Trạng Thái</th>
              <th className="py-3 px-4 text-center">Số Sản Phẩm</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading && categories.length === 0 ? (
              <tr><td colSpan="4" className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-red-500" /></td></tr>
            ) : filteredCategories.length === 0 ? (
              <tr><td colSpan="4" className="py-12 text-center text-slate-500">
                <FolderTree className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                Không có danh mục nào
              </td></tr>
            ) : filteredCategories.map(category => (
              <tr key={category.id} className={`hover:bg-black/40 transition ${category.is_hidden ? 'opacity-60' : ''}`}>
                <td className="py-4 px-4 font-semibold text-white">
                  {category.name}
                </td>
                <td className="py-4 px-4 text-neutral-400 text-xs">
                  {category.description || 'Không có mô tả'}
                </td>
                <td className="py-4 px-4 text-center">
                  {category.is_hidden ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                      <EyeOff className="w-2.5 h-2.5" /> Đã ẩn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/20 text-emerald-300 border border-red-600/30 text-[10px] font-bold">
                      <Eye className="w-2.5 h-2.5" /> Hiển thị
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold font-mono">
                    {category.product_count || 0}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    {canUpdate && (
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-1.5 bg-neutral-900/50 border border-transparent hover:border-blue-500/30 hover:bg-blue-500/20 text-blue-400 rounded-none clip-path-rog transition"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => toggleVisibility(category)}
                        disabled={busyId === category.id}
                      className={`p-1.5 rounded-none clip-path-rog transition disabled:opacity-50 ${
                        category.is_hidden 
                          ? 'bg-emerald-900/30 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-800/40' 
                          : 'bg-amber-900/30 border border-amber-800/60 text-amber-300 hover:bg-amber-800/40'
                      }`}
                      title={category.is_hidden ? 'Hiện danh mục' : 'Ẩn danh mục'}
                    >
                      {category.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-red-600/30 rounded-none clip-path-rog w-full max-w-md animate-slideUp">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-gradient-to-r from-red-600/10 to-transparent">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-red-500" />
                {editingCategory ? 'Sửa Danh Mục' : 'Thêm Danh Mục Mới'}
              </h2>
              <button onClick={handleCloseModal} className="text-neutral-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Tên Danh Mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 transition"
                  placeholder="VD: Laptop Gaming"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Mô Tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none focus:border-red-600 transition min-h-[100px] resize-y"
                  placeholder="Mô tả về danh mục này..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-widest rounded-none clip-path-rog transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-none clip-path-rog transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingCategory ? 'Cập Nhật' : 'Tạo Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
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
