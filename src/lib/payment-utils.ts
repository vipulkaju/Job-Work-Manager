import { JobCard, Payment, Party } from '../types';

export function getJobCardPaymentStatuses(jobCards: JobCard[], payments: Payment[], parties: Party[]) {
  const statuses = new Map<string, { status: 'Paid' | 'Unpaid' | 'Partial', due: number, paid: number }>();
  
  const partyIds = new Set(jobCards.map(jc => jc.partyId));
  for (const partyId of partyIds) {
    const party = parties.find(p => p.id === partyId);
    const discount = party?.discount || 0;
    const dalali = party?.dalali || 0;

    const partyJCs = jobCards.filter(jc => jc.partyId === partyId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const partyPayments = payments.filter(p => p.partyId === partyId);
    
    const jcPaidMap = new Map<string, number>();
    partyJCs.forEach(jc => jcPaidMap.set(jc.id, 0));
    
    let unallocatedPayment = 0;
    
    partyPayments.forEach(p => {
      const payAmt = p.amount + (p.discount || 0);
      if (p.jobCardIds && p.jobCardIds.length > 0) {
        let remainingPayAmt = payAmt;
        for (const jid of p.jobCardIds) {
          if (remainingPayAmt <= 0) break;
          if (jcPaidMap.has(jid)) {
            const jc = partyJCs.find(j => j.id === jid)!;
            const finalAmount = jc.amount - Math.floor(jc.amount * discount / 100) - Math.floor(jc.amount * dalali / 100);
            const currentlyPaid = jcPaidMap.get(jid)!;
            const due = finalAmount - currentlyPaid;
            if (due > 0) {
              const applyAmt = Math.min(due, remainingPayAmt);
              jcPaidMap.set(jid, currentlyPaid + applyAmt);
              remainingPayAmt -= applyAmt;
            }
          }
        }
        unallocatedPayment += remainingPayAmt;
      } else if (p.jobCardId && jcPaidMap.has(p.jobCardId)) {
        jcPaidMap.set(p.jobCardId, jcPaidMap.get(p.jobCardId)! + payAmt);
      } else {
        unallocatedPayment += payAmt;
      }
    });
    
    for (const jc of partyJCs) {
      const finalAmount = jc.amount - Math.floor(jc.amount * discount / 100) - Math.floor(jc.amount * dalali / 100);

      let paidSoFar = jcPaidMap.get(jc.id)!;
      let remainingToPay = finalAmount - paidSoFar;
      
      if (remainingToPay > 0 && unallocatedPayment > 0) {
        const applyAmt = Math.min(remainingToPay, unallocatedPayment);
        paidSoFar += applyAmt;
        unallocatedPayment -= applyAmt;
      }
      
      jcPaidMap.set(jc.id, paidSoFar);
      
      const due = finalAmount - paidSoFar;
      if (due <= 0) {
        statuses.set(jc.id, { status: 'Paid', due: 0, paid: paidSoFar });
      } else if (paidSoFar > 0) {
        statuses.set(jc.id, { status: 'Partial', due, paid: paidSoFar });
      } else {
        statuses.set(jc.id, { status: 'Unpaid', due: finalAmount, paid: 0 });
      }
    }
  }
  
  return statuses;
}
