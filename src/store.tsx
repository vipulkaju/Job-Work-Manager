import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, JobCard, Party, Payment } from './types';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const INITIAL_STATE: AppState = {
  language: 'gu',
  theme: 'dark',
  parties: [],
  jobCards: [],
  payments: [],
};

type StoreContextType = {
  state: AppState;
  setLanguage: (lang: 'en' | 'gu') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  addParty: (party: Party) => void;
  updateParty: (party: Party) => void;
  deleteParty: (id: string) => void;
  addJobCard: (card: JobCard) => void;
  updateJobCard: (card: JobCard) => void;
  deleteJobCard: (id: string) => void;
  addPayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('jobwork_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { 
          ...INITIAL_STATE, 
          language: parsed.language || 'gu',
          theme: parsed.theme || 'dark'
        };
      }
      return INITIAL_STATE;
    } catch (e) {
      return INITIAL_STATE;
    }
  });

  // Load preferences and save to localStorage
  useEffect(() => {
    localStorage.setItem('jobwork_db', JSON.stringify({
      language: state.language,
      theme: state.theme
    }));
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.language, state.theme]);

  // Real-time sync from Firestore
  useEffect(() => {
    let isSubscribed = true;
    let unsubParties: (() => void) | undefined;
    let unsubJobCards: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;

    const handleSnapshot = <T extends { id: string }>(
      collectionName: string, 
      key: keyof AppState,
      uid: string,
      sortFn?: (a: T, b: T) => number
    ) => {
      const q = query(collection(db, collectionName), where("userId", "==", uid));
      return onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        const items = snapshot.docs.map(doc => doc.data() as T);
        if (sortFn) items.sort(sortFn);
        
        setState(s => ({ ...s, [key]: items }));
      }, (error) => {
        console.error(`Firebase error for ${collectionName}:`, error);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Migrate old local data if any
        try {
          const saved = localStorage.getItem('jobwork_db');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.parties && parsed.parties.length > 0) {
              const batch = writeBatch(db);
              parsed.parties.forEach((p: any) => batch.set(doc(db, 'parties', p.id), { ...p, userId: user.uid }));
              if (parsed.jobCards) {
                parsed.jobCards.forEach((c: any) => batch.set(doc(db, 'jobCards', c.id), { ...c, userId: user.uid }));
              }
              if (parsed.payments) {
                parsed.payments.forEach((p: any) => batch.set(doc(db, 'payments', p.id), { ...p, userId: user.uid }));
              }
              await batch.commit();
              
              localStorage.setItem('jobwork_db', JSON.stringify({
                language: parsed.language || 'gu',
                theme: parsed.theme || 'dark'
              }));
            }
          }
        } catch (e) {
          console.error('Data migration error', e);
        }

        unsubParties = handleSnapshot<Party>('parties', 'parties', user.uid, (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        unsubJobCards = handleSnapshot<JobCard>('jobCards', 'jobCards', user.uid, (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        unsubPayments = handleSnapshot<Payment>('payments', 'payments', user.uid, (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      } else {
        if (unsubParties) unsubParties();
        if (unsubJobCards) unsubJobCards();
        if (unsubPayments) unsubPayments();
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribeAuth();
      if (unsubParties) unsubParties();
      if (unsubJobCards) unsubJobCards();
      if (unsubPayments) unsubPayments();
    };
  }, []);

  const setLanguage = (language: 'en' | 'gu') => setState(s => ({ ...s, language }));
  const setTheme = (theme: 'dark' | 'light') => setState(s => ({ ...s, theme }));

  const addParty = async (party: Party) => {
    setState(s => ({ ...s, parties: [party, ...s.parties] }));
    try { await setDoc(doc(db, 'parties', party.id), { ...party, userId: auth.currentUser?.uid }); } catch(e) { console.error(e); }
  };

  const updateParty = async (party: Party) => {
    setState(s => ({ ...s, parties: s.parties.map(p => p.id === party.id ? party : p) }));
    try { await setDoc(doc(db, 'parties', party.id), { ...party, userId: auth.currentUser?.uid }); } catch(e) { console.error(e); }
  };

  const deleteParty = async (id: string) => {
    setState(s => ({ 
      ...s, 
      parties: s.parties.filter(p => p.id !== id), 
      jobCards: s.jobCards.filter(c => c.partyId !== id), 
      payments: s.payments.filter(p => p.partyId !== id) 
    }));
    try {
      await deleteDoc(doc(db, 'parties', id));
      state.jobCards.filter(c => c.partyId === id).forEach(c => deleteDoc(doc(db, 'jobCards', c.id)));
      state.payments.filter(p => p.partyId === id).forEach(p => deleteDoc(doc(db, 'payments', p.id)));
    } catch(e) { console.error(e); }
  };

  const addJobCard = async (card: JobCard) => {
    setState(s => ({ ...s, jobCards: [card, ...s.jobCards] }));
    try { await setDoc(doc(db, 'jobCards', card.id), { ...card, userId: auth.currentUser?.uid }); } catch(e) { console.error(e); }
  };

  const updateJobCard = async (card: JobCard) => {
    setState(s => ({ ...s, jobCards: s.jobCards.map(c => c.id === card.id ? card : c) }));
    try { await setDoc(doc(db, 'jobCards', card.id), { ...card, userId: auth.currentUser?.uid }); } catch(e) { console.error(e); }
  };

  const deleteJobCard = async (id: string) => {
    setState(s => ({ ...s, jobCards: s.jobCards.filter(c => c.id !== id) }));
    try { await deleteDoc(doc(db, 'jobCards', id)); } catch(e) { console.error(e); }
  };

  const addPayment = async (payment: Payment) => {
    setState(s => ({ ...s, payments: [payment, ...(s.payments || [])] }));
    try { await setDoc(doc(db, 'payments', payment.id), { ...payment, userId: auth.currentUser?.uid }); } catch(e) { console.error(e); }
  };

  const deletePayment = async (id: string) => {
    setState(s => ({ ...s, payments: (s.payments || []).filter(p => p.id !== id) }));
    try { await deleteDoc(doc(db, 'payments', id)); } catch(e) { console.error(e); }
  };

  return (
    <StoreContext.Provider value={{
      state, setLanguage, setTheme,
      addParty, updateParty, deleteParty,
      addJobCard, updateJobCard, deleteJobCard,
      addPayment, deletePayment
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
