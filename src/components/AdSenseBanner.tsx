import React, { useEffect, useState } from 'react';
import { AdPlacement } from '../types';
import { getActiveAds, logAdImpression, logAdClick } from '../lib/db';
import { DollarSign, ExternalLink, X } from 'lucide-react';

interface AdSenseBannerProps {
  type: 'banner' | 'sidebar' | 'in-article' | 'sticky';
}

export default function AdSenseBanner({ type }: AdSenseBannerProps) {
  const [ad, setAd] = useState<AdPlacement | null>(null);
  const [impressionLogged, setImpressionLogged] = useState(false);
  
  // Scroll and dismiss states for sticky bottom ads
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    async function loadAd() {
      try {
        const ads = await getActiveAds();
        // Filter by slot type
        const matches = ads.filter(a => a.type === type);
        if (matches.length > 0) {
          // Select a random match for variety
          const selected = matches[Math.floor(Math.random() * matches.length)];
          setAd(selected);
        } else {
          setAd(null);
        }
      } catch (err) {
        console.error('Failed to load ad slot:', err);
      }
    }
    loadAd();
    setImpressionLogged(false);
  }, [type]);

  // Scroll detection specifically for sticky ad placement
  useEffect(() => {
    if (type !== 'sticky') return;

    const handleScroll = () => {
      // Show sticky ad after scrolling down 200px
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [type]);

  // Log impression once when ad comes into view or loads
  useEffect(() => {
    if (ad && !impressionLogged) {
      logAdImpression(ad.id)
        .then(() => setImpressionLogged(true))
        .catch(err => console.error('Error logging ad impression:', err));
    }
  }, [ad, impressionLogged]);

  const handleClick = async () => {
    if (ad) {
      try {
        await logAdClick(ad.id);
      } catch (err) {
        console.error('Error logging ad click:', err);
      }
    }
  };

  // Custom rendering for sticky bottom ads (highly compact, fades in on scroll, fully dismissible)
  if (type === 'sticky') {
    if (isDismissed) return null;

    return (
      <div 
        id="sticky-ads-spot"
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-slate-950/95 dark:bg-slate-950/95 text-white border border-slate-800 rounded-xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-md transition-all duration-500 ease-out transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        {ad ? (
          <a 
            href={ad.link} 
            target="_blank" 
            rel="noopener noreferrer nofollow"
            onClick={handleClick}
            className="flex-1 flex items-center gap-3 group min-w-0"
            id="sticky-ad-link"
          >
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] bg-red-600/25 text-red-400 border border-red-900/50 px-1 py-0.2 rounded font-bold uppercase font-mono tracking-wider shrink-0">
                  Ad
                </span>
                <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                  {ad.title}
                </h4>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                Unlock exclusive deals and partner offers today.
              </p>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors shrink-0" />
          </a>
        ) : (
          <div className="flex-1 flex items-center gap-3 min-w-0" id="sticky-ad-fallback">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-800 shrink-0">
              <DollarSign className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-slate-500 font-mono block font-bold">SPONSOR US</span>
              <a 
                href="mailto:ads@pulsewire.com"
                className="text-xs font-bold text-red-400 hover:underline truncate block"
              >
                Advertise with PulseWire
              </a>
            </div>
          </div>
        )}
        
        {/* Dismiss Trigger */}
        <button 
          id="sticky-ad-close"
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss Advertisement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Standard rendering for in-page banner and sidebar ads
  return (
    <div 
      id={`ad-${type}`}
      className={`w-full overflow-hidden transition-colors ${
        type === 'sidebar'
          ? 'border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 flex flex-col space-y-3'
          : 'border border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/30 rounded-xl p-3 my-6'
      }`}
    >
      {/* Tag */}
      <div className="flex items-center justify-between mb-2 text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-emerald-500" />
          Sponsored Spotlight
        </span>
        <span className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-[9px]">Advertisement</span>
      </div>

      {ad ? (
        <a 
          href={ad.link} 
          target="_blank" 
          rel="noopener noreferrer nofollow"
          onClick={handleClick}
          className="group block overflow-hidden rounded-lg"
        >
          <div className="relative overflow-hidden rounded-lg">
            <img 
              src={ad.imageUrl} 
              alt={ad.title} 
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-56 object-cover transform group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="p-3 bg-gray-900 text-white flex items-center justify-between">
              <span className="text-xs font-semibold truncate pr-4">{ad.title}</span>
              <span className="text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold uppercase px-2 py-1 rounded flex items-center gap-1 shrink-0 font-mono">
                Open <ExternalLink className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        </a>
      ) : (
        /* Fallback AdSense placeholder card */
        <div className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-lg py-8 px-4 text-center ${
          type === 'sidebar' ? 'min-h-[250px]' : 'min-h-[100px]'
        }`}>
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Google AdSense Partner Code</span>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 max-w-xs leading-relaxed font-sans">
            Ready to advertise with PulseWire? Target your brand to over 2.5M weekly readers in West Africa.
          </p>
          <a 
            href="mailto:ads@pulsewire.com"
            className="mt-3 text-xs text-red-600 font-bold hover:underline inline-flex items-center gap-1"
          >
            Contact Media Bureau <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
