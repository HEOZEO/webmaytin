import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Zap, Heart, Star, ShieldCheck, Truck, RotateCcw, Cpu, HardDrive, Monitor, CheckCircle, MessageSquare, Eye, GitCompareArrows, Loader2, AlertCircle, Lock, Flame } from 'lucide-react';
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
      <div className="w-full bg-[#f4f5f6] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
          <ProductDetailSkeleton />
          <section className="space-y-6">
            <div className="h-7 w-48 rounded bg-neutral-200 animate-pulse" />
            <ProductGridSkeleton count={4} />
          </section>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full bg-[#f4f5f6] min-h-screen">
        <div className="max-w-xl mx-auto py-16 text-center">
          <div className="bg-white shadow-lg p-12 rounded-lg space-y-4">
            <h2 className="text-2xl font-bold text-black">Không Tìm Thấy Sản Phẩm</h2>
            <p className="text-neutral-500 text-sm">Sản phẩm này có thể đã bị gỡ hoặc không tồn tại.</p>
            <Link to="/products" className="inline-block px-6 py-3 bg-red-600 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog hover:bg-red-500 transition-colors">
              Về Danh Sách Sản Phẩm
            </Link>
          </div>
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
    <div className="w-full bg-[#f4f5f6] min-h-screen pb-16 relative overflow-hidden">
      {/* Họa tiết ROG Anime Matrix (Dot Grid) - Đậm và Rõ hơn */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }}></div>

      {/* Diagonal Light Slash (Zephyrus Style) - Rõ nét & Có viền LED Đỏ */}
      <div className="absolute -top-[50%] right-[5%] w-[45%] h-[200%] bg-gradient-to-l from-white via-white/95 to-transparent transform -skew-x-[28deg] pointer-events-none z-0 border-l-[4px] border-red-500/30 shadow-[-15px_0_40px_rgba(255,0,41,0.15)]"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-neutral-500">
          <Link to="/" className="hover:text-red-600 transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-red-600 transition-colors">Sản phẩm</Link>
          <span>/</span>
          {product.brand_name && (
            <>
              <Link to={`/products?brand=${product.brand_id}`} className="hover:text-red-600 transition-colors">
                {product.brand_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-black font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        {/* Product Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white shadow-md p-6 rounded-lg relative aspect-video flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage || resolveImage(product.image_url)}
                alt={product.name}
                className="max-h-full object-contain transition-all duration-300"
                onError={onImageError}
              />
              <button
                onClick={() => toggleWishlist(product)}
                className={`absolute top-4 right-4 p-3 rounded-full shadow-md transition-colors ${isInWishlist(product.id) ? 'bg-rose-500 text-white' : 'bg-white text-neutral-400 hover:text-red-600'
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
                    className={`w-24 h-16 rounded-lg overflow-hidden bg-white p-1 border-2 transition-all flex-shrink-0 shadow-sm ${selectedImage === img ? 'border-red-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
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
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600 mb-2 flex-wrap">
                <span className="px-2.5 py-1 bg-white rounded-md border border-neutral-200 shadow-sm">
                  Thương Hiệu: {product.brand_name || 'Dell / Apple / ASUS'}
                </span>
                {product.sku && (
                  <span
                    className="px-2.5 py-1 bg-white rounded-md border border-neutral-200 shadow-sm text-neutral-600 font-mono cursor-pointer hover:border-red-600/40 transition"
                    title="Click để copy SKU"
                    onClick={() => {
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(product.sku).then(() => {
                          window.dispatchEvent(new CustomEvent('toast:sku-copied', { detail: product.sku }));
                        }).catch(() => { });
                      }
                    }}
                  >
                    SKU: {product.sku}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-md border shadow-sm ${product.stock > 5
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : product.stock > 0
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                  {product.stock > 5 ? `Còn Hàng (${product.stock})` : product.stock > 0 ? `Còn Hàng (${product.stock})` : 'Hết Hàng'}
                </span>
                {product.stock > 0 && product.stock <= 5 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-rose-500" /> Sắp hết hàng!
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-black leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mt-3 text-sm text-neutral-500">
                <div className="flex items-center text-amber-500 font-bold gap-1">
                  <Star className="w-4 h-4 fill-amber-500" />
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
                <span className="text-red-600">Đã bán {product.sold || 0} chiếc</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-white shadow-md p-5 rounded-lg border-l-4 border-red-600">
              <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Giá Niêm Yết Chính Hãng:</div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black text-red-600">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <span className="text-sm text-neutral-400 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Miễn phí vận chuyển & Bảo hành 12 tháng tại nhà
              </div>
            </div>

            {/* Quick Specs Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white shadow-sm p-3 rounded-lg border-l-2 border-blue-600">
                <div className="text-neutral-500 flex items-center gap-1 mb-1"><Cpu className="w-3.5 h-3.5 text-blue-600" /> CPU</div>
                <div className="font-bold text-black truncate">{product.cpu}</div>
              </div>
              <div className="bg-white shadow-sm p-3 rounded-lg border-l-2 border-red-600">
                <div className="text-neutral-500 flex items-center gap-1 mb-1"><Zap className="w-3.5 h-3.5 text-red-600" /> RAM</div>
                <div className="font-bold text-black truncate">{product.ram}</div>
              </div>
              <div className="bg-white shadow-sm p-3 rounded-lg border-l-2 border-emerald-600">
                <div className="text-neutral-500 flex items-center gap-1 mb-1"><HardDrive className="w-3.5 h-3.5 text-emerald-600" /> Ổ Cứng</div>
                <div className="font-bold text-black truncate">{product.storage}</div>
              </div>
              <div className="bg-white shadow-sm p-3 rounded-lg border-l-2 border-amber-500">
                <div className="text-neutral-500 flex items-center gap-1 mb-1"><Monitor className="w-3.5 h-3.5 text-amber-500" /> Màn Hình</div>
                <div className="font-bold text-black truncate">{product.screen_size || '15.6" Full HD'}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <button
                onClick={handleBuyNow}
                className={`sm:col-span-7 py-4 font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 ${product.stock === 0
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    : 'bg-red-600 text-white tracking-widest uppercase hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/30'
                  }`}
              >
                {product.stock === 0 ? 'HẾT HÀNG' : 'MUA NGAY (Giao Trong 2 Giờ)'}
              </button>
              <button
                onClick={() => { addToCart(product, 1); showToast.success('Đã thêm vào giỏ hàng'); }}
                className="sm:col-span-3 py-4 bg-white border border-neutral-200 shadow-sm text-red-600 font-bold rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
              <button
                onClick={handleCompare}
                title="So sánh"
                className={`sm:col-span-2 py-4 rounded-lg font-bold flex items-center justify-center gap-1 transition-colors ${isInCompare(product.id)
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-neutral-200 shadow-sm text-amber-600 hover:bg-amber-50 hover:border-amber-200'
                  }`}
              >
                <GitCompareArrows className="w-5 h-5" />
              </button>
            </div>

            {isInCompare(product.id) && (
              <Link to="/compare" className="block w-full text-center py-2.5 bg-white border border-amber-200 shadow-sm text-amber-600 font-semibold rounded-lg text-xs hover:bg-amber-50">
                → Xem bảng so sánh ({isInCompare(product.id) ? '✓' : ''})
              </Link>
            )}

            {/* Guarantee Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-neutral-200 text-xs text-neutral-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Bảo hành chính hãng 12 tháng</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>1 đổi 1 trong 30 ngày lỗi nsx</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Giao hàng toàn quốc</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Technical Specifications Table */}
        <div className="bg-white shadow-md rounded-lg p-8 space-y-6">
          <h2 className="text-xl font-bold text-black flex items-center gap-2 border-b border-neutral-200 pb-4">
            <Cpu className="w-5 h-5 text-red-600" />
            Thông Số Kỹ Thuật Chi Tiết
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0 text-sm">
            <div className="flex justify-between py-3 border-b border-neutral-100 bg-[#f4f5f6] px-3 rounded-sm">
              <span className="text-neutral-500">Bộ vi xử lý (CPU):</span>
              <span className="font-semibold text-black">{product.cpu}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 px-3">
              <span className="text-neutral-500">Bộ nhớ RAM:</span>
              <span className="font-semibold text-black">{product.ram}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 bg-[#f4f5f6] px-3 rounded-sm">
              <span className="text-neutral-500">Dung lượng lưu trữ:</span>
              <span className="font-semibold text-black">{product.storage}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 px-3">
              <span className="text-neutral-500">Card đồ họa (GPU):</span>
              <span className="font-semibold text-black">{product.gpu || 'Intel Iris Xe / RTX Graphics'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 bg-[#f4f5f6] px-3 rounded-sm">
              <span className="text-neutral-500">Màn hình:</span>
              <span className="font-semibold text-black">{product.screen_size || '15.6" Full HD (1920x1080)'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 px-3">
              <span className="text-neutral-500">Trọng lượng:</span>
              <span className="font-semibold text-black">{product.weight ? `${product.weight} kg` : '1.8 kg'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 bg-[#f4f5f6] px-3 rounded-sm">
              <span className="text-neutral-500">Dung lượng Pin:</span>
              <span className="font-semibold text-black">{product.battery ? `${product.battery} Wh` : '56 Wh'}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-neutral-100 px-3">
              <span className="text-neutral-500">Màu sắc:</span>
              <span className="font-semibold text-black">{product.color || 'Xám Titan / Đen'}</span>
            </div>
          </div>

          <div className="pt-4 text-xs text-neutral-600 leading-relaxed bg-[#f4f5f6] p-4 rounded-lg">
            <div className="font-bold text-black mb-1">Mô tả chi tiết:</div>
            {product.description || 'Sản phẩm máy tính chính hãng với thiết kế sang trọng, độ bền cao, phù hợp cho học tập, công việc văn phòng và giải trí chuyên nghiệp.'}
          </div>
        </div>

        {/* Reviews & Ratings System */}
        <div className="bg-white shadow-md rounded-lg p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              Đánh Giá & Nhận Xét Từ Khách Hàng ({reviews.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Review List */}
            <div className="lg:col-span-7 space-y-4">
              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-lg bg-[#f4f5f6] animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-32 bg-neutral-200 rounded" />
                        <div className="h-3 w-16 bg-neutral-200 rounded" />
                      </div>
                      <div className="h-3 w-24 bg-neutral-200 rounded mb-2" />
                      <div className="h-3 w-full bg-neutral-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="p-8 text-center bg-[#f4f5f6] rounded-lg border border-dashed border-neutral-300">
                  <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <p className="text-neutral-500 text-sm">Chưa có đánh giá nào cho sản phẩm này.</p>
                  <p className="text-neutral-400 text-xs mt-1">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-lg bg-[#f4f5f6] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black text-sm">{rev.full_name || 'Khách hàng'}</span>
                      <span className="text-xs text-neutral-400">
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs">
                      {[...Array(Math.max(0, Math.min(5, Number(rev.rating) || 0)))].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-neutral-700 text-sm whitespace-pre-wrap break-words">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Review Form */}
            <div className="lg:col-span-5">
              <form onSubmit={handleAddReview} className="p-6 rounded-lg bg-white border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-bold text-black text-sm">Gửi Nhận Xét Của Bạn</h3>

                {reviewSubmitted && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-md text-xs font-semibold">
                    ✓ Đã gửi nhận xét thành công! Cảm ơn bạn đã đóng góp.
                  </div>
                )}

                {!isAuthenticated ? (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2">
                    <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Bạn cần đăng nhập để gửi đánh giá</p>
                      <p>Và phải mua sản phẩm này (đơn đã giao) mới có thể đánh giá.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-2 rounded-lg bg-[#f4f5f6] border border-neutral-200 text-xs text-neutral-600">
                      Đánh giá với tên: <strong className="text-black">{user?.full_name || 'bạn'}</strong>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">Đánh giá số sao *</label>
                      <select
                        value={newReview.rating}
                        onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-sm text-black focus:outline-none focus:border-red-600 focus:shadow-[0_0_10px_rgba(255,0,41,0.1)] transition-all"
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
                      <label className="block text-xs font-semibold text-neutral-600 mb-1">Nội dung nhận xét * (tối thiểu 10 ký tự)</label>
                      <textarea
                        required
                        rows="3"
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        placeholder="Chia sẻ cảm nhận về hiệu năng, màn hình, thời lượng pin..."
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-sm text-black focus:outline-none focus:border-red-600 focus:shadow-[0_0_10px_rgba(255,0,41,0.1)] transition-all"
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
                      className="w-full py-2.5 bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg hover:bg-red-500 hover:shadow-lg transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            <h2 className="text-xl font-bold text-black border-b border-neutral-200 pb-3">Sản Phẩm Cùng Phân Khúc</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(rel => (
                <div key={rel.id} className="bg-white p-4 flex flex-col justify-between group transition-all relative overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10"></div>
                  <Link to={`/products/${rel.id}`}>
                    <img src={resolveImage(rel.image_url)} alt={rel.name} className="aspect-video w-full object-contain mb-3 bg-[#f4f5f6] p-2" onError={onImageError} />
                    <h3 className="font-bold text-black text-sm line-clamp-2 uppercase tracking-wide group-hover:text-red-600">{rel.name}</h3>
                    <div className="text-base text-red-600 font-bold mt-2">{formatPrice(rel.price)}</div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
