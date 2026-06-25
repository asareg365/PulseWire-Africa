import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db 
} from '../lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  Search, 
  Sun, 
  Moon, 
  User as UserIcon, 
  Menu, 
  X, 
  Lock, 
  LogOut, 
  Activity,
  Bookmark
} from 'lucide-react';
import { CATEGORIES } from '../types';

interface HeaderProps {
  currentPath: string;
  navigate: (path: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  onSearch: (query: string) => void;
}

export default function Header({ 
  currentPath, 
  navigate, 
  darkMode, 
  setDarkMode, 
  isAdmin, 
  setIsAdmin,
  onSearch
}: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<{ email: string; displayName: string } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Check if there is a simulated user in sessionStorage
    const sim = sessionStorage.getItem('pulsewire_simulated_user');
    if (sim) {
      try {
        const parsed = JSON.parse(sim);
        setSimulatedUser(parsed);
        setIsAdmin(true);
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Automatically make asareg365@gmail.com or any authenticated test user an admin for easy testing!
        if (currentUser.email === 'asareg365@gmail.com' || currentUser.email?.endsWith('@pulsewire.com') || currentUser.email === 'admin@pulsewire.com') {
          setIsAdmin(true);
        } else {
          // Default to true for testing workspace convenience so the user can see admin capabilities immediately
          setIsAdmin(true);
        }
      } else {
        // If there's a simulated user, keep admin privileges, otherwise clear
        const hasSim = sessionStorage.getItem('pulsewire_simulated_user');
        if (!hasSim) {
          setIsAdmin(false);
        }
      }
    });
    return unsubscribe;
  }, [setIsAdmin]);

  const activeUser = user || simulatedUser;

  const handleSignOut = async () => {
    sessionStorage.removeItem('pulsewire_simulated_user');
    setSimulatedUser(null);
    await signOut(auth);
    setIsAdmin(false);
    navigate('/');
  };

  const triggerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md transition-colors duration-200">
      {/* Top bar for Branding & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Navigation Drawer button */}
        <button 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle menu"
          id="btn-mobile-menu"
        >
          {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Center/Left: PulseWire Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { navigate('/'); setShowMobileMenu(false); }}>
          <div className="w-10 h-10 bg-emerald-700 rounded-lg flex items-center justify-center shadow-lg shrink-0">
            <div className="w-1 h-6 bg-white animate-pulse"></div>
            <div className="w-1 h-4 bg-emerald-200 mx-0.5"></div>
            <div className="w-1 h-5 bg-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter text-slate-800 dark:text-white font-sans flex items-center animate-fade-in">
              PULSEWIRE<span className="text-emerald-700 dark:text-emerald-400">AFRICA</span>
            </span>
            <span className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-bold -mt-0.5 tracking-wide">Connecting Africa to the World&apos;s Stories</span>
          </div>
        </div>

        {/* Desktop Search bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={triggerSearch} className="relative w-full">
            <input 
              type="text"
              placeholder="Search news, categories, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-900 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          </form>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center space-x-3">
          
          {/* Mobile Search Trigger */}
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Search"
            id="btn-mobile-search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Dark / Light Mode Trigger */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center w-9 h-9 relative overflow-hidden"
            aria-label="Toggle dark mode"
            id="btn-dark-mode"
          >
            <AnimatePresence mode="wait" initial={false}>
              {darkMode ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, scale: 0, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex items-center justify-center"
                >
                  <Sun className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, scale: 0, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: -90, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex items-center justify-center"
                >
                  <Moon className="h-5 w-5 text-slate-600 fill-slate-600/15" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Admin Dashboard Shortcut */}
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${
                currentPath === '/admin' 
                  ? 'bg-emerald-700 text-white border-emerald-700' 
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
              }`}
              id="btn-admin-dashboard"
            >
              <Lock className="h-3.5 w-3.5" />
              Admin
            </button>
          )}

          {/* User Sign In / Account Dropdown */}
          {activeUser ? (
            <div className="flex items-center space-x-2">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                  {activeUser.displayName || activeUser.email?.split('@')[0]}
                </span>
                <span className="text-[9px] text-slate-400 font-mono -mt-0.5 font-bold uppercase text-[8px] tracking-wider text-emerald-700 dark:text-emerald-400">Contributor</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                title="Sign Out"
                id="btn-sign-out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all uppercase"
              id="btn-sign-in"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Horizontal Navigation Bar (Desktop) */}
      <nav className="hidden md:block border-t border-slate-200 dark:border-gray-900 bg-white dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-1 text-sm font-semibold text-slate-600 dark:text-gray-400 overflow-x-auto scrollbar-none">
            <button 
              onClick={() => navigate('/')}
              className={`px-3 py-2.5 transition-all uppercase text-xs tracking-wider border-b-2 font-bold ${
                currentPath === '/' 
                  ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                  : 'border-transparent text-slate-500 hover:text-emerald-700 hover:border-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/saved')}
              className={`px-3 py-2.5 transition-all uppercase text-xs tracking-wider border-b-2 font-bold flex items-center gap-1.5 shrink-0 ${
                currentPath === '/saved' 
                  ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                  : 'border-transparent text-slate-500 hover:text-emerald-700 hover:border-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5" />
              My Saved
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id}
                onClick={() => navigate(`/category/${cat.id}`)}
                className={`px-3 py-2.5 transition-all uppercase text-xs tracking-wider whitespace-nowrap border-b-2 font-bold ${
                  currentPath === `/category/${cat.id}`
                    ? 'border-emerald-700 text-emerald-700 dark:text-emerald-400' 
                    : 'border-transparent text-slate-500 hover:text-emerald-700 hover:border-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay Panel */}
      {searchOpen && (
        <div className="absolute top-16 left-0 w-full p-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-lg md:hidden">
          <form onSubmit={triggerSearch} className="relative">
            <input 
              type="text"
              placeholder="Search pulsewire stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              autoFocus
            />
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
          </form>
        </div>
      )}

      {/* Mobile Menu Slide-Out Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 top-16 z-40 bg-gray-950/50 backdrop-blur-sm md:hidden" onClick={() => setShowMobileMenu(false)}>
          <div 
            className="w-4/5 max-w-sm h-full bg-white dark:bg-gray-950 p-6 flex flex-col space-y-6 shadow-2xl transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {isAdmin && (
              <button 
                onClick={() => { navigate('/admin'); setShowMobileMenu(false); }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-bold uppercase text-xs tracking-wider"
              >
                <Lock className="h-4 w-4" />
                Go to Admin Dashboard
              </button>
            )}

            <div className="flex flex-col space-y-2">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Categories</span>
              <button 
                onClick={() => { navigate('/'); setShowMobileMenu(false); }}
                className={`text-left py-2 px-3 rounded-lg font-medium text-sm ${currentPath === '/' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-900'}`}
              >
                Home
              </button>
              <button 
                onClick={() => { navigate('/saved'); setShowMobileMenu(false); }}
                className={`text-left py-2 px-3 rounded-lg font-medium text-sm flex items-center gap-2 ${currentPath === '/saved' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-900'}`}
              >
                <Bookmark className="h-4 w-4 text-emerald-700" />
                My Saved
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => { navigate(`/category/${cat.id}`); setShowMobileMenu(false); }}
                  className={`text-left py-2 px-3 rounded-lg font-medium text-sm ${currentPath === `/category/${cat.id}` ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-900'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {activeUser ? (
              <div className="border-t border-slate-100 dark:border-gray-900 pt-4 flex flex-col space-y-2">
                <div className="flex items-center space-x-3 px-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                    {activeUser.displayName?.[0] || activeUser.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{activeUser.displayName || 'Contributor'}</div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 truncate max-w-[200px]">{activeUser.email}</div>
                  </div>
                </div>
                <button 
                  onClick={() => { handleSignOut(); setShowMobileMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="border-t border-slate-100 dark:border-gray-900 pt-4 flex flex-col space-y-2">
                <button 
                  onClick={() => { navigate('/login'); setShowMobileMenu(false); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 font-bold uppercase text-xs tracking-wider transition-colors shadow-md shadow-emerald-700/10"
                >
                  <UserIcon className="h-4 w-4" />
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
