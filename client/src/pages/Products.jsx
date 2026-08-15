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
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <h3 className="font-bold text-black text-sm flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-red-600" /> Bộ Lọc Tìm Kiếm
        </h3>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-rose-500 hover:underline flex items-center gap-1">
            <X className="w-3 h-3" /> Xóa ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Thương Hiệu</label>
        <select
          value={selectedBrand}
          onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }}
          className="w-full p-2.5 bg-white border border-neutral-200 rounded-none clip-path-rog text-sm text-black focus:outline-none focus:border-red-600 focus:shadow-[0_0_10px_rgba(255,0,41,0.1)]"
        >
          <option value="">Tất cả thương hiệu</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Khoảng Giá</label>
        <select
          value={selectedPriceRange}
          onChange={(e) => { setSelectedPriceRange(e.target.value); setCurrentPage(1); }}
          className="w-full p-2.5 bg-white border border-neutral-200 rounded-none clip-path-rog text-sm text-black focus:outline-none focus:border-red-600 focus:shadow-[0_0_10px_rgba(255,0,41,0.1)]"
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
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => { setInStockOnly(e.target.checked); setCurrentPage(1); }}
            className="w-4 h-4 accent-red-600"
          />
          <span className="text-xs font-semibold text-neutral-300">Chỉ hiển thị còn hàng</span>
        </label>
      </div>

      {/* Sort Selector */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">Sắp Xếp</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full p-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-sm text-slate-200 focus:outline-none"
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
        <Link to="/compare" className="flex items-center justify-between gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs">
          <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> So sánh ({compareCount})</span>
          <span className="opacity-75">→</span>
        </Link>
      )}
    </div>
  );

  return (
    <div className="w-full bg-[#f4f5f6] min-h-screen pb-16 relative overflow-hidden">
      {/* Họa tiết ROG Slash Pattern & Tech Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)' }}></div>
      <div className="absolute top-[20%] left-[-10%] w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      
      <div className="relative z-10">
      {/* Hero Banner */}
      <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden bg-black mb-8">
        <img src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1920&q=80" alt="All Models Banner" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 space-y-3">
          <h1 className="text-3xl md:text-5xl font-black text-white font-rog uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,0,41,0.5)]">
            LAPTOP GAMING ASUS ROG
          </h1>
          <p className="text-red-500 font-bold uppercase tracking-widest text-sm">
            {showWishlistOnly ? 'DANH SÁCH YÊU THÍCH' : 'TẤT CẢ SẢN PHẨM'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <p className="text-neutral-600 text-sm font-bold uppercase tracking-wider">
              Hiển thị <strong className="text-red-600">{sortedProducts.length}</strong> sản phẩm phù hợp
            </p>
          </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm tên laptop, CPU, RAM..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-none clip-path-rog text-sm text-black placeholder-neutral-400 focus:outline-none focus:border-red-600 focus:shadow-[0_0_10px_rgba(255,0,41,0.2)]"
            />
          </div>

          <button
            onClick={() => setShowMobileFilter(true)}
            className="lg:hidden relative p-2.5 bg-black border border-neutral-800 rounded-none clip-path-rog text-neutral-300 hover:text-red-500"
          >
            <FilterIcon className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white font-bold tracking-widest uppercase text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center bg-white border border-neutral-200 rounded-none clip-path-rog p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-none transition-all ${viewMode === 'grid' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,0,41,0.4)]' : 'text-neutral-400 hover:text-red-600 hover:bg-neutral-100'}`}
              title="Lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-none transition-all ${viewMode === 'list' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,0,41,0.4)]' : 'text-neutral-400 hover:text-red-600 hover:bg-neutral-100'}`}
              title="Danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-white border border-neutral-200 clip-path-rog p-5 rounded-none sticky top-24 shadow-sm">
            <FilterPanel />
          </div>
        </aside>

        <div className="lg:col-span-9 space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="bg-white border border-neutral-200 clip-path-rog rounded-none clip-path-rog h-84 animate-pulse" />
              ))}
            </div>
          ) : currentProducts.length === 0 ? (
            <div className="bg-white border border-neutral-200 clip-path-rog p-12 text-center rounded-none clip-path-rog space-y-3">
              <p className="text-neutral-600 text-base">Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.</p>
              <button onClick={clearFilters} className="px-4 py-2 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs hover:bg-red-500">
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
            <div className="flex items-center justify-center space-x-2 pt-6 border-t border-neutral-200">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-9 h-9 rounded-lg font-bold text-xs transition-all ${
                    currentPage === i + 1 ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(255,0,41,0.3)]' : 'bg-white text-neutral-500 hover:text-red-600 border border-neutral-200 hover:border-red-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-lg bg-white border border-neutral-200 text-neutral-500 hover:text-red-600 hover:border-red-200 disabled:opacity-40 transition-colors"
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
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white border border-neutral-200 clip-path-rog rounded-t-3xl p-6 space-y-6 border-t-2 border-red-600/40 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between sticky top-0 bg-white/90 pb-3 -mt-2 pt-2 backdrop-blur z-10">
              <h3 className="font-bold text-black text-base flex items-center gap-2">
                <FilterIcon className="w-5 h-5 text-red-600" /> Bộ Lọc {activeFilterCount > 0 && <span className="text-red-600">({activeFilterCount})</span>}
              </h3>
              <button onClick={() => setShowMobileFilter(false)} className="p-2 text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel />
            <div className="sticky bottom-0 bg-white/90 backdrop-blur -mx-6 px-6 pt-3 pb-1 border-t border-neutral-200">
              <button
                onClick={() => setShowMobileFilter(false)}
                className="w-full py-3 bg-red-600 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog text-sm hover:bg-red-500 hover:shadow-[0_0_15px_rgba(255,0,41,0.5)] transition-all"
              >
                Áp dụng ({sortedProducts.length} sản phẩm)
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
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
      <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 text-red-600" />} {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-none clip-path-rog text-xs font-bold uppercase tracking-wide border transition-all ${
              selected.includes(opt)
                ? 'border-red-600 bg-red-50 text-red-600 shadow-[0_0_10px_rgba(255,0,41,0.1)]'
                : 'border-neutral-200 bg-[#f4f5f6] text-neutral-600 hover:text-black hover:border-red-600/50'
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
    <div className="bg-white p-4 flex flex-col justify-between group transition-all relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1">
      <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
      <div>
        <div className="relative aspect-video overflow-hidden mb-3 bg-[#f4f5f6] flex items-center justify-center">
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
            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md shadow-sm transition-colors ${
              isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-white/90 text-neutral-500 hover:text-red-600'
            }`}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddToCompare}
            title="So sánh"
            className={`absolute top-12 right-2 p-2 rounded-full backdrop-blur-md shadow-sm transition-colors ${
              isInCompare(product.id) ? 'bg-amber-500 text-white font-bold tracking-widest uppercase' : 'bg-white/90 text-neutral-500 hover:text-amber-500'
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
          <h3 className="font-bold text-black text-sm line-clamp-2 group-hover:text-red-600 transition-colors uppercase tracking-wide min-h-[2.5rem]">
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-col gap-1.5 mt-3">
          <div className="flex items-center gap-2 bg-[#f4f5f6] px-2.5 py-1.5 shadow-sm border-l-2 border-blue-600">
            <Cpu className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
              {product.cpu || 'Intel Core'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-[#f4f5f6] px-2.5 py-1.5 shadow-sm border-l-2 border-red-600">
            <HardDrive className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
              {product.ram || '16GB RAM'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-neutral-200 flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Giá bán:</div>
          <div className="text-base sm:text-lg font-black text-red-600 leading-tight whitespace-nowrap">{formatPrice(product.price)}</div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          title="Thêm vào giỏ hàng"
          className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-none clip-path-rog shrink-0 transition-all hover:shadow-[0_0_15px_rgba(255,0,41,0.5)]"
        >
          <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
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
    <div className="bg-white p-5 flex flex-col sm:flex-row items-center gap-6 group transition-all relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1">
      <div className="absolute top-0 left-0 w-1 h-full sm:w-full sm:h-1 bg-red-600 scale-y-0 sm:scale-x-0 group-hover:scale-y-100 sm:group-hover:scale-x-100 transition-transform origin-top sm:origin-left duration-500 z-10"></div>
      
      <Link to={`/products/${product.id}`} className="w-full sm:w-48 h-32 flex-shrink-0 bg-[#f4f5f6] overflow-hidden flex items-center justify-center p-2">
        <img
          src={resolveImage(product.image_url)}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={onImageError}
        />
      </Link>
      <div className="flex-1 space-y-2 min-w-0">
        <Link to={`/products/${product.id}`}>
          <h3 className="font-bold text-black text-lg group-hover:text-red-600 transition-colors line-clamp-1 uppercase tracking-wide">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-neutral-400 line-clamp-2">{product.description}</p>
        <div className="flex flex-wrap gap-2 text-xs mt-2">
          {product.cpu && (
            <div className="flex items-center gap-1.5 bg-[#f4f5f6] px-2 py-1 shadow-sm border-l-2 border-blue-600">
              <Cpu className="w-3 h-3 text-blue-600" />
              <span className="font-bold uppercase tracking-wider text-neutral-700">{product.cpu}</span>
            </div>
          )}
          {product.ram && (
            <div className="flex items-center gap-1.5 bg-[#f4f5f6] px-2 py-1 shadow-sm border-l-2 border-red-600">
              <HardDrive className="w-3 h-3 text-red-600" />
              <span className="font-bold uppercase tracking-wider text-neutral-700">{product.ram}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-3 min-w-[140px]">
        <div className="text-xl font-bold text-red-600">{formatPrice(product.price)}</div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toggleWishlist(product);
              showToast.success(isInWishlist(product.id) ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
            }}
            className={`p-2 rounded-none clip-path-rog border ${isInWishlist(product.id) ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-neutral-200 text-neutral-400 bg-[#f4f5f6] hover:text-rose-500'}`}
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="py-2.5 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4" /> Thêm Giỏ
          </button>
        </div>
      </div>
    </div>
  );
}
