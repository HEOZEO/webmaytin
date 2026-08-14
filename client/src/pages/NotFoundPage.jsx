import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ShoppingBag } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="relative">
          <h1 className="text-9xl font-black bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-400 bg-clip-text text-transparent">
            404
          </h1>
          <p className="text-slate-500 text-sm mt-2">PAGE NOT FOUND</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Trang không tồn tại</h2>
          <p className="text-slate-400 text-sm">
            Đường dẫn bạn truy cập không đúng hoặc trang đã được di chuyển.<br />
            Vui lòng kiểm tra lại URL hoặc quay về trang chủ.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 font-semibold rounded-xl text-sm hover:border-cyan-500/40 transition-all"
          >
            <Search className="w-4 h-4" />
            Xem sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}
