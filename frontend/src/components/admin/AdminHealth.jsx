import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import { RefreshCw } from 'lucide-react';

const STATUS_STYLES = {
  ok:             { dot: 'bg-green-400',  label: 'Operational',    text: 'text-green-400' },
  missing_config: { dot: 'bg-amber-400',  label: 'Not Configured', text: 'text-amber-400' },
  error:          { dot: 'bg-red-400',    label: 'Error',          text: 'text-red-400'   },
};

export default function AdminHealth() {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => apiFetch('/admin/health'),
    refetchInterval: 60_000,
  });

  const services = data?.services || [];
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—';

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl text-text-primary">System Health</h2>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-text-primary transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 max-w-lg">
          {services.map(svc => {
            const style = STATUS_STYLES[svc.status] || STATUS_STYLES.error;
            return (
              <div key={svc.service} className="glass rounded-2xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.dot} shadow-[0_0_6px_currentColor]`} />
                  <p className="text-sm font-medium text-text-primary">{svc.service}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${style.text}`}>{style.label}</p>
                  <p className="text-[10px] text-muted mt-0.5">Checked {lastChecked}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted mt-6">Auto-refreshes every 60 seconds.</p>
    </div>
  );
}
