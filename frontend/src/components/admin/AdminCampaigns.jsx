import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { Pause, Flag } from 'lucide-react';

export default function AdminCampaigns() {
  const qc = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => apiFetch('/admin/campaigns'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...body }) => apiFetch(`/admin/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries(['admin-campaigns']),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-5 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-text-primary">Campaigns</h2>
          <span className="text-xs text-muted">{campaigns.length} total</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface border-b border-border">
              <tr>
                {['Campaign', 'User', 'Leads', 'Messages', 'Created', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-dim/3 transition-colors">
                  <td className="px-6 py-3 text-text-primary font-medium">{c.name}</td>
                  <td className="px-6 py-3 text-muted text-xs">{c.users?.name || c.users?.email || '—'}</td>
                  <td className="px-6 py-3 text-text-secondary">{c.leads_count}</td>
                  <td className="px-6 py-3 text-text-secondary">{c.messages_count}</td>
                  <td className="px-6 py-3 text-muted text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    {c.flagged
                      ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Flagged</span>
                      : c.active === false
                        ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dim/10 text-muted">Paused</span>
                        : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Active</span>
                    }
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => update.mutate({ id: c.id, active: c.active === false })}
                        className="p-1.5 rounded-lg hover:bg-dim/5 text-muted hover:text-text-primary transition-colors" title="Toggle pause">
                        <Pause size={13} />
                      </button>
                      <button onClick={() => update.mutate({ id: c.id, flagged: !c.flagged })}
                        className={`p-1.5 rounded-lg transition-colors ${c.flagged ? 'text-red-400 bg-red-400/10' : 'text-muted hover:text-red-400 hover:bg-dim/5'}`} title="Flag">
                        <Flag size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
