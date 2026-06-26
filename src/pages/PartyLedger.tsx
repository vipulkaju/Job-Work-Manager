import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Share2, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { translations } from '../i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    
    let jobCards = state.jobCards.filter(c => c.partyId === party.id && c.status === 'Completed');
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
      const discountAmt = Math.floor(c.amount * (party.discount || 0) / 100);
      const dalaliAmt = Math.floor(c.amount * (party.dalali || 0) / 100);
      
      return {
        id: c.id,
        type: 'jobCard' as const,
        date: c.date,
        jamaDate: c.deliveryDate || '',
        designName: c.designName,
        cardNumber: c.cardNumber,
        quantity: c.quantity,
        shortage: c.shortage || 0,
        rate: c.rate,
        amount: c.amount,
        discountPercent: party.discount || 0,
        discountAmt: discountAmt,
        dalaliPercent: party.dalali || 0,
        dalaliAmt: dalaliAmt,
        debit: c.amount - discountAmt - dalaliAmt,
        credit: 0,
        timestamp: new Date(c.createdAt).getTime()
      };
    });
    
    const pTr = payments.map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.date,
      mode: p.mode,
      remark: p.remark,
      kasar: p.discount || 0,
      amount: p.amount,
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
      let desc = '';
      if (tr.type === 'jobCard') {
        let details = `Qty: ${tr.quantity}`;
        if (tr.shortage) details += `    Sort: ${tr.shortage}`;
        details += `\nRate: ${tr.rate}    Amt: ${tr.amount}`;
        if (tr.discountPercent) details += `\nDiscount: ${tr.discountPercent}% ( ${tr.discountAmt})`;
        if (tr.dalaliPercent) details += `\nDalali: ${tr.dalaliPercent}% ( ${tr.dalaliAmt})`;
        desc = `Job Card #${tr.cardNumber}\n(De.No. ${tr.designName})\nJama Date: ${tr.jamaDate ? new Date(tr.jamaDate).toLocaleDateString() : '-'}\n${details}`;
      } else {
        desc = `Payment (${tr.mode}) ${tr.remark ? '- ' + tr.remark : ''}${tr.kasar ? ` [Kasar: ₹${Number(tr.kasar).toFixed(2)}]` : ''}`;
      }
      return [
        new Date(tr.date).toLocaleDateString(),
        desc,
        tr.debit > 0 ? Number(tr.debit).toFixed(2) : '',
        tr.credit > 0 ? Number(tr.credit).toFixed(2) : '',
        Number(bal).toFixed(2)
      ];
    });

    const totalDebit = transactions.reduce((sum, tr) => sum + (tr.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, tr) => sum + (tr.credit || 0), 0);
    
    tableData.push([
      '',
      'TOTAL',
      Number(totalDebit).toFixed(2),
      Number(totalCredit).toFixed(2),
      Number(bal).toFixed(2)
    ]);

    autoTable(doc, {
      startY: fromDate || toDate ? 25 : 20,
      head: [['Date', 'Description', 'Debit', 'Credit', 'Balance']],
      body: tableData,
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'head' && [2, 3, 4].includes(data.column.index)) {
          data.cell.styles.halign = 'right';
        }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      }
    });

    doc.save(`${party.name}_ledger.pdf`);
  };

  const exportExcel = () => {
    let bal = 0;
    const data = transactions.map(tr => {
      bal += tr.debit - tr.credit;
      let desc = '';
      if (tr.type === 'jobCard') {
        let details = `Qty: ${tr.quantity}`;
        if (tr.shortage) details += `    Sort: ${tr.shortage}`;
        details += `\nRate: ${tr.rate}    Amt: ${tr.amount}`;
        if (tr.discountPercent) details += `\nDiscount: ${tr.discountPercent}% ( ${tr.discountAmt})`;
        if (tr.dalaliPercent) details += `\nDalali: ${tr.dalaliPercent}% ( ${tr.dalaliAmt})`;
        desc = `Job Card #${tr.cardNumber}\n(De.No. ${tr.designName})\nJama Date: ${tr.jamaDate ? new Date(tr.jamaDate).toLocaleDateString() : '-'}\n${details}`;
      } else {
        desc = `Payment (${tr.mode}) ${tr.remark ? '- ' + tr.remark : ''}${tr.kasar ? ` [Kasar: ₹${Number(tr.kasar).toFixed(2)}]` : ''}`;
      }
      return {
        Date: new Date(tr.date).toLocaleDateString(),
        Description: desc,
        Debit: tr.debit || 0,
        Credit: tr.credit || 0,
        Balance: bal
      };
    });

    const totalDebit = transactions.reduce((sum, tr) => sum + (tr.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, tr) => sum + (tr.credit || 0), 0);

    data.push({
      Date: '',
      Description: 'TOTAL',
      Debit: totalDebit,
      Credit: totalCredit,
      Balance: bal
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, // Date
      { wch: 80 }, // Description
      { wch: 12 }, // Debit
      { wch: 12 }, // Credit
      { wch: 15 }, // Balance
    ];
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
      let desc = '';
      if (tr.type === 'jobCard') {
        let details = `Qty: ${tr.quantity}`;
        if (tr.shortage) details += `    Sort: ${tr.shortage}`;
        details += `\nRate: ${tr.rate}    Amt: ${tr.amount}`;
        if (tr.discountPercent) details += `\nDiscount: ${tr.discountPercent}% ( ${tr.discountAmt})`;
        if (tr.dalaliPercent) details += `\nDalali: ${tr.dalaliPercent}% ( ${tr.dalaliAmt})`;
        desc = `Job Card #${tr.cardNumber}\n(De.No. ${tr.designName})\nJama Date: ${tr.jamaDate ? new Date(tr.jamaDate).toLocaleDateString() : '-'}\n${details}`;
      } else {
        desc = `Payment (${tr.mode}) ${tr.remark ? '- ' + tr.remark : ''}${tr.kasar ? ` [Kasar: ₹${Number(tr.kasar).toFixed(2)}]` : ''}`;
      }
      text += `${desc}\n`;
      if (tr.debit > 0) text += `Debit: ₹${Number(tr.debit).toFixed(2)}\n`;
      if (tr.credit > 0) text += `Credit: ₹${Number(tr.credit).toFixed(2)}\n`;
      text += `Balance: ₹${Number(bal).toFixed(2)}\n\n`;
    });
    const totalDebit = transactions.reduce((sum, tr) => sum + (tr.debit || 0), 0);
    const totalCredit = transactions.reduce((sum, tr) => sum + (tr.credit || 0), 0);
    text += `*Total Debit: ₹${Number(totalDebit).toFixed(2)}*\n`;
    text += `*Total Credit: ₹${Number(totalCredit).toFixed(2)}*\n`;
    text += `*Final Balance: ₹${Number(bal).toFixed(2)}*`;
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
      <div className="space-y-4 pb-4 md:pb-8">
        {transactions.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-slate-500 dark:text-slate-400">{t.noData}</div>
        ) : (
          transactions.map(tr => {
            runningBalance += tr.debit - tr.credit;
            return (
              <div key={tr.id} className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-[#12141a] p-4 text-sm shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{new Date(tr.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.balance}</span>
                    <span className={cn("font-bold text-base", runningBalance > 0 ? "text-amber-600 dark:text-amber-500" : runningBalance < 0 ? "text-emerald-600 dark:text-emerald-500" : "text-slate-500 dark:text-slate-400")}>
                      ₹{Math.abs(runningBalance).toFixed(2)}
                    </span>
                  </div>
                </div>

                {tr.type === 'jobCard' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">#{tr.cardNumber} (De.No. {tr.designName})</h4>
                        {tr.jamaDate && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Jama Date: {new Date(tr.jamaDate).toLocaleDateString()}</p>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-2 mt-4 bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex flex-col"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 opacity-70">Qty</span><span className="font-medium text-slate-900 dark:text-white">{tr.quantity}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 opacity-70">Sort</span><span className="font-medium text-red-500 dark:text-red-400">{tr.shortage || 0}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 opacity-70">Rate</span><span className="font-medium text-slate-900 dark:text-white">₹{tr.rate}</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 opacity-70">Discount</span><span className="font-medium text-slate-900 dark:text-white">{tr.discountPercent}% (₹{tr.discountAmt})</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 opacity-70">Dalali</span><span className="font-medium text-slate-900 dark:text-white">{tr.dalaliPercent}% (₹{tr.dalaliAmt})</span></div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Net Pramant</span>
                      <span className="font-bold text-amber-600 dark:text-amber-500 text-lg">₹{Number(tr.debit).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">Payment ({tr.mode})</h4>
                        {tr.remark && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tr.remark}</p>}
                        {tr.kasar > 0 && <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mt-1">Kasar: ₹{tr.kasar}</p>}
                      </div>
                      <button 
                        onClick={() => setDeleteConfirmId(tr.id)}
                        className="rounded-full p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Amount Received</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-500 text-lg">₹{Number(tr.credit).toFixed(2)}</span>
                    </div>
                  </div>
                )}
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
