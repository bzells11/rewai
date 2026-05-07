import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/supabase';
import {
  Search, ChevronLeft, ChevronRight, X, CheckCircle, AlertCircle,
  Mail, Key, Lock, Trash2, LogOut, CreditCard, Calendar, Gift, RefreshCw,
  UserCheck, Download, Bot, StickyNote,
} from 'lucide-react';

// ── Toast ──────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  const ok = toast.type === 'success';
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all
      ${ok ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
      {ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {toast.message}
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-display font-semibold text-text-primary">{title}</p>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors ml-4 shrink-0">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, subtitle, confirmLabel = 'Confirm', danger = false, onConfirm, onClose, loading }) {
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <div className="flex gap-3 mt-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-text-secondary hover:bg-dim/5 transition-all">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50
            ${danger ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-accent text-white hover:bg-accent/90'}`}>
          {loading ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function DeleteModal({ email, onConfirm, onClose, loading }) {
  const [typed, setTyped] = useState('');
  return (
    <Modal title="Delete account" subtitle="This is permanent and cannot be undone." onClose={onClose}>
      <div className="mb-4">
        <p className="text-xs text-muted mb-2">Type <span className="text-text-primary font-mono">{email}</span> to confirm</p>
        <input value={typed} onChange={e => setTyped(e.target.value)}
          className="w-full bg-dim/5 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-red-500/50 font-mono"
          placeholder={email} />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-text-secondary hover:bg-dim/5 transition-all">Cancel</button>
        <button onClick={onConfirm} disabled={typed !== email || loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-40">
          {loading ? 'Deleting...' : 'Delete Forever'}
        </button>
      </div>
    </Modal>
  );
}

function InputModal({ title, subtitle, label, placeholder, type = 'text', confirmLabel, onConfirm, onClose, loading }) {
  const [value, setValue] = useState('');
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose}>
      <div className="mb-4">
        <label className="text-xs text-muted block mb-1.5">{label}</label>
        <input type={type} value={value} onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-dim/5 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50" />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-text-secondary hover:bg-dim/5 transition-all">Cancel</button>
        <button onClick={() => onConfirm(value)} disabled={!value.trim() || loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50">
          {loading ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function DateModal({ onConfirm, onClose, loading }) {
  const [date, setDate] = useState('');
  return (
    <Modal title="Override billing date" subtitle="Sets the next billing cycle anchor." onClose={onClose}>
      <div className="mb-4">
        <label className="text-xs text-muted block mb-1.5">New billing date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full bg-dim/5 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/50" />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-border text-text-secondary hover:bg-dim/5 transition-all">Cancel</button>
        <button onClick={() => onConfirm(Math.floor(new Date(date).getTime() / 1000))} disabled={!date || loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-all disabled:opacity-50">
          {loading ? 'Updating...' : 'Set Date'}
        </button>
      </div>
    </Modal>
  );
}

// ── Plan colors ────────────────────────────────────────────────────

const PLAN_COLORS = {
  starter:   'text-muted bg-dim/5',
  growth:    'text-accent bg-accent/10',
  pro:       'text-amber-400 bg-amber-400/10',
  suspended: 'text-red-400 bg-red-400/10',
};

// ── Main component ─────────────────────────────────────────────────

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selected, setSelected]   = useState(null);
  const [toast, setToast]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [notes, setNotes]         = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const showToast = (message, type = 'success') => setToast({ message, type });

  async function exportCSV() {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (planFilter) p.set('plan', planFilter);
    const rows = await apiFetch(`/admin/users/export?${p}`).catch(e => { showToast(e.message, 'error'); return null; });
    if (!rows) return;
    const cols = ['id','email','name','company_name','plan','created_at','twilio_number'];
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `users_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  async function impersonate() {
    try {
      const { link, email } = await apiFetch(`/admin/users/${selected}/impersonate`, { method: 'POST' });
      showToast(`Opening session as ${email}`);
      window.open(link, '_blank');
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function saveNotes() {
    setNotesSaving(true);
    try {
      await apiFetch(`/admin/users/${selected}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) });
      qc.invalidateQueries(['admin-user', selected]);
      showToast('Notes saved');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setNotesSaving(false); }
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, planFilter],
    queryFn: () => {
      const p = new URLSearchParams({ page, limit: 20 });
      if (search) p.set('search', search);
      if (planFilter) p.set('plan', planFilter);
      return apiFetch(`/admin/users?${p}`);
    },
    keepPreviousData: true,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user', selected],
    queryFn: () => apiFetch(`/admin/users/${selected}`),
    enabled: !!selected,
  });

  // Sync notes whenever a different user is opened
  useEffect(() => { if (detail) setNotes(detail.admin_notes || ''); }, [detail?.id]);

  // Generic action mutation factory
  function useAction(path, method = 'POST', successMsg) {
    return useMutation({
      mutationFn: (body) => apiFetch(`/admin/users/${selected}/${path}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
      onSuccess: () => {
        showToast(successMsg);
        setModal(null);
        qc.invalidateQueries(['admin-users']);
        qc.invalidateQueries(['admin-user', selected]);
      },
      onError: (err) => showToast(err.message, 'error'),
    });
  }

  const resetPassword   = useAction('reset-password',  'POST', 'Password reset email sent');
  const changeEmail     = useAction('email',            'PATCH', 'Email updated');
  const changePassword  = useAction('password',         'PATCH', 'Password updated');
  const forceLogout     = useAction('force-logout',     'POST', 'All sessions invalidated');
  const cancelSub       = useAction('cancel-subscription', 'POST', 'Subscription cancelled');
  const extendTrial     = useAction('extend-trial',     'POST', 'Trial extended');
  const billingDate     = useAction('billing-date',     'PATCH', 'Billing date updated');

  const deleteUser = useMutation({
    mutationFn: () => apiFetch(`/admin/users/${selected}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast('Account permanently deleted');
      setModal(null);
      setSelected(null);
      qc.invalidateQueries(['admin-users']);
    },
    onError: (err) => showToast(err.message, 'error'),
  });

  const updatePlan = useMutation({
    mutationFn: (plan) => apiFetch(`/admin/users/${selected}`, { method: 'PATCH', body: JSON.stringify({ plan }) }),
    onSuccess: () => { showToast('Plan updated'); qc.invalidateQueries(['admin-users']); qc.invalidateQueries(['admin-user', selected]); },
    onError: (err) => showToast(err.message, 'error'),
  });

  const users = data?.users || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 20);

  function ActionBtn({ icon: Icon, label, onClick, danger = false }) {
    return (
      <button onClick={onClick}
        className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all text-left
          ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-secondary hover:bg-dim/5 hover:text-text-primary'}`}>
        <Icon size={13} className="shrink-0" /> {label}
      </button>
    );
  }

  function Section({ title, children }) {
    return (
      <div>
        <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1.5">{title}</p>
        <div className="glass rounded-xl overflow-hidden divide-y divide-border">
          {children}
        </div>
      </div>
    );
  }

  function Row({ label, value }) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs">{label}</span>
        <span className="text-text-primary text-xs font-medium">{value || '—'}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Modals */}
      {modal?.type === 'reset-password' && (
        <ConfirmModal title="Send password reset email" subtitle={`Will send to ${detail?.email}`}
          confirmLabel="Send Email" loading={resetPassword.isPending}
          onConfirm={() => resetPassword.mutate()} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'change-email' && (
        <InputModal title="Change email address" label="New email" placeholder="new@example.com" type="email"
          confirmLabel="Update Email" loading={changeEmail.isPending}
          onConfirm={(v) => changeEmail.mutate({ email: v })} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'change-password' && (
        <InputModal title="Set new password" label="New password (min 6 chars)" placeholder="••••••••" type="password"
          confirmLabel="Update Password" loading={changePassword.isPending}
          onConfirm={(v) => changePassword.mutate({ password: v })} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal email={detail?.email} loading={deleteUser.isPending}
          onConfirm={() => deleteUser.mutate()} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'force-logout' && (
        <ConfirmModal title="Force logout" subtitle="All active sessions will be invalidated immediately."
          confirmLabel="Force Logout" loading={forceLogout.isPending}
          onConfirm={() => forceLogout.mutate()} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'cancel-sub' && (
        <ConfirmModal title="Cancel subscription" subtitle="Will cancel immediately and downgrade to Starter."
          confirmLabel="Cancel Subscription" danger loading={cancelSub.isPending}
          onConfirm={() => cancelSub.mutate()} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'extend-trial' && (
        <InputModal title="Extend free trial" label="Days to add" placeholder="7" type="number"
          confirmLabel="Extend Trial" loading={extendTrial.isPending}
          onConfirm={(v) => extendTrial.mutate({ days: Number(v) })} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'billing-date' && (
        <DateModal loading={billingDate.isPending}
          onConfirm={(ts) => billingDate.mutate({ billing_date: ts })} onClose={() => setModal(null)} />
      )}

      {/* Table */}
      <div className={`flex flex-col flex-1 overflow-hidden ${selected ? 'border-r border-border' : ''}`}>
        <div className="px-8 pt-8 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-text-primary">Users</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">{total} total</span>
              <button onClick={() => exportCSV()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-dim/5 transition-all">
                <Download size={12} /> Export CSV
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name or email..."
                className="w-full bg-dim/5 border border-border rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50" />
            </div>
            <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
              className="bg-dim/5 border border-border rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/50">
              <option value="">All plans</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="suspended">Suspended</option>
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
                  {['Name', 'Email', 'Plan', 'Onboarding', 'AI Msgs', 'Joined'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} onClick={() => setSelected(u.id)}
                    className={`cursor-pointer hover:bg-dim/3 transition-colors ${selected === u.id ? 'bg-accent/5' : ''}`}>
                    <td className="px-4 py-3 text-text-primary font-medium text-sm">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[u.plan] || PLAN_COLORS.starter}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.onboarding ? (() => {
                        const done = Object.values(u.onboarding).filter(Boolean).length;
                        const total = Object.keys(u.onboarding).length;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Object.values(u.onboarding).map((v, i) => (
                                <span key={i} className={`w-2 h-2 rounded-full ${v ? 'bg-accent' : 'bg-dim/20'}`} />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted">{done}/{total}</span>
                          </div>
                        );
                      })() : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs">{u.ai_messages_total ?? '—'}</td>
                    <td className="px-4 py-3 text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
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

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-text-primary text-sm">User Detail</h3>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-text-primary transition-colors">
              <X size={15} />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Identity */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-bg font-bold text-sm">{(detail.name || detail.email)[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">{detail.name || '—'}</p>
                  <p className="text-xs text-muted truncate">{detail.email}</p>
                </div>
              </div>

              {/* Info */}
              <div className="glass rounded-xl p-3 space-y-2">
                <Row label="Plan" value={
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[detail.plan] || PLAN_COLORS.starter}`}>
                    {detail.plan}
                  </span>
                } />
                <Row label="Company"  value={detail.company_name} />
                <Row label="Area"     value={detail.buying_area} />
                <Row label="Twilio"   value={detail.twilio_number} />
                <Row label="Joined"   value={new Date(detail.created_at).toLocaleDateString()} />
                <Row label="Admin"    value={detail.is_admin ? 'Yes' : 'No'} />
              </div>

              {/* Impersonate */}
              <button onClick={impersonate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-amber-500/30 text-amber-400 bg-amber-500/8 hover:bg-amber-500/15 transition-all">
                <UserCheck size={14} /> Impersonate User
              </button>

              {/* Onboarding */}
              {detail.onboarding && (
                <div>
                  <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1.5">Onboarding ({Object.values(detail.onboarding).filter(Boolean).length}/{Object.keys(detail.onboarding).length})</p>
                  <div className="glass rounded-xl divide-y divide-border">
                    {[
                      { key: 'account',  label: 'Account created' },
                      { key: 'twilio',   label: 'Twilio credentials added' },
                      { key: 'campaign', label: 'First campaign created' },
                      { key: 'lead',     label: 'First lead imported' },
                      { key: 'message',  label: 'First message sent' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2.5 px-3 py-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${detail.onboarding[key] ? 'bg-accent' : 'bg-dim/20'}`} />
                        <span className={`text-xs ${detail.onboarding[key] ? 'text-text-primary' : 'text-muted'}`}>{label}</span>
                        {detail.onboarding[key] && <CheckCircle size={11} className="text-accent ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Usage */}
              <div>
                <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1.5">AI Usage</p>
                <div className="glass rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted flex items-center gap-1.5"><Bot size={11} /> Total AI messages</span>
                    <span className="text-xs font-semibold text-text-primary">{detail.ai_messages_total ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Last 30 days</span>
                    <span className="text-xs font-semibold text-accent">{detail.ai_messages_30d ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-muted tracking-widest uppercase flex items-center gap-1"><StickyNote size={10} /> Admin Notes</p>
                  {detail.admin_notes_updated_at && (
                    <span className="text-[10px] text-muted">Saved {new Date(detail.admin_notes_updated_at).toLocaleDateString()}</span>
                  )}
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Internal notes — never visible to the user..."
                  className="w-full bg-dim/5 border border-border rounded-xl px-3 py-2.5 text-xs text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 resize-none leading-relaxed" />
                <button onClick={saveNotes} disabled={notesSaving || notes === (detail.admin_notes || '')}
                  className="mt-2 w-full py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-40">
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* Change plan */}
              <Section title="Subscription">
                <div className="px-3 py-2">
                  <p className="text-xs text-muted mb-2">Change plan</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {['starter','growth','pro','suspended'].map(plan => (
                      <button key={plan} onClick={() => updatePlan.mutate(plan)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize
                          ${detail.plan === plan ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:border-accent/30'}`}>
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>
                <ActionBtn icon={CreditCard} label="Cancel subscription"  onClick={() => setModal({ type: 'cancel-sub' })} danger />
                <ActionBtn icon={Gift}       label="Extend free trial"    onClick={() => setModal({ type: 'extend-trial' })} />
                <ActionBtn icon={Calendar}   label="Override billing date" onClick={() => setModal({ type: 'billing-date' })} />
              </Section>

              {/* Account actions */}
              <Section title="Account">
                <ActionBtn icon={Mail}       label="Send password reset email" onClick={() => setModal({ type: 'reset-password' })} />
                <ActionBtn icon={Key}        label="Change email address"      onClick={() => setModal({ type: 'change-email' })} />
                <ActionBtn icon={Lock}       label="Set new password"          onClick={() => setModal({ type: 'change-password' })} />
              </Section>

              {/* Session */}
              <Section title="Session">
                <ActionBtn icon={LogOut}     label="Force logout all sessions" onClick={() => setModal({ type: 'force-logout' })} danger />
              </Section>

              {/* Danger */}
              <Section title="Danger Zone">
                <ActionBtn icon={Trash2}     label="Delete account permanently" onClick={() => setModal({ type: 'delete' })} danger />
              </Section>

              {/* Leads */}
              {detail.leads?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted tracking-widest uppercase mb-1.5">Leads ({detail.leads.length})</p>
                  <div className="space-y-1">
                    {detail.leads.slice(0, 6).map(l => (
                      <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-dim/3 text-xs">
                        <span className="text-text-primary truncate">{l.name}</span>
                        <span className={`status-${l.status} px-1.5 py-0.5 rounded-full text-[10px] shrink-0 ml-2`}>{l.status}</span>
                      </div>
                    ))}
                    {detail.leads.length > 6 && <p className="text-xs text-muted text-center">+{detail.leads.length - 6} more</p>}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
