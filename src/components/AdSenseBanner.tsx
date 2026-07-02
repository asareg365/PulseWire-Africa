import React, { useEffect, useState } from 'react';
import { AdPlacement } from '../types';
import { getActiveAds, logAdImpression, logAdClick } from '../lib/db';
import { DollarSign, ExternalLink, X, Info, Sparkles } from 'lucide-react';

interface AdSenseBannerProps {
  type: 'banner' | 'sidebar' | 'in-article' | 'sticky';
  contextTitle?: string;
  contextCategory?: string;
  contextTags?: string[];
}

interface AIAd {
  title: string;
  advertiser: string;
  description: string;
  link: string;
  ctaText: string;
  imageUrl: string;
  themeColor: string;
}

function getFallbackAd(type: string, category?: string): AIAd {
  const normCategory = (category || '').toLowerCase();
  
  if (normCategory.includes('tech') || normCategory.includes('startups') || normCategory.includes('digital') || normCategory.includes('software')) {
    return {
      title: 'Accept Payments Anywhere on Earth',
      advertiser: 'Paystack Africa',
      description: 'Modern, secure payment APIs designed for startups, small businesses, and enterprise platforms across Nigeria, Ghana, and Kenya.',
      link: 'https://paystack.com',
      ctaText: 'Get Started',
      imageUrl: '/logo-wide.svg',
      themeColor: 'sky'
    };
  } else if (normCategory.includes('sport') || normCategory.includes('football')) {
    return {
      title: 'Premium Sportswear & Training Kits',
      advertiser: 'Puma West Africa',
      description: 'Step up your speed and agility on the field with Puma premium running gear and custom athletic sportswear.',
      link: 'https://puma.com',
      ctaText: 'Shop Now',
      imageUrl: '/logo-wide.svg',
      themeColor: 'amber'
    };
  } else if (normCategory.includes('lifestyle') || normCategory.includes('entertainment') || normCategory.includes('travel')) {
    return {
      title: 'Fly Accra to London with Virgin',
      advertiser: 'Virgin Atlantic',
      description: 'Experience ultra-premium economy seats, luxury pre-flight lounges, and top-tier hospitality on daily direct flights.',
      link: 'https://virginatlantic.com',
      ctaText: 'Book Flight',
      imageUrl: '/logo-wide.svg',
      themeColor: 'rose'
    };
  }
  
  // Default general fallback
  return {
    title: 'Premium Financial Solutions for Africa',
    advertiser: 'Standard Chartered Africa',
    description: 'Grow and secure your wealth with our tailored wealth management and checking accounts across West Africa.',
    link: 'https://sc.com/africa',
    ctaText: 'Learn More',
    imageUrl: '/logo-wide.svg',
    themeColor: 'emerald'
  };
}

export default function AdSenseBanner({ type, contextTitle, contextCategory, contextTags }: AdSenseBannerProps) {
  const [dbAd, setDbAd] = useState<AdPlacement | null>(null);
  const [aiAd, setAiAd] = useState<AIAd | null>(null);
  const [loading, setLoading] = useState(false);
  const [impressionLogged, setImpressionLogged] = useState(false);
  
  // Disclosure popover state ("Why this ad?")
  const [showInfo, setShowInfo] = useState(false);

  // Scroll and dismiss states for sticky bottom ads
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    async function loadAdSlot() {
      setLoading(true);
      try {
        const ads = await getActiveAds();
        // Filter by slot type
        const matches = ads.filter(a => a.type === type);
        
        if (matches.length > 0) {
          // Use DB ad if active campaign matches exist
          const selected = matches[Math.floor(Math.random() * matches.length)];
          setDbAd(selected);
          setAiAd(null);
          setLoading(false);
        } else {
          // If no active campaign matches, load dynamic AI-generated contextual ad!
          setDbAd(null);
          try {
            const response = await fetch('/api/ai/campaigns/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: contextTitle || '',
                category: contextCategory || '',
                tags: contextTags || [],
                type
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              setAiAd(data);
            } else {
              console.warn('Utilizing fallback dynamic ad');
              setAiAd(getFallbackAd(type, contextCategory));
            }
          } catch (fetchErr) {
            console.warn('Generation blocked or network error, using fallback');
            setAiAd(getFallbackAd(type, contextCategory));
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load ad slot, utilizing fallback:', err);
        setAiAd(getFallbackAd(type, contextCategory));
        setLoading(false);
      }
    }
    loadAdSlot();
    setImpressionLogged(false);
  }, [type, contextTitle, contextCategory, contextTags]);

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
    if (dbAd && !impressionLogged) {
      logAdImpression(dbAd.id)
        .then(() => setImpressionLogged(true))
        .catch(err => console.error('Error logging ad impression:', err));
    }
  }, [dbAd, impressionLogged]);

  const handleClick = async () => {
    if (dbAd) {
      try {
        await logAdClick(dbAd.id);
      } catch (err) {
        console.error('Error logging ad click:', err);
      }
    }
  };

  if (isDismissed) return null;

  // Theme color mapping to tailwind css
  const getThemeColors = (colorName: string) => {
    const defaultColor = {
      border: 'border-slate-200 dark:border-slate-800',
      bg: 'bg-slate-50/50 dark:bg-slate-900/20',
      badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      btn: 'bg-slate-900 text-white hover:bg-slate-800'
    };

    const colors: Record<string, typeof defaultColor> = {
      emerald: {
        border: 'border-emerald-200 dark:border-emerald-900/50',
        bg: 'bg-emerald-50/30 dark:bg-emerald-950/10',
        badge: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400',
        btn: 'bg-emerald-700 hover:bg-emerald-800 text-white'
      },
      sky: {
        border: 'border-sky-200 dark:border-sky-900/50',
        bg: 'bg-sky-50/30 dark:bg-sky-950/10',
        badge: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-400',
        btn: 'bg-sky-700 hover:bg-sky-800 text-white'
      },
      indigo: {
        border: 'border-indigo-200 dark:border-indigo-900/50',
        bg: 'bg-indigo-50/30 dark:bg-indigo-950/10',
        badge: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-400',
        btn: 'bg-indigo-700 hover:bg-indigo-800 text-white'
      },
      amber: {
        border: 'border-amber-200 dark:border-amber-900/50',
        bg: 'bg-amber-50/30 dark:bg-amber-950/10',
        badge: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400',
        btn: 'bg-amber-700 hover:bg-amber-800 text-white'
      },
      rose: {
        border: 'border-rose-200 dark:border-rose-900/50',
        bg: 'bg-rose-50/30 dark:bg-rose-950/10',
        badge: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-400',
        btn: 'bg-rose-700 hover:bg-rose-800 text-white'
      },
      teal: {
        border: 'border-teal-200 dark:border-teal-900/50',
        bg: 'bg-teal-50/30 dark:bg-teal-950/10',
        badge: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-400',
        btn: 'bg-teal-700 hover:bg-teal-800 text-white'
      }
    };

    return colors[colorName?.toLowerCase()] || defaultColor;
  };

  const adTheme = aiAd ? getThemeColors(aiAd.themeColor) : getThemeColors('slate');

  // Loading skeleton state
  if (loading) {
    return (
      <div className={`w-full overflow-hidden border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-950 animate-pulse ${
        type === 'sidebar' ? 'min-h-[250px]' : 'min-h-[100px]'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
          <div className="h-3 w-12 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-28 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const currentAd = dbAd || aiAd;

  // Sticky footer custom view
  if (type === 'sticky') {
    return (
      <div 
        id="sticky-ads-spot"
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-sm bg-slate-950/95 dark:bg-slate-950/95 text-white border border-slate-800 rounded-xl shadow-2xl p-2.5 flex items-center gap-3 backdrop-blur-md transition-all duration-500 ease-out transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'
        }`}
      >
        {currentAd ? (
          <a 
            href={currentAd.link} 
            target="_blank" 
            rel="noopener noreferrer nofollow"
            onClick={handleClick}
            className="flex-1 flex items-center gap-3 group min-w-0"
            id="sticky-ad-link"
          >
            <img 
              src={currentAd.imageUrl} 
              alt={currentAd.title} 
              referrerPolicy="no-referrer"
              className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0 animate-fade-in" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[8px] border px-1 py-0.2 rounded font-bold uppercase font-mono tracking-wider shrink-0 ${
                  aiAd ? 'bg-amber-500/20 text-amber-300 border-amber-900/50' : 'bg-red-600/25 text-red-400 border-red-900/50'
                }`}>
                  {aiAd ? 'AI Match' : 'Ad'}
                </span>
                <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                  {currentAd.title}
                </h4>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {(currentAd as any).description || 'Unlock premium partner benefits today.'}
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
                href="mailto:ads@pulsewireafrica.news"
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

  return (
    <div 
      id={`ad-${type}`}
      className={`w-full overflow-hidden border rounded-2xl p-4 transition-all duration-300 relative ${adTheme.border} ${adTheme.bg} ${
        type === 'sidebar' ? 'flex flex-col space-y-3' : 'my-6 shadow-sm'
      }`}
    >
      {/* Header Tag Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          {aiAd ? (
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          ) : (
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          )}
          {aiAd ? 'AI Personalized Match' : 'Sponsored Spotlight'}
        </span>
        <div className="flex items-center gap-1.5 relative">
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            title="Ad choices"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide font-mono ${adTheme.badge}`}>
            {aiAd ? 'AI Sponsor' : 'Ad'}
          </span>

          {/* Ad Choices Disclosure tooltip */}
          {showInfo && (
            <div className="absolute right-0 top-6 z-30 w-52 p-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl text-[10px] font-sans text-gray-600 dark:text-gray-400 leading-relaxed font-normal normal-case tracking-normal">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Dynamic Ads
                </span>
                <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {aiAd ? (
                "Matched instantly based on page content, topic categories, and context using Gemini 2.5-flash-lite."
              ) : (
                "This sponsor ad is distributed and monitored by PulseWire Ad campaigns service."
              )}
            </div>
          )}
        </div>
      </div>

      {currentAd ? (
        type === 'sidebar' ? (
          /* Sidebar Layout (Vertical Stack) */
          <div className="space-y-3">
            <a 
              href={currentAd.link} 
              target="_blank" 
              rel="noopener noreferrer nofollow"
              onClick={handleClick}
              className="group block overflow-hidden rounded-xl border border-gray-100 dark:border-gray-900 relative shadow-sm"
            >
              <div className="relative overflow-hidden aspect-[4/3] bg-gray-100 dark:bg-gray-900">
                <img 
                  src={currentAd.imageUrl} 
                  alt={currentAd.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
            </a>
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase font-mono block">
                {(currentAd as any).advertiser || 'Sponsored'}
              </span>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight font-sans">
                {currentAd.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                {(currentAd as any).description || 'Explore premium sponsored products, services, and exclusive promotions custom tailored for you.'}
              </p>
              <a 
                href={currentAd.link} 
                target="_blank" 
                rel="noopener noreferrer nofollow"
                onClick={handleClick}
                className={`w-full text-center py-2 px-3 rounded-lg text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-1 transition-colors ${adTheme.btn}`}
              >
                {(currentAd as any).ctaText || 'Learn More'} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Banner Layout (Horizontal Split) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <a 
              href={currentAd.link} 
              target="_blank" 
              rel="noopener noreferrer nofollow"
              onClick={handleClick}
              className="group block overflow-hidden rounded-xl md:col-span-5 relative shadow-sm aspect-[16/10] md:aspect-auto h-full max-h-40 min-h-[110px]"
            >
              <img 
                src={currentAd.imageUrl} 
                alt={currentAd.title} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 absolute inset-0" 
              />
            </a>
            <div className="md:col-span-7 space-y-1.5 p-1">
              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase font-mono block">
                {(currentAd as any).advertiser || 'Sponsored Partner'}
              </span>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {currentAd.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {(currentAd as any).description || 'Highly recommended partner services tailored exactly to what you are currently viewing on PulseWire.'}
              </p>
              <div className="pt-1">
                <a 
                  href={currentAd.link} 
                  target="_blank" 
                  rel="noopener noreferrer nofollow"
                  onClick={handleClick}
                  className={`inline-flex items-center gap-1 text-xs font-bold font-mono tracking-wider py-1.5 px-3 rounded-lg transition-colors ${adTheme.btn}`}
                >
                  {(currentAd as any).ctaText || 'Explore Offer'} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Final fallback card if no ad is available at all */
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-lg py-8 px-4 text-center min-h-[150px]">
          <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">AdSense Network slot</span>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 max-w-xs leading-relaxed font-sans">
            Ready to advertise with PulseWire? Target your brand to over 2.5M weekly readers in West Africa.
          </p>
          <a 
            href="mailto:ads@pulsewireafrica.news"
            className="mt-3 text-xs text-red-600 font-bold hover:underline inline-flex items-center gap-1"
          >
            Contact Media Bureau <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
