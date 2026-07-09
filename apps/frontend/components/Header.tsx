'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';

export default function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Initialize theme from storage or system preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Default to dark mode as it is the signature style
      document.documentElement.classList.add('dark');
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 glass-panel border-b border-border/40 flex items-center justify-between px-6 sm:px-8">
      {/* Brand logo & Title */}
      <div className="flex items-center space-x-3 cursor-pointer select-none">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
          <div className="absolute inset-0 rounded-xl border border-white/20" />
        </div>
        <div>
          <span className="font-sans font-extrabold text-base tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
            GrowEasy
          </span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            CRM Importer
          </span>
        </div>
      </div>

      {/* Action Toggle */}
      <button
        onClick={toggleTheme}
        className="relative p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/5 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        aria-label="Toggle light/dark theme"
      >
        <div className="relative w-5 h-5 overflow-hidden">
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 rotate-0 transition-transform duration-500" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-500 rotate-0 transition-transform duration-500" />
          )}
        </div>
      </button>
    </header>
  );
}
