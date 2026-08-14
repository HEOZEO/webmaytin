import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Award, ShieldCheck, Headphones, Cpu, Monitor,
  Headphones as HeadphonesIcon, Zap, CheckCircle2, Sparkles, Filter, Package
} from 'lucide-react';
import showToast from '../utils/toast';
import api from '../services/api';

// Color palette cho brand không có metadata
const FALLBACK_COLOR = 'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 text-cyan-400';

const BRAND_METADATA = {
  Dell: { tagline: 'Độ bền huyền thoại & Hiệu năng công việc đỉnh cao', badge: 'Laptop & PC Doanh Nghiệp', type: 'Laptop', color: 'from-blue-500/20 via-sky-500/10 to-transparent border-blue-500/30 text-blue-400', series: ['XPS', 'Inspiron', 'Vostro', 'Latitude', 'Alienware'] },
  Apple: { tagline: 'Đỉnh cao thiết kế sang trọng & Chip Apple Silicon mạnh mẽ', badge: 'MacBook & Máy Tính Cao Cấp', type: 'Laptop', color: 'from-slate-300/20 via-slate-500/10 to-transparent border-slate-400/30 text-slate-200', series: ['MacBook Air', 'MacBook Pro', 'Mac Studio', 'iMac'] },
  Asus: { tagline: 'Đột phá công nghệ màn hình OLED & Hệ sinh thái Gaming ROG', badge: 'Laptop, PC & Linh Kiện', type: 'Laptop', color: 'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400', series: ['ROG Strix', 'TUF Gaming', 'Zenbook', 'Vivobook', 'ProArt'] },
  HP: { tagline: 'Thiết kế mỏng nhẹ tinh tế & Bảo mật vân tay sinh trắc học', badge: 'Laptop Văn Phòng & Gaming', type: 'Laptop', color: 'from-cyan-500/20 via-teal-500/10 to-transparent border-cyan-500/30 text-cyan-400', series: ['Spectre', 'Envy', 'Pavilion', 'Victus', 'ProBook'] },
  Lenovo: { tagline: 'Bàn phím sướng nhất thế giới & Dòng máy ThinkPad siêu bền', badge: 'Laptop Hiệu Năng & Doanh Nhân', type: 'Laptop', color: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400', series: ['ThinkPad', 'Legion', 'LOQ', 'IdeaPad', 'Yoga'] },
  Acer: { tagline: 'Tối ưu chi phí hàng đầu & Laptop gaming quốc dân Nitro', badge: 'Laptop Giá Tốt & Sinh Viên', type: 'Laptop', color: 'from-emerald-500/20 via-green-500/10 to-transparent border-emerald-500/30 text-emerald-400', series: ['Nitro 5', 'Predator', 'Swift', 'Aspire'] },
  MSI: { tagline: 'Laptop chuyên Game & Đồ họa 3D nặng với tản nhiệt Cooler Boost', badge: 'Laptop Gaming & Workstation', type: 'Laptop', color: 'from-purple-500/20 via-indigo-500/10 to-transparent border-purple-500/30 text-purple-400', series: ['Katana', 'Raider', 'Cyborg', 'Modern', 'Stealth'] },
  Gigabyte: { tagline: 'Laptop & Bo mạch chủ gaming hiệu năng cao cho dân chuyên nghiệp', badge: 'Laptop & Bo Mạch Chủ', type: 'Laptop', color: 'from-sky-500/20 via-blue-500/10 to-transparent border-sky-500/30 text-sky-300', series: ['Aorus', 'Aero', 'G5', 'G7'] },
  Intel: { tagline: 'Vi xử lý Intel Core i3/i5/i7/i9 — Trái tim của mọi cấu hình PC', badge: 'CPU Máy Tính', type: 'Linh Kiện', color: 'from-blue-500/20 via-cyan-500/10 to-transparent border-blue-500/30 text-blue-400', series: ['Core i9', 'Core i7', 'Core i5', 'Core i3', 'Xeon'] },
  AMD: { tagline: 'Vi xử lý AMD Ryzen 3/5/7/9 — Hiệu năng trên giá thành vượt trội', badge: 'CPU Máy Tính', type: 'Linh Kiện', color: 'from-red-500/20 via-orange-500/10 to-transparent border-red-500/30 text-red-400', series: ['Ryzen 9', 'Ryzen 7', 'Ryzen 5', 'Ryzen 3', 'Threadripper'] },
  NVIDIA: { tagline: 'Card đồ họa NVIDIA GeForce RTX & GTX — Chuẩn mực gaming & AI', badge: 'Card Đồ Họa GPU', type: 'Linh Kiện', color: 'from-emerald-500/20 via-green-500/10 to-transparent border-emerald-500/30 text-emerald-400', series: ['RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060', 'RTX 3060'] },
  Samsung: { tagline: 'SSD Samsung NVMe tốc độ cao & RAM DDR5 hiệu năng đỉnh', badge: 'SSD & RAM Máy Tính', type: 'Linh Kiện', color: 'from-indigo-500/20 via-blue-500/10 to-transparent border-indigo-500/30 text-indigo-300', series: ['SSD 990 Pro', 'SSD 980', 'RAM DDR5', 'NVMe Gen4'] },
  Kingston: { tagline: 'RAM, SSD Kingston — Bền bỉ & ổn định cho mọi cấu hình', badge: 'RAM & SSD', type: 'Linh Kiện', color: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30 text-red-400', series: ['Fury Beast', 'Fury Renegade', 'NV2', 'KC3000'] },
  Corsair: { tagline: 'RAM, tản nhiệt nước & PSU Corsair — Cao cấp cho dàn PC enthusiast', badge: 'RAM, Tản Nhiệt & PSU', type: 'Linh Kiện', color: 'from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 text-yellow-400', series: ['Vengeance', 'Dominator', 'iCUE H150i', 'RM850x'] },
  WD: { tagline: 'Ổ cứng Western Digital — Lưu trữ tin cậy cho cá nhân & doanh nghiệp', badge: 'HDD & SSD Lưu Trữ', type: 'Linh Kiện', color: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30 text-blue-300', series: ['Black SN850X', 'Blue SN580', 'Red Plus', 'My Passport'] },
  Seagate: { tagline: 'Ổ cứng Seagate BarraCuda & IronWolf — Dung lượng lớn, bền bỉ', badge: 'HDD & SSD Lưu Trữ', type: 'Linh Kiện', color: 'from-green-500/20 via-emerald-500/10 to-transparent border-green-500/30 text-green-400', series: ['BarraCuda', 'FireCuda', 'IronWolf', 'Exos'] },
  Crucial: { tagline: 'RAM & SSD Crucial by Micron — Thương hiệu chính hãng từ Mỹ', badge: 'RAM & SSD', type: 'Linh Kiện', color: 'from-teal-500/20 via-cyan-500/10 to-transparent border-teal-500/30 text-teal-400', series: ['P3 Plus', 'P5 Plus', 'DDR5 Pro', 'Ballistix'] },
  'G.Skill': { tagline: 'RAM G.Skill Trident Z — Đỉnh cao ép xung cho gaming & workstation', badge: 'RAM Gaming Cao Cấp', type: 'Linh Kiện', color: 'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400', series: ['Trident Z5 RGB', 'Ripjaws', 'Sniper X', 'Royal'] },
  LG: { tagline: 'Màn hình LG UltraGear, UltraFine — Chuẩn mực gaming & sáng tạo', badge: 'Màn Hình Máy Tính', type: 'Màn Hình', color: 'from-pink-500/20 via-rose-500/10 to-transparent border-pink-500/30 text-pink-400', series: ['UltraGear 27GP950', 'UltraFine 5K', 'OLED Flex', '27GN950'] },
  AOC: { tagline: 'Màn hình AOC Gaming — Tần số quét cao, giá tốt cho game thủ', badge: 'Màn Hình Gaming', type: 'Màn Hình', color: 'from-red-500/20 via-orange-500/10 to-transparent border-red-500/30 text-red-400', series: ['AGON Pro', '24G2SP', '27G2SP', 'Curved C24G1'] },
  ViewSonic: { tagline: 'Màn hình ViewSonic — Chuyên đồ họa, in ấn & thiết kế chuẩn màu', badge: 'Màn Hình Đồ Họa', type: 'Màn Hình', color: 'from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30 text-blue-400', series: ['ColorPro VP2786', 'XG2405', 'VX3276', 'TD1655'] },
  BenQ: { tagline: 'Màn hình BenQ Mobiuz & PD — Chuẩn màu cho designer & gamer', badge: 'Màn Hình Đồ Họa & Gaming', type: 'Màn Hình', color: 'from-purple-500/20 via-violet-500/10 to-transparent border-purple-500/30 text-purple-400', series: ['MOBIUZ EX270QM', 'PD3220U', 'ZOWIE XL2566K', 'GW2785'] },
  Logitech: { tagline: 'Chuột, bàn phím, tai nghe Logitech — Chuẩn mực văn phòng & gaming', badge: 'Phụ Kiện Máy Tính', type: 'Phụ Kiện', color: 'from-blue-500/20 via-cyan-500/10 to-transparent border-blue-500/30 text-blue-400', series: ['MX Master 3S', 'G Pro X', 'G502', 'G733'] },
  Razer: { tagline: 'Razer — Phụ kiện gaming cao cấp cho game thủ chuyên nghiệp', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-emerald-500/20 via-green-500/10 to-transparent border-emerald-500/30 text-emerald-400', series: ['DeathAdder V3', 'BlackWidow V4', 'Kraken V3', 'Basilisk V3'] },
  HyperX: { tagline: 'HyperX — Tai nghe, bàn phím, chuột gaming được tin dùng', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30 text-red-400', series: ['Cloud III', 'Alloy Origins', 'Pulsefire Haste', 'Fury Ultra'] },
  SteelSeries: { tagline: 'SteelSeries — Phụ kiện gaming đỉnh cao cho esports', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-orange-500/20 via-amber-500/10 to-transparent border-orange-500/30 text-orange-400', series: ['Apex Pro', 'Arctis Nova Pro', 'Aerox 3', 'Rival 600'] },
  Akko: { tagline: 'Akko — Bàn phím cơ hot-swappable, theme độc đáo', badge: 'Bàn Phím Cơ', type: 'Phụ Kiện', color: 'from-pink-500/20 via-fuchsia-500/10 to-transparent border-pink-500/30 text-pink-400', series: ['3068B', '5075B', 'PC98B', '3098B'] },
  Keychron: { tagline: 'Keychron — Bàn phím cơ wireless cho Mac & Windows', badge: 'Bàn Phím Cơ', type: 'Phụ Kiện', color: 'from-cyan-500/20 via-teal-500/10 to-transparent border-cyan-500/30 text-cyan-400', series: ['Q1 Pro', 'K8 Pro', 'V1', 'K2'] }
};

const BRAND_HIGHLIGHTS = [
  { title: '100% Chính Hãng', desc: 'Nhập khẩu trực tiếp từ các tập đoàn công nghệ hàng đầu thế giới với chứng nhận CO/CQ.', icon: ShieldCheck, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { title: 'Bảo Hành Đầy Đủ', desc: 'Cam kết bảo hành chính hãng từ 12 đến 36 tháng, hỗ trợ 1 đổi 1 trong 30 ngày đầu.', icon: Award, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { title: 'Hỗ Trợ Kỹ Thuật 24/7', desc: 'Tư vấn cấu hình máy tính phù hợp với nhu cầu học tập, làm việc, đồ họa và chơi game.', icon: Headphones, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
];

// Color rotation cho brands không có metadata
const FALLBACK_COLORS = [
  'from-cyan-500/20 via-blue-500/10 to-transparent border-cyan-500/30 text-cyan-400',
  'from-purple-500/20 via-pink-500/10 to-transparent border-purple-500/30 text-purple-400',
  'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-400',
  'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400',
  'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400',
  'from-indigo-500/20 via-blue-500/10 to-transparent border-indigo-500/30 text-indigo-400'
];

export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/brands')
      .then(res => {
        const raw = res?.data?.data || res?.data?.brands || res?.data;
        const list = Array.isArray(raw) ? raw : [];
        // Chỉ giữ brand có sản phẩm (product_count > 0)
        const withProducts = list.filter(b => (b.product_count ?? 0) > 0);
        setBrands(withProducts);
      })
      .catch(err => {
        console.error('Fetch brands error:', err);
        showToast.error('Không thể tải danh sách thương hiệu');
      })
      .finally(() => setLoading(false));
  }, []);

  const brandTypes = useMemo(() => {
    const set = new Set();
    brands.forEach(b => {
      const meta = BRAND_METADATA[b.name];
      if (meta?.type) set.add(meta.type);
    });
    return Array.from(set);
  }, [brands]);

  const filteredBrands = brands.filter(b => {
    if (typeFilter === 'all') return true;
    const meta = BRAND_METADATA[b.name];
    return meta?.type === typeFilter;
  });

  const typeIcon = (t) => {
    if (t === 'Linh Kiện') return Cpu;
    if (t === 'Màn Hình') return Monitor;
    if (t === 'Phụ Kiện') return HeadphonesIcon;
    return Sparkles;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header Banner */}
        <section className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Đối Tác Ủy Quyền Chính Thức
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Thương Hiệu Máy Tính <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
              Hàng Đầu Thế Giới
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            LaptopStore tự hào là nhà phân phối chính thức các thương hiệu Laptop, PC, Linh kiện, Màn hình & Phụ kiện máy tính hàng đầu thế giới với mức giá ưu đãi và chế độ hậu mãi chu đáo nhất.
          </p>
        </section>

        {/* Trust Values Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRAND_HIGHLIGHTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="group bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all flex items-start gap-4 shadow-lg">
                <div className={`p-3 rounded-2xl border ${item.color} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main Brands Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> Thương Hiệu Có Sản Phẩm
              </h2>
              <p className="text-slate-400 text-xs mt-1">Chỉ hiển thị các hãng đang có sản phẩm bán tại LaptopStore</p>
            </div>
            <span className="text-xs text-cyan-400 font-bold px-3 py-1 bg-cyan-950/60 rounded-full border border-cyan-500/30">
              {filteredBrands.length} / {brands.length} hãng
            </span>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                typeFilter === 'all'
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 border-transparent shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-cyan-500/40'
              }`}
            >
              Tất cả ({brands.length})
            </button>
            {brandTypes.map(t => {
              const Icon = typeIcon(t);
              const count = brands.filter(b => BRAND_METADATA[b.name]?.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    typeFilter === t
                      ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 border-transparent shadow-lg shadow-cyan-500/25'
                      : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-slate-900/60 rounded-3xl h-72 animate-pulse border border-slate-800" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="bg-slate-900/60 backdrop-blur-md p-12 rounded-3xl text-center space-y-3 border border-slate-800">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 text-sm">
                Không có thương hiệu nào phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBrands.map((brand, idx) => {
                const meta = BRAND_METADATA[brand.name];
                const color = meta?.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                const tagline = meta?.tagline || brand.description || 'Thương hiệu máy tính chính hãng';
                const badge = meta?.badge || 'Chính Hãng';
                const series = meta?.series || ['Xem sản phẩm'];
                const productCount = brand.product_count || 0;

                const ctaText = meta?.type === 'Linh Kiện'
                  ? `Xem ${brand.name} (Linh Kiện)`
                  : meta?.type === 'Màn Hình'
                  ? `Xem Màn Hình ${brand.name}`
                  : meta?.type === 'Phụ Kiện'
                  ? `Xem Phụ Kiện ${brand.name}`
                  : `Khám Phá Máy Tính ${brand.name}`;

                return (
                  <div
                    key={brand.id}
                    className={`group bg-slate-900/60 backdrop-blur-md rounded-3xl p-6 border bg-gradient-to-br ${color} flex flex-col justify-between hover:border-cyan-400/60 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 border border-slate-800">
                          {badge}
                        </span>
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {productCount} sản phẩm
                        </span>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center font-black text-base text-cyan-400 group-hover:border-cyan-500/50 group-hover:scale-105 transition-all flex-shrink-0 shadow-inner text-center leading-tight px-1">
                          {brand.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition-colors truncate">
                            {brand.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {tagline}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dòng sản phẩm:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {series.slice(0, 4).map(s => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-300 text-[11px] font-semibold border border-slate-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Link
                        to={`/products?brand=${brand.id}`}
                        className="w-full py-3 bg-slate-950 group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-sky-400 group-hover:text-slate-950 text-cyan-300 border border-slate-800 group-hover:border-transparent font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        {ctaText} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer CTA */}
        <section className="bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-purple-500/15 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-cyan-500/30 text-center space-y-4 shadow-2xl">
          <div className="inline-flex p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl border border-cyan-500/40">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Bạn Cần Tư Vấn Cấu Hình Máy Tính Theo Nhu Cầu?</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Đội ngũ chuyên gia kỹ thuật của LaptopStore sẵn sàng hỗ trợ bạn lựa chọn thương hiệu và cấu hình máy tính tối ưu nhất.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Liên Hệ Tư Vấn Trực Tiếp <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 font-bold rounded-2xl text-xs sm:text-sm"
            >
              Xem Tất Cả Sản Phẩm
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}