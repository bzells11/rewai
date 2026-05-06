import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { Search, ChevronLeft, ChevronRight, X, User } from 'lucide-react';

const PLAN_COLORS = {
  starter: 'text-muted bg-dim/5',
  growth:  'text-accent bg-accent/10',
  pro:     'text-amber-400 bg-amber-400/10',
  suspended: 'text-red-400 bg-red-400/10',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, planFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 20 });
      if (search) p.set('search', search);
      if (planFilter) p.set('plan', planFilter);
      return apiFetch(`/admin/users?${p}`);
    },
    keepPreviousData: true,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user', selected],
    queryFn: () => apiFetch(`/admin/users/${selected}`),
    enabled: !!selected,
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...body }) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); qc.invalidateQueries(['admin-user', selected]); },
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 20);

  return (
    <div className="flex h-full">
      {/* Table */}
      <div className={`flex flex-col flex-1 overflow-hidden ${selected ? 'border-r border-border' : ''}`}>
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-text-primary">Users</h2>
            <span className="text-xs text-muted">{total} total</span>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or email..."
                className="w-full bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
              className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50">
              <option value="">All plans</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="suspended">Suspended</option>
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
                  {['Name', 'Email', 'Plan', 'Joined', 'Twilio'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} onClick={() => setSelected(u.id)}
                    className={`cursor-pointer hover:bg-dim/3 transition-colors ${selected === u.id ? 'bg-accent/5' : ''}`}>
                    <td className="px-6 py-3 text-text-primary font-medium">{u.name || '—'}</td>
                    <td className="px-6 py-3 text-text-secondary">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[u.plan] || PLAN_COLORS.starter}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-muted text-xs">{u.twilio_number || '—'}</td>
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

      {/* Detail panel */}
      {selected && (
        <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-text-primary">User Detail</h3>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          </div>
          {detailLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-bg font-bold">{(detail.name || detail.email)[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">{detail.name || '—'}</p>
                  <p className="text-xs text-muted">{detail.email}</p>
                </div>
              </div>

              <div className="glass rounded-xl p-4 space-y-2 text-sm">
                <Row label="Plan" value={detail.plan} />
                <Row label="Company" value={detail.company_name} />
                <Row label="Area" value={detail.buying_area} />
                <Row label="Twilio #" value={detail.twilio_number} />
                <Row label="Joined" value={new Date(detail.created_at).toLocaleDateString()} />
                <Row label="Admin" value={detail.is_admin ? 'Yes' : 'No'} />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-2">Change Plan</p>
                <div className="flex gap-2 flex-wrap">
                  {['starter', 'growth', 'pro', 'suspended'].map(plan => (
                    <button key={plan} onClick={() => updateUser.mutate({ id: detail.id, plan })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize
                        ${detail.plan === plan ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:border-accent/30 hover:bg-dim/5'}`}>
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-2">Leads ({detail.leads?.length || 0})</p>
                <div className="space-y-1.5">
                  {(detail.leads || []).slice(0, 8).map(l => (
                    <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-dim/3 text-xs">
                      <span className="text-text-primary">{l.name}</span>
                      <span className={`status-${l.status} px-1.5 py-0.5 rounded-full text-[10px]`}>{l.status}</span>
                    </div>
                  ))}
                  {(detail.leads?.length || 0) > 8 && (
                    <p className="text-xs text-muted text-center">+{detail.leads.length - 8} more</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted mb-2">Campaigns ({detail.campaigns?.length || 0})</p>
                {(detail.campaigns || []).map(c => (
                  <div key={c.id} className="px-3 py-2 rounded-lg bg-dim/3 text-xs text-text-secondary">{c.name}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted text-xs">{label}</span>
      <span className="text-text-primary text-xs font-medium">{value || '—'}</span>
    </div>
  );
}
