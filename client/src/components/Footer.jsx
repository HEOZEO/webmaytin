import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Shield, Clock, CreditCard, Facebook, Youtube, Instagram, ArrowRight } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-[#060a12] border-t border-slate-800 text-slate-400">
      <div className="border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <div className="text-xs font-bold text-white">Bảo Hành 12 Tháng</div>
            <div className="text-[10px] text-slate-500">Chính hãng toàn quốc</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-400" />
            <div className="text-xs font-bold text-white">Trả Góp 0%</div>
            <div className="text-[10px] text-slate-500">Duyệt online nhanh</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-400" />
            <div className="text-xs font-bold text-white">Hỗ Trợ 24/7</div>
            <div className="text-[10px] text-slate-500">Tư vấn miễn phí</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <MapPin className="w-6 h-6 text-amber-400" />
            <div className="text-xs font-bold text-white">Giao Hàng Tận Nơi</div>
            <div className="text-[10px] text-slate-500">COD toàn quốc</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <Logo size={44} />
          <p className="text-xs text-slate-400 leading-relaxed">
            Hệ thống bán lẻ máy tính xách tay & linh kiện chính hãng hàng đầu Việt Nam.
            Cam kết sản phẩm chất lượng, giá tốt nhất thị trường.
          </p>
          <div className="flex items-center gap-2">
            <a href="#" className="p-2 bg-slate-900 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors">
              <Youtube className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 bg-slate-900 hover:bg-purple-500/20 text-slate-400 hover:text-purple-400 rounded-lg transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Danh Mục Máy Tính</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/products" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 group">Laptop Văn Phòng <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></Link></li>
            <li><Link to="/products?category=gaming" className="hover:text-cyan-400 transition-colors">Laptop Gaming</Link></li>
            <li><Link to="/products?category=macbook" className="hover:text-cyan-400 transition-colors">MacBook Pro / Air</Link></li>
            <li><Link to="/products?category=pc" className="hover:text-cyan-400 transition-colors">PC Mới & PC Đồng Bộ</Link></li>
            <li><Link to="/products?category=monitor" className="hover:text-cyan-400 transition-colors">Màn Hình Máy Tính</Link></li>
            <li><Link to="/products?category=components" className="hover:text-cyan-400 transition-colors">Linh Kiện Máy Tính</Link></li>
            <li><Link to="/products?category=accessories" className="hover:text-cyan-400 transition-colors">Phụ Kiện Máy Tính</Link></li>
            <li><Link to="/brands" className="hover:text-amber-400 transition-colors font-semibold">Xem Tất Cả Thương Hiệu</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Hỗ Trợ</h4>
          <ul className="space-y-2.5 text-xs">
            <li><Link to="/page/warranty" className="hover:text-cyan-400 transition-colors">Chính sách bảo hành</Link></li>
            <li><Link to="/page/policy" className="hover:text-cyan-400 transition-colors">Hướng dẫn mua hàng & thanh toán</Link></li>
            <li><Link to="/page/policy" className="hover:text-cyan-400 transition-colors">Chính sách đổi trả hàng</Link></li>
            <li><Link to="/page/faq" className="hover:text-cyan-400 transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>
            <li><Link to="/contact" className="hover:text-cyan-400 transition-colors font-semibold">Liên Hệ Tư Vấn</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-xs uppercase tracking-widest">Liên Hệ</h4>
          <ul className="space-y-3 text-xs">
            <li className="flex items-start gap-2.5"><MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" /> Hà Nội, Việt Nam</li>
            <li className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Hotline: <strong className="text-white">1900 6789</strong></li>
            <li className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-cyan-400 flex-shrink-0" /> support@laptopstore.com</li>
            <li className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-cyan-400 flex-shrink-0" /> 08:00 - 22:00 (T2 - CN)</li>
          </ul>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
          >
            Gửi tin nhắn cho chúng tôi <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-5 text-center text-[11px] text-slate-600">
          © 2026 LaptopStore – High Tech Hub. All rights reserved. Designed & Developed for Excellence.
        </div>
      </div>
    </footer>
  );
}