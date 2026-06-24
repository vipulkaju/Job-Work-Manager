import React from 'react';
import { useStore } from '../store';
import { translations } from '../i18n';
import { Users, FileText, IndianRupee, Truck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { state } = useStore();
  const t = translations[state.language];

  const { totalParties, totalJobCards, pendingDispatch, outstanding } = React.useMemo(() => {
    const totalParties = state.parties.length;
    const totalJobCards = state.jobCards.length;
    const pendingDispatch = state.jobCards.filter(c => c.status === 'Completed').length;
    const totalBilled = state.jobCards.reduce((acc, card) => {
      const party = state.parties.find(p => p.id === card.partyId);
      const discountAmt = Math.floor(card.amount * (party?.discount || 0) / 100);
      const dalaliAmt = Math.floor(card.amount * (party?.dalali || 0) / 100);
      return acc + (card.amount - discountAmt - dalaliAmt);
    }, 0);
    const totalPaid = (state.payments || []).reduce((acc, pay) => acc + pay.amount + (pay.discount || 0), 0);
    const outstanding = totalBilled - totalPaid;

    return { totalParties, totalJobCards, pendingDispatch, outstanding };
  }, [state.parties, state.jobCards, state.payments]);

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 font-sans pb-24">
      {/* Header */}
      <div className="pt-6 pb-2">
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
          {t.dashboard}
        </h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
          {t.todayWork} - <span className="text-slate-700 dark:text-slate-300">{new Date().toLocaleDateString(state.language === 'gu' ? 'gu-IN' : 'en-IN')}</span>
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-slate-500" />}
          label={t.totalParties}
          value={totalParties}
          className="bg-white dark:bg-[#12141a] border-slate-200 dark:border-white/10 shadow-sm"
          valueClass="text-slate-900 dark:text-white font-display"
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-slate-500" />}
          label={t.totalJobCards}
          value={totalJobCards}
          className="bg-white dark:bg-[#12141a] border-slate-200 dark:border-white/10 shadow-sm"
          valueClass="text-slate-900 dark:text-white font-display"
        />
        <StatCard
          icon={<Truck className="h-5 w-5 text-amber-500" />}
          label={t.pendingDispatch}
          value={pendingDispatch}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/50 shadow-sm"
          valueClass="text-amber-700 dark:text-amber-500 font-display"
          labelClass="text-amber-800/70 dark:text-amber-500/70"
          badge={<div className="mt-2 inline-block rounded-md bg-amber-500/10 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 dark:text-amber-400 uppercase">Action Needed</div>}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          label={t.outstandingAmount}
          value={`₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-900/50 shadow-sm"
          valueClass="text-emerald-700 dark:text-emerald-400 font-display"
          labelClass="text-emerald-800/70 dark:text-emerald-500/70"
        />
      </div>

      {/* Recent Activity or Chart Placeholder */}
      <div className="mt-4 rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-6 shadow-sm">
        <h2 className="mb-6 text-center text-lg font-display font-bold text-slate-900 dark:text-white">{t.monthlyStats}</h2>
        <div className="flex h-32 max-w-md mx-auto items-end justify-center gap-4 px-2">
          {/* Mockup Chart bars */}
          {[40, 65, 55, 90, 45, 30, 60, 75].map((height, i) => (
            <div
              key={i}
              className={cn(
                "group relative flex-1 cursor-pointer rounded-t-md transition-all duration-300 hover:opacity-100",
                height === 90 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-slate-100 dark:bg-white/5 hover:bg-emerald-400/50 dark:hover:bg-emerald-500/30"
              )}
              style={{ height: `${height}%` }}
            >
              {height === 90 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-500 dark:text-emerald-400">Peak</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, className, valueClass, labelClass, badge }: { icon: React.ReactNode; label: string; value: string | number; className?: string; valueClass?: string; labelClass?: string; badge?: React.ReactNode }) {
  return (
    <div className={cn("group relative overflow-hidden rounded-3xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5", className)}>
      <div className="mb-3 inline-flex rounded-xl bg-white/50 dark:bg-white/5 p-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        {icon}
      </div>
      <p className={cn("mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", labelClass)}>{label}</p>
      <h3 className={cn("text-2xl font-bold tracking-tight", valueClass)}>{value}</h3>
      {badge}
    </div>
  );
}
