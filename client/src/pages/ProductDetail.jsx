import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Zap, Heart, Star, ShieldCheck, Truck, RotateCcw, Cpu, HardDrive, Monitor, CheckCircle, MessageSquare, Eye, GitCompareArrows, Loader2, AlertCircle, Lock } from 'lucide-react';
import showToast from '../utils/toast';
import productService from '../services/productService';
import reviewService from '../services/reviewService';
import { resolveImage, onImageError } from '../utils/imageHelper';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import { useAuth } from '../context/AuthContext';
import { ProductDetailSkeleton, ProductGridSkeleton } from '../components/Skeleton';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reviews — load từ API thật (fix C-07)
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [selectedImage, setSelectedImage] = useState('');

  // Form for new review
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', name: '' });
  const [reviewErrors, setReviewErrors] = useState({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();

  // Load product
  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setReviews([]);
    setReviewsLoading(true);
    productService.getProductById(id)
      .then(res => {
        const item = res?.data || res?.product || res;
        setProduct(item);
        setSelectedImage(item.image_url);

        // Fetch related products (cùng category, loại trừ sp hiện tại)
        productService.getAllProducts({ limit: 20, category: item.category_id })
          .then(relRes => {
            const allRel = relRes?.data || relRes?.products || [];
            const sameCategory = allRel.filter(p => String(p.id) !== String(id));
            setRelatedProducts(sameCategory.slice(0, 4));
          })
          .catch(() => setRelatedProducts([]));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  // Load reviews từ API (fix C-07: thay vì hard-code)
  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    reviewService.getProductReviews(id)
      .then(res => {
        const list = res?.data || res || [];
        setReviews(Array.isArray(list) ? list : []);
      })
      .catch(err => console.error('Failed to load reviews:', err))
      .finally(() => setReviewsLoading(false));
  }, [id]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      showToast.error('Vui lòng đăng nhập để mua hàng');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    if (product) {
      addToCart(product, 1);
      showToast.success('Đã thêm vào giỏ, chuyển đến thanh toán...');
      navigate('/checkout');
    }
  };

  const handleCompare = () => {
    if (isInCompare(product.id)) {
      removeFromCompare(product.id);
      showToast.success('Đã xóa khỏi danh sách so sánh');
    } else {
      const result = addToCompare(product);
      if (result.length === 0) {
        showToast.error('Bạn đã có 3 sản phẩm trong danh sách so sánh');
      } else {
        showToast.success('Đã thêm vào danh sách so sánh');
      }
    }
  };

  // Validate review form
  const validateReviewForm = () => {
    const errs = {};
    const c = (newReview.comment || '').trim();
    if (c.length < 10) errs.comment = 'Nhận xét phải có ít nhất 10 ký tự';
    if (c.length > 2000) errs.comment = 'Nhận xét không quá 2000 ký tự';
    if (!newReview.rating || newReview.rating < 1 || newReview.rating > 5) {
      errs.rating = 'Vui lòng chọn số sao';
    }
    return errs;
  };

  // Submit review qua API thật (fix C-07: thay vì chỉ push local)
  const handleAddReview = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      showToast.error('Vui lòng đăng nhập để gửi đánh giá');
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }

    const errs = validateReviewForm();
    setReviewErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmittingReview(true);
    try {
      const res = await reviewService.createReview({
        product_id: Number(id),
        rating: Number(newReview.rating),
        comment: newReview.comment.trim()
      });
      // Reload reviews list để có data mới nhất (kèm full_name từ users JOIN)
      const list = await reviewService.getProductReviews(id);
      const fresh = list?.data || list || [];
      setReviews(Array.isArray(fresh) ? fresh : []);
      setNewReview({ rating: 5, comment: '', name: '' });
      setReviewSubmitted(true);
      setTimeout(() => setReviewSubmitted(false), 4000);
      showToast.success(res?.message || 'Đã gửi đánh giá thành công!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.data?.message || 'Gửi đánh giá thất bại. Vui lòng thử lại.';
      showToast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        <ProductDetailSkeleton />
        <section className="space-y-6">
          <div className="h-7 w-48 rounded bg-slate-800/40 animate-pulse" />
          <ProductGridSkeleton count={4} />
        </section>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center">
        <div className="glass-card p-12 rounded-3xl space-y-4">
          <h2 className="text-2xl font-bold text-white">Không Tìm Thấy Sản Phẩm</h2>
          <p className="text-slate-400 text-sm">Sản phẩm này có thể đã bị gỡ hoặc không tồn tại.</p>
          <Link to="/products" className="inline-block px-6 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl">
            Về Danh Sách Sản Phẩm
          </Link>
        </div>
      </div>
    );
  }

  // Generate thumbnail gallery without duplicate images
  const extraImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [];
  const galleryImages = Array.from(new Set([
    resolveImage(product.image_url),
    ...extraImages.map(img => resolveImage(img))
  ].filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-cyan-400 transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-cyan-400 transition-colors">Sản phẩm</Link>
        <span>/</span>
        {product.brand_name && (
          <>
            <Link to={`/products?brand=${product.brand_id}`} className="hover:text-cyan-400 transition-colors">
              {product.brand_name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-white font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Product Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-6 rounded-3xl glow-blue relative aspect-video flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage || resolveImage(product.image_url)}
              alt={product.name}
              className="max-h-full object-contain rounded-2xl transition-all duration-300"
              onError={onImageError}
            />
            <button
              onClick={() => toggleWishlist(product)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-colors ${
                isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-slate-900/70 text-slate-300 hover:text-white'
              }`}
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-24 h-16 rounded-xl overflow-hidden glass-card p-1 border-2 transition-all flex-shrink-0 ${
                    selectedImage === img ? 'border-cyan-400 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover rounded-lg" onError={onImageError} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Key Details & Buy Box */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex-wrap">
              <span className="px-2.5 py-1 bg-cyan-950/60 rounded-md border border-cyan-500/30">
                Thương Hiệu: {product.brand_name || 'Dell / Apple / ASUS'}
              </span>
              {product.sku && (
                <span
                  className="px-2.5 py-1 bg-slate-900/60 rounded-md border border-slate-700 text-slate-300 font-mono cursor-pointer hover:border-cyan-500/40 transition"
                  title="Click để copy SKU"
                  onClick={() => {
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(product.sku).then(() => {
                        // eslint-disable-next-line no-alert
                        window.dispatchEvent(new CustomEvent('toast:sku-copied', { detail: product.sku }));
                      }).catch(() => {});
                    }
                  }}
                >
                  SKU: {product.sku}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-md border ${
                product.stock > 5
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : product.stock > 0
                    ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                    : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
              }`}>
                {product.stock > 5 ? `Còn Hàng (${product.stock})` : product.stock > 0 ? `Còn Hàng (${product.stock})` : 'Hết Hàng'}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="text-amber-400 animate-pulse">⚠️ Sắp hết!</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mt-3 text-sm text-slate-400">
              <div className="flex items-center text-amber-400 font-bold gap-1">
                <Star className="w-4 h-4 fill-amber-400" />
                {/* Fix C-07: rating thật từ backend (product.avg_rating), không hard-code */}
                {product.avg_rating && Number(product.avg_rating) > 0
                  ? `${Number(product.avg_rating).toFixed(1)} / 5`
                  : 'Chưa có đánh giá'}
              </div>
              {reviews.length > 0 && (
                <>
                  <span>•</span>
                  <span>{reviews.length} đánh giá khách hàng</span>
                </>
              )}
              <span>•</span>
              <span className="text-cyan-400">Đã bán {product.sold || 0} chiếc</span>
            </div>
          </div>

          {/* Price Box */}
          <div className="glass-card p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-cyan-950/30 border border-cyan-500/20">
            <div className="text-xs text-slate-400">Giá Niêm Yết Chính Hãng:</div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-3xl font-black text-cyan-400">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="text-sm text-slate-500 line-through">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Miễn phí vận chuyển & Bảo hành 12 tháng tại nhà
            </div>
          </div>

          {/* Quick Specs Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="glass-card p-3 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1 mb-1"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU</div>
              <div className="font-bold text-white truncate">{product.cpu}</div>
            </div>
            <div className="glass-card p-3 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1 mb-1"><Zap className="w-3.5 h-3.5 text-purple-400" /> RAM</div>
              <div className="font-bold text-white truncate">{product.ram}</div>
            </div>
            <div className="glass-card p-3 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1 mb-1"><HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Ổ Cứng</div>
              <div className="font-bold text-white truncate">{product.storage}</div>
            </div>
            <div className="glass-card p-3 rounded-xl">
              <div className="text-slate-400 flex items-center gap-1 mb-1"><Monitor className="w-3.5 h-3.5 text-amber-400" /> Màn Hình</div>
              <div className="font-bold text-white truncate">{product.screen_size || '15.6" Full HD'}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <button
              onClick={handleBuyNow}
              className={`sm:col-span-7 py-4 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 ${
                product.stock === 0
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 hover:shadow-lg hover:shadow-cyan-500/25'
              }`}
            >
              {product.stock === 0 ? 'HẾT HÀNG' : 'MUA NGAY (Giao Trong 2 Giờ)'}
            </button>
            <button
              onClick={() => { addToCart(product, 1); showToast.success('Đã thêm vào giỏ hàng'); }}
              className="sm:col-span-3 py-4 glass-card border border-cyan-500/40 text-cyan-300 font-bold rounded-xl hover:bg-cyan-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
            </button>
            <button
              onClick={handleCompare}
              title="So sánh"
              className={`sm:col-span-2 py-4 rounded-xl font-bold flex items-center justify-center gap-1 transition-colors ${
                isInCompare(product.id)
                  ? 'bg-amber-500 text-slate-950'
                  : 'glass-card border border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <GitCompareArrows className="w-5 h-5" />
            </button>
          </div>

          {isInCompare(product.id) && (
            <Link to="/compare" className="block w-full text-center py-2.5 glass-card border border-amber-500/40 text-amber-300 font-semibold rounded-xl text-xs hover:bg-amber-500/10">
              → Xem bảng so sánh ({/* số SP đã chọn */} {isInCompare(product.id) ? '✓' : ''})
            </Link>
          )}

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>Bảo hành chính hãng 12 tháng</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>1 đổi 1 trong 30 ngày lỗi nsx</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Giao hàng toàn quốc</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Technical Specifications Table */}
      <div className="glass-card rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Thông Số Kỹ Thuật Chi Tiết
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Bộ vi xử lý (CPU):</span>
            <span className="font-semibold text-white">{product.cpu}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Bộ nhớ RAM:</span>
            <span className="font-semibold text-white">{product.ram}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Dung lượng lưu trữ:</span>
            <span className="font-semibold text-white">{product.storage}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Card đồ họa (GPU):</span>
            <span className="font-semibold text-white">{product.gpu || 'Intel Iris Xe / RTX Graphics'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Màn hình:</span>
            <span className="font-semibold text-white">{product.screen_size || '15.6" Full HD (1920x1080)'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Trọng lượng:</span>
            <span className="font-semibold text-white">{product.weight ? `${product.weight} kg` : '1.8 kg'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Dung lượng Pin:</span>
            <span className="font-semibold text-white">{product.battery ? `${product.battery} Wh` : '56 Wh'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Màu sắc:</span>
            <span className="font-semibold text-white">{product.color || 'Xám Titan / Đen'}</span>
          </div>
        </div>

        <div className="pt-4 text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
          <div className="font-bold text-white mb-1">Mô tả chi tiết:</div>
          {product.description || 'Sản phẩm máy tính chính hãng với thiết kế sang trọng, độ bền cao, phù hợp cho học tập, công việc văn phòng và giải trí chuyên nghiệp.'}
        </div>
      </div>

      {/* Reviews & Ratings System — Fix C-07: load từ API + submit qua API */}
      <div className="glass-card rounded-3xl p-8 space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Đánh Giá & Nhận Xét Từ Khách Hàng ({reviews.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Review List */}
          <div className="lg:col-span-7 space-y-4">
            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-32 bg-slate-800 rounded" />
                      <div className="h-3 w-16 bg-slate-800 rounded" />
                    </div>
                    <div className="h-3 w-24 bg-slate-800 rounded mb-2" />
                    <div className="h-3 w-full bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Chưa có đánh giá nào cho sản phẩm này.</p>
                <p className="text-slate-500 text-xs mt-1">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    {/* Fix C-07: tên từ DB (users.full_name), không phải input */}
                    <span className="font-bold text-white text-sm">{rev.full_name || 'Khách hàng'}</span>
                    <span className="text-xs text-slate-500">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    {[...Array(Math.max(0, Math.min(5, Number(rev.rating) || 0)))].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">{rev.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Review Form */}
          <div className="lg:col-span-5">
            <form onSubmit={handleAddReview} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-sm">Gửi Nhận Xét Của Bạn</h3>

              {reviewSubmitted && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold">
                  ✓ Đã gửi nhận xét thành công! Cảm ơn bạn đã đóng góp.
                </div>
              )}

              {!isAuthenticated ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                  <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Bạn cần đăng nhập để gửi đánh giá</p>
                    <p>Và phải mua sản phẩm này (đơn đã giao) mới có thể đánh giá.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    Đánh giá với tên: <strong className="text-white">{user?.full_name || 'bạn'}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Đánh giá số sao *</label>
                    <select
                      value={newReview.rating}
                      onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="5">★★★★★ - Rất hài lòng (5 Sao)</option>
                      <option value="4">★★★★☆ - Hài lòng (4 Sao)</option>
                      <option value="3">★★★☆☆ - Bình thường (3 Sao)</option>
                      <option value="2">★★☆☆☆ - Chưa hài lòng (2 Sao)</option>
                      <option value="1">★☆☆☆☆ - Rất tệ (1 Sao)</option>
                    </select>
                    {reviewErrors.rating && (
                      <p className="text-xs text-rose-400 mt-1">{reviewErrors.rating}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nội dung nhận xét * (tối thiểu 10 ký tự)</label>
                    <textarea
                      required
                      rows="3"
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      placeholder="Chia sẻ cảm nhận về hiệu năng, màn hình, thời lượng pin..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex items-center justify-between mt-1">
                      {reviewErrors.comment ? (
                        <p className="text-xs text-rose-400">{reviewErrors.comment}</p>
                      ) : <span />}
                      <span className="text-[10px] text-slate-500">{newReview.comment.length} / 2000</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl hover:bg-cyan-400 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingReview ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                    ) : 'Gửi Đánh Giá'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Sản Phẩm Cùng Phân Khúc</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(rel => (
              <div key={rel.id} className="glass-card rounded-2xl p-4 flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
                <Link to={`/products/${rel.id}`}>
                  <img src={resolveImage(rel.image_url)} alt={rel.name} className="aspect-video w-full object-cover rounded-xl mb-3 bg-slate-900" onError={onImageError} />
                  <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-cyan-300">{rel.name}</h3>
                  <div className="text-xs text-cyan-400 font-bold mt-2">{formatPrice(rel.price)}</div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
