import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Award, ShieldCheck, Headphones, Cpu, Monitor,
  Headphones as HeadphonesIcon, Zap, CheckCircle2, Sparkles, Filter, Package
} from 'lucide-react';
import showToast from '../utils/toast';
import api from '../services/api';

// Color palette cho brand không có metadata
const FALLBACK_COLOR = 'from-red-600/20 via-red-600/10 to-transparent border-red-600/30 text-red-500';

const BRAND_METADATA = {
  Dell: { tagline: 'Độ bền huyền thoại & Hiệu năng công việc đỉnh cao', badge: 'Laptop & PC Doanh Nghiệp', type: 'Laptop', color: 'from-red-600/20 via-sky-500/10 to-transparent border-red-600/30 text-blue-400', series: ['XPS', 'Inspiron', 'Vostro', 'Latitude', 'Alienware'] },
  Apple: { tagline: 'Đỉnh cao thiết kế sang trọng & Chip Apple Silicon mạnh mẽ', badge: 'MacBook & Máy Tính Cao Cấp', type: 'Laptop', color: 'from-slate-300/20 via-slate-500/10 to-transparent border-slate-400/30 text-slate-200', series: ['MacBook Air', 'MacBook Pro', 'Mac Studio', 'iMac'] },
  Asus: { tagline: 'Đột phá công nghệ màn hình OLED & Hệ sinh thái Gaming ROG', badge: 'Laptop, PC & Linh Kiện', type: 'Laptop', color: 'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400', series: ['ROG Strix', 'TUF Gaming', 'Zenbook', 'Vivobook', 'ProArt'] },
  HP: { tagline: 'Thiết kế mỏng nhẹ tinh tế & Bảo mật vân tay sinh trắc học', badge: 'Laptop Văn Phòng & Gaming', type: 'Laptop', color: 'from-red-600/20 via-teal-500/10 to-transparent border-red-600/30 text-red-500', series: ['Spectre', 'Envy', 'Pavilion', 'Victus', 'ProBook'] },
  Lenovo: { tagline: 'Bàn phím sướng nhất thế giới & Dòng máy ThinkPad siêu bền', badge: 'Laptop Hiệu Năng & Doanh Nhân', type: 'Laptop', color: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400', series: ['ThinkPad', 'Legion', 'LOQ', 'IdeaPad', 'Yoga'] },
  Acer: { tagline: 'Tối ưu chi phí hàng đầu & Laptop gaming quốc dân Nitro', badge: 'Laptop Giá Tốt & Sinh Viên', type: 'Laptop', color: 'from-red-600/20 via-green-500/10 to-transparent border-red-600/30 text-red-500', series: ['Nitro 5', 'Predator', 'Swift', 'Aspire'] },
  MSI: { tagline: 'Laptop chuyên Game & Đồ họa 3D nặng với tản nhiệt Cooler Boost', badge: 'Laptop Gaming & Workstation', type: 'Laptop', color: 'from-red-600/20 via-indigo-500/10 to-transparent border-red-600/30 text-red-500', series: ['Katana', 'Raider', 'Cyborg', 'Modern', 'Stealth'] },
  Gigabyte: { tagline: 'Laptop & Bo mạch chủ gaming hiệu năng cao cho dân chuyên nghiệp', badge: 'Laptop & Bo Mạch Chủ', type: 'Laptop', color: 'from-sky-500/20 via-red-600/10 to-transparent border-sky-500/30 text-sky-300', series: ['Aorus', 'Aero', 'G5', 'G7'] },
  Intel: { tagline: 'Vi xử lý Intel Core i3/i5/i7/i9 — Trái tim của mọi cấu hình PC', badge: 'CPU Máy Tính', type: 'Linh Kiện', color: 'from-red-600/20 via-red-600/10 to-transparent border-red-600/30 text-blue-400', series: ['Core i9', 'Core i7', 'Core i5', 'Core i3', 'Xeon'] },
  AMD: { tagline: 'Vi xử lý AMD Ryzen 3/5/7/9 — Hiệu năng trên giá thành vượt trội', badge: 'CPU Máy Tính', type: 'Linh Kiện', color: 'from-red-500/20 via-orange-500/10 to-transparent border-red-500/30 text-red-400', series: ['Ryzen 9', 'Ryzen 7', 'Ryzen 5', 'Ryzen 3', 'Threadripper'] },
  NVIDIA: { tagline: 'Card đồ họa NVIDIA GeForce RTX & GTX — Chuẩn mực gaming & AI', badge: 'Card Đồ Họa GPU', type: 'Linh Kiện', color: 'from-red-600/20 via-green-500/10 to-transparent border-red-600/30 text-red-500', series: ['RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 4060', 'RTX 3060'] },
  Samsung: { tagline: 'SSD Samsung NVMe tốc độ cao & RAM DDR5 hiệu năng đỉnh', badge: 'SSD & RAM Máy Tính', type: 'Linh Kiện', color: 'from-indigo-500/20 via-red-600/10 to-transparent border-indigo-500/30 text-indigo-300', series: ['SSD 990 Pro', 'SSD 980', 'RAM DDR5', 'NVMe Gen4'] },
  Kingston: { tagline: 'RAM, SSD Kingston — Bền bỉ & ổn định cho mọi cấu hình', badge: 'RAM & SSD', type: 'Linh Kiện', color: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30 text-red-400', series: ['Fury Beast', 'Fury Renegade', 'NV2', 'KC3000'] },
  Corsair: { tagline: 'RAM, tản nhiệt nước & PSU Corsair — Cao cấp cho dàn PC enthusiast', badge: 'RAM, Tản Nhiệt & PSU', type: 'Linh Kiện', color: 'from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 text-yellow-400', series: ['Vengeance', 'Dominator', 'iCUE H150i', 'RM850x'] },
  WD: { tagline: 'Ổ cứng Western Digital — Lưu trữ tin cậy cho cá nhân & doanh nghiệp', badge: 'HDD & SSD Lưu Trữ', type: 'Linh Kiện', color: 'from-red-600/20 via-indigo-500/10 to-transparent border-red-600/30 text-blue-300', series: ['Black SN850X', 'Blue SN580', 'Red Plus', 'My Passport'] },
  Seagate: { tagline: 'Ổ cứng Seagate BarraCuda & IronWolf — Dung lượng lớn, bền bỉ', badge: 'HDD & SSD Lưu Trữ', type: 'Linh Kiện', color: 'from-green-500/20 via-red-600/10 to-transparent border-green-500/30 text-green-400', series: ['BarraCuda', 'FireCuda', 'IronWolf', 'Exos'] },
  Crucial: { tagline: 'RAM & SSD Crucial by Micron — Thương hiệu chính hãng từ Mỹ', badge: 'RAM & SSD', type: 'Linh Kiện', color: 'from-teal-500/20 via-red-600/10 to-transparent border-teal-500/30 text-teal-400', series: ['P3 Plus', 'P5 Plus', 'DDR5 Pro', 'Ballistix'] },
  'G.Skill': { tagline: 'RAM G.Skill Trident Z — Đỉnh cao ép xung cho gaming & workstation', badge: 'RAM Gaming Cao Cấp', type: 'Linh Kiện', color: 'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400', series: ['Trident Z5 RGB', 'Ripjaws', 'Sniper X', 'Royal'] },
  LG: { tagline: 'Màn hình LG UltraGear, UltraFine — Chuẩn mực gaming & sáng tạo', badge: 'Màn Hình Máy Tính', type: 'Màn Hình', color: 'from-pink-500/20 via-rose-500/10 to-transparent border-pink-500/30 text-pink-400', series: ['UltraGear 27GP950', 'UltraFine 5K', 'OLED Flex', '27GN950'] },
  AOC: { tagline: 'Màn hình AOC Gaming — Tần số quét cao, giá tốt cho game thủ', badge: 'Màn Hình Gaming', type: 'Màn Hình', color: 'from-red-500/20 via-orange-500/10 to-transparent border-red-500/30 text-red-400', series: ['AGON Pro', '24G2SP', '27G2SP', 'Curved C24G1'] },
  ViewSonic: { tagline: 'Màn hình ViewSonic — Chuyên đồ họa, in ấn & thiết kế chuẩn màu', badge: 'Màn Hình Đồ Họa', type: 'Màn Hình', color: 'from-red-600/20 via-indigo-500/10 to-transparent border-red-600/30 text-blue-400', series: ['ColorPro VP2786', 'XG2405', 'VX3276', 'TD1655'] },
  BenQ: { tagline: 'Màn hình BenQ Mobiuz & PD — Chuẩn màu cho designer & gamer', badge: 'Màn Hình Đồ Họa & Gaming', type: 'Màn Hình', color: 'from-red-600/20 via-violet-500/10 to-transparent border-red-600/30 text-red-500', series: ['MOBIUZ EX270QM', 'PD3220U', 'ZOWIE XL2566K', 'GW2785'] },
  Logitech: { tagline: 'Chuột, bàn phím, tai nghe Logitech — Chuẩn mực văn phòng & gaming', badge: 'Phụ Kiện Máy Tính', type: 'Phụ Kiện', color: 'from-red-600/20 via-red-600/10 to-transparent border-red-600/30 text-blue-400', series: ['MX Master 3S', 'G Pro X', 'G502', 'G733'] },
  Razer: { tagline: 'Razer — Phụ kiện gaming cao cấp cho game thủ chuyên nghiệp', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-red-600/20 via-green-500/10 to-transparent border-red-600/30 text-red-500', series: ['DeathAdder V3', 'BlackWidow V4', 'Kraken V3', 'Basilisk V3'] },
  HyperX: { tagline: 'HyperX — Tai nghe, bàn phím, chuột gaming được tin dùng', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30 text-red-400', series: ['Cloud III', 'Alloy Origins', 'Pulsefire Haste', 'Fury Ultra'] },
  SteelSeries: { tagline: 'SteelSeries — Phụ kiện gaming đỉnh cao cho esports', badge: 'Phụ Kiện Gaming', type: 'Phụ Kiện', color: 'from-orange-500/20 via-amber-500/10 to-transparent border-orange-500/30 text-orange-400', series: ['Apex Pro', 'Arctis Nova Pro', 'Aerox 3', 'Rival 600'] },
  Akko: { tagline: 'Akko — Bàn phím cơ hot-swappable, theme độc đáo', badge: 'Bàn Phím Cơ', type: 'Phụ Kiện', color: 'from-pink-500/20 via-fuchsia-500/10 to-transparent border-pink-500/30 text-pink-400', series: ['3068B', '5075B', 'PC98B', '3098B'] },
  Keychron: { tagline: 'Keychron — Bàn phím cơ wireless cho Mac & Windows', badge: 'Bàn Phím Cơ', type: 'Phụ Kiện', color: 'from-red-600/20 via-teal-500/10 to-transparent border-red-600/30 text-red-500', series: ['Q1 Pro', 'K8 Pro', 'V1', 'K2'] }
};

const BRAND_HIGHLIGHTS = [
  { title: '100% Chính Hãng', desc: 'Nhập khẩu trực tiếp từ các tập đoàn công nghệ hàng đầu thế giới với chứng nhận CO/CQ.', icon: ShieldCheck, color: 'text-red-500 bg-red-600/10 border-red-600/20' },
  { title: 'Bảo Hành Đầy Đủ', desc: 'Cam kết bảo hành chính hãng từ 12 đến 36 tháng, hỗ trợ 1 đổi 1 trong 30 ngày đầu.', icon: Award, color: 'text-red-500 bg-red-600/10 border-red-600/20' },
  { title: 'Hỗ Trợ Kỹ Thuật 24/7', desc: 'Tư vấn cấu hình máy tính phù hợp với nhu cầu học tập, làm việc, đồ họa và chơi game.', icon: Headphones, color: 'text-red-500 bg-red-600/10 border-red-600/20' }
];

// Color rotation cho brands không có metadata
const FALLBACK_COLORS = [
  'from-red-600/20 via-red-600/10 to-transparent border-red-600/30 text-red-500',
  'from-red-600/20 via-pink-500/10 to-transparent border-red-600/30 text-red-500',
  'from-red-600/20 via-teal-500/10 to-transparent border-red-600/30 text-red-500',
  'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400',
  'from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-400',
  'from-indigo-500/20 via-red-600/10 to-transparent border-indigo-500/30 text-indigo-400'
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
    <div className="min-h-screen bg-black relative">
      {/* High-tech Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Intense Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-red-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -left-40 w-[20rem] h-[20rem] bg-red-700/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[25rem] h-[25rem] bg-red-900/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header Banner */}
        <section className="text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-none clip-path-rog bg-black border border-red-600/50 shadow-[0_0_15px_rgba(255,0,0,0.3)] text-red-500 text-xs font-black uppercase tracking-[0.2em]">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Đối Tác Ủy Quyền Chính Thức
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight uppercase tracking-tight">
            Thương Hiệu Máy Tính <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-orange-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
              Hàng Đầu Thế Giới
            </span>
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            LaptopStore tự hào là nhà phân phối chính thức các thương hiệu Laptop, PC, Linh kiện, Màn hình & Phụ kiện máy tính hàng đầu thế giới với mức giá ưu đãi và chế độ hậu mãi chu đáo nhất.
          </p>
        </section>

        {/* Trust Values Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {BRAND_HIGHLIGHTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="group bg-neutral-900/80 backdrop-blur-xl p-6 rounded-none clip-path-rog border border-neutral-800 hover:border-red-500 hover:bg-neutral-900 hover:shadow-[0_0_20px_rgba(255,0,0,0.2)] transition-all duration-300 flex items-start gap-4">
                <div className="p-3 bg-black rounded-none clip-path-rog border border-red-600/30 text-red-500 flex-shrink-0 group-hover:scale-110 group-hover:bg-red-600/10 group-hover:border-red-500 transition-all shadow-[inset_0_0_10px_rgba(255,0,0,0.1)]">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-white uppercase tracking-wide group-hover:text-red-500 transition-colors">{item.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main Brands Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-4 gap-3 relative z-10">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="w-5 h-5 text-red-600 animate-pulse" /> Thương Hiệu Có Sản Phẩm
              </h2>
              <p className="text-neutral-500 text-xs mt-1 font-medium">Chỉ hiển thị các hãng đang có sản phẩm bán tại LaptopStore</p>
            </div>
            <span className="text-xs text-red-500 font-black px-4 py-1.5 bg-black rounded-none clip-path-rog border border-red-600/30 shadow-[0_0_10px_rgba(255,0,0,0.2)]">
              {filteredBrands.length} / {brands.length} hãng
            </span>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 flex-wrap relative z-10">
            <span className="text-[11px] font-black text-neutral-500 uppercase tracking-[0.1em] flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-none clip-path-rog text-xs font-black border transition-all ${
                typeFilter === 'all'
                  ? 'bg-red-600 text-white tracking-[0.15em] uppercase border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.4)]'
                  : 'bg-black text-neutral-400 border-neutral-800 hover:border-red-600/50 hover:text-red-400'
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
                  className={`px-4 py-2 rounded-none clip-path-rog text-xs font-black border transition-all flex items-center gap-1.5 uppercase tracking-wide ${
                    typeFilter === t
                      ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.4)]'
                      : 'bg-black text-neutral-400 border-neutral-800 hover:border-red-600/50 hover:text-red-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-neutral-900 rounded-none clip-path-rog h-72 animate-pulse border border-neutral-800" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="bg-black/60 backdrop-blur-md p-12 rounded-none clip-path-rog text-center space-y-3 border border-neutral-800 relative z-10 shadow-[0_0_30px_rgba(255,0,0,0.1)]">
              <Package className="w-12 h-12 text-red-600/50 mx-auto" />
              <p className="text-neutral-400 text-sm font-medium">
                Không có thương hiệu nào phù hợp với bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {filteredBrands.map((brand, idx) => {
                const meta = BRAND_METADATA[brand.name];
                // Keep the color string, but it's meant for a dark bg
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
                    className={`group bg-neutral-900/80 backdrop-blur-xl rounded-none clip-path-rog p-6 border border-neutral-800 bg-gradient-to-br ${color} flex flex-col justify-between hover:border-red-500 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,0,0,0.25)] transition-all duration-300 relative overflow-hidden`}
                  >
                    {/* Glowing Accent Line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 z-10 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>

                    <div className="space-y-4 relative z-20">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-black rounded-none clip-path-rog text-[10px] font-black uppercase tracking-[0.1em] text-red-500 border border-neutral-800 group-hover:border-red-600/50 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                          {badge}
                        </span>
                        <span className="px-2.5 py-1 bg-emerald-950/50 text-emerald-400 rounded-none clip-path-rog text-[11px] font-black border border-emerald-900 flex items-center gap-1 group-hover:border-emerald-500/50 group-hover:text-emerald-300 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {productCount} sản phẩm
                        </span>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="w-16 h-16 rounded-none clip-path-rog bg-black border border-neutral-800 flex items-center justify-center font-black text-xl text-red-600 group-hover:border-red-500 group-hover:bg-red-600/10 group-hover:scale-105 transition-all flex-shrink-0 text-center leading-tight px-1 shadow-[inset_0_0_15px_rgba(0,0,0,1)] group-hover:shadow-[inset_0_0_20px_rgba(255,0,0,0.2)]">
                          {brand.name.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-black text-white group-hover:text-red-500 transition-colors truncate uppercase tracking-wide drop-shadow-md">
                            {brand.name}
                          </h3>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                            {tagline}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-neutral-800/80">
                        <span className="text-[10px] text-neutral-500 font-black uppercase tracking-[0.1em]">Dòng sản phẩm tiêu biểu:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {series.slice(0, 4).map(s => (
                            <span key={s} className="px-2 py-1 rounded-none clip-path-rog bg-black text-neutral-300 text-[11px] font-bold border border-neutral-800 group-hover:border-red-900 group-hover:text-white transition-colors">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 relative z-20">
                      <Link
                        to={`/products?brand=${brand.id}`}
                        className="w-full py-3.5 bg-black hover:bg-red-600 text-red-500 hover:text-white font-black tracking-[0.2em] uppercase border border-red-600/30 hover:border-red-500 rounded-none clip-path-rog text-[11px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,0,0,0.1)] hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]"
                      >
                        {ctaText} <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer CTA */}
        <section className="relative z-10 bg-neutral-900/90 backdrop-blur-xl p-8 sm:p-14 rounded-none clip-path-rog border border-red-600/50 text-center space-y-5 shadow-[0_0_40px_rgba(255,0,0,0.15)] overflow-hidden">
          {/* Decorative background grid in footer */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ef44441a_1px,transparent_1px),linear-gradient(to_bottom,#ef44441a_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          
          <div className="relative z-20">
            <div className="inline-flex p-4 bg-black text-red-500 rounded-none clip-path-rog border border-red-600/40 shadow-[0_0_20px_rgba(255,0,0,0.3)] mb-2">
              <Zap className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight drop-shadow-md">Bạn Cần Tư Vấn Cấu Hình Máy Tính Theo Nhu Cầu?</h2>
            <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed font-medium">
              Đội ngũ chuyên gia kỹ thuật của LaptopStore sẵn sàng hỗ trợ bạn lựa chọn thương hiệu và cấu hình máy tính tối ưu nhất.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-red-600 text-white font-black tracking-[0.15em] uppercase rounded-none clip-path-rog text-xs sm:text-sm hover:shadow-[0_0_25px_rgba(255,0,0,0.5)] hover:bg-red-500 transition-all border border-red-400/50"
              >
                Liên Hệ Tư Vấn Trực Tiếp <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black border border-neutral-700 hover:border-red-500 hover:text-white text-red-500 font-black tracking-[0.15em] uppercase rounded-none clip-path-rog text-xs sm:text-sm transition-all hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]"
              >
                Xem Tất Cả Sản Phẩm
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}