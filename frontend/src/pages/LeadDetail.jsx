import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/supabase';
import ConversationThread from '../components/ConversationThread';
import { ArrowLeft, Bot, User, Calendar, DollarSign, Clock, MapPin } from 'lucide-react';

const STATUS_LABELS = {
  cold: 'Cold', active: 'Active', warm: 'Warm',
  hot: 'Hot', handed_off: 'Won', dead: 'Dead',
};

const STATUS_OPTIONS = ['cold', 'active', 'warm', 'hot', 'handed_off', 'dead'];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => apiFetch(`/leads/${id}`),
    refetchInterval: 15_000,
  });

  async function toggleAI() {
    await apiFetch(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ai_enabled: !lead.ai_enabled }),
    });
    queryClient.invalidateQueries({ queryKey: ['lead', id] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  async function updateStatus(status) {
    await apiFetch(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    queryClient.invalidateQueries({ queryKey: ['lead', id] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) return <div className="p-8 text-muted">Lead not found.</div>;

  return (
    <div className="flex h-full">
      {/* Left panel — lead info */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-border">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-xs text-muted hover:text-text-primary mb-5 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Pipeline
          </button>

          <h2 className="font-display font-bold text-lg text-text-primary">{lead.name}</h2>
          {lead.address && (
            <p className="flex items-center gap-1.5 text-xs text-muted mt-1">
              <MapPin size={12} /> {lead.address}
            </p>
          )}

          {/* Status picker */}
          <div className="mt-4">
            <label className="text-xs text-muted block mb-1.5">Status</label>
            <select
              value={lead.status}
              onChange={e => updateStatus(e.target.value)}
              className={`w-full bg-dim/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/50 status-${lead.status}`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* AI toggle */}
          <button
            onClick={toggleAI}
            className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border
              ${lead.ai_enabled
                ? 'bg-accent text-white border-accent/80 hover:bg-accent/90'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25'
              }`}
          >
            {lead.ai_enabled ? <Bot size={15} /> : <User size={15} />}
            {lead.ai_enabled ? 'AI Managing — Click to Take Over' : 'You Are Managing — Re-enable AI'}
          </button>
        </div>

        {/* Lead details */}
        <div className="p-6 space-y-4 text-sm">
          {lead.ai_notes && (
            <div>
              <p className="text-xs text-muted mb-1">AI Summary</p>
              <p className="text-text-secondary leading-relaxed">{lead.ai_notes}</p>
            </div>
          )}
          {lead.situation && (
            <div>
              <p className="text-xs text-muted mb-1">Situation</p>
              <p className="text-text-secondary">{lead.situation}</p>
            </div>
          )}
          {lead.timeline && (
            <div className="flex items-center gap-2 text-text-secondary">
              <Calendar size={13} className="text-muted" />
              <span>Timeline: {lead.timeline}</span>
            </div>
          )}
          {lead.asking_price && (
            <div className="flex items-center gap-2 text-text-secondary">
              <DollarSign size={13} className="text-muted" />
              <span>Asking: ${lead.asking_price.toLocaleString()}</span>
            </div>
          )}
          {lead.last_contact_at && (
            <div className="flex items-center gap-2 text-text-secondary">
              <Clock size={13} className="text-muted" />
              <span>Last contact: {new Date(lead.last_contact_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Follow-up schedule */}
        {lead.schedules?.length > 0 && (
          <div className="px-6 pb-6">
            <p className="text-xs text-muted mb-3">Follow-up Schedule</p>
            <div className="space-y-1.5">
              {lead.schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Attempt {s.attempt_number}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    s.status === 'pending' ? 'text-accent bg-accent-dim' :
                    s.status === 'sent' ? 'text-green-400 bg-green-400/10' :
                    'text-muted bg-dim/5'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right panel — conversation */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-text-primary">Conversation</h3>
          <p className="text-xs text-muted">{lead.phone}</p>
        </div>
        <ConversationThread
          lead={lead}
          conversations={lead.conversations || []}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['lead', id] })}
        />
      </div>
    </div>
  );
}
