import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const ACTION_LABELS = {
  reset_password:       'Password Reset Email',
  change_email:         'Email Changed',
  change_password:      'Password Changed',
  delete_account:       'Account Deleted',
  force_logout:         'Force Logout',
  update_user:          'User Updated',
  impersonate:          'Impersonation',
  update_notes:         'Notes Updated',
  cancel_subscription:  'Subscription Cancelled',
  extend_trial:         'Trial Extended',
  override_billing_date:'Billing Date Changed',
};

const ACTION_COLORS = {
  delete_account:  'text-red-400 bg-red-400/10',
  impersonate:     'text-amber-400 bg-amber-400/10',
  force_logout:    'text-orange-400 bg-orange-400/10',
  cancel_subscription: 'text-red-400 bg-red-400/10',
};

export default function AdminAuditLog() {
  const [page, setPage]           = useState(1);
  const [adminFilter, setAdminFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page, adminFilter, actionFilter, dateFrom, dateTo],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 50 });
      if (adminFilter)  p.set('admin_email', adminFilter);
      if (actionFilter) p.set('action', actionFilter);
      if (dateFrom)     p.set('date_from', dateFrom);
      if (dateTo)       p.set('date_to', dateTo + 'T23:59:59Z');
      return apiFetch(`/admin/audit-log?${p}`);
    },
    keepPreviousData: true,
  });

  const logs  = data?.logs  || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 50);

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl text-text-primary">Audit Log</h2>
          <span className="text-xs text-muted">{total.toLocaleString()} entries</span>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={adminFilter} onChange={e => { setAdminFilter(e.target.value); setPage(1); }}
              placeholder="Filter by admin email..."
              className="bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 w-52" />
          </div>

          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50">
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50" />
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
                {['Timestamp', 'Admin', 'Action', 'Target', 'Details'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-dim/3 transition-colors">
                  <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-text-secondary text-xs">{log.admin_email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'text-accent bg-accent/10'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted text-xs capitalize">
                    {log.target_type} {log.target_id ? `· ${log.target_id.slice(0, 8)}…` : ''}
                  </td>
                  <td className="px-5 py-3 text-muted text-xs max-w-xs truncate">
                    {log.metadata && Object.keys(log.metadata).length
                      ? Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-muted text-sm">No audit entries yet</td></tr>
              )}
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
