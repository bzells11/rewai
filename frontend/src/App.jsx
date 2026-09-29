import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { DEMO_MODE } from './lib/demo';
import { ThemeProvider } from './lib/ThemeContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
import Integrations from './pages/Integrations';
import LeadDetail from './pages/LeadDetail';
import Import from './pages/Import';
import Settings from './pages/Settings';
import Archive from './pages/Archive';
import Admin from './pages/Admin';
import AdminGuard from './components/AdminGuard';

export default function App() {
  const [session, setSession] = useState(DEMO_MODE ? { demo: true } : undefined); // undefined = loading

  useEffect(() => {
    if (DEMO_MODE) return;
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={DEMO_MODE ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
        <Route element={session ? <Layout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/import" element={<Import />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/archive" element={<Archive />} />
        </Route>
        {/* Admin — hidden from nav, guarded by is_admin flag */}
        <Route path="/admin" element={
          session
            ? <AdminGuard><Admin /></AdminGuard>
            : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
