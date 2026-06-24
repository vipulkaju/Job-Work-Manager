import React from 'react';
import { useStore } from '../store';
import { translations } from '../i18n';
import { Moon, Sun, Languages, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { logout } from '../lib/firebase';

export default function Settings() {
  const { state, setTheme, setLanguage } = useStore();
  const t = translations[state.language];

  return (
    <div className="flex flex-col p-6 md:p-8">
      <div className="pb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
          {t.settings}
        </h1>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Theme Settings */}
        <div className="rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Moon className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">{t.theme}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition-all",
                state.theme === 'light'
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <Sun className="h-4 w-4" />
              {t.lightMode}
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border p-3 font-medium transition-all",
                state.theme === 'dark'
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <Moon className="h-4 w-4" />
              {t.darkMode}
            </button>
          </div>
        </div>

        {/* Language Settings */}
        <div className="rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Languages className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">{t.language}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "rounded-xl border p-3 font-medium transition-all",
                state.language === 'en'
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              {t.english}
            </button>
            <button
              onClick={() => setLanguage('gu')}
              className={cn(
                "rounded-xl border p-3 font-medium transition-all",
                state.language === 'gu'
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-500"
                  : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              {t.gujarati}
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div className="rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <LogOut className="h-5 w-5 text-red-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Account</h2>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                try {
                  await logout();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-600 transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-500 dark:hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
