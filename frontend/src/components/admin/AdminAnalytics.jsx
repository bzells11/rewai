import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { Users, MessageSquare, Flame, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color = 'text-accent' }) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className={`flex items-center gap-1.5 text-xs mb-2 ${color}`}>
        <Icon size={12} />{label}
      </div>
      <p className="font-display font-bold text-2xl text-text-primary">{value ?? '—'}</p>
    </div>
  );
}

function BarChart({ data, label }) {
  const entries = Object.entries(data || {}).slice(-30).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-semibold text-muted mb-4">{label} (last 30 days)</p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted text-center py-6">No data yet</p>
      ) : (
        <div className="flex items-end gap-1 h-24">
          {entries.map(([day, count]) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-accent/30 hover:bg-accent/60 rounded-sm transition-colors cursor-default"
                style={{ height: `${Math.max(4, (count / max) * 88)}px` }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-primary whitespace-nowrap z-10">
                {day}: {count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => apiFetch('/admin/analytics'),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <h2 className="font-display font-bold text-xl text-text-primary mb-6">Platform Analytics</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}        label="Total Users"     value={data?.total_users?.toLocaleString()}    color="text-accent" />
        <StatCard icon={TrendingUp}   label="Total Leads"     value={data?.total_leads?.toLocaleString()}    color="text-blue-400" />
        <StatCard icon={MessageSquare} label="Messages Sent"  value={data?.total_messages?.toLocaleString()} color="text-purple-400" />
        <StatCard icon={Flame}        label="Hot Leads"       value={data?.hot_leads?.toLocaleString()}      color="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart data={data?.messages_by_day} label="Messages Sent Per Day" />
        <BarChart data={data?.users_by_day}    label="New Signups Per Day" />
      </div>
    </div>
  );
}
