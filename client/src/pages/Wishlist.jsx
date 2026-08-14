import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Eye, ArrowLeft } from 'lucide-react';
import showToast from '../utils/toast';
import { useWishlist } from '../context/WishlistContext';
import { resolveImage, onImageError } from '../utils/imageHelper';
import { useCart } from '../context/CartContext';
import { useCompare } from '../context/CompareContext';

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { addToCompare, isInCompare } = useCompare();

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleRemove = (product) => {
    toggleWishlist(product);
    showToast.success('Đã xóa khỏi danh sách yêu thích');
  };

  if (wishlist.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4 text-center space-y-6">
        <div className="glass-card p-10 rounded-3xl space-y-4">
          <Heart className="w-16 h-16 text-slate-600 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Danh Sách Yêu Thích Trống</h2>
          <p className="text-slate-400 text-sm">Bạn chưa thêm sản phẩm nào vào danh sách yêu thích.</p>
          <Link to="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl">
            <ArrowLeft className="w-4 h-4" /> Khám phá sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-400 fill-rose-400" /> Sản Phẩm Yêu Thích
          </h1>
          <p className="text-slate-400 text-sm mt-1">{wishlist.length} sản phẩm đã lưu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map(product => (
          <div key={product.id} className="glass-card rounded-2xl p-4 flex flex-col group hover:border-cyan-500/40 transition-all">
            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center p-3">
              <img src={resolveImage(product.image_url)} alt={product.name} className="w-full h-full object-contain" onError={onImageError} />
              {product.stock === 0 && (
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-rose-500/90 text-white text-[10px] font-bold rounded">HẾT HÀNG</span>
              )}
            </div>
            <Link to={`/products/${product.id}`} className="block">
              <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-cyan-300 min-h-[2.5rem]">{product.name}</h3>
            </Link>
            <div className="text-xs text-slate-400 mt-2 space-y-1">
              <div>CPU: {product.cpu || '—'}</div>
              <div>RAM: {product.ram || '—'}</div>
            </div>
            <div className="mt-3 text-base font-bold text-cyan-400">{formatPrice(product.price)}</div>
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="col-span-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Thêm giỏ
              </button>
              <button
                onClick={() => addToCompare(product)}
                className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-colors ${
                  isInCompare(product.id) ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-slate-400 hover:text-amber-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
            <button
              onClick={() => handleRemove(product)}
              className="mt-2 text-xs text-rose-400 hover:underline flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Xóa khỏi yêu thích
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
