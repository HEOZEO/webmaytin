import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, HelpCircle, FileText, Mail, Phone, MapPin, Clock, Wrench, Package, Search, ChevronRight, Zap } from 'lucide-react';

const PAGES = {
  warranty: {
    title: 'Chính Sách Bảo Hành',
    icon: ShieldCheck,
    color: 'from-red-600 to-red-600',
    sections: [
      { icon: ShieldCheck, title: 'Cam kết chính hãng 100%',
        content: 'Toàn bộ sản phẩm laptop, PC, linh kiện tại LaptopStore đều là hàng chính hãng, có tem và phiếu bảo hành từ nhà sản xuất. Chúng tôi nói KHÔNG với hàng refurbished, hàng kém chất lượng.' },
      { icon: Wrench, title: 'Thời hạn bảo hành',
        content: 'Laptop: 12-36 tháng tùy hãng (Dell, HP, ASUS, Lenovo) - MacBook: 12 tháng tại nhà - PC đồng bộ: 24 tháng - Linh kiện (RAM, SSD, VGA): 36 tháng. Bảo hành mặc kính, màn hình, pin theo tiêu chuẩn nhà sản xuất.' },
      { icon: MapPin, title: 'Bảo hành tại nhà (On-site)',
        content: 'Đối với đơn hàng tại Hà Nội & TP.HCM: KTV đến tận nơi trong vòng 24-48h. Đối với tỉnh thành khác: gửi qua đơn vị vận chuyển, LaptopStore chịu phí ship 2 chiều.' },
      { icon: RotateCcw, title: 'Đổi trả 1-1 trong 30 ngày',
        content: 'Sản phẩm lỗi do nhà sản xuất được đổi mới trong 30 ngày đầu. Điều kiện: còn nguyên tem, không trầy xước, đầy đủ phụ kiện và hộp. Hoàn tiền 100% nếu sản phẩm hết hàng đổi.' },
      { icon: Package, title: 'Quy trình bảo hành',
        content: 'Bước 1: Liên hệ hotline 1900 6789 hoặc email support@laptopstore.com\nBước 2: Cung cấp mã đơn hàng, số serial máy\nBước 3: Mang máy đến store hoặc gửi ship (nếu ở xa)\nBước 4: KTV kiểm tra và báo thời gian sửa chữa (thường 3-7 ngày)\nBước 5: Nhận máy kèm biên bản bảo hành' }
    ]
  },
  policy: {
    title: 'Chính Sách & Hướng Dẫn Mua Hàng',
    icon: FileText,
    color: 'from-red-600 to-teal-500',
    sections: [
      { icon: CreditCard, title: 'Phương thức thanh toán',
        content: '1. COD (Thanh toán khi nhận hàng): Áp dụng toàn quốc, không thu thêm phí.\n2. Chuyển khoản ngân hàng: Quét QR MBBank, nội dung = mã đơn hàng. Đơn được xử lý trong 2h.\n3. Thẻ tín dụng/ATM: Đang phát triển (coming soon).' },
      { icon: Truck, title: 'Chính sách vận chuyển',
        content: '• Nội thành Hà Nội & HCM: Giao nhanh trong 2 giờ, MIỄN PHÍ ship\n• Các tỉnh thành khác: Giao qua GHN, GHTK, Viettel Post trong 1-3 ngày. Phí ship từ 30k tùy khu vực.\n• Đơn từ 5 triệu: FREESHIP toàn quốc.' },
      { icon: HelpCircle, title: 'Hướng dẫn mua hàng',
        content: 'Bước 1: Tìm sản phẩm qua thanh tìm kiếm hoặc bộ lọc\nBước 2: Thêm vào giỏ hàng / So sánh để chọn sản phẩm tốt nhất\nBước 3: Vào giỏ hàng, áp dụng mã giảm giá (nếu có)\nBước 4: Điền thông tin nhận hàng, chọn phương thức thanh toán\nBước 5: Xác nhận đơn - Nhân viên gọi xác nhận trong 15 phút\nBước 6: Nhận hàng - kiểm tra - thanh toán (nếu COD)' },
      { icon: Mail, title: 'Liên hệ hỗ trợ',
        content: '• Hotline: 1900 6789 (8:00 - 22:00, tất cả các ngày)\n• Email: support@laptopstore.com\n• Chat trực tiếp: biểu tượng góc phải màn hình\n• Địa chỉ: Hà Nội, Việt Nam' }
    ]
  },
  faq: {
    title: 'Câu Hỏi Thường Gặp (FAQ)',
    icon: HelpCircle,
    color: 'from-amber-500 to-orange-500',
    sections: [
      { icon: HelpCircle, title: 'Làm sao chọn laptop phù hợp với nhu cầu?',
        content: '• Sinh viên / Văn phòng: i5 Gen 12 trở lên, RAM 16GB, SSD 512GB, màn 15.6" Full HD\n• Đồ họa / Render: i7/i9 hoặc Ryzen 7/9, RAM 32GB, VGA rời RTX 4060+\n• Gaming: i5/i7 Gen mới nhất + RTX 4070 trở lên, RAM 16-32GB, màn 144Hz+\n• Lập trình viên: Ưu tiên RAM lớn (32GB+), CPU nhiều nhân, màn hình 2K+' },
      { icon: HelpCircle, title: 'Có thể trả góp 0% không?',
        content: 'Có. Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng (Visa, Mastercard, JCB) cho đơn từ 3 triệu. Duyệt online trong 10 phút. Liên hệ hotline 1900 6789 để được hỗ trợ.' },
      { icon: HelpCircle, title: 'Sản phẩm có kèm Windows bản quyền không?',
        content: 'Tùy model. Một số laptop có sẵn Windows bản quyền (Single Language) - hiển thị rõ trong phần mô tả. Với máy không có, LaptopStore cung cấp dịch vụ cài Windows bản quyền thêm 990k.' },
      { icon: HelpCircle, title: 'Tôi ở tỉnh xa có được giao hàng không?',
        content: 'Có. LaptopStore giao hàng toàn quốc qua các đơn vị vận chuyển uy tín (GHN, GHTK, Viettel Post). Đơn từ 5 triệu được FREE SHIP.' },
      { icon: HelpCircle, title: 'Chính sách 1 đổi 1 áp dụng khi nào?',
        content: 'Áp dụng trong 30 ngày đầu kể từ ngày nhận hàng với điều kiện: sản phẩm lỗi phần cứng do nhà sản xuất (không bao gồm lỗi do người dùng như rơi vỡ, vào nước), còn nguyên tem seal, đầy đủ hộp phụ kiện.' },
      { icon: HelpCircle, title: 'Tôi muốn xuất hóa đơn VAT?',
        content: 'Có hỗ trợ xuất hóa đơn VAT điện tử cho doanh nghiệp. Vui lòng cung cấp thông tin công ty (mã số thuế, địa chỉ) trong phần ghi chú đơn hàng hoặc liên hệ hotline sau khi đặt hàng.' }
    ]
  }
};

export default function StaticPage() {
  const { slug } = useParams();
  const page = PAGES[slug];
  const [searchQuery, setSearchQuery] = useState('');

  if (!page) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Trang không tồn tại</h2>
        <Link to="/" className="text-red-500 hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  const PageIcon = page.icon;

  const filteredSections = page.sections.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sec.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black relative text-white selection:bg-red-600 selection:text-white pb-20">
      {/* ROG Tech Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef444410_1px,transparent_1px),linear-gradient(to_bottom,#ef444410_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_60%_40%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[40rem] h-[20rem] bg-red-700/20 rounded-[100%] blur-[120px] transform -translate-y-1/2" />
      </div>

      {/* Hero / Search Section (Like ROG Support) */}
      <div className="relative border-b border-red-900/30 bg-neutral-900/50 backdrop-blur-md pt-16 pb-20 clip-path-rog-bottom">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          <div className="inline-flex p-4 bg-black rounded-none clip-path-rog text-red-500 border border-red-600/30 shadow-[0_0_20px_rgba(255,0,0,0.2)] mb-4">
            <PageIcon className="w-10 h-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400">TRUNG TÂM HỖ TRỢ</span>
            <br />
            <span className="text-white text-3xl sm:text-4xl lg:text-5xl">{page.title}</span>
          </h1>
          
          {/* ROG Style Search Bar */}
          <div className="max-w-2xl mx-auto mt-10 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-none clip-path-rog blur opacity-25 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center bg-black border border-neutral-800 p-2 rounded-none clip-path-rog group-hover:border-red-500/50 transition-colors">
              <Search className="w-6 h-6 text-red-600 ml-4 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Bạn cần tìm kiếm sự hỗ trợ gì?" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none text-white px-4 py-4 focus:outline-none placeholder-neutral-500 font-medium text-lg"
              />
              <button className="hidden sm:flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-none clip-path-rog font-black uppercase tracking-[0.1em] transition-colors shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                Tìm Kiếm
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 relative z-10">
        
        {/* Support Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSections.length > 0 ? (
            filteredSections.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <div key={idx} className="group relative bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 clip-path-rog p-8 rounded-none hover:border-red-500 hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,0,0,0.15)] flex flex-col h-full">
                  {/* Glowing Laser Line */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
                  
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-black rounded-none clip-path-rog text-red-500 border border-neutral-800 group-hover:border-red-500 group-hover:bg-red-600/10 group-hover:scale-110 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-white group-hover:text-red-500 transition-colors uppercase tracking-wide mt-1 leading-tight">{sec.title}</h2>
                  </div>
                  
                  <p className="text-sm text-neutral-400 whitespace-pre-line leading-relaxed font-medium flex-1">
                    {sec.content}
                  </p>

                  <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center text-xs font-black text-red-600 uppercase tracking-[0.1em] group-hover:text-red-400 transition-colors">
                    Chi Tiết <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-1 md:col-span-2 py-20 text-center space-y-4">
              <Package className="w-16 h-16 text-neutral-800 mx-auto" />
              <p className="text-xl font-bold text-neutral-500">Không tìm thấy thông tin hỗ trợ phù hợp.</p>
            </div>
          )}
        </div>

        {/* Bottom Contact Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-neutral-900 to-black border border-red-900/50 clip-path-rog p-10 sm:p-14 mt-16 shadow-[0_0_40px_rgba(255,0,0,0.1)] group">
          {/* Animated red glow inside banner */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none group-hover:from-red-600/20 transition-colors duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black border border-red-600/30 rounded-none clip-path-rog text-red-500 text-xs font-black uppercase tracking-[0.2em] mb-2">
                <Zap className="w-3.5 h-3.5 animate-pulse" /> Hỗ Trợ Trực Tiếp
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Vẫn Cần Thêm Sự Trợ Giúp?</h3>
              <p className="text-sm text-neutral-400 font-medium max-w-xl">Đội ngũ kỹ thuật viên ROG LaptopStore luôn sẵn sàng giải đáp mọi vấn đề của bạn qua điện thoại hoặc email.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
              <a href="tel:19006789" className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent border border-red-600 text-red-500 hover:bg-red-600 hover:text-white rounded-none clip-path-rog text-sm font-black tracking-[0.15em] uppercase transition-all shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                <Phone className="w-4 h-4" /> Tổng Đài: 1900 6789
              </a>
              <a href="mailto:support@laptopstore.com" className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-none clip-path-rog text-sm font-black tracking-[0.15em] uppercase transition-all shadow-[0_0_20px_rgba(255,0,0,0.4)]">
                <Mail className="w-4 h-4" /> Gửi Email
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
