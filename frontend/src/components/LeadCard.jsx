import { useNavigate } from 'react-router-dom';
import { MessageSquare, Clock } from 'lucide-react';

const STATUS_LABELS = {
  cold: 'Cold',
  active: 'Active',
  warm: 'Warm',
  hot: 'Hot',
  handed_off: 'Handed Off',
  dead: 'Dead',
};

function timeAgo(dateStr) {
  if (!dateStr) return 'Never contacted';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LeadCard({ lead }) {
  const navigate = useNavigate();
  const isHot = lead.status === 'hot';

  return (
    <div
      onClick={() => navigate(`/leads/${lead.id}`)}
      className={`glass rounded-xl p-4 cursor-pointer transition-all duration-200
        ${isHot ? 'border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.1)]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-display font-semibold text-text-primary text-sm leading-tight">{lead.name}</p>
          {lead.address && (
            <p className="text-xs text-muted mt-0.5 truncate max-w-[160px]">{lead.address}</p>
          )}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 status-${lead.status}`}>
          {STATUS_LABELS[lead.status] || lead.status}
        </span>
      </div>

      {/* AI notes or situation */}
      {(lead.ai_notes || lead.situation) && (
        <p className="text-xs text-text-secondary mb-3 line-clamp-2 leading-relaxed">
          {lead.ai_notes || lead.situation}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {timeAgo(lead.last_contact_at)}
        </span>
        {lead.asking_price && (
          <span className="flex items-center gap-1 text-text-secondary">
            ${lead.asking_price.toLocaleString()}
          </span>
        )}
        {!lead.ai_enabled && (
          <span className="ml-auto text-amber-400 font-medium">Manual</span>
        )}
      </div>
    </div>
  );
}
