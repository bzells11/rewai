import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/supabase';
import LeadCard from '../components/LeadCard';
import { Flame, TrendingUp, Users, Activity } from 'lucide-react';

const COLUMNS = [
  { key: 'cold', label: 'Cold' },
  { key: 'active', label: 'Active' },
  { key: 'warm', label: 'Warm' },
  { key: 'hot', label: 'Hot' },
  { key: 'handed_off', label: 'Handed Off' },
];

export default function Dashboard() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => apiFetch('/leads'),
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch('/users/me/stats'),
    refetchInterval: 60_000,
  });

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = leads.filter(l => l.status === col.key);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border">
        <h1 className="font-display font-bold text-2xl text-text-primary mb-5">Lead Pipeline</h1>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Total Leads', value: stats?.total ?? leads.length, color: 'text-text-secondary' },
            { icon: Activity, label: 'Response Rate', value: stats ? `${stats.response_rate}%` : '—', color: 'text-accent' },
            { icon: TrendingUp, label: 'Warm', value: stats?.warm ?? 0, color: 'text-amber-400' },
            { icon: Flame, label: 'Hot Leads', value: stats?.hot ?? 0, color: 'text-red-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 text-muted text-xs mb-2">
                <Icon size={13} />
                {label}
              </div>
              <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-5 h-full min-w-max">
            {COLUMNS.map(col => (
              <div key={col.key} className="w-72 flex flex-col">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-display font-semibold text-sm text-text-primary">{col.label}</span>
                  <span className="text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {byStatus[col.key]?.length ?? 0}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {byStatus[col.key]?.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border h-24 flex items-center justify-center">
                      <span className="text-xs text-muted">Empty</span>
                    </div>
                  )}
                  {byStatus[col.key]?.map(lead => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
