import React, { useState } from 'react';
import { subscribeNewsletter } from '../lib/db';
import { Mail, Check, AlertCircle, ArrowRight, Twitter, Facebook, Instagram, Linkedin, Globe } from 'lucide-react';
import { CATEGORIES } from '../types';

interface FooterProps {
  navigate: (path: string) => void;
}

export default function Footer({ navigate }: FooterProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus('idle');
    try {
      await subscribeNewsletter(email.trim());
      setStatus('success');
      setMessage('Thank you! You have successfully subscribed to the PulseWire Africa bulletin.');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage('Failed to subscribe. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-gray-400 border-t border-slate-200 dark:border-gray-900 transition-colors duration-200">
      
      {/* Upper Footer: Newsletter Banner */}
      <div className="border-b border-slate-200 dark:border-gray-900 bg-emerald-50/60 dark:bg-emerald-950/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-xl text-center lg:text-left">
            <h3 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white flex items-center justify-center lg:justify-start gap-2">
              <Mail className="h-6 w-6 text-emerald-600" />
              Subscribe to PulseWire Bulletins
            </h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
              Receive breaking news alerts, weekly editorial deep dives, and expert analysis on politics, business, and tech from across the African continent. No spam. Unsubscribe anytime.
            </p>
          </div>

          <div className="w-full max-w-md">
            <form onSubmit={handleSubscribe} className="relative flex items-center">
              <input 
                type="email" 
                required
                placeholder="Enter your email address" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400 transition-all pr-12"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-1.5 p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center"
                aria-label="Subscribe"
                id="btn-newsletter-subscribe"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </form>

            {status === 'success' && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-semibold flex items-center gap-1.5 leading-relaxed">
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {message}
              </p>
            )}

            {status === 'error' && (
              <p className="text-xs text-red-500 mt-3 font-semibold flex items-center gap-1.5 leading-relaxed">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                {message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        
        {/* Col 1: About */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center shadow-md">
              <div className="w-0.5 h-5 bg-white"></div>
              <div className="w-0.5 h-3.5 bg-emerald-200 mx-0.5"></div>
              <div className="w-0.5 h-4 bg-white"></div>
            </div>
            <span className="text-base font-black tracking-tighter text-slate-800 dark:text-white">PULSEWIRE<span className="text-emerald-700 dark:text-emerald-400">AFRICA</span></span>
          </div>
          <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed font-sans">
            PulseWire Africa &mdash; <strong className="text-emerald-700 dark:text-emerald-400 font-bold">Connecting Africa to the World&apos;s Stories.</strong>
          </p>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
            A premier, high-integrity digital news network reporting investigative stories, corporate business, technology breakthroughs, and sports insights.
          </p>
          <div className="flex items-center space-x-3 text-slate-400 dark:text-gray-500">
            <a href="#" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Twitter className="h-4 w-4" /></a>
            <a href="#" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Facebook className="h-4 w-4" /></a>
            <a href="#" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Instagram className="h-4 w-4" /></a>
            <a href="#" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Linkedin className="h-4 w-4" /></a>
            <a href="#" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"><Globe className="h-4 w-4" /></a>
          </div>
        </div>

        {/* Col 2: Category Quicklinks */}
        <div className="flex flex-col space-y-4">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest font-mono">Editorial Sections</h4>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {CATEGORIES.slice(0, 8).map(cat => (
              <li key={cat.id}>
                <button 
                  onClick={() => navigate(`/category/${cat.id}`)}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-left text-slate-500 dark:text-gray-400 cursor-pointer"
                >
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Legal & Support */}
        <div className="flex flex-col space-y-4">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest font-mono">Corporate Policy</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button 
                onClick={() => navigate('/info/about')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                About Us & Mission
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/contact')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Contact Us
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/privacy')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/terms')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Terms & Conditions
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/editorial')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Editorial Policy
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/fact-check')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Fact Checking Policy
              </button>
            </li>
            <li>
              <button 
                onClick={() => navigate('/info/cookie')}
                className="hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline text-slate-500 dark:text-gray-400 text-left cursor-pointer"
              >
                Cookie Policy
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Contact & Locations */}
        <div className="flex flex-col space-y-4">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest font-mono">HQ - Berekum Branch</h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-sans">
            PulseWire Media Bureau<br />
            ВС-0578-5502 Hno N109<br />
            Nanasuano, Berekum
          </p>
          <div className="text-xs text-slate-500 dark:text-gray-400 space-y-1">
            <p><strong>Hotline:</strong> +233 248472474</p>
            <p><strong>Editorial:</strong> editor@pulsewire.com</p>
            <p><strong>General:</strong> info@pulsewire.com</p>
            <p><strong>Support:</strong> asareg365@gmail.com</p>
          </div>
        </div>
      </div>

      {/* Bottom Data Bar */}
      <div className="border-t border-slate-200 dark:border-gray-950 bg-white dark:bg-gray-950 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> GHS/USD 14.85</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> NGN/USD 1,620</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> BTC/USD 67,432</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] shrink-0 font-sans font-semibold text-slate-400 dark:text-gray-500">
            <span>© 2026 PulseWire Africa all rights reserved</span>
            <span className="hidden md:inline">•</span>
            <div className="flex gap-3">
              <a href="#" className="hover:text-emerald-700">TWITTER</a>
              <a href="#" className="hover:text-emerald-700">INSTAGRAM</a>
              <a href="#" className="hover:text-emerald-700">LINKEDIN</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
