import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { ExternalLink, DollarSign } from 'lucide-react';

export default function AdminBilling() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-billing'],
    queryFn: () => apiFetch('/admin/billing'),
  });

  const subs = data?.subscriptions || [];
  const mrr = data?.mrr || 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-8 pb-5 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-text-primary">Billing</h2>
          <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl">
            <DollarSign size={14} className="text-accent" />
            <div>
              <p className="text-[10px] text-muted">Monthly Recurring Revenue</p>
              <p className="font-display font-bold text-lg text-text-primary">${mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data?.note ? (
          <div className="flex items-center justify-center h-40 text-muted text-sm">{data.note}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface border-b border-border">
              <tr>
                {['Customer', 'Plan', 'MRR', 'Status', 'Next Billing', 'Stripe'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map(s => (
                <tr key={s.id} className="hover:bg-dim/3 transition-colors">
                  <td className="px-6 py-3 text-text-primary">{s.customer_email || '—'}</td>
                  <td className="px-6 py-3 text-text-secondary text-xs capitalize">{s.plan}</td>
                  <td className="px-6 py-3 text-text-primary font-medium">
                    ${(s.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize
                      ${s.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted text-xs">
                    {s.current_period_end ? new Date(s.current_period_end * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <a href={s.stripe_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-accent hover:underline">
                      <ExternalLink size={11} /> View
                    </a>
                  </td>
                </tr>
              ))}
              {!subs.length && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted text-sm">No active subscriptions</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
