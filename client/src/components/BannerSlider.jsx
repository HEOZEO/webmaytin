import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { resolveImage, onImageError } from '../utils/imageHelper';

const FALLBACK_BANNERS = [
  {
    id: 1,
    title: 'Siêu Phẩm Gaming 2026',
    subtitle: 'NVIDIA GeForce RTX 40 Series & Intel Gen 14',
    badge: 'GIẢM ĐẾN 25%',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    link: '/products?category=gaming',
    buttonText: 'Sắm Laptop Gaming',
    gradient: 'from-cyan-500/20 via-blue-600/10 to-transparent'
  }
];

export default function BannerSlider() {
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/banners?active=true')
      .then(r => r.json())
      .then(res => {
        const list = res?.data || [];
        if (list.length > 0) {
          setBanners(list.map(b => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || '',
            badge: b.badge || '',
            image: b.image_url,
            link: b.link || '/products',
            buttonText: b.button_text || 'Xem Ngay',
            gradient: b.gradient || 'from-cyan-500/20 via-blue-600/10 to-transparent'
          })));
        }
      })
      .catch(err => console.warn('Banner fetch failed, using fallback:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading && banners.length === 0) {
    return <div className="w-full h-[360px] sm:h-[440px] rounded-3xl glass-card animate-pulse" />;
  }

  if (banners.length === 0) {
    return null;
  }

  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  return (
    <div className="relative w-full h-[360px] sm:h-[440px] rounded-3xl overflow-hidden glass-card glow-blue group">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <img
            src={resolveImage(banner.image)}
            alt={banner.title}
            className="w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-1000"
            onError={onImageError}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} via-slate-950/80 to-slate-950`} />

          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-3xl space-y-4">
            {banner.badge && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider w-fit">
                <Sparkles className="w-3.5 h-3.5" />
                {banner.badge}
              </div>
            )}

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-2">
                {banner.subtitle}
              </p>
            )}

            <div className="pt-2">
              <Link
                to={banner.link}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all text-sm"
              >
                {banner.buttonText || 'Xem Ngay'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
