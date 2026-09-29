import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock } from 'lucide-react';

// Cards sit under a labeled column, so the longest statuses use short badges to save width.
const STATUS_LABELS = {
  cold:       'Cold',
  active:     'Active',
  warm:       'Warm',
  hot:        'Hot',
  handed_off: 'Won',
  dead:       'Dead',
  not_interested: 'No',
  do_not_contact: 'DNC',
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

export default function LeadCard({ lead, isDragging, compact }) {
  const navigate = useNavigate();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isCurrentlyDragging } = useSortable({
    id: lead.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isCurrentlyDragging && navigate(`/leads/${lead.id}`)}
      className={`glass rounded-xl p-3.5 cursor-pointer select-none touch-none
        ${isCurrentlyDragging ? 'opacity-30' : ''}
        ${isDragging ? 'shadow-2xl rotate-1 opacity-100' : ''}
      `}
    >
      {/* Name + status badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="lead-card-name font-display font-semibold text-text-primary text-sm leading-snug">
          {lead.name}
        </p>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 status-${lead.status}`}>
          {STATUS_LABELS[lead.status] || lead.status}
        </span>
      </div>

      {/* Address */}
      {!compact && lead.address && (
        <p className="text-xs text-muted truncate mb-2 lead-card-address">{lead.address}</p>
      )}

      {/* AI notes or situation */}
      {!compact && (lead.ai_notes || lead.situation) && (
        <p className="text-xs text-text-secondary mb-3 line-clamp-3 leading-relaxed lead-card-situation">
          {lead.ai_notes || lead.situation}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[11px] text-muted pt-1 border-t border-black/5">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {timeAgo(lead.last_contact_at)}
        </span>
        {lead.asking_price && (
          <span className="flex items-center gap-1 ml-auto">
            <span className="text-muted/60">Asking</span>
            <span className="font-medium text-text-secondary lead-card-price">${lead.asking_price.toLocaleString()}</span>
          </span>
        )}
        {!lead.ai_enabled && !lead.asking_price && (
          <span className="ml-auto text-amber-500 font-medium">Manual</span>
        )}
      </div>
    </div>
  );
}
