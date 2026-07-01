import React from 'react';
import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  className?: string;
}

export default function ThemeToggle({ darkMode, setDarkMode, className = '' }: ThemeToggleProps) {
  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border border-slate-200 dark:border-slate-800/90 bg-slate-100 dark:bg-slate-900/90 p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:border-slate-300 dark:hover:border-slate-700/80 select-none items-center shadow-inner ${className}`}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      id="theme-toggle-switch"
    >
      {/* Background Icons */}
      <div className="flex w-full justify-between px-1 text-slate-400 dark:text-slate-500 z-0">
        <Sun className={`h-3.5 w-3.5 transition-colors duration-200 ${!darkMode ? 'text-amber-500' : ''}`} />
        <Moon className={`h-3.5 w-3.5 transition-colors duration-200 ${darkMode ? 'text-emerald-400' : ''}`} />
      </div>

      {/* Animated Sliding Circle */}
      <motion.div
        className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/40 dark:border-slate-700/50 z-10"
        layout
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
        animate={{
          x: darkMode ? '32px' : '0px',
        }}
      >
        {darkMode ? (
          <Moon className="h-3 w-3 text-emerald-400 fill-emerald-400/10 shrink-0" />
        ) : (
          <Sun className="h-3 w-3 text-amber-500 fill-amber-500/10 shrink-0" />
        )}
      </motion.div>
    </button>
  );
}
