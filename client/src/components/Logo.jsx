import React from 'react';

export default function Logo({ size = 44, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex-shrink-0 flex items-center justify-center">
        {/* Neon Glow Aura Behind Logo */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-md opacity-40 animate-pulse" />

        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative flex-shrink-0 drop-shadow-xl"
          aria-label="LaptopStore Logo"
        >
          <defs>
            {/* Primary Cyan-to-Blue Gradient */}
            <linearGradient id="mainBrandGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>

            {/* Inner Glass Display Gradient */}
            <linearGradient id="innerGlass" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Accent Gold/Cyan Sparkle */}
            <linearGradient id="coreSparkle" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Squircle Container */}
          <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#innerGlass)" stroke="url(#mainBrandGrad)" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Laptop Screen Body Frame */}
          <rect x="12" y="13" width="40" height="27" rx="5" fill="url(#mainBrandGrad)" filter="url(#neonGlow)" />
          {/* Dark Inner Screen Display */}
          <rect x="15" y="16" width="34" height="21" rx="3" fill="#090d16" />

          {/* High Tech Core Icon (Lightning/Speed Symbol) inside Display */}
          <path d="M34 19 L26 28 H33 L30 35 L39 25 H32 Z" fill="url(#mainBrandGrad)" />

          {/* Code / Tech Accents on Display */}
          <rect x="18" y="20" width="4" height="1.5" rx="0.75" fill="#38bdf8" opacity="0.8" />
          <rect x="18" y="23" width="6" height="1.5" rx="0.75" fill="#38bdf8" opacity="0.5" />
          <rect x="18" y="26" width="3" height="1.5" rx="0.75" fill="#38bdf8" opacity="0.3" />

          {/* Laptop Base Stand */}
          <path d="M 8 43 C 8 41.5 9.5 41 11 41 L 53 41 C 54.5 41 56 41.5 56 43 L 57 46 C 57 47 56 48 54.5 48 L 9.5 48 C 8 48 7 47 7 46 Z" fill="url(#mainBrandGrad)" />
          {/* Base Notch Opening Track */}
          <rect x="25" y="42" width="14" height="2.5" rx="1.25" fill="#0f172a" opacity="0.8" />

          {/* Top Status LED Dot */}
          <circle cx="50" cy="17" r="2.5" fill="#38bdf8">
            <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span className="text-xl font-black text-white tracking-tight">
              Laptop
            </span>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 tracking-tight">
              Store
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-cyan-400/90">
              HIGH TECH HUB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}