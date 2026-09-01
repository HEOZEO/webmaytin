import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AnimatedRoutes from './components/AnimatedRoutes';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationManager from './components/NotificationManager';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CompareProvider>
              <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-red-600 selection:text-white font-bold tracking-widest uppercase relative">
                  <AnimatedRoutes />

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
