import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, Settings, LogOut, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Pipeline' },
  { to: '/import', icon: Upload, label: 'Import Leads' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-surface">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Zap size={14} className="text-bg" fill="currentColor" />
            </div>
            <span className="font-display font-semibold text-text-primary tracking-tight">REW AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                ${isActive
                  ? 'bg-accent-dim text-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
