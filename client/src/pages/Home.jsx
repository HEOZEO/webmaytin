import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, ShieldCheck, Truck, Zap, ShoppingCart, Heart, Monitor, HardDrive, Headphones, Laptop, Loader2 } from 'lucide-react';
import showToast from '../utils/toast';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import BannerSlider from '../components/BannerSlider';
import { ProductGridSkeleton } from '../components/Skeleton';
import { resolveImage, onImageError, FALLBACK_IMAGE } from '../utils/imageHelper';

const CATEGORIES = [
  { id: 'laptop', name: 'Laptop', icon: Laptop, count: '30+ Mẫu', color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400' },
  { id: 'pc', name: 'PC Mới & PC Đồng Bộ', icon: Cpu, count: '15+ Cấu hình', color: 'from-purple-500/20 to-indigo-500/10 text-purple-400' },
  { id: 'monitor', name: 'Màn Hình Máy Tính', icon: Monitor, count: '20+ Model', color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400' },
  { id: 'components', name: 'Linh Kiện Máy Tính', icon: HardDrive, count: 'RAM, SSD, VGA, CPU', color: 'from-amber-500/20 to-orange-500/10 text-amber-400' },
  { id: 'accessories', name: 'Phụ Kiện Máy Tính', icon: Headphones, count: 'Chuột, Bàn phím, Tai nghe', color: 'from-rose-500/20 to-pink-500/10 text-rose-400' }
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();

  useEffect(() => {
    productService.getAllProducts({ limit: 12 })
      .then(res => {
        const items = res?.data || res?.products || [];
        setFeaturedProducts(items.slice(0, 12));
      })
      .catch(err => {
        console.error(err);
        showToast.error('Không thể tải sản phẩm nổi bật');
      })
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="space-y-14 pb-16">
      {/* Top Banner Slider Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <BannerSlider />
      </section>

      {/* Main Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Danh Mục Máy Tính
          </h2>
          <Link to="/products" className="text-xs text-cyan-400 font-semibold hover:underline">
            Xem tất cả danh mục →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="glass-card p-5 rounded-2xl flex flex-col items-center text-center space-y-3 group hover:border-cyan-500/50 hover:scale-105 transition-all"
              >
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${cat.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">{cat.count}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-cyan-500">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Giao Hàng Siêu Tốc</h3>
              <p className="text-xs text-slate-400 mt-0.5">Miễn phí giao hàng nội thành & hỗ trợ COD</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">100% Chính Hãng</h3>
              <p className="text-xs text-slate-400 mt-0.5">Bảo hành 12-36 tháng, 1 đổi 1 trong 30 ngày</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-purple-500">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">Trả Góp 0% Lãi Suất</h3>
              <p className="text-xs text-slate-400 mt-0.5">Duyệt hồ sơ online chỉ trong 10 phút</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid (4 columns) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Sản Phẩm Máy Tính Bán Chạy & Nổi Bật</h2>
            <p className="text-slate-400 text-sm mt-1">Các dòng Laptop, PC, Màn hình & Linh kiện máy tính được khách hàng đánh giá cao nhất</p>
          </div>
          <Link to="/products" className="text-cyan-400 font-semibold text-sm hover:underline flex items-center gap-1">
            Xem Tất Cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map(product => (
              <div key={product.id} className="glass-card rounded-2xl p-5 flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
                <div>
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center">
                    <Link to={`/products/${product.id}`} className="block w-full h-full">
                      <img
                        src={resolveImage(product.image_url)}
                        alt={product.name}
                        onError={onImageError}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>
                    <button
                      onClick={() => {
                        toggleWishlist(product);
                        showToast.success(isInWishlist(product.id) ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-colors ${
                        isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-slate-900/60 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const r = addToCompare(product);
                        showToast.success(r.length === 0 ? 'Tối đa 3 SP so sánh' : 'Đã thêm vào so sánh');
                      }}
                      className={`absolute top-12 right-2 p-2 rounded-full backdrop-blur-md transition-colors ${
                        isInCompare(product.id) ? 'bg-amber-500 text-slate-950' : 'bg-slate-900/60 text-slate-300 hover:text-amber-400'
                      }`}
                      title="Thêm vào so sánh"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18M16 3v18"/><path d="M3 8h18M3 16h18"/></svg>
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] font-bold text-amber-400 border border-amber-500/30">
                      ★ 4.8 / 5
                    </span>
                  </div>

                  <Link to={`/products/${product.id}`} className="block">
                    <h3 className="font-bold text-white text-base line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="grid grid-cols-2 gap-1.5 mt-3 text-xs text-slate-400">
                    <div className="bg-slate-900/80 p-1.5 rounded text-center truncate">{product.cpu || 'Intel Core'}</div>
                    <div className="bg-slate-900/80 p-1.5 rounded text-center truncate">{product.ram || '16GB RAM'}</div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">Giá bán:</div>
                    <div className="text-lg font-bold text-cyan-400 truncate">{formatPrice(product.price)}</div>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(product);
                      showToast.success('Đã thêm vào giỏ hàng');
                    }}
                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Thêm
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
