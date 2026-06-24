import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Parties from './pages/Parties';
import JobCards from './pages/JobCards';
import Settings from './pages/Settings';
import PartyLedger from './pages/PartyLedger';
import Login from './pages/Login';
import { useEffect, useState } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="parties" element={<Parties />} />
              <Route path="jobcards" element={<JobCards />} />
              <Route path="settings" element={<Settings />} />
              <Route path="ledger/:partyId" element={<PartyLedger />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </StoreProvider>
  );
}

