import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/supabase';
import { RotateCcw, Trash2, Archive, AlertTriangle, Search } from 'lucide-react';

function ConfirmModal({ lead, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={17} className="text-red-400" />
          </div>
          <div>
            <p className="font-display font-semibold text-text-primary">Permanently delete?</p>
            <p className="text-xs text-muted mt-0.5">This cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary mb-6">
          <span className="font-medium text-text-primary">{lead.name}</span> and all their conversation history will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-text-secondary hover:bg-dim/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArchivePage() {
  const queryClient = useQueryClient();
  const [confirmLead, setConfirmLead] = useState(null);
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads-archived'],
    queryFn: () => apiFetch('/leads/archived'),
  });

  const restore = useMutation({
    mutationFn: (id) => apiFetch(`/leads/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-archived'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const permanentDelete = useMutation({
    mutationFn: (id) => apiFetch(`/leads/${id}/permanent`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads-archived'] });
      setConfirmLead(null);
    },
  });

  function formatDate(str) {
    if (!str) return '';
    return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="p-8 max-w-2xl">
      {confirmLead && (
        <ConfirmModal
          lead={confirmLead}
          onConfirm={() => permanentDelete.mutate(confirmLead.id)}
          onCancel={() => setConfirmLead(null)}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <Archive size={20} className="text-muted" />
        <h1 className="font-display font-bold text-2xl text-text-primary">Archive</h1>
        {leads.length > 0 && (
          <span className="text-xs text-muted bg-dim/5 border border-border px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search archived leads..."
          className="w-full bg-dim/5 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Archive size={32} className="text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-secondary font-medium mb-1">Nothing archived</p>
          <p className="text-sm text-muted">Leads you archive will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads
            .filter(l => {
              const q = search.toLowerCase();
              return !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.address?.toLowerCase().includes(q);
            })
            .map(lead => (
            <div
              key={lead.id}
              className="glass rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-text-primary truncate">{lead.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {lead.address && <span>{lead.address} · </span>}
                  Archived {formatDate(lead.archived_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => restore.mutate(lead.id)}
                  disabled={restore.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/25 hover:bg-accent/8 transition-all disabled:opacity-50"
                >
                  <RotateCcw size={11} />
                  Restore
                </button>
                <button
                  onClick={() => setConfirmLead(lead)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={11} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

      )}

      <p className="text-xs text-muted mt-6 text-center">
        Archived leads are hidden from your pipeline. Restore them anytime or permanently delete them here.
      </p>
    </div>
  );
}
