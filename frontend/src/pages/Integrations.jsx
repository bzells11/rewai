import { useState } from 'react';
import { Plug, Zap, Check, Clock } from 'lucide-react';

const INTEGRATIONS = [
  {
    id: 'podio',
    name: 'Podio',
    category: 'CRM',
    description: 'Sync leads and conversations directly into your Podio workspace. Push hot leads automatically.',
    color: '#00b0f0',
    initial: 'P',
    popular: true,
    status: 'coming_soon',
  },
  {
    id: 'reisift',
    name: 'REISift',
    category: 'CRM',
    description: 'Import leads from REISift lists and push AI conversation status back as tags and disposition.',
    color: '#6366f1',
    initial: 'RS',
    popular: true,
    status: 'coming_soon',
  },
  {
    id: 'resimpli',
    name: 'REsimpli',
    category: 'CRM',
    description: 'Two-way sync with REsimpli — pull your leads in and push AI summaries and follow-up status out.',
    color: '#f59e0b',
    initial: 'R',
    popular: false,
    status: 'coming_soon',
  },
  {
    id: 'investorfuse',
    name: 'InvestorFuse',
    category: 'CRM',
    description: 'Connect your InvestorFuse pipeline so hot leads surface automatically in your workflow.',
    color: '#10b981',
    initial: 'IF',
    popular: false,
    status: 'coming_soon',
  },
  {
    id: 'freedomsoft',
    name: 'FreedomSoft',
    category: 'CRM',
    description: 'Import FreedomSoft leads and sync conversation outcomes back as dispositions.',
    color: '#ef4444',
    initial: 'FS',
    popular: false,
    status: 'coming_soon',
  },
  {
    id: 'batchleads',
    name: 'BatchLeads',
    category: 'Lead Source',
    description: 'Pull lists directly from BatchLeads skip-traced data into your REW AI pipeline.',
    color: '#8b5cf6',
    initial: 'BL',
    popular: true,
    status: 'coming_soon',
  },
  {
    id: 'dealmachine',
    name: 'DealMachine',
    category: 'Lead Source',
    description: 'Import driving-for-dollars leads from DealMachine and start AI follow-up immediately.',
    color: '#f97316',
    initial: 'DM',
    popular: false,
    status: 'coming_soon',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'Automation',
    description: 'Connect REW AI to 6,000+ apps. Trigger automations when a lead goes hot or opts out.',
    color: '#ff4a00',
    initial: 'Z',
    popular: true,
    status: 'coming_soon',
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    category: 'Automation',
    description: 'Send real-time events to any endpoint when leads reply, go hot, or get handed off.',
    color: '#38bdf8',
    initial: '{}',
    popular: false,
    status: 'coming_soon',
  },
];

const CATEGORIES = ['All', 'CRM', 'Lead Source', 'Automation'];

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [notified, setNotified] = useState({});

  const filtered = activeCategory === 'All'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeCategory);

  function handleNotify(id) {
    setNotified(prev => ({ ...prev, [id]: true }));
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Plug size={15} className="text-accent" />
          </div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Integrations</h1>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
          Connect REW AI to the tools you already use. Keep your existing workflow — REW AI slots in and handles the conversations.
        </p>
      </div>

      {/* Coming soon banner */}
      <div className="flex items-start gap-3 bg-accent/5 border border-accent/15 rounded-xl px-5 py-4 mb-8">
        <Clock size={15} className="text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-text-primary">Integrations are in development</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Click "Notify Me" on any integration and you'll be the first to know when it goes live. Votes help prioritize the build order.
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${activeCategory === cat
                ? 'bg-accent text-bg'
                : 'bg-dim/5 text-text-secondary hover:bg-dim/8 hover:text-text-primary'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            notified={!!notified[integration.id]}
            onNotify={() => handleNotify(integration.id)}
          />
        ))}
      </div>

      {/* Request section */}
      <div className="mt-10 glass rounded-2xl p-6 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-dim/5 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-accent" />
        </div>
        <div>
          <p className="font-display font-semibold text-text-primary text-sm mb-1">Don't see your CRM?</p>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Every wholesaler's stack is different. Let us know what you're using and we'll prioritize it.
          </p>
          <a
            href="mailto:brandonzeller01@gmail.com?subject=REW AI — Integration Request"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            Request an integration →
          </a>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, notified, onNotify }) {
  const { name, category, description, color, initial, popular } = integration;

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4 hover:!transform-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Logo placeholder */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-xs text-white shrink-0"
            style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44`, color }}
          >
            {initial}
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-text-primary leading-tight">{name}</p>
            <p className="text-[11px] text-muted">{category}</p>
          </div>
        </div>

        {popular && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 shrink-0">
            Popular
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary leading-relaxed flex-1">{description}</p>

      {/* Action */}
      <button
        onClick={onNotify}
        disabled={notified}
        className={`w-full py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-center gap-1.5
          ${notified
            ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
            : 'bg-dim/5 border border-border text-text-secondary hover:border-accent/30 hover:text-accent hover:bg-accent/5'
          }`}
      >
        {notified ? (
          <><Check size={12} /> You're on the list</>
        ) : (
          'Notify Me When Available'
        )}
      </button>
    </div>
  );
}
