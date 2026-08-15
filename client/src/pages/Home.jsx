import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, ShieldCheck, Truck, Zap, ShoppingCart, Heart, Monitor, HardDrive, Headphones, Laptop, Loader2, Play, Sparkles } from 'lucide-react';
import showToast from '../utils/toast';
import productService from '../services/productService';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import BannerSlider from '../components/BannerSlider';
import { ProductGridSkeleton } from '../components/Skeleton';
import { resolveImage, onImageError, FALLBACK_IMAGE } from '../utils/imageHelper';

const CATEGORIES = [
  { id: 'laptop', name: 'Laptop', icon: Laptop, count: '30+ Mẫu', color: 'from-red-600/20 to-black text-red-500' },
  { id: 'pc', name: 'PC Mới & PC Đồng Bộ', icon: Cpu, count: '15+ Cấu hình', color: 'from-red-600/20 to-black text-red-500' },
  { id: 'monitor', name: 'Màn Hình Máy Tính', icon: Monitor, count: '20+ Model', color: 'from-red-600/20 to-black text-red-500' },
  { id: 'components', name: 'Linh Kiện Máy Tính', icon: HardDrive, count: 'RAM, SSD, VGA', color: 'from-red-600/20 to-black text-red-500' },
  { id: 'accessories', name: 'Phụ Kiện Máy Tính', icon: Headphones, count: 'Chuột, Bàn phím', color: 'from-red-600/20 to-black text-red-500' }
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
      <section className="w-full">
        <BannerSlider />
      </section>

      {/* Main Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b-2 border-red-600/50 pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 uppercase tracking-widest">
            <Zap className="w-5 h-5 text-red-500" />
            Danh Mục Nổi Bật
          </h2>
          <Link to="/products" className="text-xs text-red-500 font-bold hover:text-red-400 tracking-wider uppercase flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                to={`/products?category=${cat.id}`}
                className="bg-neutral-900 border border-neutral-800 clip-path-rog p-5 flex flex-col items-center text-center space-y-3 group hover:border-red-600 hover:glow-rog transition-all"
              >
                <div className={`p-4 rounded-none clip-path-rog bg-gradient-to-br ${cat.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-red-500 transition-colors uppercase tracking-widest">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500">{cat.count}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features Value Proposition */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 clip-path-rog p-6 flex items-center gap-4 border-l-4 border-l-red-600">
            <div className="p-3 bg-red-600/10 text-red-500 rounded-none clip-path-rog">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-wider">Giao Hàng Siêu Tốc</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Miễn phí giao hàng nội thành & hỗ trợ COD</p>
            </div>
          </div>

          <div className="bg-neutral-900 clip-path-rog p-6 flex items-center gap-4 border-l-4 border-l-red-600">
            <div className="p-3 bg-red-600/10 text-red-500 rounded-none clip-path-rog">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-wider">100% Chính Hãng</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Bảo hành 12-36 tháng, 1 đổi 1 trong 30 ngày</p>
            </div>
          </div>

          <div className="bg-neutral-900 clip-path-rog p-6 flex items-center gap-4 border-l-4 border-l-red-600">
            <div className="p-3 bg-red-600/10 text-red-500 rounded-none clip-path-rog">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base uppercase tracking-wider">Trả Góp 0% Lãi Suất</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Duyệt hồ sơ online chỉ trong 10 phút</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid (Light Theme / Zephyrus Style) */}
      <div className="w-full bg-[#f4f5f6] text-black py-16" style={{ clipPath: 'polygon(0 40px, 100% 0, 100% 100%, 0 100%)', marginTop: '4rem' }}>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 mb-24">
          
          {/* LAPTOP GAMING OVERVIEW */}
          <div className="flex flex-col items-center justify-center text-center space-y-6 pt-8 pb-4">
            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-widest font-rog">
              LAPTOP GAMING CHÍNH HÃNG
            </h2>
            <p className="text-neutral-600 max-w-4xl text-sm md:text-base leading-relaxed">
              Tại <strong className="text-black">Laptop Store</strong>, chúng tôi tự hào là đại lý phân phối chính hãng các dòng Laptop Gaming hàng đầu. Nổi bật nhất là dải sản phẩm <strong className="text-red-600">ASUS ROG</strong> với ba dòng chủ lực: ROG Flow di động linh hoạt, ROG Zephyrus mỏng nhẹ thanh lịch và cỗ máy thể thao điện tử ROG Strix. Cam kết cấu hình đời mới nhất, bảo hành chính hãng 24 tháng.
            </p>
            <Link to="/products?category=gaming" className="text-red-600 font-bold text-sm uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1">
              XEM TẤT CẢ LAPTOP GAMING <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/compare" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold text-sm uppercase tracking-widest rounded-none clip-path-rog hover:opacity-90 transition-opacity flex items-center gap-2 shadow-lg">
              <Sparkles className="w-4 h-4" /> AI Series Comparison
            </Link>
          </div>

          {/* 3 Columns Product Lines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-neutral-200">
            {/* Flow */}
            <div className="flex flex-col items-center text-center group bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
              <div className="w-full aspect-[4/3] mb-6 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=600&q=80" alt="ROG Flow" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest mb-3 font-rog text-black">ROG FLOW</h3>
              <p className="text-neutral-600 text-xs font-bold leading-relaxed mb-4 px-2 line-clamp-4">
                Dòng sản phẩm 2-trong-1 linh hoạt nhất thế giới. Vừa là Tablet giải trí, vừa là Laptop Gaming thực thụ. Thích hợp cho những ai di chuyển nhiều nhưng vẫn cần sức mạnh tuyệt đối.
              </p>
              <Link to="/products?category=flow" className="text-red-600 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1 mt-auto">
                XEM THÊM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Zephyrus */}
            <div className="flex flex-col items-center text-center group bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
              <div className="w-full aspect-[4/3] mb-6 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=600&q=80" alt="ROG Zephyrus" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest mb-3 font-rog text-black">ROG ZEPHYRUS</h3>
              <p className="text-neutral-600 text-xs font-bold leading-relaxed mb-4 px-2 line-clamp-4">
                Sự giao thoa hoàn hảo giữa hiệu năng và tính thẩm mỹ. Lớp vỏ nhôm nguyên khối, màn hình OLED rực rỡ, lý tưởng cho giới sáng tạo nội dung (Creator) và game thủ phong cách.
              </p>
              <Link to="/products?category=zephyrus" className="text-red-600 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1 mt-auto">
                XEM THÊM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Strix */}
            <div className="flex flex-col items-center text-center group bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
              <div className="w-full aspect-[4/3] mb-6 overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80" alt="ROG Strix" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest mb-3 font-rog text-black">ROG STRIX</h3>
              <p className="text-neutral-600 text-xs font-bold leading-relaxed mb-4 px-2 line-clamp-4">
                Cỗ máy cày cuốc thực thụ với hệ thống tản nhiệt hạng nặng. Được sinh ra để chinh phục các tựa game eSports với mức FPS cao nhất. Sự lựa chọn số 1 của game thủ Hardcore.
              </p>
              <Link to="/products?category=strix" className="text-red-600 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors flex items-center gap-1 mt-auto">
                XEM THÊM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </section>
      </div>

      {/* Sản Phẩm Đỉnh Cao with ROG Grid Pattern */}
      <div className="w-full bg-[#f4f5f6] text-black py-16 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 border-b-2 border-red-600/50 pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-black uppercase tracking-widest border-l-4 border-red-600 pl-3">Sản Phẩm Đỉnh Cao</h2>
              <p className="text-neutral-500 text-sm mt-1 pl-4">Tinh tế, mỏng nhẹ và mạnh mẽ - Chuẩn mực mới</p>
            </div>
          <Link to="/products" className="text-red-500 font-bold text-sm hover:text-red-400 uppercase tracking-widest flex items-center gap-1">
            Xem Tất Cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="flex flex-col gap-8">
            {/* Spotlight Section */}
            {featuredProducts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Spotlight Product */}
                <div className="lg:col-span-2 bg-white p-8 flex flex-col md:flex-row gap-8 group transition-all relative overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-red-600/10 hover:-translate-y-1 z-10">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-20"></div>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 blur-[100px] rounded-full pointer-events-none"></div>
                  <div className="absolute -bottom-16 -right-10 text-[180px] font-rog font-black text-black/[0.02] pointer-events-none transform -rotate-12 select-none">
                    ROG
                  </div>
                  <div className="w-full md:w-1/2 relative aspect-square bg-white flex items-center justify-center p-6 z-10">
                    <img
                      src={resolveImage(featuredProducts[0].image_url)}
                      alt={featuredProducts[0].name}
                      onError={onImageError}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 drop-shadow-[0_0_30px_rgba(255,0,41,0.3)]"
                    />
                    <span className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-red-600 to-orange-500 text-white font-black text-xs uppercase tracking-widest clip-path-rog shadow-lg shadow-red-500/30">
                      HOT SALE
                    </span>
                  </div>
                  <div className="w-full md:w-1/2 flex flex-col justify-center space-y-6 z-10">
                    <div>
                      <Link to={`/products/${featuredProducts[0].id}`}>
                        <h3 className="text-2xl lg:text-4xl font-black text-black font-rog uppercase tracking-wide group-hover:text-red-600 transition-colors leading-tight">
                          {featuredProducts[0].name}
                        </h3>
                      </Link>
                      <p className="text-neutral-600 mt-4 text-sm leading-relaxed font-medium">
                        Siêu phẩm tối thượng mang lại hiệu năng đột phá. Trải nghiệm khung hình mượt mà không độ trễ.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="flex items-center gap-3 bg-[#f4f5f6] p-3 shadow-sm border-l-2 border-blue-600 group/spec hover:bg-blue-50 transition-colors">
                        <Cpu className="w-5 h-5 shrink-0 text-blue-600 group-hover/spec:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm text-neutral-800 font-bold uppercase tracking-wider leading-tight">
                          {featuredProducts[0].cpu || 'Intel Core i9'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 bg-[#f4f5f6] p-3 shadow-sm border-l-2 border-red-600 group/spec hover:bg-red-50 transition-colors">
                        <HardDrive className="w-5 h-5 shrink-0 text-red-600 group-hover/spec:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm text-neutral-800 font-bold uppercase tracking-wider leading-tight">
                          {featuredProducts[0].ram || '32GB DDR5'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-3xl font-black text-black">
                        {formatPrice(featuredProducts[0].price)}
                      </div>
                      <button
                        onClick={() => {
                          addToCart(featuredProducts[0]);
                          showToast.success('Đã thêm vào giỏ hàng');
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest clip-path-rog transition-all hover:shadow-[0_0_20px_rgba(255,0,41,0.6)] flex items-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" /> Mua Ngay
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2 Smaller Products */}
                <div className="flex flex-col gap-6">
                  {featuredProducts.slice(1, 3).map(product => (
                    <div key={product.id} className="flex-1 bg-white p-4 flex gap-4 group transition-all relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-red-600/10 hover:-translate-y-1">
                      <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
                      <div className="w-1/3 relative bg-white flex items-center justify-center p-2">
                        <img src={resolveImage(product.image_url)} alt={product.name} onError={onImageError} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="w-2/3 flex flex-col justify-center">
                        <Link to={`/products/${product.id}`}>
                          <h3 className="font-bold text-black text-sm line-clamp-2 group-hover:text-red-600 transition-colors uppercase">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="text-black font-black mt-2 text-lg">{formatPrice(product.price)}</div>
                        <div className="flex flex-col gap-1.5 mt-3">
                          <div className="flex items-center gap-2 bg-[#f4f5f6] px-2 py-1.5 shadow-sm border-l-2 border-blue-600">
                            <Cpu className="w-3 h-3 shrink-0 text-blue-600" />
                            <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
                              {product.cpu || 'Intel Core'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-[#f4f5f6] px-2 py-1.5 shadow-sm border-l-2 border-red-600">
                            <HardDrive className="w-3 h-3 shrink-0 text-red-600" />
                            <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
                              {product.ram || '16GB RAM'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grid for the rest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(3).map(product => (
                <div key={product.id} className="bg-white p-5 flex flex-col justify-between group transition-all relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-red-600/10 hover:-translate-y-1">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
                  <div>
                    <div className="relative aspect-video overflow-hidden mb-4 bg-white flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <Link to={`/products/${product.id}`} className="block w-full h-full">
                      <img
                        src={resolveImage(product.image_url)}
                        alt={product.name}
                        onError={onImageError}
                        className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 drop-shadow-md"
                      />
                    </Link>
                    <button
                      onClick={() => {
                        toggleWishlist(product);
                        showToast.success(isInWishlist(product.id) ? 'Đã xóa khỏi yêu thích' : 'Đã thêm vào yêu thích');
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-none clip-path-rog transition-colors ${
                        isInWishlist(product.id) ? 'bg-red-600 text-white shadow-lg' : 'bg-neutral-100 text-neutral-500 hover:text-red-600 border border-neutral-200'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const r = addToCompare(product);
                        showToast.success(r.length === 0 ? 'Tối đa 3 SP so sánh' : 'Đã thêm vào so sánh');
                      }}
                      className={`absolute top-12 right-2 p-2 rounded-none clip-path-rog transition-colors ${
                        isInCompare(product.id) ? 'bg-red-600 text-white shadow-lg' : 'bg-neutral-100 text-neutral-500 hover:text-red-600 border border-neutral-200'
                      }`}
                      title="Thêm vào so sánh"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18M16 3v18"/><path d="M3 8h18M3 16h18"/></svg>
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-none bg-red-600 text-[10px] font-bold text-white uppercase tracking-wider">
                      ★ 4.8 / 5
                    </span>
                  </div>

                  <Link to={`/products/${product.id}`} className="block">
                    <h3 className="font-bold text-black text-base line-clamp-2 group-hover:text-red-600 transition-colors uppercase tracking-wide">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex flex-col gap-1.5 mt-3">
                    <div className="flex items-center gap-2 bg-[#f4f5f6] px-2.5 py-2 shadow-sm border-l-2 border-blue-600 hover:bg-blue-50 transition-colors">
                      <Cpu className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
                        {product.cpu || 'Intel Core'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-[#f4f5f6] px-2.5 py-2 shadow-sm border-l-2 border-red-600 hover:bg-red-50 transition-colors">
                      <HardDrive className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span className="text-[10px] text-neutral-700 font-bold uppercase tracking-wider leading-tight">
                        {product.ram || '16GB RAM'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#f4f5f6] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Giá bán:</div>
                    <div className="text-lg font-black text-black truncate">{formatPrice(product.price)}</div>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(product);
                      showToast.success('Đã thêm vào giỏ hàng');
                    }}
                    className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-none clip-path-rog transition-all hover:shadow-[0_0_15px_rgba(255,0,41,0.6)] active:scale-95"
                    title="Thêm vào giỏ hàng"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            </div>

            <div className="flex justify-center mt-10">
              <Link to="/products" className="inline-flex items-center gap-2 px-10 py-4 bg-red-600 text-white font-bold text-sm uppercase tracking-widest clip-path-rog hover:bg-red-500 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,0,41,0.6)] transition-all">
                Xem Tất Cả Sản Phẩm Đỉnh Cao <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative pt-16 pb-8 flex items-center justify-center">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-red-600/40 to-transparent"></div>
          <div className="relative px-6 flex gap-2">
            <div className="w-2.5 h-2.5 bg-red-600 transform rotate-45 shadow-[0_0_10px_rgba(255,0,0,0.5)]"></div>
            <div className="w-2.5 h-2.5 bg-red-600 transform rotate-45 opacity-60"></div>
            <div className="w-2.5 h-2.5 bg-red-600 transform rotate-45 opacity-30"></div>
          </div>
        </div>

        {/* VIDEO SECTION */}
        <div className="pt-10 pb-10">
            <h2 className="text-3xl font-black text-center text-black uppercase tracking-widest mb-10 font-rog">VIDEO</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {/* Big Video */}
              <div className="lg:col-span-2 relative aspect-[16/9] group cursor-pointer overflow-hidden bg-black clip-path-rog">
                <img src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=80" alt="Video 1" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-black/60 border border-white/30 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-red-600 transition-colors">
                    <Play className="w-6 h-6 ml-1" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
                  <div className="flex items-center gap-2 text-sm md:text-base font-bold">
                    <Play className="w-4 h-4 shrink-0" /> ROG Zephyrus DUO 2026 – Siêu phẩm laptop gaming có 2 màn hình 16 inch đồng bộ tuyệt đối mọi thông số
                  </div>
                </div>
              </div>
              
              {/* 2 Small Videos */}
              <div className="flex flex-col gap-2">
                <div className="relative flex-1 group cursor-pointer overflow-hidden bg-black clip-path-rog">
                  <img src="https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=600&q=80" alt="Video 2" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold flex items-center gap-1.5 pointer-events-none">
                    <Play className="w-3.5 h-3.5 shrink-0" /> ROG Zephyrus G16 2026 – Laptop gaming 16 inch mỏng...
                  </div>
                </div>
                <div className="relative flex-1 group cursor-pointer overflow-hidden bg-black clip-path-rog">
                  <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=600&q=80" alt="Video 3" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-bold flex items-center gap-1.5 pointer-events-none">
                    <Play className="w-3.5 h-3.5 shrink-0" /> ROG Zephyrus G14 2026 (GU405) - Laptop Gaming RTX...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Related Articles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-black text-center text-white uppercase tracking-widest mb-12 font-rog">BÀI VIẾT LIÊN QUAN</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {[
            {
              title: "ROG Strix SCAR 18 2026: Chuẩn Flagship Gaming Thế Hệ Mới",
              excerpt: "Cấu hình ROG Strix Scar 18 2026 dùng Intel Core Ultra 9 290HX Plus, GPU NVIDIA GeForce RTX 5090 Laptop 24GB GDDR7, màn hình ROG Nebula HDR Mini LED...",
              image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80"
            },
            {
              title: "Đánh Giá ROG Strix Scar 18 2026: Laptop Gaming Flagship RTX 5090 Có Xứng Đáng Vị Trí Đầu Bảng?",
              excerpt: "ROG Strix Scar 18 2026 là một trong những laptop gaming 18 mạnh mẽ nhất hiện nay, sử dụng Intel Core Ultra 9 290HX Plus, GPU NVIDIA GeForce RTX 5090 Laptop GPU...",
              image: "https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=400&q=80"
            },
            {
              title: "Đánh Giá ROG Zephyrus DUO 2026: Đột Phá Bàn Phím Rời Và Không Gian Hiển Thị Kép",
              excerpt: "Đánh giá ROG Zephyrus DUO 2026, có thể khẳng định đây là một trong những laptop hai màn hình 16 inch mạnh nhất thị trường hiện nay...",
              image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=400&q=80"
            },
            {
              title: "Có Nên Mua Laptop Gaming Mỏng Nhẹ Năm 2026? Đánh Giá Hiệu Năng Thực Tế Và Tiêu Chí Chọn Máy",
              excerpt: "Năm 2026, laptop gaming mỏng nhẹ dưới 2kg trang bị RTX 50 series cho hiệu năng Cinebench R23 đơn nhân đạt 2,400 điểm trở lên...",
              image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80"
            }
          ].map((article, idx) => (
            <div key={idx} className="flex gap-5 group cursor-pointer border-b border-neutral-800 pb-8 hover:border-red-600/50 transition-colors">
              <div className="w-2/5 shrink-0 h-32 overflow-hidden bg-black relative">
                <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
              </div>
              <div className="w-3/5 py-1">
                <div className="text-red-600 text-[10px] font-black uppercase tracking-widest mb-2">// POST</div>
                <h3 className="text-white font-bold text-sm leading-tight group-hover:text-red-500 transition-colors mb-2">
                  {article.title}
                </h3>
                <p className="text-neutral-400 text-xs leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
