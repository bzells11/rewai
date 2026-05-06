import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminSmsLogs() {
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sms', page, direction, search],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 50 });
      if (direction) p.set('direction', direction);
      if (search) p.set('search', search);
      return apiFetch(`/admin/sms-logs?${p}`);
    },
    keepPreviousData: true,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 50);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-text-primary">SMS Logs</h2>
          <span className="text-xs text-muted">{total.toLocaleString()} messages</span>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search message body..."
              className="w-full bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
          </div>
          <select value={direction} onChange={e => { setDirection(e.target.value); setPage(1); }}
            className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50">
            <option value="">All directions</option>
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
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
                {['Timestamp', 'User', 'Lead', 'Direction', 'Message', 'AI'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-dim/3 transition-colors">
                  <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">
                    {log.leads?.users?.name || log.leads?.users?.email || '—'}
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">{log.leads?.name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                      ${log.direction === 'inbound' ? 'bg-green-500/10 text-green-400' : 'bg-accent/10 text-accent'}`}>
                      {log.direction}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs max-w-xs truncate">{log.body}</td>
                  <td className="px-5 py-3 text-xs text-muted">{log.ai_generated ? '✓' : '—'}</td>
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
  );
}
