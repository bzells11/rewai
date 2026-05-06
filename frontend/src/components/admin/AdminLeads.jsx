import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function AdminLeads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-leads', page, search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 25 });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      return apiFetch(`/admin/leads?${p}`);
    },
    keepPreviousData: true,
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-lead', selected],
    queryFn: () => apiFetch(`/admin/leads/${selected}`),
    enabled: !!selected,
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 25);

  return (
    <div className="flex h-full">
      <div className={`flex flex-col flex-1 overflow-hidden ${selected ? 'border-r border-border' : ''}`}>
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-text-primary">All Leads</h2>
            <span className="text-xs text-muted">{total} total</span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or phone..."
                className="w-full bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50">
              <option value="">All statuses</option>
              {['cold','active','warm','hot','handed_off','dead'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
                  {['Lead', 'Phone', 'Status', 'User', 'Last Contact', 'AI'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map(l => (
                  <tr key={l.id} onClick={() => setSelected(l.id)}
                    className={`cursor-pointer hover:bg-dim/3 transition-colors ${selected === l.id ? 'bg-accent/5' : ''}`}>
                    <td className="px-5 py-3 text-text-primary font-medium">{l.name}</td>
                    <td className="px-5 py-3 text-text-secondary text-xs font-mono">{l.phone}</td>
                    <td className="px-5 py-3">
                      <span className={`status-${l.status} text-[10px] font-medium px-2 py-0.5 rounded-full`}>{l.status}</span>
                    </td>
                    <td className="px-5 py-3 text-muted text-xs">{l.users?.name || l.users?.email || '—'}</td>
                    <td className="px-5 py-3 text-muted text-xs">
                      {l.last_contact_at ? new Date(l.last_contact_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{l.ai_enabled ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="flex items-center gap-1 text-xs text-muted hover:text-text-primary disabled:opacity-40 transition-colors">
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-muted">Page {page} of {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="flex items-center gap-1 text-xs text-muted hover:text-text-primary disabled:opacity-40 transition-colors">
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {selected && detail && (
        <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-text-primary">Conversation History</h3>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-text-primary transition-colors"><X size={16} /></button>
          </div>
          <div className="px-6 py-3 border-b border-border">
            <p className="font-medium text-text-primary">{detail.name}</p>
            <p className="text-xs text-muted">{detail.phone} · {detail.users?.email}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {(detail.conversations || []).map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed
                  ${msg.direction === 'outbound' ? 'bg-accent text-bg rounded-br-sm' : 'glass rounded-bl-sm text-text-primary'}`}>
                  {msg.body}
                  <div className="mt-1 opacity-60 text-[10px]">
                    {new Date(msg.sent_at).toLocaleTimeString()} {msg.ai_generated ? '· AI' : ''}
                  </div>
                </div>
              </div>
            ))}
            {!detail.conversations?.length && (
              <p className="text-center text-muted text-xs py-6">No messages yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
