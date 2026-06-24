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
        return { ...INITIAL_STATE, ...parsed };
      }
      return INITIAL_STATE;
    } catch (e) {
      return INITIAL_STATE;
    }
  });

  // Load preferences and save to localStorage
  useEffect(() => {
    localStorage.setItem('jobwork_db', JSON.stringify(state));
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  // Real-time sync from Firestore
  useEffect(() => {
    let isSubscribed = true;
    let unsubParties: (() => void) | undefined;
    let unsubJobCards: (() => void) | undefined;
    let unsubPayments: (() => void) | undefined;

    const handleSnapshot = <T extends { id: string }>(
      collectionName: string, 
      key: keyof AppState,
      sortFn?: (a: T, b: T) => number
    ) => {
      const q = query(collection(db, collectionName), where("userId", "==", auth.currentUser?.uid));
      return onSnapshot(q, (snapshot) => {
        if (!isSubscribed) return;
        const items = snapshot.docs.map(doc => doc.data() as T);
        if (sortFn) items.sort(sortFn);
        
        // Only update state if we received data, or if we already have data from firebase
        // This prevents overwriting local storage with empty arrays if firebase fails to load
        setState(s => {
          // If firebase returned nothing, but we have local data, keep local data for now
          // unless the user explicitly deleted everything.
          if (items.length === 0 && (s[key] as any[]).length > 0) {
            return s; // Keep existing data
          }
          return { ...s, [key]: items };
        });
      }, (error) => {
        console.error(`Firebase error for ${collectionName}:`, error);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubParties = handleSnapshot<Party>('parties', 'parties');
        unsubJobCards = handleSnapshot<JobCard>('jobCards', 'jobCards', (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        unsubPayments = handleSnapshot<Payment>('payments', 'payments', (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
