import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, Edit, Trash2, Search, X, Loader2, Filter, ChevronDown,
  Package, Tag, Image as ImageIcon, Eye, ToggleLeft, ToggleRight, AlertTriangle, Upload, CheckCircle2
} from 'lucide-react';
import showToast from '../../utils/toast';
import { adminProductService } from '../../services/adminService';
import api from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/admin/Pagination';
import { formatVND } from '../../utils/theme';
import { resolveImage, onImageError, resolveImageFresh, getBackendUrl } from '../../utils/imageHelper';
import { Can, usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
  name: '', sku: '', price: '', sale_price: '', stock: '',
  cpu: '', ram: '', storage: '', gpu: '', screen_size: '',
  image_url: '', description: '', brand_id: '', category_id: '', is_active: true
};

const STOCK_FILTERS = [
  { v: 'all', label: 'Tất cả' },
  { v: 'in_stock', label: 'Còn hàng' },
  { v: 'low_stock', label: 'Sắp hết (≤10)' },
  { v: 'out_of_stock', label: 'Hết hàng' }
];

const PRICE_RANGES = [
  { v: 'all', label: 'Tất cả mức giá', min: null, max: null },
  { v: 'under_10m', label: 'Dưới 10 triệu', min: 0, max: 10000000 },
  { v: '10_20m', label: '10 - 20 triệu', min: 10000000, max: 20000000 },
  { v: '20_30m', label: '20 - 30 triệu', min: 20000000, max: 30000000 },
  { v: 'over_30m', label: 'Trên 30 triệu', min: 30000000, max: null }
];

export default function AdminProducts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { hasPermission } = usePermission();
  // Xoá sản phẩm — mặc định chỉ admin. Nhưng admin có thể cấp quyền này cho staff.
  const canDelete = isAdmin || hasPermission('products.delete');
  const canBulkStock = isAdmin || hasPermission('products.bulk_stock');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

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
      showToast.success('Tải hình ảnh lên thành công!');
    };
    reader.onerror = () => {
      setUploadingImage(false);
      showToast.error('Không thể đọc file ảnh');
    };
    reader.readAsDataURL(file);
  };

  // Filter states
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [filters, setFilters] = useState({
    category_id: '',
    brand_id: '',
    stock: 'all',
    price: 'all',
    is_active: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r?.data?.data || r?.data || [])).catch(() => {});
    api.get('/brands').then(r => setBrands(r?.data?.data || r?.data || [])).catch(() => {});
  }, []);

  // Reset về trang 1 khi đổi limit hoặc search/filter
  useEffect(() => {
    setPage(1);
  }, [limit, search, filters]);

  useEffect(() => {
    loadProducts();
  }, [page, limit, filters]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const priceRange = PRICE_RANGES.find(p => p.v === filters.price);
      const params = {
        page, limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };
      if (search) params.search = search;
      if (filters.category_id) params.category = filters.category_id;
      if (filters.brand_id) params.brand = filters.brand_id;
      if (priceRange?.min != null) params.minPrice = priceRange.min;
      if (priceRange?.max != null) params.maxPrice = priceRange.max;
      if (filters.stock && filters.stock !== 'all') params.stockStatus = filters.stock;
      if (filters.is_active !== 'all') params.is_active = filters.is_active === 'active';

      const res = await adminProductService.getAll(params);
      let items = res?.data?.products || res?.products || res?.data?.data || res?.data || [];
      const pg = res?.data?.pagination || res?.pagination || { totalPages: 1, totalItems: items.length };

      setProducts(items);
      setTotalPages(pg.totalPages || pg.pages || 1);
      setTotal(pg.totalItems || pg.total || items.length);
    } catch (err) {
      console.error(err);
      showToast.error('Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  const handleResetFilters = () => {
    setFilters({
      category_id: '', brand_id: '', stock: 'all', price: 'all',
      is_active: 'all', sortBy: 'created_at', sortOrder: 'DESC'
    });
    setSearch('');
    setPage(1);
  };

  const openAddModal = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      brand_id: brands[0]?.id || '',
      category_id: categories[0]?.id || ''
    });
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      price: product.price || '',
      sale_price: product.sale_price || '',
      stock: product.stock ?? '',
      cpu: product.cpu || '',
      ram: product.ram || '',
      storage: product.storage || '',
      gpu: product.gpu || '',
      screen_size: product.screen_size || '',
      image_url: product.image_url || '',
      description: product.description || '',
      brand_id: product.brand_id || '',
      category_id: product.category_id || '',
      is_active: product.is_active !== false
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = [];
    if (!form.name?.trim()) errors.push('Vui lòng nhập tên sản phẩm');
    if (!form.price || form.price <= 0) errors.push('Giá bán phải lớn hơn 0');
    if (form.sale_price && form.sale_price >= form.price) errors.push('Giá khuyến mãi phải nhỏ hơn giá gốc');
    if (form.stock === '' || form.stock < 0) errors.push('Số lượng tồn kho không hợp lệ');
    
    if (errors.length > 0) {
      showToast.error(errors[0]);
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: Number(form.stock) || 0,
        brand_id: Number(form.brand_id) || null,
        category_id: Number(form.category_id) || null
      };
      if (editing) {
        await adminProductService.update(editing.id, payload);
        showToast.success('Cập nhật sản phẩm thành công');
      } else {
        await adminProductService.create(payload);
        showToast.success('Thêm sản phẩm mới thành công');
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      console.error(err);
      showToast.error(err.response?.data?.message || 'Lưu sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  const [deleteModalProduct, setDeleteModalProduct] = useState(null);

  const handleSoftDelete = async () => {
    if (!deleteModalProduct) return;
    try {
      await adminProductService.delete(deleteModalProduct.id, false);
      showToast.success('Đã ẩn sản phẩm (sẽ không hiển thị ở trang khách hàng)');
      setDeleteModalProduct(null);
      loadProducts();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Ẩn sản phẩm thất bại');
    }
  };

  const handleHardDelete = async () => {
    if (!deleteModalProduct) return;
    try {
      await adminProductService.delete(deleteModalProduct.id, true);
      showToast.success('Đã xóa vĩnh viễn sản phẩm khỏi CSDL');
      setDeleteModalProduct(null);
      loadProducts();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Xóa vĩnh viễn thất bại');
    }
  };

  const handleRestore = async (id, name) => {
    try {
      await adminProductService.restore(id);
      showToast.success(`Đã mở lại sản phẩm "${name}" thành công`);
      loadProducts();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Mở lại thất bại');
    }
  };

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (filters.category_id) n++;
    if (filters.brand_id) n++;
    if (filters.stock !== 'all') n++;
    if (filters.price !== 'all') n++;
    if (filters.is_active !== 'all') n++;
    if (search) n++;
    return n;
  }, [filters, search]);

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-cyan-400" /> Quản Lý Sản Phẩm
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tổng <span className="text-cyan-300 font-bold">{total}</span> sản phẩm
            {activeFiltersCount > 0 && <span className="text-purple-300 ml-2">· {activeFiltersCount} bộ lọc đang áp dụng</span>}
          </p>
        </div>
        <Can permission="products.create">
          <button onClick={openAddModal} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Thêm Laptop Mới
          </button>
        </Can>
      </header>

      {/* Search + Filter toggle */}
      <div className="space-y-3">
        <form onSubmit={handleSearch} className="glass-card rounded-2xl p-3 flex gap-2 border border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SKU, CPU..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button type="button" onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition ${
              filtersOpen || activeFiltersCount > 0
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> Bộ lọc
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/40 text-[10px]">{activeFiltersCount}</span>
            )}
          </button>
          <button type="submit" className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-cyan-400">Tìm</button>
        </form>

        {/* Advanced filters */}
        {filtersOpen && (
          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 animate-slideUp">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-purple-400" /> Bộ lọc nâng cao
              </h3>
              <button onClick={handleResetFilters} className="text-[10px] text-rose-300 hover:text-rose-200 font-bold">Xoá tất cả</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Danh mục</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => { setFilters({ ...filters, category_id: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Thương hiệu</label>
                <select
                  value={filters.brand_id}
                  onChange={(e) => { setFilters({ ...filters, brand_id: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Tất cả thương hiệu</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Khoảng giá</label>
                <select
                  value={filters.price}
                  onChange={(e) => { setFilters({ ...filters, price: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {PRICE_RANGES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Tồn kho</label>
                <select
                  value={filters.stock}
                  onChange={(e) => { setFilters({ ...filters, stock: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {STOCK_FILTERS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Trạng thái</label>
                <select
                  value={filters.is_active}
                  onChange={(e) => { setFilters({ ...filters, is_active: e.target.value }); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang hiển thị</option>
                  <option value="hidden">Đang ẩn</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Sắp xếp</label>
                <select
                  value={`${filters.sortBy}_${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('_');
                    setFilters({ ...filters, sortBy, sortOrder });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="created_at_DESC">Mới nhất</option>
                  <option value="created_at_ASC">Cũ nhất</option>
                  <option value="name_ASC">Tên A-Z</option>
                  <option value="name_DESC">Tên Z-A</option>
                  <option value="price_ASC">Giá thấp → cao</option>
                  <option value="price_DESC">Giá cao → thấp</option>
                  <option value="stock_ASC">Tồn kho ít nhất</option>
                  <option value="stock_DESC">Tồn kho nhiều nhất</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 font-bold">Sản Phẩm</th>
                <th className="py-3 px-3 font-bold">Danh Mục / Brand</th>
                <th className="py-3 px-3 font-bold">Cấu Hình</th>
                <th className="py-3 px-3 font-bold text-right">Giá</th>
                <th className="py-3 px-3 font-bold text-center">Kho</th>
                <th className="py-3 px-3 font-bold text-center">Trạng Thái</th>
                <th className="py-3 px-3 font-bold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-400" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500">
                  <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  Không có sản phẩm nào phù hợp
                </td></tr>
              ) : products.map(prod => (
                <tr key={prod.id} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3 min-w-0 max-w-[260px]">
                      <img src={resolveImage(prod.image_url)} onError={onImageError} className="w-10 h-10 rounded-xl object-cover bg-slate-800 flex-shrink-0" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white line-clamp-1 text-xs">{prod.name}</p>
                        {prod.sku ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(prod.sku).then(() => showToast.success(`Đã copy SKU: ${prod.sku}`)).catch(() => {});
                              }
                            }}
                            className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded hover:bg-cyan-500/20 transition"
                            title="Click để copy SKU"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {prod.sku}
                          </button>
                        ) : (
                          <p className="text-[10px] text-amber-400 mt-0.5">⚠ Chưa có SKU</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs">
                    <p className="text-slate-300">{prod.category_name || 'Chưa phân loại'}</p>
                    <p className="text-[10px] text-slate-500">{prod.brand_name || 'Khác'}</p>
                  </td>
                  <td className="py-3 px-3 text-[11px] text-slate-400">
                    <p className="line-clamp-1">{prod.cpu || 'Tiêu chuẩn'}</p>
                    <p className="text-[10px] text-slate-500">{prod.ram || '8GB'} · {prod.storage || '512GB'}</p>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <p className="font-bold text-cyan-300 text-xs">{formatVND(prod.sale_price || prod.price)}</p>
                    {prod.sale_price && <p className="text-[10px] text-slate-500 line-through">{formatVND(prod.price)}</p>}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                      Number(prod.stock) <= 0 ? 'text-rose-400' : Number(prod.stock) <= 10 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {Number(prod.stock) <= 10 && <AlertTriangle className="w-3 h-3" />}
                      {prod.stock}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                      prod.is_active !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {prod.is_active !== false ? <Eye className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                      {prod.is_active !== false ? 'Hiển thị' : 'Ẩn'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {prod.is_active === false && (
                        <Can permission="products.update">
                          <button
                            onClick={() => handleRestore(prod.id, prod.name)}
                            title="Mở lại sản phẩm (Cho phép hiển thị trên cửa hàng)"
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" /> Mở lại
                          </button>
                        </Can>
                      )}
                      <Can permission="products.update">
                        <button onClick={() => openEditModal(prod)} title="Chỉnh sửa sản phẩm"
                          className="p-2 bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </Can>
                      {canDelete && (
                        <button onClick={() => setDeleteModalProduct({ id: prod.id, name: prod.name })} title="Tùy chọn xóa / ẩn sản phẩm"
                          className="p-2 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemLabel="sản phẩm"
            limitOptions={[10, 20, 50, 100]}
          />
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                {editing ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Tên sản phẩm */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  Tên sản phẩm <span className="text-rose-400">*</span>
                </label>
                <input required type="text" placeholder="VD: Laptop Dell XPS 15 2024" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-cyan-500" />
              </div>

              {/* SKU, Danh mục, Thương hiệu */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>SKU (Mã sản phẩm)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const b = brands.find(x => String(x.id) === String(form.brand_id));
                        const c = categories.find(x => String(x.id) === String(form.category_id));
                        const noDiacritics = (s) => String(s || '')
                          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                          .replace(/đ/g, 'd').replace(/Đ/g, 'D');
                        const BRAND = { dell: 'DEL', hp: 'HP', hewlett: 'HP', lenovo: 'LEN', apple: 'APP', asus: 'ASU', acer: 'ACE', msi: 'MSI' };
                        const CAT = { 'van phong': 'OFF', 'sinh vien': 'STD', 'gaming': 'GMG', 'do hoa': 'GRH', 'mong nhe': 'THN', 'doanh nhan': 'BIZ' };
                        const pickBrand = (name) => {
                          if (!name) return 'GEN';
                          const n = noDiacritics(name).toLowerCase().trim();
                          for (const k of Object.keys(BRAND)) if (n === k || n.startsWith(k + ' ') || n.startsWith(k + '-')) return BRAND[k];
                          return (noDiacritics(name).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0,3) || 'GEN').padEnd(3,'X');
                        };
                        const pickCat = (name) => {
                          if (!name) return 'GEN';
                          const n = noDiacritics(name).toLowerCase().trim();
                          if (CAT[n]) return CAT[n];
                          return (noDiacritics(name).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0,3) || 'GEN').padEnd(3,'X');
                        };
                        const brandCode = pickBrand(b?.name);
                        const catCode = pickCat(c?.name);
                        const d = new Date();
                        const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
                        const rand = String(Math.floor(1000 + Math.random() * 9000));
                        setForm(f => ({ ...f, sku: `LAP-${brandCode}-${catCode}-${ymd}-${rand}` }));
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition"
                      title="Tự động sinh SKU theo brand + category + ngày tạo"
                    >
                      ⚡ Tự động
                    </button>
                  </label>
                  <input type="text" placeholder="VD: LAP-DEL-VAN-0001 hoặc để trống rồi bấm Tự động" value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 uppercase font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5">Danh mục</label>
                  <select value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100">
                    <option value="">-- Chọn --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5">Thương hiệu</label>
                  <select value={form.brand_id} onChange={(e) => setForm({...form, brand_id: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100">
                    <option value="">-- Chọn --</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Giá bán, Giá khuyến mãi, Tồn kho */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    Giá bán (VND) <span className="text-rose-400">*</span>
                  </label>
                  <input required type="number" min="0" placeholder="VD: 25000000" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5">Giá KM (VND)</label>
                  <input type="number" min="0" placeholder="VD: 22000000" value={form.sale_price} onChange={(e) => setForm({...form, sale_price: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    Tồn kho <span className="text-rose-400">*</span>
                  </label>
                  <input required type="number" min="0" placeholder="VD: 50" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100" />
                </div>
              </div>

              {/* Thông số kỹ thuật */}
              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs font-semibold text-slate-400 mb-3">Thông số kỹ thuật</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">CPU</label>
                    <input type="text" placeholder="VD: Intel Core i7-1360P" value={form.cpu} onChange={(e) => setForm({...form, cpu: e.target.value})}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">RAM</label>
                    <input type="text" placeholder="VD: 16GB DDR5" value={form.ram} onChange={(e) => setForm({...form, ram: e.target.value})}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">SSD</label>
                    <input type="text" placeholder="VD: 512GB NVMe" value={form.storage} onChange={(e) => setForm({...form, storage: e.target.value})}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">GPU</label>
                    <input type="text" placeholder="VD: RTX 4050 6GB" value={form.gpu} onChange={(e) => setForm({...form, gpu: e.target.value})}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 w-full" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Màn hình</label>
                    <input type="text" placeholder='VD: 15.6" FHD IPS' value={form.screen_size} onChange={(e) => setForm({...form, screen_size: e.target.value})}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 w-full" />
                  </div>
                </div>
              </div>

              {/* Hình ảnh sản phẩm */}
              <div className="border-t border-slate-800 pt-4">
                <label className="text-xs font-semibold text-slate-300 mb-2 block">Hình ảnh sản phẩm</label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-sm font-semibold transition disabled:opacity-50"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Upload className="w-4 h-4" />}
                    Tải hình từ máy tính
                  </button>
                  <span className="text-xs text-slate-500 text-center sm:text-left">hoặc dán URL bên dưới</span>
                </div>

                <input
                  type="url"
                  value={form.image_url.startsWith('data:') ? '' : form.image_url}
                  onChange={(e) => setForm({...form, image_url: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-cyan-500 mb-3"
                />

                {form.image_url && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveImageFresh(form.image_url)}
                        alt="Preview"
                        className="w-14 h-14 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 mb-0.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Hình ảnh đã sẵn sàng!
                        </span>
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px] sm:max-w-[300px] font-mono">
                          {form.image_url.startsWith('data:') ? 'Ảnh từ máy tính (Data URL)' : form.image_url}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: '' })}
                      className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition flex-shrink-0"
                      title="Xóa ảnh"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Mô tả chi tiết</label>
                <textarea rows="4" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Nhập mô tả chi tiết về sản phẩm..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 resize-none focus:border-cyan-500" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({...form, is_active: e.target.checked})}
                  className="w-4 h-4 rounded accent-cyan-500" />
                <span className="text-xs font-bold text-slate-300">Hiển thị sản phẩm trên cửa hàng</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs">Huỷ</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with 2 Options */}
      {deleteModalProduct && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md space-y-4 border border-rose-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" /> Tùy Chọn Xóa Sản Phẩm
              </h3>
              <button onClick={() => setDeleteModalProduct(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn đang thao tác với sản phẩm: <strong className="text-cyan-300 font-bold">{deleteModalProduct.name}</strong>. Vui lòng chọn 1 trong 2 phương án:
            </p>

            <div className="space-y-3">
              {/* Option 1: Soft Delete / Hide */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-500 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4" /> Phương Án 1: Ẩn Sản Phẩm
                  </span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full">Khuyên dùng</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sản phẩm sẽ bị <strong>ẩn ngay lập tức</strong> và <strong>không hiển thị ở trang khách hàng</strong>. Bạn có thể bấm <strong>"Mở lại"</strong> bất cứ lúc nào.
                </p>
                <button
                  onClick={handleSoftDelete}
                  className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition"
                >
                  Ẩn Sản Phẩm (Có Thể Mở Lại)
                </button>
              </div>

              {/* Option 2: Hard Delete */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30 hover:border-rose-500 transition space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Phương Án 2: Xóa Vĩnh Viễn
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full">Không thể hoàn tác</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Xóa hoàn toàn sản phẩm khỏi CSDL. <strong>Không thể khôi phục</strong> sau khi xóa vĩnh viễn.
                </p>
                <button
                  onClick={handleHardDelete}
                  className="w-full py-2 bg-rose-500/20 hover:bg-rose-500 border border-rose-500/40 text-rose-300 hover:text-white font-bold rounded-xl text-xs transition"
                >
                  Xóa Vĩnh Viễn Khỏi CSDL
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setDeleteModalProduct(null)} className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-700">
                Đóng / Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
