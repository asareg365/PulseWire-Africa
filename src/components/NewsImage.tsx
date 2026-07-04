import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../lib/imageUtils';
import { Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatioClass?: string; // e.g. "aspect-[16/9]"
  caption?: string;
  allowZoom?: boolean;
}

export default function NewsImage({
  src,
  alt,
  className = '',
  aspectRatioClass = 'aspect-[16/9]',
  caption,
  allowZoom = true,
}: NewsImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get optimized URLs for different contexts
  const blurSrc = getOptimizedImageUrl(src, { width: 80, quality: 30, fit: 'crop' }) || null;
  const displaySrc = getOptimizedImageUrl(src, { width: 1200, quality: 85 }) || null;
  const zoomSrc = getOptimizedImageUrl(src, { width: 2000, quality: 90 }) || null;

  return (
    <div className={`space-y-2 ${className}`} id={`news-image-container-${Math.random().toString(36).substr(2, 9)}`}>
      {/* Primary Image Display Box */}
      <div 
        className={`relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-slate-100 dark:bg-slate-950 group/img shadow-sm ${aspectRatioClass}`}
      >
        {/* 1. Low-res blurred ambient backdrop to fill empty space for non-16:9 ratios */}
        {blurSrc && (
          <img
            src={blurSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-110 opacity-40 dark:opacity-20 pointer-events-none select-none z-0"
          />
        )}

        {/* 2. Main High-resolution Image - Centered and set to contain so it never crops */}
        {displaySrc && (
          <img
            src={displaySrc}
            alt={alt}
            referrerPolicy="no-referrer"
            onLoad={() => setImageLoaded(true)}
            className={`relative w-full h-full object-contain z-10 transition-all duration-500 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          />
        )}

        {/* 3. Smooth Shimmer skeleton before image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-shimmer z-20" />
        )}

        {/* 4. Action Zoom Button (Lightbox trigger) */}
        {allowZoom && imageLoaded && (
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute bottom-3 right-3 z-20 p-2 bg-slate-900/80 hover:bg-emerald-700 text-white rounded-xl shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-md"
            title="Expand coverage image"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Caption description */}
      {caption && (
        <p className="text-[11px] text-slate-500 dark:text-gray-400 font-sans italic text-center px-4 leading-relaxed">
          {caption}
        </p>
      )}

      {/* Full-screen Lightbox Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 bg-slate-950/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-lg animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          {/* Top Info Bar */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-50 bg-gradient-to-b from-black/60 to-transparent">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-300">
              PulseWire Africa Media Coverage
            </span>
            <button 
              onClick={() => setIsZoomed(false)}
              className="p-2 bg-white/10 hover:bg-red-600 rounded-full transition-colors text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main Large Image Container */}
          <div 
            className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {zoomSrc && (
              <img
                src={zoomSrc}
                alt={alt}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
              />
            )}
          </div>

          {/* Bottom Caption Bar */}
          <div className="absolute bottom-6 inset-x-0 px-6 text-center max-w-3xl mx-auto z-50">
            <p className="text-sm font-sans font-medium text-white leading-relaxed">
              {alt}
            </p>
            {caption && (
              <p className="text-xs text-slate-400 mt-1 italic font-sans">
                {caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-900" id="article-photo-gallery">
      <div className="flex items-center space-x-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white font-mono">
          Field Coverage & Media Gallery ({images.length})
        </h3>
      </div>

      {/* Grid of extra images */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((imgUrl, idx) => {
          const thumbnail = getOptimizedImageUrl(imgUrl, { width: 500, quality: 80, fit: 'crop' }) || null;
          return (
            <div 
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-slate-50 dark:bg-slate-950 cursor-pointer group/gal shadow-sm hover:shadow-md transition-all duration-300"
            >
              {thumbnail && (
                <img 
                  src={thumbnail} 
                  alt={`${title} - Gallery image ${idx + 1}`} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform group-hover/gal:scale-105 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/gal:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-3 py-1.5 bg-slate-900/90 text-white text-[10px] font-bold font-mono uppercase tracking-widest rounded-lg flex items-center gap-1.5">
                  <Maximize2 className="h-3 w-3" /> View Photo
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Lightbox Slider */}
      {activeIdx !== null && (
        <div 
          className="fixed inset-0 bg-slate-950/98 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setActiveIdx(null)}
        >
          {/* Top Nav */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between text-white z-50">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              Media {activeIdx + 1} of {images.length}
            </span>
            <button 
              onClick={() => setActiveIdx(null)}
              className="p-2 bg-white/10 hover:bg-red-600 rounded-full text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Slider controls */}
          <div className="relative max-w-5xl max-h-[80vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {images.length > 1 && (
              <button 
                onClick={() => setActiveIdx((activeIdx - 1 + images.length) % images.length)}
                className="absolute left-2 md:-left-16 p-3 bg-white/10 hover:bg-emerald-700 rounded-full text-white transition-colors backdrop-blur-sm z-50"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {images[activeIdx] && (
              <img
                src={getOptimizedImageUrl(images[activeIdx], { width: 1800, quality: 90 }) || null}
                alt={`${title} - Large view`}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/5"
              />
            )}

            {images.length > 1 && (
              <button 
                onClick={() => setActiveIdx((activeIdx + 1) % images.length)}
                className="absolute right-2 md:-right-16 p-3 bg-white/10 hover:bg-emerald-700 rounded-full text-white transition-colors backdrop-blur-sm z-50"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Footer title */}
          <div className="absolute bottom-6 text-center text-slate-300 font-sans text-xs px-6">
            {title} &mdash; Supplementary Field Media
          </div>
        </div>
      )}
    </div>
  );
}
