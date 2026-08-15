import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import DebugPage from './pages/DebugPage';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Compare from './pages/Compare';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import CustomerProfile from './pages/CustomerProfile';
import Wishlist from './pages/Wishlist';
import Brands from './pages/Brands';
import Contact from './pages/Contact';
import StaticPage from './pages/StaticPage';
import NotFoundPage from './pages/NotFoundPage';
import PaymentPage from './pages/PaymentPage';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminReviews from './pages/admin/AdminReviews';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminInventory from './pages/admin/AdminInventory';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminContactMessages from './pages/admin/AdminContactMessages';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPayments from './pages/admin/AdminPayments';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import NotificationManager from './components/NotificationManager';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-red-600 selection:text-white font-bold tracking-widest uppercase">
                  <Routes>
                    <Route path="/" element={<><Navbar /><main className="flex-grow"><Home /></main><Footer /></>} />
                    <Route path="/products" element={<><Navbar /><main className="flex-grow"><Products /></main><Footer /></>} />
                    <Route path="/products/:id" element={<><Navbar /><main className="flex-grow"><ProductDetail /></main><Footer /></>} />
                    <Route path="/compare" element={<><Navbar /><main className="flex-grow"><Compare /></main><Footer /></>} />
                    <Route path="/checkout" element={<><Navbar /><main className="flex-grow"><Checkout /></main><Footer /></>} />
                    <Route path="/cart" element={<Navigate to="/checkout" replace />} />
                    <Route path="/login" element={<><Navbar /><main className="flex-grow"><Login /></main><Footer /></>} />
                    <Route path="/reset-password/:token" element={<><Navbar /><main className="flex-grow"><ResetPassword /></main><Footer /></>} />
                    <Route path="/profile" element={<><Navbar /><main className="flex-grow"><CustomerProfile /></main><Footer /></>} />
                    <Route path="/wishlist" element={<><Navbar /><main className="flex-grow"><Wishlist /></main><Footer /></>} />
                    <Route path="/brands" element={<><Navbar /><main className="flex-grow"><Brands /></main><Footer /></>} />
                    <Route path="/contact" element={<><Navbar /><main className="flex-grow"><Contact /></main><Footer /></>} />
                    <Route path="/page/:slug" element={<><Navbar /><main className="flex-grow"><StaticPage /></main><Footer /></>} />
                    <Route path="/payment" element={<><Navbar /><main className="flex-grow"><PaymentPage /></main><Footer /></>} />
                    <Route path="/debug-images" element={<DebugPage />} />

                    <Route path="/admin/*" element={<AdminLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="reviews" element={<AdminReviews />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                      <Route path="inventory" element={<AdminInventory />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="contacts" element={<AdminContactMessages />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="payments" element={<AdminPayments />} />
                    </Route>

                    <Route path="*" element={<><Navbar /><main className="flex-grow"><NotFoundPage /></main><Footer /></>} />
                  </Routes>

                  <Toaster
                    position="top-right"
                    gutter={8}
                    toastOptions={{
                      duration: 2000,
                      style: {
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        maxWidth: '420px'
                      },
                      success: { iconTheme: { primary: '#06b6d4', secondary: '#0f172a' } },
                      error: { iconTheme: { primary: '#f43f5e', secondary: '#0f172a' } }
                    }}
                  />
                  <NotificationManager />
                </div>
              </Router>
            </CompareProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
