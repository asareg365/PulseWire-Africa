import React, { useEffect, useState } from 'react';
import { Article } from '../types';
import { getAllArticles } from '../lib/db';
import { Zap, Clock } from 'lucide-react';

interface BreakingTickerProps {
  navigate: (path: string) => void;
}

export default function BreakingTicker({ navigate }: BreakingTickerProps) {
  const [tickerArticles, setTickerArticles] = useState<Article[]>([]);

  useEffect(() => {
    async function loadTicker() {
      try {
        const articles = await getAllArticles();
        // Take the top 4 latest stories
        setTickerArticles(articles.slice(0, 4));
      } catch (err) {
        console.error('Failed to load breaking ticker:', err);
      }
    }
    loadTicker();
  }, []);

  if (tickerArticles.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 text-white h-10 border-y border-slate-800 flex items-center overflow-hidden text-xs sm:text-sm font-sans font-medium select-none">
      {/* "BREAKING" Badge */}
      <div className="bg-red-600 text-white h-full px-4 flex items-center font-black text-[10px] uppercase tracking-widest gap-1.5 shrink-0 z-10 shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
        <Zap className="h-3.5 w-3.5 fill-white shrink-0" />
        Breaking
      </div>

      {/* Rolling Items Container */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center bg-slate-900">
        <div className="flex items-center space-x-12 animate-marquee whitespace-nowrap hover:pause-animation">
          {tickerArticles.map((art, idx) => (
            <div 
              key={art.id} 
              onClick={() => navigate(`/article/${art.slug}`)}
              className="flex items-center space-x-2 cursor-pointer hover:text-emerald-400 transition-colors py-1"
            >
              <span className="text-emerald-400 mx-1 font-bold">●</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase">
                {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).join(' & ')}
              </span>
              <span className="text-slate-200 hover:underline hover:text-white font-medium">
                {art.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-normal flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(art.publishedAt || art.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {/* Duplicate for infinite loop effect */}
          {tickerArticles.map((art, idx) => (
            <div 
              key={`${art.id}-dup`} 
              onClick={() => navigate(`/article/${art.slug}`)}
              className="flex items-center space-x-2 cursor-pointer hover:text-emerald-400 transition-colors py-1"
            >
              <span className="text-emerald-400 mx-1 font-bold">●</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase">
                {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).join(' & ')}
              </span>
              <span className="text-slate-200 hover:underline hover:text-white font-medium">
                {art.title}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-normal flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(art.publishedAt || art.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 25s linear infinite;
        }
        .hover\\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
