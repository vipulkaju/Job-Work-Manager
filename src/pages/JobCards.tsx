import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Share2, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../i18n';
import { v4 as uuidv4 } from 'uuid';
import { JobCard, JobCardStatus } from '../types';
import { cn } from '../lib/utils';
import { getJobCardPaymentStatuses } from '../lib/payment-utils';

export default function JobCards() {
  const { state, addJobCard, updateJobCard, deleteJobCard } = useStore();
  const t = translations[state.language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<JobCard | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredCards = state.jobCards.filter(c => 
    c.cardNumber.toLowerCase().includes(search.toLowerCase()) || 
    c.designName.toLowerCase().includes(search.toLowerCase())
  );

  const paymentStatuses = useMemo(() => getJobCardPaymentStatuses(state.jobCards, state.payments || [], state.parties), [state.jobCards, state.payments, state.parties]);

  const handleEdit = (card: JobCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteJobCard(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const cycleStatus = (card: JobCard) => {
    const statuses: JobCardStatus[] = ['Pending', 'In Process', 'Completed'];
    const currentIndex = statuses.indexOf(card.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    updateJobCard({ ...card, status: nextStatus });
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-black/80 pb-4 backdrop-blur-xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">{t.jobCards}</h1>
          <button
            onClick={handleAddNew}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border-none bg-white dark:bg-[#12141a] py-3 pl-10 pr-4 shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="flex-1">
        {filteredCards.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-slate-400 font-medium">
            {t.noData}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredCards.map(card => {
              const party = state.parties.find(p => p.id === card.partyId);
              const partyName = party?.name || 'Unknown Party';
              const pStatus = paymentStatuses.get(card.id);
              
              return (
                <div key={card.id} className="rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs mb-1 tracking-wider">#{card.cardNumber}</h3>
                      <p className="text-base font-display font-bold text-slate-900 dark:text-white leading-tight">{partyName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center gap-1 bg-slate-50 dark:bg-white/5 rounded-full p-1 border border-slate-100 dark:border-white/5">
                        <button onClick={() => handleEdit(card)} className="rounded-full p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(card.id)} className="rounded-full p-1.5 text-red-500 dark:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <a 
                        href={`https://wa.me/?text=${encodeURIComponent(`*Job Card*: ${card.cardNumber}\n*Party*: ${partyName}\n*Design*: ${card.designName}\n*Qty*: ${card.quantity}\n*Amount*: ₹${card.amount}\n*Status*: ${card.status}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm"
                      >
                        <Share2 className="h-4 w-4" />
                      </a>
                      <button 
                        onClick={() => cycleStatus(card)}
                        className={cn(
                          "rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:shadow-md active:scale-95 transition-all duration-300",
                          card.status === 'Completed' ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20" :
                          card.status === 'In Process' ? "bg-amber-500 text-white border-amber-600 shadow-amber-500/20" :
                          "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/5"
                        )}
                      >
                        {card.status === 'Pending' ? t.pending : card.status === 'In Process' ? t.inProcess : t.completed}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-5 grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">{t.designName}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{card.designName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">{t.quality}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{card.quality || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">{t.quantity}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{card.quantity}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">{t.amount}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900 dark:text-white">₹{card.amount}</span>
                        {pStatus && pStatus.status !== 'Unpaid' && (
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                            pStatus.status === 'Paid' ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-500"
                          )}>
                            {pStatus.status === 'Paid' ? t.paid : `${t.partial} (₹${pStatus.due})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <JobCardModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={(c) => editingCard ? updateJobCard(c) : addJobCard(c)} 
          initialCard={editingCard}
          t={t} 
          parties={state.parties} 
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c2128] p-6 shadow-2xl border border-slate-200 dark:border-white/5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.delete}?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t.deleteConfirm}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                {t.cancel}
              </button>
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobCardModal({ onClose, onSave, initialCard, t, parties }: { onClose: () => void, onSave: (c: JobCard) => void, initialCard: JobCard | null, t: any, parties: any[] }) {
  const { state } = useStore();
  const [formData, setFormData] = useState({
    partyId: initialCard?.partyId || (parties.length > 0 ? parties[0].id : ''),
    designName: initialCard?.designName || '', 
    quality: initialCard?.quality || '', 
    quantity: initialCard?.quantity?.toString() || '', 
    rate: initialCard?.rate?.toString() || '', 
    date: initialCard?.date || new Date().toISOString().split('T')[0],
    status: initialCard?.status || 'Pending'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partyId || !formData.designName) return;
    
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const baseAmount = qty * rate;
    let finalAmount = baseAmount;
    
    const selectedParty = parties.find(p => p.id === formData.partyId);
    if (selectedParty) {
      if (selectedParty.discount) {
        finalAmount -= (baseAmount * selectedParty.discount / 100);
      }
      if (selectedParty.dalali) {
        finalAmount -= (baseAmount * selectedParty.dalali / 100);
      }
    }
    
    let nextCardNumber = initialCard?.cardNumber;
    if (!nextCardNumber) {
      // Auto-increment logic
      const maxNumber = state.jobCards.reduce((max, card) => {
        const num = parseInt(card.cardNumber, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      nextCardNumber = (maxNumber + 1).toString();
    }
    
    onSave({
      id: initialCard?.id || uuidv4(),
      cardNumber: nextCardNumber,
      date: formData.date,
      partyId: formData.partyId,
      designName: formData.designName,
      quality: formData.quality,
      quantity: qty,
      rate: rate,
      amount: baseAmount,
      deliveryDate: initialCard?.deliveryDate || '',
      status: formData.status as any,
      createdAt: initialCard?.createdAt || new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-[#1c2128] p-6 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5">
        <div className="mb-6 flex items-center justify-between text-slate-900 dark:text-white">
          <h2 className="text-xl font-bold">{initialCard ? t.editJobCard : t.addJobCard}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.name} (Party)</label>
            <select required value={formData.partyId} onChange={e => setFormData(s => ({ ...s, partyId: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0">
              <option value="" className="dark:bg-[#1c2128]">Select Party</option>
              {parties.map(p => <option key={p.id} value={p.id} className="dark:bg-[#1c2128]">{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.designName}</label>
            <input required type="text" value={formData.designName} onChange={e => setFormData(s => ({ ...s, designName: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.quality}</label>
              <input type="text" value={formData.quality} onChange={e => setFormData(s => ({ ...s, quality: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData(s => ({ ...s, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0 dark:[color-scheme:dark]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.quantity}</label>
              <input required type="number" step="0.01" value={formData.quantity} onChange={e => setFormData(s => ({ ...s, quantity: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.rate}</label>
              <input required type="number" step="0.01" value={formData.rate} onChange={e => setFormData(s => ({ ...s, rate: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
          </div>
          {initialCard && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.status}</label>
              <select value={formData.status} onChange={e => setFormData(s => ({ ...s, status: e.target.value as any }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0">
                <option value="Pending" className="dark:bg-[#1c2128]">{t.pending}</option>
                <option value="In Process" className="dark:bg-[#1c2128]">{t.inProcess}</option>
                <option value="Completed" className="dark:bg-[#1c2128]">{t.completed}</option>
              </select>
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={!formData.partyId || !formData.designName.trim()} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
