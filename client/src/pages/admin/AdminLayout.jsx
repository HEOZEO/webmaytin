import React, { useEffect, useState } from 'react';
import {
  Package, Users, ShoppingCart, TrendingUp, Tag,
  LayoutDashboard, Boxes, Image as ImageIcon,
  LogOut, Home, Eye, Menu, X, ChevronLeft,
  MessageCircle, Settings, CreditCard, Star, FolderTree
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import showToast from '../../utils/toast';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import AdminAlerts from '../../components/AdminAlerts';

const ROUTE_TITLES = {
  '/admin': 'Tổng quan hệ thống',
  '/admin/products': 'Quản lý sản phẩm',
  '/admin/categories': 'Quản lý danh mục',
  '/admin/orders': 'Quản lý đơn hàng',
  '/admin/inventory': 'Quản lý tồn kho',
  '/admin/users': 'Quản lý khách hàng',
  '/admin/coupons': 'Quản lý mã giảm giá',
  '/admin/analytics': 'Phân tích kinh doanh',
  '/admin/contacts': 'Tin nhắn liên hệ',
  '/admin/settings': 'Cài đặt hệ thống',
  '/admin/payments': 'Quản lý thanh toán',
  '/admin/reviews': 'Quản lý đánh giá'
};

const FULL_SIDEBAR = [
  { to: '/admin', label: 'Tổng Quan', icon: LayoutDashboard, exact: true, adminOnly: false, permission: null },
  { to: '/admin/products', label: 'Sản Phẩm', icon: Package, adminOnly: false, permission: 'products.view' },
  { to: '/admin/categories', label: 'Danh Mục', icon: FolderTree, adminOnly: false, permission: 'categories.view' },
  { to: '/admin/orders', label: 'Đơn Hàng', icon: ShoppingCart, adminOnly: false, permission: 'orders.view' },
  { to: '/admin/inventory', label: 'Tồn Kho', icon: Boxes, adminOnly: false, permission: 'inventory.view' },
  { to: '/admin/users', label: 'Khách Hàng', icon: Users, adminOnly: false, permission: 'users.view' },
  { to: '/admin/coupons', label: 'Mã Giảm Giá', icon: Tag, adminOnly: true, permission: null },
  { to: '/admin/analytics', label: 'Phân Tích', icon: TrendingUp, adminOnly: false, permission: 'analytics.view' },
  { to: '/admin/contacts', label: 'Liên Hệ', icon: MessageCircle, adminOnly: false, permission: 'contacts.view' },
  { to: '/admin/reviews', label: 'Đánh Giá', icon: Star, adminOnly: false, permission: 'reviews.view' },
  { to: '/admin/payments', label: 'Thanh Toán', icon: CreditCard, adminOnly: true, permission: null },
  { to: '/admin/settings', label: 'Cài Đặt', icon: Settings, adminOnly: true, permission: null }
];

export default function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [now, setNow] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sidebar badges (poll every 30s)
  const [alerts, setAlerts] = useState({ lowStockCount: 0, expiringCouponsCount: 0, pendingPaymentsCount: 0 });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Poll alerts every 30s (matches backend cache TTL on /admin/stats/alerts)
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await adminService.getAlerts();
        const data = res?.data || {};
        setAlerts({
          lowStockCount: data.lowStockCount || 0,
          expiringCouponsCount: data.expiringCouponsCount || 0,
          pendingPaymentsCount: data.pendingPaymentsCount || 0
        });
      } catch {
        // silent fail
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'staff') {
      showToast.error('Bạn không có quyền truy cập trang quản trị');
      navigate('/');
      return;
    }
    // Chỉ /admin/coupons, /admin/settings và /admin/payments mới là admin-only.
    // /admin/users giờ cho phép staff truy cập (chỉ xem + khoá/mở khoá customer).
    const ADMIN_ONLY_ROUTES = ['/admin/coupons', '/admin/settings', '/admin/payments'];
    if (user.role !== 'admin' && ADMIN_ONLY_ROUTES.some(r => location.pathname.startsWith(r))) {
      showToast.error('Trang này chỉ dành cho quản trị viên');
      navigate('/admin');
      return;
    }
    // Nếu staff đang ở trang bị ẩn do không có permission → redirect về /admin
    if (user.role === 'staff') {
      const blocked = FULL_SIDEBAR.find(
        (it) => it.to !== '/admin' && it.permission && !hasPermission(it.permission) && location.pathname.startsWith(it.to)
      );
      if (blocked) {
        showToast.error(`Bạn không có quyền truy cập trang "${blocked.label}"`);
        navigate('/admin');
      }
    }
    setMobileOpen(false);
  }, [user, navigate, location.pathname, hasPermission]);

  if (!user || (user.role !== 'admin' && user.role !== 'staff')) return null;

  const SIDEBAR_ITEMS = FULL_SIDEBAR.filter(item => {
    // Admin route-only (Coupons, Settings) — staff không thấy
    if (item.adminOnly && user.role !== 'admin') return false;
    // Custom permission check (nếu item yêu cầu permission + user không có → ẩn)
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });
  const currentTitle = ROUTE_TITLES[location.pathname] || 'Admin Panel';

  const handleLogout = () => {
    logout();
    showToast.success('Đã đăng xuất');
    navigate('/login');
  };

  const initials = (user.full_name || user.email || 'A')
    .split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  const sidebarWidth = collapsed ? 'lg:w-[72px]' : 'lg:w-60';
  const sidebarLabelClass = collapsed ? 'lg:opacity-0 lg:hidden' : '';
  const mainPadding = collapsed ? 'lg:pl-[72px]' : 'lg:pl-60';

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className={`flex items-center gap-2 px-3 py-4 border-b border-neutral-800 ${collapsed && !isMobile ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-none clip-path-rog bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="w-4 h-4 text-white" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Laptop Store</p>
            <p className="text-xs font-black text-white truncate">Admin Panel</p>
          </div>
        )}
      </div>

      <nav className={`p-3 space-y-1 flex-1 overflow-y-auto ${collapsed && !isMobile ? 'px-2' : ''}`}>
        {SIDEBAR_ITEMS.map(item => {
          const Icon = item.icon;
          // Pick badge for known routes
          let badge = null;
          if (item.to === '/admin/products' && alerts.lowStockCount > 0) {
            badge = alerts.lowStockCount;
          } else if (item.to === '/admin/coupons' && alerts.expiringCouponsCount > 0) {
            badge = alerts.expiringCouponsCount;
          } else if (item.to === '/admin/orders' && alerts.pendingPaymentsCount > 0) {
            badge = alerts.pendingPaymentsCount;
          }
          const showBadge = badge && badge > 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-none clip-path-rog text-xs font-semibold transition-all relative ${
                  collapsed && !isMobile ? 'justify-center px-2 py-3' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold tracking-widest uppercase shadow-lg shadow-red-600/20'
                    : 'text-neutral-300 hover:bg-neutral-900/70 hover:text-red-400'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={`flex-1 ${sidebarLabelClass}`}>{item.label}</span>
              {showBadge && !collapsed && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {showBadge && collapsed && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={`p-3 border-t border-neutral-800 space-y-1 ${collapsed && !isMobile ? 'px-2' : ''}`}>
        <Link
          to="/"
          title="Về trang khách"
          className={`flex items-center gap-3 rounded-none clip-path-rog text-xs font-medium text-neutral-400 hover:bg-neutral-900 hover:text-slate-200 ${
            collapsed && !isMobile ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          }`}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span className={sidebarLabelClass}>Về trang khách</span>
        </Link>
        {(!collapsed || isMobile) && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-none clip-path-rog text-xs font-medium text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-300 relative">
      {/* Tech Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 h-screen z-30 bg-black border-r border-neutral-800 flex-col transition-all duration-300 ${sidebarWidth}`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-screen w-64 z-50 bg-black border-r border-neutral-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-neutral-900 hover:bg-slate-700 flex items-center justify-center text-neutral-300"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent isMobile />
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 relative z-10 ${mainPadding}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen(true);
                  else setCollapsed(c => !c);
                }}
                className="w-10 h-10 rounded-none clip-path-rog bg-black border border-neutral-800 hover:border-red-600/50 flex items-center justify-center text-neutral-300 hover:text-red-400 transition flex-shrink-0"
                title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              >
                {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold hidden sm:block">Bảng điều khiển</p>
                <h1 className="text-base sm:text-lg font-black text-white truncate">{currentTitle}</h1>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Hệ thống hoạt động
              </span>
              <span className="text-slate-700">|</span>
              <span className="font-mono">{now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="flex items-center gap-2">
              <AdminAlerts />

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-none clip-path-rog bg-black hover:bg-neutral-900 border border-neutral-800 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                    {initials}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-white truncate max-w-[140px]">{user.full_name || user.email}</p>
                    <p className="text-[10px] text-red-500 uppercase font-bold">{user.role}</p>
                  </div>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-12 w-60 bg-[#0a0a0a] rounded-none clip-path-rog p-2 border border-neutral-800 shadow-2xl z-20">
                      <div className="px-3 py-3 border-b border-neutral-800 mb-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-none clip-path-rog bg-gradient-to-br from-red-600 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{user.full_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900 rounded-lg">
                        <Eye className="w-3.5 h-3.5" /> Hồ sơ cá nhân
                      </Link>
                      <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900 rounded-lg">
                        <Home className="w-3.5 h-3.5" /> Về trang khách
                      </Link>
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg">
                        <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}