import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, LogOut, Shield, Search, Menu, X, Eye, ChevronDown, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCompare } from '../context/CompareContext';
import productService from '../services/productService';
import Logo from './Logo';
import { resolveImage, onImageError } from '../utils/imageHelper';

const NAV_LINKS = [
  { to: '/', label: 'Trang Chủ' },
  { to: '/products', label: 'Sản Phẩm' },
  { to: '/brands', label: 'Thương Hiệu Máy Tính' },
  { to: '/contact', label: 'Liên Hệ' },
  { to: '/page/warranty', label: 'Bảo Hành' },
  { to: '/page/faq', label: 'FAQ' }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { wishlist } = useWishlist();
  const { compareCount } = useCompare();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    productService.getAllProducts({ limit: 100 })
      .then(res => setAllProducts(res?.data || res?.products || []))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim().length > 1) {
      const matched = allProducts.filter(p =>
        p.name.toLowerCase().includes(val.toLowerCase()) ||
        (p.cpu && p.cpu.toLowerCase().includes(val.toLowerCase()))
      ).slice(0, 5);
      setSearchResults(matched);
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSelectProduct = (id) => {
    setShowSearchResults(false);
    setSearchQuery('');
    navigate(`/products/${id}`);
  };

  const isAdmin = user && (user.role === 'admin' || user.role === 'staff');

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <>
      <nav className="bg-black/90 backdrop-blur-lg sticky top-0 z-50 border-b border-red-600/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            <Link to="/" className="flex-shrink-0">
              <Logo size={44} />
            </Link>

            <div className="hidden lg:flex flex-1 justify-center items-center space-x-8 font-bold text-xs uppercase tracking-widest font-rog">
              {NAV_LINKS.slice(0, 5).map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={
                    isActive(link.to)
                      ? 'text-red-500 border-b-2 border-red-600 pb-1'
                      : 'text-neutral-300 hover:text-red-500 transition-colors'
                  }
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="text-red-500 flex items-center gap-1 hover:text-red-400">
                  <Shield className="w-4 h-4" /> Admin
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="relative">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 text-neutral-300 hover:text-red-500 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
                {isSearchOpen && (
                  <div className="absolute right-0 top-full mt-4 w-[300px] z-50 bg-black border border-red-600/50 p-2 shadow-[0_0_20px_rgba(255,0,41,0.2)]">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="Tìm laptop ROG, TUF, Zephyrus..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-9 pr-4 py-2 bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                    {showSearchResults && (
                      <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
                        {searchResults.length > 0 ? (
                          searchResults.map(prod => (
                            <button
                              key={prod.id}
                              onClick={() => { handleSelectProduct(prod.id); setIsSearchOpen(false); }}
                              className="w-full flex items-center gap-3 p-2 hover:bg-neutral-800 text-left transition-colors"
                            >
                              <img src={resolveImage(prod.image_url)} alt="" className="w-10 h-10 object-cover bg-black" onError={onImageError} />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold text-white uppercase tracking-wider truncate">{prod.name}</div>
                                <div className="text-[10px] text-red-500 font-semibold">
                                  {prod.price ? `${new Intl.NumberFormat('vi-VN').format(prod.price)}đ` : ''}
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-neutral-400 text-center">Không tìm thấy sản phẩm.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {compareCount > 0 && (
                <Link to="/compare" className="hidden sm:flex relative p-2 text-neutral-300 hover:text-amber-400 transition-colors" title="So sánh">
                  <Eye className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white font-bold tracking-widest uppercase text-[10px] font-bold rounded-full flex items-center justify-center">
                    {compareCount}
                  </span>
                </Link>
              )}

              <Link to="/wishlist" className="relative p-2 text-neutral-300 hover:text-rose-400 transition-colors" title="Yêu thích">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              <Link to="/checkout" className="relative p-2 text-neutral-300 hover:text-red-500 transition-colors" title="Giỏ hàng">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center glow-rog">
                    {totalItems}
                  </span>
                )}
              </Link>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 px-2 py-1.5 border border-neutral-800 hover:border-red-600/50 clip-path-rog text-neutral-200 transition-all"
                  >
                    <div className="w-6 h-6 bg-red-600 flex items-center justify-center text-white font-bold text-xs clip-path-rog">
                      {(user.full_name || user.email)?.[0]?.toUpperCase()}
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-2 z-50 border border-slate-700 space-y-1 shadow-2xl">
                      <div className="px-3 py-2 border-b border-neutral-800">
                        <div className="text-xs font-bold text-white truncate">{user.full_name || user.email}</div>
                        <div className="text-[10px] text-red-500 font-bold uppercase">{user.role}</div>
                      </div>
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-none clip-path-rog hover:bg-neutral-900 text-xs text-slate-200">
                        <User className="w-3.5 h-3.5" /> Hồ sơ
                      </Link>
                      <Link to="/wishlist" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-none clip-path-rog hover:bg-neutral-900 text-xs text-slate-200">
                        <Heart className="w-3.5 h-3.5" /> Yêu thích
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-none clip-path-rog hover:bg-neutral-900 text-xs text-red-400 font-bold">
                          <Shield className="w-3.5 h-3.5" /> Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-none clip-path-rog hover:bg-rose-500/10 text-xs text-rose-300"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white font-bold tracking-widest uppercase bg-gradient-to-r from-red-500 to-sky-300 rounded-none clip-path-rog hover:opacity-90 transition-opacity"
                >
                  <User className="w-4 h-4" />
                  Đăng Nhập
                </Link>
              )}

              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-neutral-300 hover:text-red-500"
                aria-label="Mở menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Tìm laptop, MacBook, RTX..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 bg-black/90 border border-neutral-800 rounded-none clip-path-rog text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-neutral-900 border border-neutral-800 clip-path-rog border-l border-red-600/30 flex flex-col animate-[slideLeft_0.3s_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <span className="text-base font-bold text-white flex items-center gap-2">
                <Logo size={28} showText={false} /> Menu
              </span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={
                    isActive(link.to)
                      ? 'rainbow-active-mobile flex items-center gap-3 px-4 py-3 rounded-none clip-path-rog text-sm'
                      : 'flex items-center gap-3 px-4 py-3 rounded-none clip-path-rog text-sm font-medium text-slate-200 hover:bg-neutral-900 hover:text-red-400 transition-colors'
                  }
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-neutral-800 my-3"></div>
              {compareCount > 0 && (
                <Link to="/compare" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-none clip-path-rog text-sm font-medium text-amber-300 hover:bg-amber-500/10">
                  <Eye className="w-4 h-4" /> So sánh ({compareCount})
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-none clip-path-rog text-sm font-bold text-red-400 bg-red-600/10">
                  <Shield className="w-4 h-4" /> Admin Panel
                </Link>
              )}
            </div>
            <div className="p-4 border-t border-neutral-800">
              {user ? (
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }}
                  className="w-full py-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold rounded-none clip-path-rog text-sm flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 bg-gradient-to-r from-red-500 to-sky-300 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog text-sm flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" /> Đăng Nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
