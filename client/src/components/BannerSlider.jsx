import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
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
  const [typedText, setTypedText] = useState('');
  
  const SLIDE_DURATION = 5000;

  // Typewriter effect logic
  useEffect(() => {
    if (banners.length === 0) return;
    const currentSubtitle = banners[currentIndex]?.subtitle || '';
    let i = 0;
    setTypedText('');
    const typingInterval = setInterval(() => {
      if (i < currentSubtitle.length) {
        setTypedText(currentSubtitle.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50); // Speed of typing

    return () => clearInterval(typingInterval);
  }, [currentIndex, banners]);

  // Fetch banners
  useEffect(() => {
    api.get('/banners?active=true')
      .then(res => {
        const list = res.data?.data || [];
        if (list.length > 0) {
          setBanners(list.map(b => ({
            id: b.id,
            title: b.title,
            subtitle: b.subtitle || '',
            badge: b.badge || '',
            image: b.image_url,
            link: b.link || '/products',
            buttonText: b.button_text || 'Xem Ngay',
            gradient: b.gradient || 'from-red-900/40 via-black/80 to-black'
          })));
        }
      })
      .catch(err => console.warn('Banner fetch failed, using fallback:', err))
      .finally(() => setLoading(false));
  }, []);

  // Slide timer
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (loading && banners.length === 0) {
    return <div className="w-full h-[500px] sm:h-[700px] bg-neutral-900 clip-path-rog animate-pulse" />;
  }

  if (banners.length === 0) return null;

  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  return (
    <div 
      className="relative w-full h-[500px] sm:h-[700px] overflow-hidden bg-black group"
      style={{ clipPath: 'polygon(0 0, 100% 0, 100% 90%, 0 100%)' }}
    >
      {/* HUD Scanner Line */}
      <div className="scanner-line"></div>

      {/* HUD Corners */}
      <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-red-500/50 z-20"></div>
      <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-red-500/50 z-20"></div>
      <div className="absolute bottom-20 left-6 w-12 h-12 border-b-4 border-l-4 border-red-500/50 z-20"></div>
      <div className="absolute bottom-20 right-6 w-12 h-12 border-b-4 border-r-4 border-red-500/50 z-20"></div>

      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-10"
        >
          <img
            src={resolveImage(banners[currentIndex].image)}
            alt={banners[currentIndex].title}
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
            onError={onImageError}
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${banners[currentIndex].gradient || 'from-black/90'} via-black/50 to-transparent`} />
          
          <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-16 lg:px-24 max-w-4xl z-20 perspective-1000">
            {/* 3D Tilt Card Container */}
            <motion.div
              whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-black/40 backdrop-blur-md border border-red-500/30 p-8 sm:p-12 clip-path-rog shadow-[0_0_50px_rgba(255,0,0,0.15)] relative overflow-hidden"
            >
              {/* Subtle inner scan line on hover */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-red-500/10 to-transparent opacity-0 hover:opacity-100 -translate-y-full hover:translate-y-full transition-all duration-1000" />
              
              {banners[currentIndex].badge && (
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-600/90 border border-red-500 text-white text-xs font-black uppercase tracking-widest w-fit mb-6 shadow-[0_0_15px_rgba(255,0,41,0.6)]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {banners[currentIndex].badge}
                </motion.div>
              )}

              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight font-rog uppercase tracking-wide drop-shadow-[0_0_20px_rgba(255,0,41,0.6)] glitch-text mb-4"
                data-text={banners[currentIndex].title}
              >
                {banners[currentIndex].title}
              </motion.h2>

              <div className="h-14">
                <p className="text-red-400 font-mono text-sm sm:text-base leading-relaxed typewriter-cursor">
                  {typedText}
                </p>
              </div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="pt-6 flex items-center gap-4"
              >
                <Link
                  to={banners[currentIndex].link}
                  className="inline-flex items-center gap-2.5 px-10 py-4 clip-path-rog font-bold bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_30px_rgba(255,0,41,0.8)] hover:-translate-y-1 transition-all text-sm uppercase tracking-widest"
                >
                  {banners[currentIndex].buttonText || 'Xem Ngay'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-red-600 text-neutral-300 hover:text-white border border-red-900/50 opacity-0 group-hover:opacity-100 transition-all clip-path-rog"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-red-600 text-neutral-300 hover:text-white border border-red-900/50 opacity-0 group-hover:opacity-100 transition-all clip-path-rog"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Animated Progress Bars */}
          <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-4">
            {banners.map((_, index) => (
              <div
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="relative h-2 w-16 bg-neutral-800/80 cursor-pointer overflow-hidden border border-neutral-700/50"
                style={{ transform: 'skewX(-30deg)' }}
              >
                {index === currentIndex && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
                    className="absolute top-0 left-0 h-full bg-red-600 shadow-[0_0_10px_rgba(255,0,0,0.8)]"
                  />
                )}
                {index < currentIndex && (
                  <div className="absolute top-0 left-0 h-full w-full bg-red-600/60" />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
