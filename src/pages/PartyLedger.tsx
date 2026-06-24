import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Share2, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../i18n';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { getJobCardPaymentStatuses } from '../lib/payment-utils';

export default function PartyLedger() {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const { state, deletePayment } = useStore();
  const t = translations[state.language];

  const party = state.parties.find(p => p.id === partyId);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid' | 'Partial'>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deletePayment(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const transactions = useMemo(() => {
    if (!party) return [];
    
    let jobCards = state.jobCards.filter(c => c.partyId === party.id);
    let payments = (state.payments || []).filter(p => p.partyId === party.id);

    if (statusFilter !== 'All') {
      const statuses = getJobCardPaymentStatuses(jobCards, payments, state.parties);
      jobCards = jobCards.filter(c => {
        const s = statuses.get(c.id);
        return s && s.status === statusFilter;
      });
      payments = []; // Hide payments when filtering by job card status
    }

    if (fromDate) {
      jobCards = jobCards.filter(c => new Date(c.date) >= new Date(fromDate));
      payments = payments.filter(p => new Date(p.date) >= new Date(fromDate));
    }
    if (toDate) {
      jobCards = jobCards.filter(c => new Date(c.date) <= new Date(toDate));
      payments = payments.filter(p => new Date(p.date) <= new Date(toDate));
    }

    const jcTr = jobCards.map(c => {
      const discountAmt = c.amount * (party.discount || 0) / 100;
      const dalaliAmt = c.amount * (party.dalali || 0) / 100;
      return {
        id: c.id,
        type: 'jobCard' as const,
        date: c.date,
        desc: `Job Card #${c.cardNumber} (${c.designName})`,
        debit: c.amount - discountAmt - dalaliAmt,
        credit: 0,
        timestamp: new Date(c.createdAt).getTime()
      };
    });
    
    const pTr = payments.map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.date,
      desc: `Payment (${p.mode}) ${p.remark ? '- ' + p.remark : ''}${p.discount ? ` [Kasar: ₹${p.discount}]` : ''}`,
      debit: 0,
      credit: p.amount + (p.discount || 0),
      timestamp: new Date(p.createdAt).getTime()
    }));
    
    return [...jcTr, ...pTr].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA === dateB ? a.timestamp - b.timestamp : dateA - dateB;
    });
  }, [state.jobCards, state.payments, party?.id, fromDate, toDate, statusFilter]);

  if (!party) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4">
        <p className="text-slate-500 dark:text-slate-400">Party not found.</p>
        <button onClick={() => navigate('/parties')} className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white">
          Go Back
        </button>
      </div>
    );
  }

  let runningBalance = 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Ledger: ${party.name}`, 14, 15);
    if (fromDate || toDate) {
      doc.setFontSize(10);
      doc.text(`Date: ${fromDate || 'Start'} to ${toDate || 'End'}`, 14, 22);
    }
    
    let bal = 0;
    const tableData = transactions.map(tr => {
      bal += tr.debit - tr.credit;
      return [
        new Date(tr.date).toLocaleDateString(),
        tr.desc,
        tr.debit > 0 ? tr.debit.toString() : '',
        tr.credit > 0 ? tr.credit.toString() : '',
        bal.toString()
      ];
    });

    (doc as any).autoTable({
      startY: fromDate || toDate ? 25 : 20,
      head: [['Date', 'Description', 'Debit', 'Credit', 'Balance']],
      body: tableData,
    });

    doc.save(`${party.name}_ledger.pdf`);
  };

  const exportExcel = () => {
    let bal = 0;
    const data = transactions.map(tr => {
      bal += tr.debit - tr.credit;
      return {
        Date: new Date(tr.date).toLocaleDateString(),
        Description: tr.desc,
        Debit: tr.debit || 0,
        Credit: tr.credit || 0,
        Balance: bal
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `${party.name}_ledger.xlsx`);
  };

  const shareWhatsApp = () => {
    let text = `*Ledger: ${party.name}*\n`;
    if (fromDate || toDate) text += `*Date:* ${fromDate || 'Start'} to ${toDate || 'End'}\n`;
    text += `------------------------\n`;
    let bal = 0;
    transactions.forEach(tr => {
      bal += tr.debit - tr.credit;
      text += `*${new Date(tr.date).toLocaleDateString()}*\n`;
      text += `${tr.desc}\n`;
      if (tr.debit > 0) text += `Debit: ₹${tr.debit}\n`;
      if (tr.credit > 0) text += `Credit: ₹${tr.credit}\n`;
      text += `Balance: ₹${bal}\n\n`;
    });
    text += `*Final Balance: ₹${bal}*`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="flex flex-col p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-50/80 dark:bg-black/80 pb-4 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 mb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="rounded-full p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.partyLedger}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{party.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={exportPDF} title={t.exportPdf} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><Download className="h-5 w-5" /></button>
              <button onClick={exportExcel} title={t.exportExcel} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><FileText className="h-5 w-5" /></button>
              <button onClick={shareWhatsApp} title={t.shareWhatsapp} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><Share2 className="h-5 w-5" /></button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-3 mt-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">{t.fromDate}</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-sm text-slate-900 dark:text-white dark:[color-scheme:dark]" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">{t.toDate}</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-sm text-slate-900 dark:text-white dark:[color-scheme:dark]" />
            </div>
          </div>
          <div className="mt-1">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-sm text-slate-900 dark:text-white focus:border-emerald-500/50 focus:outline-none focus:ring-0"
            >
              <option value="All">{t.all}</option>
              <option value="Paid">{t.paid}</option>
              <option value="Unpaid">{t.unpaid}</option>
              <option value="Partial">{t.partial}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Transactions List */}
      <div className="space-y-4 pb-24 md:pb-8">
        {transactions.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-slate-500 dark:text-slate-400">{t.noData}</div>
        ) : (
          transactions.map(tr => {
            runningBalance += tr.debit - tr.credit;
            return (
              <div key={tr.id} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1c2128] p-3 text-sm shadow-sm dark:shadow-none">
                <div className="mb-2 flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">{new Date(tr.date).toLocaleDateString()}</span>
                  <span className={cn("font-bold", runningBalance > 0 ? "text-amber-600 dark:text-amber-500" : runningBalance < 0 ? "text-emerald-600 dark:text-emerald-500" : "text-slate-500 dark:text-slate-400")}>
                    {t.balance}: ₹{Math.abs(runningBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-slate-900 dark:text-white flex-1">{tr.desc}</p>
                  {tr.type === 'payment' && (
                    <button 
                      onClick={() => setDeleteConfirmId(tr.id)}
                      className="ml-2 rounded-full p-1.5 text-red-500 dark:text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-600 dark:text-amber-400">{tr.debit > 0 ? `${t.debit}: ₹${tr.debit}` : ''}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{tr.credit > 0 ? `${t.credit}: ₹${tr.credit}` : ''}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-t-3xl bg-white dark:bg-[#1c2128] p-6 shadow-2xl sm:rounded-3xl border border-slate-200 dark:border-white/5">
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{t.deleteConfirm || 'Are you sure?'}</h3>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-xl bg-slate-100 dark:bg-white/5 py-3 font-semibold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                {t.cancel || 'Cancel'}
              </button>
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">
                {t.delete || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
