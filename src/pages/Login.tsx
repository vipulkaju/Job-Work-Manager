import React from 'react';
import { Package } from 'lucide-react';
import { loginWithGoogle } from '../lib/firebase';
import { translations } from '../i18n';
import { useStore } from '../store';

export default function Login() {
  const { state } = useStore();
  const t = translations[state.language];

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 font-sans dark:bg-[#09090b]">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white p-8 shadow-2xl shadow-emerald-900/5 transition-all duration-300 dark:border-white/10 dark:bg-[#12141a]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Package className="h-10 w-10" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            JobWork Pro
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            Sign in to manage your parties, job cards, and payments efficiently.
          </p>
        </div>

        <button
          onClick={handleLogin}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:ring-slate-300 active:scale-[0.98] dark:bg-white/5 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/10 dark:hover:ring-white/20"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="tracking-wide">Continue with Google</span>
        </button>
      </div>
    </div>
  );
}
