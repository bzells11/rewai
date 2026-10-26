import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/supabase';
import LeadCard from '../components/LeadCard';
import DemoControls from '../components/DemoControls';
import { DEMO_MODE } from '../lib/demo';
import { Flame, TrendingUp, Users, Activity, Trash2, Rows2, Plus, RefreshCw } from 'lucide-react';

function collisionDetection(args) {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  return closestCenter(args);
}

const ALL_COLUMNS = [
  { key: 'cold',           label: 'Cold',           color: '#64748b' },
  { key: 'active',         label: 'Active',         color: '#3b82f6' },
  { key: 'warm',           label: 'Warm',           color: '#f59e0b' },
  { key: 'hot',            label: 'Hot',            color: '#ef4444' },
  { key: 'handed_off',     label: 'Won',            color: '#10b981' },
  { key: 'not_interested', label: 'Not Interested', color: '#8b5cf6' },
  { key: 'do_not_contact', label: 'Do Not Contact', color: '#475569' },
];

// The demo shows every AI outcome. The production board keeps its original five columns.
const COLUMNS = DEMO_MODE
  ? ALL_COLUMNS.filter(c => c.key !== 'handed_off')
  : ALL_COLUMNS.filter(c => !['not_interested', 'do_not_contact'].includes(c.key));

const COLUMN_EMPTY_MSG = {
  cold:           DEMO_MODE ? 'Load the sample leads to start' : 'Import leads to fill your pipeline',
  active:         'Appears after the first AI outreach',
  warm:           'Sellers who reply land here',
  hot:            'Ready-to-close leads land here',
  handed_off:     'Closed deals land here',
  not_interested: 'Polite no. Follow up later.',
  do_not_contact: 'Opted out. AI stops texting.',
};

function KanbanColumn({ col, leads, compact }) {
  // setNodeRef on the outer wrapper — full height = reliable drop detection
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  const bgNormal = col.color + '0d';
  const bgOver   = col.color + '1f';

  return (
    // Demo mode fits all outcome columns on screen instead of scrolling horizontally.
    <div ref={setNodeRef} data-col={col.key} className={`${DEMO_MODE ? 'flex-1 min-w-0' : 'w-72'} flex flex-col`}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.color }} />
        <span className="font-display font-semibold text-sm tracking-tight kanban-col-label truncate" style={{ color: col.color }}>
          {col.label}
        </span>
        <span className="ml-auto text-xs text-muted tabular-nums font-medium kanban-col-count">
          {leads.length}
        </span>
      </div>

      {/* Tinted card area — shrinks to fit cards only */}
      <div
        className="rounded-2xl p-2.5 space-y-2 transition-colors duration-150"
        style={{ background: isOver ? bgOver : bgNormal }}
      >
        {leads.length === 0 && (
          <div className="min-h-[80px] flex items-center justify-center px-3">
            <span className="col-empty-msg text-xs text-muted text-center">{COLUMN_EMPTY_MSG[col.key]}</span>
          </div>
        )}
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead} compact={compact} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

function TrashZone({ visible }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash' });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-6 h-12 rounded-2xl transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        ${isOver
          ? 'bg-red-500 shadow-[0_0_24px_rgba(239,68,68,0.35)] scale-105'
          : 'bg-red-500/10 border-2 border-dashed border-red-400/40'
        }
      `}
    >
      <Trash2 size={16} className={isOver ? 'text-white' : 'text-red-400'} />
      <span className={`text-sm font-medium ${isOver ? 'text-white' : 'text-red-400'}`}>Archive lead</span>
    </div>
  );
}

const STATS = [
  { key: 'total',    label: 'Total Leads',   icon: Users     },
  { key: 'response', label: 'Response Rate', icon: Activity  },
  { key: 'warm',     label: 'Warm',          icon: TrendingUp},
  { key: 'hot',      label: 'Hot Leads',     icon: Flame     },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeLead, setActiveLead] = useState(null);
  const [localLeads, setLocalLeads] = useState([]);
  const [sortBy, setSortBy]     = useState('default');
  const [filterBy, setFilterBy] = useState('all');
  const [compact, setCompact] = useState(
    () => localStorage.getItem('rewai-compact') === 'true'
  );

  function toggleCompact() {
    setCompact(c => {
      const next = !c;
      localStorage.setItem('rewai-compact', String(next));
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const { data: leads = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['leads'],
    queryFn: () => apiFetch('/leads'),
    refetchInterval: DEMO_MODE ? 2_000 : 10_000,
  });

  // Sync local order from server when not dragging
  useEffect(() => {
    if (!activeLead) setLocalLeads(leads);
  }, [leads, activeLead]);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch('/users/me/stats'),
    refetchInterval: DEMO_MODE ? 3_000 : 30_000,
  });

  const liveStats = {
    total:    leads.length,
    warm:     leads.filter(l => l.status === 'warm').length,
    hot:      leads.filter(l => l.status === 'hot').length,
    response: stats?.response_rate,
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) =>
      apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const prev = queryClient.getQueryData(['leads']);
      queryClient.setQueryData(['leads'], old =>
        old.map(l => (l.id === id ? { ...l, status } : l))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(['leads'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteLead = useMutation({
    mutationFn: (id) => apiFetch(`/leads/${id}`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const prev = queryClient.getQueryData(['leads']);
      queryClient.setQueryData(['leads'], old => old.filter(l => l.id !== id));
      return { prev };
    },
    onError: (_err, _id, ctx) => queryClient.setQueryData(['leads'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const updatePosition = useMutation({
    mutationFn: ({ id, position }) =>
      apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ position }) }),
    onMutate: async ({ id, position }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const prev = queryClient.getQueryData(['leads']);
      queryClient.setQueryData(['leads'], old => {
        const updated = old.map(l => l.id === id ? { ...l, position } : l);
        return [...updated].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(['leads'], ctx.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const byStatus = COLUMNS.reduce((acc, col) => {
    let colLeads = localLeads.filter(l => l.status === col.key);

    // ── Filter ──
    if (filterBy === 'ai-on')    colLeads = colLeads.filter(l => l.ai_enabled);
    if (filterBy === 'ai-off')   colLeads = colLeads.filter(l => !l.ai_enabled);
    if (filterBy === 'has-price') colLeads = colLeads.filter(l => l.asking_price);
    if (filterBy === '7d')  colLeads = colLeads.filter(l => new Date(l.imported_at) > new Date(Date.now() - 7  * 86400000));
    if (filterBy === '30d') colLeads = colLeads.filter(l => new Date(l.imported_at) > new Date(Date.now() - 30 * 86400000));
    if (filterBy === '90d') colLeads = colLeads.filter(l => new Date(l.imported_at) > new Date(Date.now() - 90 * 86400000));

    // ── Sort ──
    if (sortBy === 'contacted')   colLeads = colLeads.filter(l => !!l.last_contact_at);
    if (sortBy === 'uncontacted') colLeads = colLeads.filter(l => !l.last_contact_at);
    if (sortBy === 'name')    colLeads = [...colLeads].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'date')    colLeads = [...colLeads].sort((a, b) => new Date(b.imported_at) - new Date(a.imported_at));
    if (sortBy === 'price')   colLeads = [...colLeads].sort((a, b) => (b.asking_price ?? 0) - (a.asking_price ?? 0));
    if (sortBy === 'contacted' || sortBy === 'uncontacted') {
      colLeads = [...colLeads].sort((a, b) => new Date(b.last_contact_at ?? 0) - new Date(a.last_contact_at ?? 0));
    }

    acc[col.key] = colLeads;
    return acc;
  }, {});

  function handleDragStart(event) {
    setActiveLead(localLeads.find(l => l.id === event.active.id) ?? null);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const isOverColumn = COLUMNS.some(c => c.key === over.id);
    if (isOverColumn) return;

    const activeItem = localLeads.find(l => l.id === active.id);
    const overItem   = localLeads.find(l => l.id === over.id);
    if (!activeItem || !overItem || activeItem.status !== overItem.status) return;

    setLocalLeads(prev => {
      const col    = prev.filter(l => l.status === activeItem.status);
      const others = prev.filter(l => l.status !== activeItem.status);
      const from   = col.findIndex(l => l.id === active.id);
      const to     = col.findIndex(l => l.id === over.id);
      if (from === to) return prev;
      return [...others, ...arrayMove(col, from, to)];
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) { setLocalLeads(leads); return; }
    if (over.id === 'trash') { deleteLead.mutate(active.id); return; }

    const activeItem = localLeads.find(l => l.id === active.id);
    if (!activeItem) return;

    const isOverColumn = COLUMNS.some(c => c.key === over.id);

    if (isOverColumn) {
      if (activeItem.status !== over.id) {
        updateStatus.mutate({ id: activeItem.id, status: over.id });
      }
    } else {
      const overItem = localLeads.find(l => l.id === over.id);
      if (overItem && activeItem.status !== overItem.status) {
        updateStatus.mutate({ id: activeItem.id, status: overItem.status });
        return;
      }
      // Same-column reorder — compute position from current localLeads order
      const colLeads   = localLeads.filter(l => l.status === activeItem.status);
      const finalIndex = colLeads.findIndex(l => l.id === active.id);
      const prev       = colLeads[finalIndex - 1]?.position ?? 0;
      const next       = colLeads[finalIndex + 1]?.position ?? (prev + 2_000_000);
      const newPos     = Math.floor((prev + next) / 2);
      updatePosition.mutate({ id: activeItem.id, position: newPos });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-surface border-b border-border">
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display font-bold text-xl text-text-primary tracking-tight">
              Lead Pipeline
            </h1>
            <div className="demo-fade flex items-center gap-2">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#6b7280] hover:text-text-secondary hover:bg-dim/5 transition-all duration-150 disabled:opacity-40"
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={toggleCompact}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                  ${compact
                    ? 'bg-accent/10 text-accent'
                    : 'text-[#6b7280] hover:text-text-secondary hover:bg-dim/5'
                  }`}
              >
                <Rows2 size={13} />
                Compact
              </button>
              <button
                onClick={() => navigate('/import')}
                className="add-leads-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-bg hover:bg-accent/90 transition-all duration-150"
              >
                <Plus size={13} />
                Add Leads
              </button>
            </div>
          </div>

          {DEMO_MODE && <DemoControls />}

          <div className="demo-fade grid grid-cols-4 gap-3">
            {STATS.map(({ key, label, icon: Icon }) => {
              const raw = liveStats[key];
              const display = key === 'response' && raw ? `${raw}%` : raw;
              return (
                <div key={key} className="rounded-xl px-5 py-4 glass">
                  <div className="stat-card-label flex items-center gap-1.5 text-muted text-xs mb-2">
                    <Icon size={12} />
                    {label}
                  </div>
                  {display != null
                    ? <p className="stat-card-value font-display font-bold text-2xl text-text-primary">{display}</p>
                    : <p className="text-xs text-muted/70 pt-0.5">No campaigns yet</p>
                  }
                </div>
              );
            })}
          </div>
        </div>

        {/* Sort / Filter bar */}
        <div className="demo-fade px-8 py-2.5 border-b border-border flex items-center gap-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className={`bg-dim/5 border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none transition-all cursor-pointer
              ${sortBy !== 'default' ? 'border-accent/40 text-accent bg-accent/5' : 'border-border text-[#6b7280]'}`}
          >
            <option value="default">Sort: Default</option>
            <option value="name">Sort: Name A→Z</option>
            <option value="date">Sort: Date Added</option>
            <option value="price">Sort: Asking Price</option>
            <option value="contacted">Sort: Contacted</option>
            <option value="uncontacted">Sort: Not Contacted</option>
          </select>

          <select
            value={filterBy}
            onChange={e => setFilterBy(e.target.value)}
            className={`bg-dim/5 border rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none transition-all cursor-pointer
              ${filterBy !== 'all' ? 'border-accent/40 text-accent bg-accent/5' : 'border-border text-[#6b7280]'}`}
          >
            <option value="all">Filter: All Leads</option>
            <optgroup label="Activity">
              <option value="ai-on">AI Managing</option>
              <option value="ai-off">Manual Mode</option>
              <option value="has-price">Has Asking Price</option>
            </optgroup>
            <optgroup label="Date Added">
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </optgroup>
          </select>

          {(sortBy !== 'default' || filterBy !== 'all') && (
            <button
              onClick={() => { setSortBy('default'); setFilterBy('all'); }}
              className="text-xs text-muted hover:text-text-primary transition-colors"
            >
              Clear
            </button>
          )}

          <span className="ml-auto text-xs text-muted">
            {Object.values(byStatus).reduce((s, a) => s + a.length, 0)} leads
          </span>
        </div>

        {/* Kanban */}
        <div className={`flex-1 py-6 ${DEMO_MODE ? 'px-6 overflow-x-hidden' : 'px-8 overflow-x-auto'}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className={`flex h-full ${DEMO_MODE ? 'gap-3 w-full' : 'gap-4 min-w-max'}`}>
              {COLUMNS.map(col => (
                <KanbanColumn key={col.key} col={col} leads={byStatus[col.key] ?? []} compact={compact} />
              ))}
            </div>
          )}
        </div>
      </div>

      <TrashZone visible={!!activeLead} />

      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadCard lead={activeLead} isDragging compact={compact} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
