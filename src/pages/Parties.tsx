import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, FileText, IndianRupee, Download, Share2, X } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../i18n';
import { v4 as uuidv4 } from 'uuid';
import { Party, Payment } from '../types';
import { cn } from '../lib/utils';
import { getJobCardPaymentStatuses } from '../lib/payment-utils';

export default function Parties() {
  const navigate = useNavigate();
  const { state, addParty, updateParty, deleteParty, addPayment } = useStore();
  const t = translations[state.language];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredParties = React.useMemo(() => state.parties.filter(p => {
    return p.name.toLowerCase().includes(search.toLowerCase());
  }), [state.parties, search]);

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingParty(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteParty(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openLedger = (party: Party) => {
    navigate(`/ledger/${party.id}`);
  };

  const openPayment = (party: Party) => {
    setActiveParty(party);
    setIsPaymentOpen(true);
  };

  return (
    <div className="flex flex-col p-4 md:p-8">
      <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-black/80 pb-4 backdrop-blur-xl mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">{t.parties}</h1>
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
        {filteredParties.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            {t.noData}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredParties.map(party => {
              const partyJobCards = state.jobCards.filter(c => c.partyId === party.id && c.status === 'Completed');
              const partyPayments = (state.payments || []).filter(p => p.partyId === party.id);
              const totalBilled = partyJobCards.reduce((acc, c) => {
                const discountAmt = Math.floor(c.amount * (party.discount || 0) / 100);
                const dalaliAmt = Math.floor(c.amount * (party.dalali || 0) / 100);
                return acc + (c.amount - discountAmt - dalaliAmt);
              }, 0);
              const totalPaid = partyPayments.reduce((acc, p) => acc + p.amount + (p.discount || 0), 0);
              const balance = totalBilled - totalPaid;

              return (
              <div key={party.id} className="rounded-[1.5rem] border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 shadow-sm dark:shadow-none transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => openLedger(party)}>
                    <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white leading-tight mb-1">{party.name}</h3>
                    <div className="mt-2 flex flex-col gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                      <p className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider opacity-70">Mobile</span> {party.mobile || '-'}</p>
                      <p className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider opacity-70">City</span> {party.address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <span className={cn("text-lg font-display font-bold px-3 py-1 rounded-xl", balance > 0 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border border-amber-200/50 dark:border-amber-500/20" : balance < 0 ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 border border-emerald-200/50 dark:border-emerald-500/20" : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/10")}>
                      ₹{Math.abs(balance).toFixed(2)} <span className="text-[10px] tracking-wider uppercase opacity-80">{balance > 0 ? 'Dr' : balance < 0 ? 'Cr' : ''}</span>
                    </span>
                    <div className="flex items-center gap-1 md:opacity-0 transition-opacity duration-300 md:group-hover:opacity-100 bg-slate-50 dark:bg-white/5 rounded-full p-1 border border-slate-100 dark:border-white/5">
                      <button onClick={(e) => { e.stopPropagation(); openPayment(party); }} className="rounded-full bg-emerald-100 dark:bg-emerald-500/20 p-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors shadow-sm" title={t.addPayment}>
                        <IndianRupee className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openLedger(party); }} className="rounded-full bg-blue-100 dark:bg-blue-500/20 p-2 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors shadow-sm" title={t.ledger}>
                        <FileText className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(party); }} className="rounded-full p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(party.id); }} className="rounded-full p-2 text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {isModalOpen && (
        <PartyModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={(p) => editingParty ? updateParty(p) : addParty(p)} 
          initialParty={editingParty}
          t={t} 
        />
      )}

      {isPaymentOpen && activeParty && (
        <PaymentModal
          party={activeParty}
          onClose={() => setIsPaymentOpen(false)}
          onSave={addPayment}
          t={t}
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

function PaymentModal({ party, onClose, onSave, t }: { party: Party, onClose: () => void, onSave: (p: Payment) => void, t: any }) {
  const { state } = useStore();
  const partyJobCards = state.jobCards.filter(c => c.partyId === party.id && c.status === 'Completed').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const statuses = getJobCardPaymentStatuses(state.jobCards, state.payments || [], state.parties);
  
  const unpaidJobCards = partyJobCards.filter(jc => {
    const status = statuses.get(jc.id);
    return status && status.due > 0;
  });

  const [formData, setFormData] = useState({ 
    amount: '', 
    discount: '',
    mode: 'Cash' as 'Cash' | 'UPI' | 'Bank Transfer', 
    date: new Date().toISOString().split('T')[0],
    remark: '',
    jobCardIds: [] as string[]
  });

  const handleJobCardToggle = (jobCardId: string, checked: boolean, dueAmt: number) => {
    setFormData(s => {
      let newIds = s.jobCardIds;
      if (checked) {
        newIds = [...newIds, jobCardId];
      } else {
        newIds = newIds.filter(id => id !== jobCardId);
      }
      
      // Recalculate amount
      let totalDue = 0;
      newIds.forEach(id => {
        const st = statuses.get(id);
        if (st) totalDue += st.due;
      });
      
      return { ...s, jobCardIds: newIds, amount: totalDue > 0 ? totalDue.toString() : '' };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    onSave({
      id: uuidv4(),
      partyId: party.id,
      jobCardIds: formData.jobCardIds.length > 0 ? formData.jobCardIds : undefined,
      amount: parseFloat(formData.amount),
      discount: formData.discount ? parseFloat(formData.discount) : null,
      mode: formData.mode,
      date: formData.date,
      remark: formData.remark,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-[#1c2128] p-6 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5">
        <div className="mb-6 flex items-center justify-between text-slate-900 dark:text-white">
          <div>
            <h2 className="text-xl font-bold">{t.addPayment}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{party.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.selectJobCard}</label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 space-y-1">
              {unpaidJobCards.length === 0 ? (
                <p className="text-sm text-slate-500 p-2">No pending job cards</p>
              ) : (
                unpaidJobCards.map(jc => {
                  const status = statuses.get(jc.id);
                  const due = status ? status.due : jc.amount;
                  return (
                    <label key={jc.id} className="flex items-center gap-3 p-2 hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer rounded-lg transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.jobCardIds.includes(jc.id)} 
                        onChange={(e) => handleJobCardToggle(jc.id, e.target.checked, due)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 dark:border-white/20 dark:bg-[#1c2128]" 
                      />
                      <span className="text-sm font-medium text-slate-900 dark:text-white flex-1">
                        #{jc.cardNumber} - {jc.designName}
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-500">
                        ₹{due.toFixed(2)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.amount}</label>
              <input required autoFocus type="number" step="0.01" value={formData.amount} onChange={e => setFormData(s => ({ ...s, amount: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.discount || 'Kasar'}</label>
              <input type="number" step="0.01" value={formData.discount} onChange={e => setFormData(s => ({ ...s, discount: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.date}</label>
              <input required type="date" value={formData.date} onChange={e => setFormData(s => ({ ...s, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0 dark:[color-scheme:dark]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.mode}</label>
            <select value={formData.mode} onChange={e => setFormData(s => ({ ...s, mode: e.target.value as any }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0">
              <option value="Cash" className="dark:bg-[#1c2128]">{t.cash}</option>
              <option value="UPI" className="dark:bg-[#1c2128]">{t.upi}</option>
              <option value="Bank Transfer" className="dark:bg-[#1c2128]">{t.bank}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.remark}</label>
            <input type="text" value={formData.remark} onChange={e => setFormData(s => ({ ...s, remark: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={!formData.amount} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PartyModal({ onClose, onSave, initialParty, t }: { onClose: () => void, onSave: (p: Party) => void, initialParty: Party | null, t: any }) {
  const [formData, setFormData] = useState({ 
    name: initialParty?.name || '', 
    mobile: initialParty?.mobile || '', 
    address: initialParty?.address || '', 
    gst: initialParty?.gst || '',
    discount: initialParty?.discount || '',
    dalali: initialParty?.dalali || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave({
      id: initialParty?.id || uuidv4(),
      name: formData.name,
      mobile: formData.mobile,
      address: formData.address,
      gst: formData.gst,
      discount: formData.discount ? parseFloat(formData.discount.toString()) : null,
      dalali: formData.dalali ? parseFloat(formData.dalali.toString()) : null,
      createdAt: initialParty?.createdAt || new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-[#1c2128] p-6 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5">
        <div className="mb-6 flex items-center justify-between text-slate-900 dark:text-white">
          <h2 className="text-xl font-bold">{initialParty ? t.editParty : t.addParty}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.name}</label>
            <input required autoFocus type="text" value={formData.name} onChange={e => setFormData(s => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.mobile}</label>
            <input type="tel" value={formData.mobile} onChange={e => setFormData(s => ({ ...s, mobile: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.city}</label>
            <input type="text" value={formData.address} onChange={e => setFormData(s => ({ ...s, address: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.discount}</label>
              <input type="number" step="0.01" value={formData.discount} onChange={e => setFormData(s => ({ ...s, discount: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.dalali}</label>
              <input type="number" step="0.01" value={formData.dalali} onChange={e => setFormData(s => ({ ...s, dalali: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">{t.gst}</label>
            <input type="text" value={formData.gst} onChange={e => setFormData(s => ({ ...s, gst: e.target.value }))} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-3 text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0" />
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              {t.cancel}
            </button>
            <button type="submit" disabled={!formData.name.trim()} className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
