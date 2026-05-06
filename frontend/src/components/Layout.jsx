import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2, Mail, MessageSquare, TrendingUp, Users, ScanLine,
  Plug, Settings, Archive, ShieldCheck,
} from 'lucide-react';
import { supabase, apiFetch } from '../lib/supabase';

function SoonBadge({ dim }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none bg-amber-500/20 text-amber-600">
      Soon
    </span>
  );
}

export default function Layout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => apiFetch('/leads'),
    staleTime: 30_000,
  });

  const { data: profile } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch('/users/me'),
    staleTime: 60_000,
  });

  const fullName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userName = fullName.split(' ')[0];
  const userInitial = userName[0]?.toUpperCase() ?? '?';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
    ${isActive
      ? 'nav-active font-medium'
      : 'text-text-secondary hover:text-text-primary hover:bg-dim/5'
    }`;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface">

        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <img src="/logo-white.png" alt="REW AI" className="h-7 w-auto logo-white" />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">

          {/* WORK */}
          <div>
            <p className="text-[10px] font-semibold text-muted tracking-widest px-3 mb-1.5">WORK</p>
            <div className="space-y-0.5">
              <NavLink to="/dashboard" className={linkClass}>
                <BarChart2 size={16} />
                <span className="flex-1">Pipeline</span>
                {leads.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none bg-accent text-bg">
                    {leads.length}
                  </span>
                )}
              </NavLink>
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary cursor-not-allowed"
              >
                <Mail size={16} />
                <span className="flex-1 text-left">Campaigns</span>
                <SoonBadge />
              </button>
              <NavLink to="/conversations" className={linkClass}>
                <MessageSquare size={16} />
                <span className="flex-1">Conversations</span>
              </NavLink>
              <NavLink to="/archive" className={linkClass}>
                <Archive size={16} />
                <span className="flex-1">Archive</span>
              </NavLink>
            </div>
          </div>

          {/* INTEL */}
          <div>
            <p className="text-[10px] font-semibold text-muted tracking-widest px-3 mb-1.5">INTEL</p>
            <div className="space-y-0.5">
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary cursor-not-allowed"
              >
                <TrendingUp size={16} />
                <span className="flex-1 text-left">Analytics</span>
                <SoonBadge />
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary cursor-not-allowed"
              >
                <Users size={16} />
                <span className="flex-1 text-left">Buyers</span>
                <SoonBadge />
              </button>
              <button
                disabled
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted/50 cursor-not-allowed"
              >
                <ScanLine size={16} />
                <span className="flex-1 text-left">Deal Analyzer</span>
                <SoonBadge dim />
              </button>
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            <p className="text-[10px] font-semibold text-muted tracking-widest px-3 mb-1.5">SYSTEM</p>
            <div className="space-y-0.5">
              <NavLink to="/integrations" className={linkClass}>
                <Plug size={16} />
                <span className="flex-1">Integrations</span>
              </NavLink>
              {profile?.is_admin && (
                <NavLink to="/admin" className={linkClass}>
                  <ShieldCheck size={16} />
                  <span className="flex-1">Admin</span>
                </NavLink>
              )}
            </div>
          </div>

        </nav>

        {/* Bottom pinned */}
        <div className="px-3 pt-3 pb-4 border-t border-border space-y-0.5">
          <NavLink to="/settings" className={linkClass}>
            <Settings size={16} />
            Settings
          </NavLink>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="text-bg font-bold text-sm leading-none">{userInitial}</span>
            </div>
            <div className="min-w-0">
              <p className="sidebar-username text-sm font-medium text-text-primary truncate leading-tight">{userName}</p>
              <p className="text-[11px] text-muted">Starter plan</p>
            </div>
          </div>
        </div>

      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
