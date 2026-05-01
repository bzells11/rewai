import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/supabase';
import { Save, CheckCircle, MessageSquare } from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => apiFetch('/users/me') });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns'], queryFn: () => apiFetch('/users/me/campaigns') });

  const [profile, setProfile] = useState({ name: '', company_name: '', buying_area: '', twilio_number: '', twilio_sid: '', twilio_auth_token: '' });
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
    });
  }, [user]);

  useEffect(() => {
    if (campaigns[0]) setCampaign({
      name: campaigns[0].name,
      intro_template: campaigns[0].intro_template,
    });
  }, [campaigns]);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = { ...profile };
      if (!updates.twilio_sid) delete updates.twilio_sid;
      if (!updates.twilio_auth_token) delete updates.twilio_auth_token;
      await apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(updates) });

      if (campaign.intro_template) {
        if (campaigns[0]) {
          // Update existing campaign (not yet exposed in API — create new for now)
        } else {
          await apiFetch('/users/me/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="font-display font-bold text-2xl text-text-primary mb-8">Settings</h1>

      <form onSubmit={saveProfile} className="space-y-8">
        {/* Profile */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold text-text-primary mb-5">Your Profile</h2>
          <div className="space-y-4">
            {[
              { key: 'name', label: 'Your Name', placeholder: 'Brandon Zeller' },
              { key: 'company_name', label: 'Company Name', placeholder: 'Zeller Properties' },
              { key: 'buying_area', label: 'Buying Area', placeholder: 'Columbus, OH' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
                <input
                  type="text"
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
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
              { key: 'twilio_number', label: 'Twilio Phone Number', placeholder: '+16145550000', type: 'text' },
              { key: 'twilio_sid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'text' },
              { key: 'twilio_auth_token', label: 'Auth Token', placeholder: '••••••••••••••••', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
                <input
                  type={type}
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors font-mono"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Campaign / Intro message */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-text-primary">Intro Message Template</h2>
          </div>
          <p className="text-xs text-muted mb-5">
            This is the first message AI sends to new leads. Use {'{{name}}'}, {'{{address}}'}, {'{{wholesaler}}'} as variables.
          </p>
          <textarea
            value={campaign.intro_template}
            onChange={e => setCampaign(c => ({ ...c, intro_template: e.target.value }))}
            placeholder={`Hey {{name}}, this is {{wholesaler}}! I saw your property at {{address}} and wanted to reach out — we buy houses in the area and might be able to help. Is this still something you're looking to sell?`}
            rows={5}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors resize-none leading-relaxed"
          />
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent text-bg font-semibold py-3 rounded-xl text-sm hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saved ? (
            <><CheckCircle size={16} /> Saved!</>
          ) : saving ? (
            'Saving...'
          ) : (
            <><Save size={16} /> Save Settings</>
          )}
        </button>
      </form>
    </div>
  );
}
