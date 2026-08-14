import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, HelpCircle, FileText, Mail, Phone, MapPin, Clock, Wrench, Package } from 'lucide-react';

const PAGES = {
  warranty: {
    title: 'Chính Sách Bảo Hành',
    icon: ShieldCheck,
    color: 'from-cyan-500 to-blue-500',
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
    color: 'from-emerald-500 to-teal-500',
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

  if (!page) {
    return (
      <div className="max-w-2xl mx-auto my-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Trang không tồn tại</h2>
        <Link to="/" className="text-cyan-400 hover:underline">Về trang chủ</Link>
      </div>
    );
  }

  const PageIcon = page.icon;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className={`glass-card p-8 rounded-3xl space-y-3 bg-gradient-to-br ${page.color} bg-opacity-10`}>
        <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${page.color}`}>
          <PageIcon className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{page.title}</h1>
        <p className="text-slate-300 text-sm">Cập nhật lần cuối: 02/08/2026</p>
      </div>

      <div className="space-y-4">
        {page.sections.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <div key={idx} className="glass-card p-6 rounded-2xl space-y-3 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">{sec.title}</h2>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{sec.content}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
        <div>
          <h3 className="text-base font-bold text-white">Vẫn còn thắc mắc?</h3>
          <p className="text-xs text-slate-400 mt-1">Đội ngũ tư vấn sẵn sàng hỗ trợ bạn 24/7</p>
        </div>
        <div className="flex gap-3">
          <a href="tel:19006789" className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-xs font-semibold text-cyan-300">
            <Phone className="w-3.5 h-3.5" /> 1900 6789
          </a>
          <a href="mailto:support@laptopstore.com" className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-xs font-bold text-slate-950">
            <Mail className="w-3.5 h-3.5" /> Gửi Email
          </a>
        </div>
      </div>
    </div>
  );
}
