import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, ShoppingCart, Heart, LayoutGrid, List, ChevronLeft, ChevronRight, X, SlidersHorizontal, Filter as FilterIcon, Cpu, Monitor, HardDrive, Zap, Eye } from 'lucide-react';
import showToast from '../utils/toast';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { resolveImage, onImageError } from '../utils/imageHelper';

const PRICE_RANGES = [
  { value: '', label: 'Tất cả mức giá' },
  { value: 'under10', label: 'Dưới 10 triệu', min: 0, max: 10000000 },
  { value: '10to15', label: 'Từ 10 - 15 triệu', min: 10000000, max: 15000000 },
  { value: '15to25', label: 'Từ 15 - 25 triệu', min: 15000000, max: 25000000 },
  { value: '25to35', label: 'Từng 25 - 35 triệu', min: 25000000, max: 35000000 },
  { value: 'over35', label: 'Trên 35 triệu', min: 35000000, max: null }
];

const FALLBACK_IMG = '/images/fallback/no-image.svg';

const RAM_OPTIONS = ['8GB', '16GB', '32GB', '64GB'];
const STORAGE_OPTIONS = ['256GB', '512GB', '1TB', '2TB'];
const SCREEN_OPTIONS = ['13.3"', '14"', '15.6"', '16"', '17.3"'];

const SPEC_OPTIONS = {
  cpu: ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4'],
  gpu: ['RTX 3050', 'RTX 3060', 'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090', 'GTX 1650', 'GTX 1660', 'Integrated', 'Iris Xe', 'Radeon'],
  ram: RAM_OPTIONS,
  storage: STORAGE_OPTIONS,
  screen_size: SCREEN_OPTIONS
};

const toggleArrayValue = (arr, val) => {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
};

export default function Products() {
  const [searchParams] = useSearchParams();
  const showWishlistOnly = searchParams.get('wishlist') === 'true';
  const categoryParam = searchParams.get('category');
  const brandParam = searchParams.get('brand');
  const searchParam = searchParams.get('search');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParam || '');
  const [selectedBrand, setSelectedBrand] = useState(brandParam || '');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [selectedCpu, setSelectedCpu] = useState([]);
  const [selectedGpu, setSelectedGpu] = useState([]);
  const [selectedRam, setSelectedRam] = useState([]);
  const [selectedStorage, setSelectedStorage] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = 12;

  const [brands, setBrands] = useState([]);

  const { addToCart } = useCart();
  const { wishlist, toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, isInCompare, compareCount } = useCompare();

  useEffect(() => {
    productService.getBrands()
      .then(res => setBrands(res?.data || res?.brands || []))
      .catch(err => console.error(err));
  }, []);

  // Sync brand param từ URL vào state
  useEffect(() => {
    if (brandParam && brandParam !== selectedBrand) {
      setSelectedBrand(brandParam);
    }
    if (searchParam && searchParam !== searchTerm) {
      setSearchTerm(searchParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandParam, searchParam]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (selectedBrand) params.brand = selectedBrand;
      if (categoryParam) params.category = categoryParam;
      if (searchParam) params.search = searchParam;
      const res = await productService.getAllProducts(params);
      const items = res?.data || res?.products || [];
      setProducts(items);
    } catch (err) {
      console.error(err);
      showToast.error('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand, categoryParam, searchParam]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Combined filtering pipeline (CPU/GPU/RAM/Storage/Screen done client-side for instant feedback)
  const filteredProducts = useMemo(() => {
    const sourceProducts = showWishlistOnly ? wishlist : products;

    const matchingSpec = (product, value, field) => {
      if (!product[field]) return false;
      const productValue = String(product[field]).toLowerCase();
      const valLower = value.toLowerCase();

      if (field === 'gpu' && valLower === 'integrated') {
        return productValue.includes('integrated') || productValue.includes('iris') || productValue.includes('uhd') || productValue.includes('graphics') || productValue.includes('intel');
      }

      if (field === 'screen_size') {
        const cleanProduct = productValue.replace(/["\s]/g, '');
        const cleanValue = valLower.replace(/["\s]/g, '');
        return cleanProduct.includes(cleanValue);
      }

      return productValue.includes(valLower);
    };

    return sourceProducts.filter(product => {
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.cpu && product.cpu.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesBrand = !selectedBrand ||
        String(product.brand_id) === String(selectedBrand) ||
        (product.brand_name && product.brand_name.toLowerCase().includes(selectedBrand.toLowerCase()));

      const matchesCpu = selectedCpu.length === 0 || selectedCpu.some(c => matchingSpec(product, c, 'cpu'));
      const matchesGpu = selectedGpu.length === 0 || selectedGpu.some(g => matchingSpec(product, g, 'gpu'));
      const matchesRam = selectedRam.length === 0 || selectedRam.some(r => matchingSpec(product, r, 'ram'));
      const matchesStorage = selectedStorage.length === 0 || selectedStorage.some(s => matchingSpec(product, s, 'storage'));
      const matchesScreen = selectedScreen.length === 0 || selectedScreen.some(s => matchingSpec(product, s, 'screen_size'));

      let matchesPrice = true;
      const range = PRICE_RANGES.find(p => p.value === selectedPriceRange);
      if (range && (range.min !== null || range.max !== null)) {
        const price = Number(product.price);
        if (range.min !== null && price < range.min) matchesPrice = false;
        if (range.max !== null && price > range.max) matchesPrice = false;
      }

      const matchesStock = !inStockOnly || (product.stock && Number(product.stock) > 0);

      return matchesSearch && matchesBrand && matchesCpu && matchesGpu && matchesRam && matchesStorage && matchesScreen && matchesPrice && matchesStock;
    });
  }, [products, wishlist, searchTerm, selectedBrand, selectedCpu, selectedGpu, selectedRam, selectedStorage, selectedScreen, selectedPriceRange, inStockOnly, showWishlistOnly]);

  // Sort
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    if (sortBy === 'price-low') sorted.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === 'price-high') sorted.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    else if (sortBy === 'best-seller') sorted.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    return sorted;
  }, [filteredProducts, sortBy]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setSelectedPriceRange('');
    setSelectedCpu([]);
    setSelectedGpu([]);
    setSelectedRam([]);
    setSelectedStorage([]);
    setSelectedScreen([]);
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
  };

  const activeFilterCount = [selectedBrand, selectedPriceRange, inStockOnly, ...selectedCpu, ...selectedGpu, ...selectedRam, ...selectedStorage, ...selectedScreen].filter(Boolean).length;

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" /> Bộ Lọc Tìm Kiếm
        </h3>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-rose-400 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Xóa ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Thương Hiệu</label>
        <select
          value={selectedBrand}
          onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }}
          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none"
        >
          <option value="">Tất cả thương hiệu</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Khoảng Giá</label>
        <select
          value={selectedPriceRange}
          onChange={(e) => { setSelectedPriceRange(e.target.value); setCurrentPage(1); }}
          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none"
        >
          {PRICE_RANGES.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* CPU Filter - Multi-select chips */}
      <FilterChipGroup label="CPU" icon={Cpu} field="cpu" selected={selectedCpu} setSelected={setSelectedCpu} setCurrentPage={setCurrentPage} />

      {/* GPU Filter - Multi-select chips */}
      <FilterChipGroup label="Card Đồ Họa (GPU)" icon={Monitor} field="gpu" selected={selectedGpu} setSelected={setSelectedGpu} setCurrentPage={setCurrentPage} />

      {/* RAM Filter - Multi-select chips */}
      <FilterChipGroup label="Dung Lượng RAM" icon={Zap} field="ram" selected={selectedRam} setSelected={setSelectedRam} setCurrentPage={setCurrentPage} />

      {/* Storage Filter - Multi-select chips */}
      <FilterChipGroup label="Ổ Cứng (SSD/HDD)" icon={HardDrive} field="storage" selected={selectedStorage} setSelected={setSelectedStorage} setCurrentPage={setCurrentPage} />

      {/* Screen Size Filter - Multi-select chips */}
      <FilterChipGroup label="Kích Thước Màn Hình" icon={Monitor} field="screen_size" selected={selectedScreen} setSelected={setSelectedScreen} setCurrentPage={setCurrentPage} />

      {/* In Stock Toggle */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
            className="w-4 h-4 accent-cyan-500"
          />
          <span className="text-xs font-semibold text-slate-300">Chỉ hiển thị còn hàng</span>
        </label>
      </div>

      {/* Sort Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sắp Xếp</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none"
        >
          <option value="featured">Nổi bật nhất</option>
          <option value="best-seller">Bán chạy nhất</option>
          <option value="newest">Mới nhất</option>
          <option value="price-low">Giá: Thấp → Cao</option>
          <option value="price-high">Giá: Cao → Thấp</option>
          <option value="name">Tên: A → Z</option>
        </select>
      </div>

      {compareCount > 0 && (
        <Link to="/compare" className="flex items-center justify-between gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl text-xs">
          <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> So sánh ({compareCount})</span>
          <span className="opacity-75">→</span>
        </Link>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {showWishlistOnly ? 'Danh Sách Yêu Thích' : 'Bộ Sưu Tập Laptop & PC'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Hiển thị <strong className="text-cyan-400">{sortedProducts.length}</strong> sản phẩm phù hợp</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm tên laptop, CPU, RAM..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={() => setShowMobileFilter(true)}
            className="lg:hidden relative p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 hover:text-cyan-400"
          >
            <FilterIcon className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 sticky top-24">
            <FilterPanel />
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="glass-card rounded-2xl h-84 animate-pulse" />
              ))}
            </div>
          ) : currentProducts.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl space-y-3">
              <p className="text-slate-400 text-base">Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.</p>
              <button onClick={clearFilters} className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs">
                Đặt Lại Bộ Lọc
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentProducts.map(product => (
                <ProductCard key={product.id} product={product} formatPrice={formatPrice} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} addToCompare={addToCompare} isInCompare={isInCompare} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {currentProducts.map(product => (
                <ProductListItem key={product.id} product={product} formatPrice={formatPrice} addToCart={addToCart} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} addToCompare={addToCompare} isInCompare={isInCompare} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-6 border-t border-slate-800">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg font-semibold text-xs transition-all ${
                    currentPage === i + 1 ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showMobileFilter && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto glass-card rounded-t-3xl p-6 space-y-6 border-t-2 border-cyan-500/40 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between sticky top-0 bg-slate-900/90 pb-3 -mt-2 pt-2 backdrop-blur z-10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FilterIcon className="w-5 h-5 text-cyan-400" /> Bộ Lọc {activeFilterCount > 0 && <span className="text-cyan-400">({activeFilterCount})</span>}
              </h3>
              <button onClick={() => setShowMobileFilter(false)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel />
            <div className="sticky bottom-0 bg-slate-900/90 backdrop-blur -mx-6 px-6 pt-3 pb-1 border-t border-slate-800">
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold rounded-xl text-sm"
              >
                Áp dụng ({sortedProducts.length} sản phẩm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChipGroup({ label, icon: Icon, field, selected, setSelected, setCurrentPage }) {
  const options = SPEC_OPTIONS[field] || [];
  const toggle = (val) => {
    setSelected(toggleArrayValue(selected, val));
    setCurrentPage(1);
  };
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-cyan-400" />} {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              selected.includes(opt)
                ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product, formatPrice, addToCart, toggleWishlist, isInWishlist, addToCompare, isInCompare }) {
  const handleAddToCart = () => {
    addToCart(product);
    showToast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };
  const handleAddToCompare = () => {
    if (!isInCompare(product.id) && addToCompare(product).length === 0) {
      showToast.error('Tối đa 3 sản phẩm để so sánh');
    } else {
      showToast.success('Đã thêm vào danh sách so sánh');
    }
  };
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
      <div>
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
          <Link to={`/products/${product.id}`} className="block w-full h-full">
            <img
              src={resolveImage(product.image_url)}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={onImageError}
            />
          </Link>
          <button
            onClick={() => toggleWishlist(product)}
            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-colors ${
              isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-slate-900/60 text-slate-300 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddToCompare}
            title="So sánh"
            className={`absolute top-12 right-2 p-2 rounded-full backdrop-blur-md transition-colors ${
              isInCompare(product.id) ? 'bg-amber-500 text-slate-950' : 'bg-slate-900/60 text-slate-300 hover:text-amber-400'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
          {product.stock === 0 && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-rose-500/90 text-white text-[10px] font-bold rounded">
              HẾT HÀNG
            </span>
          )}
        </div>

        <Link to={`/products/${product.id}`} className="block">
          <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-cyan-300 transition-colors min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>

        <div className="grid grid-cols-2 gap-1 mt-3 text-[11px] text-slate-400">
          <div className="bg-slate-900 p-1 rounded text-center truncate">{product.cpu || '—'}</div>
          <div className="bg-slate-900 p-1 rounded text-center truncate">{product.ram || '—'}</div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] text-slate-500">Giá bán:</div>
          <div className="text-base font-bold text-cyan-400 truncate">{formatPrice(product.price)}</div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Thêm
        </button>
      </div>
    </div>
  );
}

function ProductListItem({ product, formatPrice, addToCart, toggleWishlist, isInWishlist, addToCompare, isInCompare }) {
  const handleAddToCart = () => {
    addToCart(product);
    showToast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };
  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6 group hover:border-cyan-500/40 transition-all">
      <Link to={`/products/${product.id}`} className="w-full sm:w-48 h-32 flex-shrink-0 bg-gradient-to-br from-slate-800 to-slate-950 rounded-xl overflow-hidden flex items-center justify-center p-2">
        <img
          src={resolveImage(product.image_url)}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={onImageError}
        />
      </Link>
      <div className="flex-1 space-y-2 min-w-0">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-bold text-white text-lg group-hover:text-cyan-300 transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {product.cpu && <span className="px-2.5 py-1 bg-slate-900 rounded-md text-slate-300">CPU: {product.cpu}</span>}
          {product.ram && <span className="px-2.5 py-1 bg-slate-900 rounded-md text-slate-300">RAM: {product.ram}</span>}
          {product.storage && <span className="px-2.5 py-1 bg-slate-900 rounded-md text-slate-300">SSD: {product.storage}</span>}
          {product.gpu && <span className="px-2.5 py-1 bg-slate-900 rounded-md text-slate-300">GPU: {product.gpu}</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-3 min-w-[140px]">
        <div className="text-xl font-bold text-cyan-400">{formatPrice(product.price)}</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toggleWishlist(product);
              showToast.success(isInWishlist(product.id) ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
            }}
            className={`p-2 rounded-xl border ${isInWishlist(product.id) ? 'border-rose-500 text-rose-400 bg-rose-500/10' : 'border-slate-700 text-slate-400 hover:text-rose-400'}`}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" /> Thêm Giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
