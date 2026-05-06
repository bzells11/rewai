import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart2, MessageSquare, Activity, DollarSign, TrendingUp, Shield, ArrowLeft } from 'lucide-react';
import AdminUsers      from '../components/admin/AdminUsers';
import AdminLeads      from '../components/admin/AdminLeads';
import AdminCampaigns  from '../components/admin/AdminCampaigns';
import AdminSmsLogs    from '../components/admin/AdminSmsLogs';
import AdminBilling    from '../components/admin/AdminBilling';
import AdminAnalytics  from '../components/admin/AdminAnalytics';
import AdminHealth     from '../components/admin/AdminHealth';

const SECTIONS = [
  { key: 'users',     label: 'Users',         icon: Users,          component: AdminUsers },
  { key: 'leads',     label: 'Leads',         icon: BarChart2,      component: AdminLeads },
  { key: 'campaigns', label: 'Campaigns',     icon: MessageSquare,  component: AdminCampaigns },
  { key: 'sms',       label: 'SMS Logs',      icon: Activity,       component: AdminSmsLogs },
  { key: 'billing',   label: 'Billing',       icon: DollarSign,     component: AdminBilling },
  { key: 'analytics', label: 'Analytics',     icon: TrendingUp,     component: AdminAnalytics },
  { key: 'health',    label: 'System Health', icon: Shield,         component: AdminHealth },
];

export default function Admin() {
  const [active, setActive] = useState('users');
  const navigate = useNavigate();
  const ActiveComponent = SECTIONS.find(s => s.key === active)?.component;

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-border bg-surface">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[10px] font-bold text-accent tracking-widest uppercase">REW AI Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                ${active === key
                  ? 'nav-active font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dim/5'
                }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-3 border-t border-border">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-dim/5 transition-all"
          >
            <ArrowLeft size={15} />
            Back to App
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}
