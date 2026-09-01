import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, X, Loader2, GripVertical, Upload, CheckCircle2 } from 'lucide-react';
import showToast from '../../utils/toast';
import bannerService from '../../services/bannerService';
import { resolveImage, getBackendUrl, onImageError } from '../../utils/imageHelper';

const EMPTY = {
  title: '', subtitle: '', badge: '', button_text: 'Xem Ngay', link: '/products',
  image_url: '', display_order: 0, is_active: true
};

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await bannerService.getAll();
      const items = res?.data || res?.banners || res || [];
      const sorted = Array.isArray(items) ? [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)) : [];
      setBanners(sorted);
    } catch (err) {
      showToast.error('Không thể tải danh sách banner');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, display_order: banners.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      badge: b.badge || '',
      button_text: b.button_text || '',
      link: b.link || '',
      image_url: b.image_url || '',
      display_order: b.display_order || 0,
      is_active: b.is_active !== false
    });
    setModalOpen(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast.error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP...)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(prev => ({ ...prev, image_url: event.target.result }));
      setUploadingImage(false);
      showToast.success('Tải ảnh banner lên thành công!');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      showToast.error('Không thể đọc file ảnh');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.image_url) {
      showToast.error('Vui lòng nhập Tiêu đề và Hình ảnh banner');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await bannerService.update(editing.id, form);
        showToast.success('Cập nhật banner thành công');
      } else {
        await bannerService.create(form);
        showToast.success('Thêm banner mới thành công');
      }
      setModalOpen(false);
      loadBanners();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Lưu banner thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa banner "${title || id}"?`)) return;
    try {
      await bannerService.delete(id);
      showToast.success('Đã xóa banner thành công');
      loadBanners();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Xóa banner thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">🖼️ Quản Lý Banner Trang Chủ</h1>
          <p className="text-neutral-400 text-sm mt-1">{banners.length} banner</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-red-500 to-sky-400 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> Thêm Banner Mới
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-none clip-path-rog p-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-300">
          <thead className="text-xs uppercase text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Hình Ảnh</th>
              <th className="py-3 px-4">Tiêu Đề / Phụ Đề</th>
              <th className="py-3 px-4">Link Liên Kết</th>
              <th className="py-3 px-4">Thứ Tự</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-red-500" /></td></tr>
            ) : banners.length === 0 ? (
              <tr><td colSpan="7" className="py-12 text-center text-slate-500">Chưa có banner nào. Hãy thêm banner đầu tiên.</td></tr>
            ) : banners.map((b, idx) => (
              <tr key={b.id} className="hover:bg-black/40">
                <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                <td className="py-3 px-4">
                  <img src={resolveImage(b.image_url)} alt={b.title} className="w-32 h-16 object-cover rounded-lg bg-neutral-900 border border-slate-700" onError={(e) => { e.target.src = getBackendUrl('/images/fallback/no-image.svg'); }} />
                </td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-white">{b.title || 'Chưa có tiêu đề'}</div>
                  <div className="text-xs text-neutral-400 line-clamp-1">{b.subtitle || 'Không có mô tả phụ'}</div>
                </td>
                <td className="py-3 px-4 text-xs text-red-400 max-w-[200px] truncate">{b.link || '/products'}</td>
                <td className="py-3 px-4 text-xs text-neutral-400 font-bold">{b.display_order || 0}</td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${b.is_active !== false ? 'bg-red-600/20 text-emerald-300 border-red-600/30' : 'bg-slate-700 text-neutral-400 border-slate-600'}`}>
                    {b.is_active !== false ? 'HIỂN THỊ' : 'ĐÃ ẨN'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-1">
                  <button onClick={() => openEdit(b)} title="Sửa banner" className="p-2 bg-neutral-900 hover:bg-red-600/20 text-red-500 rounded-lg transition"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(b.id, b.title)} title="Xóa banner" className="p-2 bg-neutral-900 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog p-6 rounded-none clip-path-rog w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 border border-red-600/30">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold text-white">{editing ? 'Chỉnh Sửa' : 'Thêm'} Banner</h3>
              <button onClick={() => setModalOpen(false)}><X className="w-5 h-5 text-neutral-400 hover:text-white" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Tiêu đề *</label>
                <input required type="text" placeholder="Tiêu đề banner" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100 focus:border-red-600" />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Phụ đề / Mô tả</label>
                <textarea rows="2" placeholder="Phụ đề mô tả banner" value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100 resize-none focus:border-red-600" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Badge (Khuyến mãi)</label>
                  <input type="text" placeholder="GIẢM 25% / MỚI VỀ" value={form.badge} onChange={(e) => setForm({...form, badge: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Tên nút bấm</label>
                  <input type="text" placeholder="Xem Ngay" value={form.button_text} onChange={(e) => setForm({...form, button_text: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Hình ảnh banner *</label>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="flex items-center gap-2 px-4 py-2 bg-red-600/10 border border-red-600/30 hover:bg-red-600/20 text-red-400 rounded-none clip-path-rog text-xs font-bold transition disabled:opacity-50">
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Upload className="w-4 h-4" />}
                    Tải ảnh từ máy tính
                  </button>
                  <span className="text-[10px] text-slate-500">hoặc dán URL</span>
                </div>
                <input required type="url" placeholder="URL Hình Ảnh https://..." value={form.image_url.startsWith('data:') ? '' : form.image_url} onChange={(e) => setForm({...form, image_url: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100" />
                {form.image_url && (
                  <div className="mt-2 relative group">
                    <img src={form.image_url} alt="Preview" className="w-full h-32 object-cover rounded-none clip-path-rog border border-slate-700 bg-neutral-900" onError={(e) => { e.target.style.display = 'none'; }} />
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-red-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Đã tải hình ảnh thành công</span>
                      <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="text-rose-400 hover:underline">Xóa ảnh</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Đường dẫn liên kết</label>
                  <input type="text" placeholder="/products" value={form.link} onChange={(e) => setForm({...form, link: e.target.value})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Thứ tự hiển thị</label>
                  <input type="number" placeholder="1" value={form.display_order} onChange={(e) => setForm({...form, display_order: Number(e.target.value)})} className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-200 pt-1 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})} className="accent-red-600 w-4 h-4 rounded" />
                <span className="font-bold">Hiển thị banner trên trang chủ</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-neutral-900 text-neutral-300 font-semibold rounded-none clip-path-rog text-xs">Hủy</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Lưu Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
