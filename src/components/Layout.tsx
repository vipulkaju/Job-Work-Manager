import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Users, FileText, Settings as SettingsIcon, Package } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../i18n';
import { cn } from '../lib/utils';

export default function Layout() {
  const { state } = useStore();
  const t = translations[state.language];

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-slate-200 transition-colors duration-300 font-sans overflow-hidden">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#12141a]">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 dark:border-white/10 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">JobWork Pro</span>
        </div>
        
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          <SidebarItem to="/" icon={<Home className="h-5 w-5" />} label={t.dashboard} />
          <SidebarItem to="/parties" icon={<Users className="h-5 w-5" />} label={t.parties} />
          <SidebarItem to="/jobcards" icon={<FileText className="h-5 w-5" />} label={t.jobCards} />
        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-white/10">
          <SidebarItem to="/settings" icon={<SettingsIcon className="h-5 w-5" />} label={t.settings} />
        </div>
      </aside>

      {/* Mobile-first layout wrapper (Fallback for small screens) / Main Content Area (Desktop) */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 bg-slate-50/50 dark:bg-black/50">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom Navigation (Mobile Only) */}
        <nav className="md:hidden absolute bottom-0 left-0 right-0 flex h-20 items-center justify-around border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl px-4 pb-safe z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
          <NavItem to="/" icon={<Home className="h-6 w-6" />} label={t.dashboard} />
          <NavItem to="/parties" icon={<Users className="h-6 w-6" />} label={t.parties} />
          <NavItem to="/jobcards" icon={
            <div className="-mt-8 flex h-14 w-14 items-center justify-center rounded-2xl border-4 border-white dark:border-[#09090b] bg-emerald-500 shadow-xl shadow-emerald-500/30 text-white transition-transform hover:scale-105 active:scale-95">
              <FileText className="h-6 w-6" />
            </div>
          } label={t.jobCards} isFab />
          <NavItem to="/settings" icon={<SettingsIcon className="h-6 w-6" />} label={t.settings} />
        </nav>
      </div>
    </div>
  );
}

function SidebarItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

function NavItem({ to, icon, label, isFab }: { to: string; icon: React.ReactNode; label: string; isFab?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 p-2 text-[10px] font-semibold tracking-wide transition-all',
          isFab ? '' : isActive
            ? 'text-emerald-500 dark:text-emerald-400'
            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        )
      }
    >
      {icon}
      <span className={isFab ? "mt-1 text-emerald-500 dark:text-emerald-400 font-bold" : ""}>{label}</span>
    </NavLink>
  );
}
