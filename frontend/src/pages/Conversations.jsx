import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, supabase } from '../lib/supabase';
import ConversationThread from '../components/ConversationThread';
import { Bot, User, Search } from 'lucide-react';

const STATUS_COLORS = {
  cold:       'text-muted',
  active:     'text-accent',
  warm:       'text-amber-400',
  hot:        'text-red-400',
  handed_off: 'text-emerald-400',
  dead:       'text-muted',
};

const statusColors = {
  cold:       '#4b5563',
  active:     '#3b82f6',
  warm:       '#f59e0b',
  hot:        '#ef4444',
  handed_off: '#22c55e',
  won:        '#22c55e',
  dead:       '#4b5563',
};

const STATUS_LABELS = {
  cold: 'Cold', active: 'Active', warm: 'Warm',
  hot: 'Hot', handed_off: 'Won', dead: 'Dead',
};

const FILTERS = [
  { key: 'all',        label: 'All'    },
  { key: 'hot',        label: 'Hot'    },
  { key: 'warm',       label: 'Warm'   },
  { key: 'active',     label: 'Active' },
  { key: 'cold',       label: 'Cold'   },
  { key: 'handed_off', label: 'Won'    },
];

const TEAL = '#0ea5e9';

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Conversations() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [localAiEnabled, setLocalAiEnabled] = useState(null);
  const [search, setSearch] = useState('');

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => apiFetch('/leads'),
    refetchInterval: 5_000,
  });

  const { data: selectedLead } = useQuery({
    queryKey: ['lead', selectedId],
    queryFn: () => apiFetch(`/leads/${selectedId}`),
    enabled: !!selectedId,
    refetchInterval: 3_000,
  });

  // Real-time: new messages for the open conversation
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`conversations:${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `lead_id=eq.${selectedId}` },
        () => queryClient.invalidateQueries({ queryKey: ['lead', selectedId] })
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedId, queryClient]);

  // Real-time: lead list sidebar updates
  useEffect(() => {
    const channel = supabase
      .channel('leads-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
        () => queryClient.invalidateQueries({ queryKey: ['leads'] })
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  const q = search.toLowerCase();
  const sorted = [...leads]
    .filter(l => activeFilter === 'all' || l.status === activeFilter)
    .filter(l => !q || l.name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.address?.toLowerCase().includes(q))
    .sort((a, b) => {
      if (!a.last_contact_at && !b.last_contact_at) return 0;
      if (!a.last_contact_at) return 1;
      if (!b.last_contact_at) return -1;
      return new Date(b.last_contact_at) - new Date(a.last_contact_at);
    });

  // Auto-select first lead on load
  const firstLeadId = sorted[0]?.id;
  useEffect(() => {
    if (firstLeadId && !selectedId) setSelectedId(firstLeadId);
  }, [firstLeadId]);

  // Reset local override whenever a different lead is selected
  useEffect(() => { setLocalAiEnabled(null); }, [selectedId]);

  function handleFilterChange(key) {
    setActiveFilter(key);
    setSelectedId(null);
  }

  async function toggleAI() {
    if (!selectedLead) return;
    const newValue = !(localAiEnabled ?? selectedLead.ai_enabled);
    setLocalAiEnabled(newValue); // flips the button instantly — no await needed
    try {
      await apiFetch(`/leads/${selectedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ai_enabled: newValue }),
      });
    } catch {
      setLocalAiEnabled(null); // revert on error
    } finally {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  }

  // Merge local override into the lead so ConversationThread sees the same instant state
  const aiEnabled = localAiEnabled !== null ? localAiEnabled : (selectedLead?.ai_enabled ?? true);
  const leadForThread = selectedLead ? { ...selectedLead, ai_enabled: aiEnabled } : null;

  const totalLeads  = leads.length;
  const activeCount = leads.filter(l => l.status === 'active').length;
  const warmCount   = leads.filter(l => l.status === 'warm').length;
  const hotCount    = leads.filter(l => l.status === 'hot').length;

  return (
    <div className="flex h-full">

      {/* ── Left panel ── */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col bg-surface">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display font-bold text-xl text-text-primary">Conversations</h1>
            <span className="text-xs text-muted bg-dim/5 px-2 py-0.5 rounded-full">{sorted.length}</span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-4">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className="shrink-0 pb-2 text-[11px] font-medium transition-all duration-150"
                style={{
                  color: activeFilter === f.key ? 'var(--text-primary)' : 'var(--muted)',
                  borderBottom: activeFilter === f.key ? `2px solid ${TEAL}` : '2px solid transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && sorted.length === 0 && (
            <div className="text-center text-muted text-sm py-16">
              {activeFilter === 'all' ? 'No leads yet' : `No ${STATUS_LABELS[activeFilter]?.toLowerCase()} leads`}
            </div>
          )}

          {sorted.map(lead => {
            const isSelected = lead.id === selectedId;
            const barColor = statusColors[lead.status?.toLowerCase()] || '#4b5563';

            return (
              <button
                key={lead.id}
                onClick={() => setSelectedId(lead.id)}
                className="w-full text-left py-4 transition-colors duration-100"
                style={{
                  boxSizing:    'border-box',
                  paddingLeft:  '20px',
                  paddingRight: '20px',
                  borderLeft:   `3px solid ${barColor}`,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background:   isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-display font-semibold text-sm text-text-primary truncate">{lead.name}</p>
                  {timeAgo(lead.last_contact_at) && (
                    <span className="text-[11px] text-muted shrink-0">{timeAgo(lead.last_contact_at)}</span>
                  )}
                </div>

                {lead.address && (
                  <p className="text-xs text-muted truncate mb-1.5">{lead.address}</p>
                )}

                <p className="text-xs text-text-secondary truncate">
                  {lead.ai_notes || lead.situation || 'No messages yet'}
                </p>
              </button>
            );
          })}
        </div>

        {/* AI toggle */}
        {selectedLead && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={toggleAI}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={aiEnabled
                ? { background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${TEAL}`, color: '#ffffff' }
                : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b' }
              }
            >
              {aiEnabled ? <Bot size={14} /> : <User size={14} />}
              {aiEnabled ? 'AI Managing — Take Over' : 'Manual Mode — Re-enable AI'}
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLead ? (
          <>
            {/* Thread header */}
            <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display font-semibold text-text-primary leading-tight">{selectedLead.name}</h2>
                <p className="text-xs text-muted mt-0.5">{selectedLead.phone}</p>
                {selectedLead.address && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)', opacity: 0.75 }}>{selectedLead.address}</p>
                )}
                {selectedLead.situation && (
                  <p className="text-xs italic mt-0.5" style={{ color: 'var(--muted)', opacity: 0.55 }}>{selectedLead.situation}</p>
                )}
              </div>
              <span className={`text-xs font-medium mt-0.5 shrink-0 ${STATUS_COLORS[selectedLead.status]}`}>
                {STATUS_LABELS[selectedLead.status]}
              </span>
            </div>

            <ConversationThread
              lead={leadForThread}
              conversations={selectedLead.conversations || []}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['lead', selectedId] })}
            />
          </>
        ) : (
          /* No lead selected */
          <div className="flex flex-col h-full">

            {/* Compact summary line */}
            {totalLeads > 0 && (
              <div className="px-6 py-3 border-b border-border">
                <p className="text-xs text-muted">
                  {totalLeads} total · {activeCount} active · {warmCount} warm · {hotCount} hot
                </p>
              </div>
            )}

            {/* Centered prompt */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--muted)', opacity: 0.3, marginBottom: 4 }}>
                <path d="M4 7a4 4 0 014-4h16a4 4 0 014 4v12a4 4 0 01-4 4h-7l-5.5 4v-4H8a4 4 0 01-4-4V7z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-muted">Select a seller from the list to view their AI conversation thread.</p>
              <p className="text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                Hot and Warm leads respond fastest — check those first.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
