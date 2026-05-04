import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, supabase } from '../lib/supabase';
import { Save, CheckCircle, MessageSquare, LogOut, Sun, Moon, Check, ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading]   = useState(false);

  const justUpgraded = searchParams.get('upgraded') === '1';

  async function startCheckout(plan) {
    setCheckoutLoading(true);
    try {
      const { url } = await apiFetch('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
      window.location.href = url;
    } catch (err) {
      alert(err.message);
      setCheckoutLoading(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await apiFetch('/billing/portal', { method: 'POST' });
      window.location.href = url;
    } catch (err) {
      alert(err.message);
      setPortalLoading(false);
    }
  }
  const { theme, toggleTheme } = useTheme();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiFetch('/users/me') });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => apiFetch('/users/me/campaigns') });
  const { data: deletedLeads = [], refetch: refetchDeleted } = useQuery({
    queryKey: ['leads-deleted'],
    queryFn: () => apiFetch('/leads/deleted'),
  });

  const [profile, setProfile] = useState({ name: '', company_name: '', buying_area: '', twilio_number: '', twilio_sid: '', twilio_auth_token: '', handoff_retention_days: 30 });
  const [restoring, setRestoring] = useState(null);
  const [campaign, setCampaign] = useState({ name: 'Default', intro_template: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setProfile({
      name: user.name || '',
      company_name: user.company_name || '',
      buying_area: user.buying_area || '',
      twilio_number: user.twilio_number || '',
      twilio_sid: '',
      twilio_auth_token: '',
      handoff_retention_days: user.handoff_retention_days ?? 30,
    });
  }, [user]);

  useEffect(() => {
    if (campaigns[0]) setCampaign({ name: campaigns[0].name, intro_template: campaigns[0].intro_template });
  }, [campaigns]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = { ...profile };
      if (!updates.twilio_sid) delete updates.twilio_sid;
      if (!updates.twilio_auth_token) delete updates.twilio_auth_token;
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(updates) });
      if (campaign.intro_template && !campaigns[0]) {
        await apiFetch('/users/me/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
      }
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function restoreLead(id) {
    setRestoring(id);
    try {
      await apiFetch(`/leads/${id}/restore`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      refetchDeleted();
    } finally {
      setRestoring(null);
    }
  }

  function daysUntilGone(deletedAt) {
    const gone = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((gone - Date.now()) / (24 * 60 * 60 * 1000)));
  }

  const inputClass = 'w-full bg-dim/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="p-8 max-w-xl">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-8">Settings</h1>

      <form onSubmit={saveProfile} className="space-y-8">

        {/* Profile */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold text-text-primary mb-5">Your Profile</h2>
          <div className="space-y-4">
            {[
              { key: 'name',         label: 'Your Name',    placeholder: 'Brandon Zeller' },
              { key: 'company_name', label: 'Company Name', placeholder: 'Zeller Properties' },
              { key: 'buying_area',  label: 'Buying Area',  placeholder: 'Columbus, OH' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
                <input
                  type="text"
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Twilio */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold text-text-primary mb-1">Twilio SMS</h2>
          <p className="text-xs text-muted mb-5">Your Twilio credentials so AI can text sellers on your behalf.</p>
          <div className="space-y-4">
            {[
              { key: 'twilio_number',     label: 'Twilio Phone Number', placeholder: '+16145550000',                      type: 'text',     mono: false },
              { key: 'twilio_sid',        label: 'Account SID',         placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'text',     mono: true  },
              { key: 'twilio_auth_token', label: 'Auth Token',          placeholder: '••••••••••••••••',                  type: 'password', mono: true  },
            ].map(({ key, label, placeholder, type, mono }) => (
              <div key={key}>
                <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
                <input
                  type={type}
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className={`${inputClass}${mono ? ' font-mono' : ''}`}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Intro message */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">Intro Message Template</h2>
          </div>
          <p className="text-xs text-muted mb-5">
            First message AI sends to new leads. Use {'{{name}}'}, {'{{address}}'}, {'{{wholesaler}}'} as variables.
          </p>
          <textarea
            value={campaign.intro_template}
            onChange={e => setCampaign(c => ({ ...c, intro_template: e.target.value }))}
            placeholder={`Hey {{name}}, this is {{wholesaler}}! I saw your property at {{address}} and wanted to reach out — we buy houses in the area and might be able to help. Is this still something you're looking to sell?`}
            rows={5}
            className="w-full bg-dim/5 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none leading-relaxed"
          />
        </section>

        {/* Lead Retention */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold text-text-primary mb-1">Lead Retention</h2>
          <p className="text-xs text-muted mb-5">Handed Off leads are automatically moved to Recently Deleted after this many days of inactivity.</p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={365}
              value={profile.handoff_retention_days}
              onChange={e => setProfile(p => ({ ...p, handoff_retention_days: Number(e.target.value) }))}
              className={`${inputClass} w-28`}
            />
            <span className="text-sm text-text-secondary">days</span>
          </div>
          <p className="text-xs text-muted mt-3">Leads in Recently Deleted are permanently removed after 30 days.</p>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent text-bg font-semibold py-3 rounded-xl text-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saved ? <><CheckCircle size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Settings</>}
        </button>
      </form>

      {/* Plan & Billing */}
      <section className="glass rounded-2xl p-6 mt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-text-primary">Plan &amp; Billing</h2>
          {user?.plan !== 'starter' && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-text-secondary transition-colors"
            >
              <ExternalLink size={12} />
              {portalLoading ? 'Opening...' : 'Manage billing'}
            </button>
          )}
        </div>

        {justUpgraded && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-2">
            <CheckCircle size={13} /> You're all set — your plan has been upgraded.
          </div>
        )}

        {/* Current plan */}
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/15 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-text-primary text-sm capitalize">{user?.plan ?? 'Starter'}</p>
              <p className="text-xs text-muted mt-0.5">
                {user?.plan === 'growth' ? '$397 / month · 2,000 contacts'
                  : user?.plan === 'pro'  ? '$697 / month · Unlimited contacts'
                  : '$197 / month · 500 contacts'}
              </p>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-accent/15 text-accent">Active</span>
          </div>
          <ul className="space-y-1.5">
            {['AI SMS conversations', 'Kanban pipeline', 'CSV import', 'Follow-up scheduler', 'Email support'].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                <Check size={11} className="text-accent shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Growth — live upgrade */}
        {user?.plan === 'starter' && (
          <div className="p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-text-primary text-sm">Growth</p>
                <p className="text-xs text-muted mt-0.5">$397 / month · 2,000 contacts</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {['Everything in Starter', 'Priority support', 'CRM integrations', 'Campaign analytics', 'Custom intro templates'].map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Check size={11} className="text-muted shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => startCheckout('growth')}
              disabled={checkoutLoading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-accent text-bg hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              {checkoutLoading ? 'Redirecting...' : 'Upgrade to Growth — $397/mo'}
            </button>
          </div>
        )}
      </section>

      {/* Recently Deleted */}
      <section className="glass rounded-2xl p-6 mt-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-semibold text-text-primary">Recently Deleted</h2>
            <p className="text-xs text-muted mt-0.5">Leads here are permanently removed after 30 days.</p>
          </div>
          {deletedLeads.length > 0 && (
            <span className="text-xs text-muted bg-dim/5 px-2 py-0.5 rounded-full">{deletedLeads.length}</span>
          )}
        </div>

        {deletedLeads.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">No recently deleted leads</p>
        ) : (
          <div className="space-y-2">
            {deletedLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-dim/3 border border-border">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{lead.name}</p>
                  {lead.address && <p className="text-xs text-muted truncate">{lead.address}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted">{daysUntilGone(lead.deleted_at)}d left</span>
                  <button
                    onClick={() => restoreLead(lead.id)}
                    disabled={restoring === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/25 hover:bg-accent/8 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={11} />
                    {restoring === lead.id ? 'Restoring…' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* App Appearance */}
      <section className="glass rounded-2xl p-6 mt-8">
        <h2 className="font-display font-semibold text-text-primary mb-5">App Appearance</h2>
        <p className="text-xs text-text-secondary mb-4">Mode</p>
        <div className="flex gap-3">
          {[
            { value: 'dark',  label: 'Dark',  icon: Moon },
            { value: 'light', label: 'Light', icon: Sun  },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => theme !== value && toggleTheme()}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border transition-all duration-150
                ${theme === value
                  ? 'border-accent/40 bg-accent/8 text-accent'
                  : 'border-border bg-dim/3 text-text-secondary hover:border-accent/20 hover:bg-dim/5'
                }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Account */}
      <div className="mt-10 pt-8 border-t border-border">
        <h2 className="font-display font-semibold text-text-primary mb-4">Account</h2>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
