import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';
import NotificationManager from './NotificationManager';

// import pages (Assuming this file is at src/components/AnimatedRoutes.jsx)
import DebugPage from '../pages/DebugPage';
import Home from '../pages/Home';
import Products from '../pages/Products';
import ProductDetail from '../pages/ProductDetail';
import Compare from '../pages/Compare';
import Checkout from '../pages/Checkout';
import Login from '../pages/Login';
import ResetPassword from '../pages/ResetPassword';
import CustomerProfile from '../pages/CustomerProfile';
import Wishlist from '../pages/Wishlist';
import Brands from '../pages/Brands';
import Contact from '../pages/Contact';
import StaticPage from '../pages/StaticPage';
import NotFoundPage from '../pages/NotFoundPage';
import PaymentPage from '../pages/PaymentPage';

import AdminLayout from '../pages/admin/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import AdminProducts from '../pages/admin/AdminProducts';
import AdminOrders from '../pages/admin/AdminOrders';
import AdminReviews from '../pages/admin/AdminReviews';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminCoupons from '../pages/admin/AdminCoupons';
import AdminInventory from '../pages/admin/AdminInventory';
import AdminCategories from '../pages/admin/AdminCategories';
import AdminAnalytics from '../pages/admin/AdminAnalytics';
import AdminContactMessages from '../pages/admin/AdminContactMessages';
import AdminSettings from '../pages/admin/AdminSettings';
import AdminPayments from '../pages/admin/AdminPayments';

// Page Transition Wrapper
const PageWrapper = ({ children }) => {
  return (
    <>
      <Navbar />
      <motion.main 
        className="flex-grow relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        {children}
      </motion.main>
      <Footer />
      
      {/* Hologram / Scanline Transition Effect overlay */}
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 bg-red-900 z-[9998] origin-bottom"
      />
      <motion.div
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        className="fixed inset-0 bg-black z-[9997] origin-bottom"
      />
    </>
  );
};

export default function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/products" element={<PageWrapper><Products /></PageWrapper>} />
        <Route path="/products/:id" element={<PageWrapper><ProductDetail /></PageWrapper>} />
        <Route path="/compare" element={<PageWrapper><Compare /></PageWrapper>} />
        <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
        <Route path="/cart" element={<Navigate to="/checkout" replace />} />
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/reset-password/:token" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><CustomerProfile /></PageWrapper>} />
        <Route path="/wishlist" element={<PageWrapper><Wishlist /></PageWrapper>} />
        <Route path="/brands" element={<PageWrapper><Brands /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/page/:slug" element={<PageWrapper><StaticPage /></PageWrapper>} />
        <Route path="/payment" element={<PageWrapper><PaymentPage /></PageWrapper>} />
        <Route path="/debug-images" element={<DebugPage />} />

        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
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

        <Route path="*" element={<PageWrapper><NotFoundPage /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}
