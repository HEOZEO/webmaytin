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
    gradient: 'from-red-600/30 via-black/80 to-black'
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
            gradient: b.gradient || 'from-red-600/30 via-black/80 to-black'
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
    return <div className="w-full h-[360px] sm:h-[440px] bg-neutral-900 clip-path-rog animate-pulse" />;
  }

  if (banners.length === 0) {
    return null;
  }

  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  return (
    <div 
      className="relative w-full h-[500px] sm:h-[700px] overflow-hidden bg-black group"
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 88%, 0 100%)' }}
    >
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
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
            onError={onImageError}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient || 'from-black/95'} via-black/40 to-transparent`} />

          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-3xl space-y-4">
            {banner.badge && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600/90 border border-red-500 text-white text-xs font-black uppercase tracking-widest w-fit shadow-[0_0_15px_rgba(255,0,41,0.6)]">
                <Sparkles className="w-3.5 h-3.5" />
                {banner.badge}
              </div>
            )}

            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight font-rog uppercase tracking-wide drop-shadow-[0_0_20px_rgba(255,0,41,0.4)]">
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed line-clamp-2">
                {banner.subtitle}
              </p>
            )}

            <div className="pt-6">
              <Link
                to={banner.link}
                className="inline-flex items-center gap-2.5 px-10 py-4 clip-path-rog font-bold bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_30px_rgba(255,0,41,0.8)] hover:-translate-y-1 transition-all text-sm uppercase tracking-widest"
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
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-red-600 text-neutral-300 hover:text-white border border-red-900/50 opacity-0 group-hover:opacity-100 transition-all clip-path-rog"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/60 hover:bg-red-600 text-neutral-300 hover:text-white border border-red-900/50 opacity-0 group-hover:opacity-100 transition-all clip-path-rog"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-16 sm:bottom-24 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 transition-all duration-300 ${
                  index === currentIndex ? 'w-12 bg-red-600' : 'w-4 bg-neutral-700/80 hover:bg-neutral-400'
                }`}
                style={{ transform: 'skewX(-20deg)' }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
