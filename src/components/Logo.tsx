import React from 'react';

interface LogoProps {
  variant?: 'header' | 'icon' | 'full' | 'login';
  className?: string;
}

export default function Logo({ variant = 'header', className = '' }: LogoProps) {
  // Common styled components for the logo icon/mark
  const LogoMark = () => (
    <svg 
      viewBox="0 0 170 120" 
      className="h-full w-auto shrink-0 select-none"
      fill="currentColor"
    >
      <defs>
        {/* Africa outline clip path */}
        <clipPath id="africa-clip">
          <path d="M 122 30 C 131 28, 142 30, 146 34 C 148 36, 151 41, 153 45 C 154 48, 151 52, 149 55 C 147 57, 151 59, 150 63 C 148 66, 149 69, 146 72 C 143 75, 141 78, 139 81 C 137 84, 136 88, 133 90 C 131 91, 129 88, 128 85 C 126 82, 126 79, 125 76 C 124 73, 122 70, 120 67 C 118 64, 116 65, 114 62 C 112 59, 111 55, 112 52 C 113 49, 110 48, 111 45 C 112 42, 116 43, 117 41 C 118 39, 119 31, 122 30 Z" />
          <path d="M 149 78 C 150 78, 151 81, 150 84 C 149 85, 148 85, 147 82 C 147 80, 148 79, 149 78 Z" />
        </clipPath>
      </defs>

      {/* 1. Africa Globe Circular Orbit Lines */}
      {/* Top-left dark blue/white arc */}
      <path 
        d="M 130 20 A 40 40 0 0 0 90 60 A 40 40 0 0 0 105 90" 
        fill="none" 
        stroke="currentColor" 
        className="text-slate-900 dark:text-slate-100" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      {/* Bottom-right red arc */}
      <path 
        d="M 155 35 A 40 40 0 0 1 170 60 A 40 40 0 0 1 130 100" 
        fill="none" 
        stroke="#dc2626" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />

      {/* 2. Africa Continent Filled with Horizontal Stripes */}
      <g clipPath="url(#africa-clip)">
        {/* Upper stripes in navy/slate (Y from 20 to 60) */}
        <rect x="105" y="28" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="33" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="38" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="43" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="48" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="53" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="105" y="58" width="50" height="2.5" className="fill-slate-900 dark:fill-slate-100" />
        
        {/* Lower stripes in red (Y from 60 to 95) */}
        <rect x="105" y="63" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="68" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="73" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="78" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="83" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="88" width="50" height="2.5" fill="#dc2626" />
        <rect x="105" y="93" width="50" height="2.5" fill="#dc2626" />
      </g>

      {/* 3. Bold P Letterform */}
      <path 
        d="M 15 35 L 45 35 C 56 35, 63 41, 63 51 C 63 61, 56 67, 45 67 L 29 67 L 29 95 L 15 95 Z M 29 46 L 29 56 L 43 56 C 46 56, 49 54, 49 51 C 49 48, 46 46, 43 46 Z" 
        className="fill-slate-900 dark:fill-slate-100" 
        fillRule="evenodd"
      />

      {/* 4. Bold W Letterform */}
      <path 
        d="M 52 35 L 65 35 L 73 74 L 81 35 L 94 35 L 102 74 L 110 35 L 123 35 L 110 95 L 96 95 L 87 56 L 78 95 L 64 95 Z" 
        fill="#dc2626" 
      />

      {/* 5. Heartbeat Pulsewave (re-routing across the P) */}
      {/* Outer Glow/Border for high contrast separation */}
      <path 
        d="M 2 60 L 17 60 L 21 46 L 24 74 L 28 35 L 32 83 L 36 52 L 39 66 L 42 60 L 58 60" 
        fill="none" 
        stroke="currentColor" 
        className="text-white dark:text-gray-950" 
        strokeWidth="6.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Active Red Stroke */}
      <path 
        d="M 2 60 L 17 60 L 21 46 L 24 74 L 28 35 L 32 83 L 36 52 L 39 66 L 42 60 L 58 60" 
        fill="none" 
        stroke="#dc2626" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={`w-10 h-10 shrink-0 ${className}`} id="logo-icon-only">
        <LogoMark />
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center text-center space-y-4 ${className}`} id="logo-login">
        {/* Beautiful large emblem */}
        <div className="w-24 h-16 shrink-0">
          <LogoMark />
        </div>
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
            PULSE<span className="text-red-600">WIRE</span> <span className="text-slate-500 dark:text-slate-400 font-light">AFRICA</span>
          </h2>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase mt-0.5">A F R I C A</span>
          <div className="flex items-center w-36 my-2">
            <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-800" />
            <div className="h-[1px] flex-1 bg-red-600" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-gray-400 italic font-medium tracking-wide">
            Connecting Africa to the World&apos;s Stories.
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col space-y-3 ${className}`} id="logo-full">
        <div className="flex items-center space-x-3.5">
          <div className="w-14 h-10 shrink-0">
            <LogoMark />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white font-sans leading-none">
              PULSE<span className="text-red-600">WIRE</span>
            </h3>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 tracking-[0.25em] uppercase font-sans mt-1">
              AFRICA
            </span>
          </div>
        </div>
        <div className="flex items-center w-full max-w-[200px]">
          <div className="h-[1px] flex-1 bg-slate-300 dark:bg-slate-800" />
          <div className="h-[1px] flex-1 bg-red-600" />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-gray-400 italic">
          Connecting Africa to the World&apos;s Stories.
        </p>
      </div>
    );
  }

  // Header default variant: Horizontal layout optimized for the top navigation bar
  return (
    <div className={`flex items-center space-x-3 cursor-pointer ${className}`} id="logo-header">
      {/* Emblem graphic */}
      <div className="w-11 h-9 sm:w-12 sm:h-10 shrink-0">
        <LogoMark />
      </div>
      
      {/* Lettering and Tagline */}
      <div className="flex flex-col justify-center">
        <span className="text-lg sm:text-xl font-black tracking-tighter text-slate-900 dark:text-white font-sans flex items-center leading-none">
          PULSE<span className="text-red-600">WIRE</span><span className="text-slate-400 dark:text-slate-500 font-normal text-sm sm:text-base ml-1 tracking-wider">AFRICA</span>
        </span>
        <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tracking-wide mt-0.5 whitespace-nowrap">
          Connecting Africa to the World&apos;s Stories
        </span>
      </div>
    </div>
  );
}
