import { useNavigate } from 'react-router-dom';
import {
  Bot, Flame, Calendar, LayoutDashboard,
  Upload, UserCheck, Check, ArrowRight,
  MessageSquare, X,
} from 'lucide-react';

/* ─── data ─────────────────────────────────────── */

const FEATURES = [
  {
    icon: Bot,
    color: '#38bdf8',
    title: 'AI Conversations',
    desc: 'Claude AI texts your sellers, handles objections, and qualifies leads 24/7, in your voice, never robotic.',
  },
  {
    icon: Flame,
    color: '#f87171',
    title: 'Hot Lead Detection',
    desc: 'When a seller signals intent, REW AI flags them hot instantly and surfaces them to the top of your pipeline.',
  },
  {
    icon: Calendar,
    color: '#a78bfa',
    title: 'Auto Follow-Up',
    desc: 'Scheduled touches on day 1, 3, 7, 21, 45, and 90. Most deals close on follow-up 5+. REW AI never gives up.',
  },
  {
    icon: LayoutDashboard,
    color: '#34d399',
    title: 'Kanban Pipeline',
    desc: 'Drag leads from cold to warm to hot. See every conversation at a glance. No more scattered spreadsheets.',
  },
  {
    icon: Upload,
    color: '#fbbf24',
    title: 'Instant CSV Import',
    desc: 'Drop any list from BatchLeads, DealMachine, or your skip trace tool. Leads go live in seconds.',
  },
  {
    icon: UserCheck,
    color: '#38bdf8',
    title: 'Manual Takeover',
    desc: 'Step in on any thread with one click. AI hands off cleanly and you close. No awkward context switching.',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Import your leads',
    desc: 'Upload a CSV or add leads one by one. REW AI reads your list, normalizes phone numbers, and queues follow-up schedules automatically.',
  },
  {
    num: '02',
    title: 'AI texts your sellers',
    desc: 'Your AI sends a personalized intro message and handles the full back-and-forth: qualifying, following up, answering questions, handling objections.',
  },
  {
    num: '03',
    title: 'You close the hot ones',
    desc: 'When a seller is ready to talk numbers, REW AI flags them hot and hands the thread to you. One click to take over.',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$197',
    contacts: '500 contacts',
    highlight: false,
    features: [
      'AI SMS conversations',
      'Kanban pipeline',
      'CSV import',
      'Follow-up scheduler',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$397',
    contacts: '2,000 contacts',
    highlight: true,
    features: [
      'Everything in Starter',
      'Priority support',
      'CRM integrations (coming soon)',
      'Campaign analytics',
      'Custom intro templates',
    ],
  },
  {
    name: 'Pro',
    price: '$697',
    contacts: 'Unlimited contacts',
    highlight: false,
    features: [
      'Everything in Growth',
      'Dedicated onboarding call',
      'Webhook & Zapier access',
      'White-glove setup',
      'SLA support',
    ],
  },
];

const BEFORE = [
  'Send 2 texts, get no reply, give up',
  'Miss hot leads buried in your inbox',
  'Manually track follow-ups in a spreadsheet',
  'Lose deals to slower competitors who followed up',
];

const AFTER = [
  'AI follows up 6 times across 90 days',
  'Hot leads surface automatically, instantly',
  'Full pipeline tracked and visualized',
  'Close deals while you sleep',
];

/* ─── component ─────────────────────────────────── */

export default function Landing() {
  const navigate = useNavigate();

  const ctaBtn = 'inline-flex items-center gap-2 font-semibold transition-all duration-150 active:scale-95';

  return (
    <div className="min-h-screen bg-bg text-text-primary overflow-x-hidden">
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow-pulse { 0%,100% { box-shadow: 0 0 18px rgba(56,189,248,0.15); } 50% { box-shadow: 0 0 28px rgba(56,189,248,0.28); } }
        .float { animation: float 4s ease-in-out infinite; }
        .glow-cta { animation: glow-pulse 2.5s ease-in-out infinite; }
        .fade-up { animation: fade-up 0.6s ease both; }
        .fade-up-1 { animation: fade-up 0.6s 0.1s ease both; }
        .fade-up-2 { animation: fade-up 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fade-up 0.6s 0.3s ease both; }
        .feature-cell:hover { background: rgba(255,255,255,0.03); }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-dim/6 bg-bg/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-white.png" alt="REW AI" className="h-7 w-auto logo-white" />
            <span className="font-display font-bold text-lg tracking-tight">REW AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-text-primary transition-colors duration-150">Features</a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors duration-150">How it works</a>
            <a href="#pricing" className="hover:text-text-primary transition-colors duration-150">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 px-3 py-2"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/login?signup=1')}
              className="glow-cta text-sm font-semibold px-4 py-2 rounded-lg text-bg transition-all duration-150 hover:opacity-90 bg-accent"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.06) 0%, transparent 70%)' }} />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <h1 className="fade-up-1 font-display font-bold text-5xl lg:text-[3.75rem] leading-[1.06] tracking-tight mb-6">
              Your AI that follows up with{' '}
              <span style={{ background: 'linear-gradient(135deg, #94a3b8, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                motivated sellers
              </span>{' '}
              so you never miss a deal
            </h1>

            <p className="fade-up-2 text-lg text-text-secondary leading-relaxed mb-10 max-w-lg">
              REW AI handles every follow-up conversation with your leads, qualifying sellers, answering questions, and surfacing hot deals automatically.
            </p>

            <div className="fade-up-3 flex flex-col sm:flex-row items-start gap-4">
              <button
                onClick={() => navigate('/login?signup=1')}
                className={`${ctaBtn} glow-cta text-slate-900 px-7 py-3.5 rounded-xl text-sm`}
                style={{ background: '#f1f5f9' }}
              >
                Start for free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors duration-150 py-3.5"
              >
                Already have an account? Sign in →
              </button>
            </div>

            <p className="text-xs text-muted mt-5">No credit card required · Cancel anytime</p>
          </div>

          {/* Right: SMS mock-up */}
          <div className="hidden lg:flex justify-center">
            <div className="float relative w-80">
              <div className="rounded-3xl border border-dim/10 bg-dim/3 backdrop-blur-xl overflow-hidden shadow-2xl"
                style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)' }}>

                <div className="bg-dim/4 px-5 py-3 flex items-center gap-3 border-b border-dim/6">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-text-secondary font-medium">AI Managing · John Smith</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-medium">🔥 Hot</span>
                </div>

                <div className="p-4 space-y-3 bg-bg/60">
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-accent text-bg text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-sm">
                        Hey John! This is Brandon from REW AI. I saw your property at 742 Maple Ave and wanted to reach out. Still looking to sell?
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1 pr-1">
                        <Bot size={9} className="text-accent/50" />
                        <span className="text-[9px] text-muted">AI · 9:02 AM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-dim/6 border border-dim/8 text-text-primary text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                        Yes I am. Been trying to sell for months. What's your offer process?
                      </div>
                      <span className="text-[9px] text-muted pl-1 mt-1 block">John · 9:14 AM</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="bg-accent text-bg text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-br-sm">
                        Great! We buy as-is, all cash, close in as little as 14 days. No repairs, no fees. Can I get you a quick offer this week?
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1 pr-1">
                        <Bot size={9} className="text-accent/50" />
                        <span className="text-[9px] text-muted">AI · 9:14 AM</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="bg-dim/6 border border-dim/8 text-text-primary text-xs leading-relaxed px-3.5 py-2.5 rounded-2xl rounded-bl-sm">
                        Yes please! I'm very motivated to sell ASAP.
                      </div>
                      <span className="text-[9px] text-muted pl-1 mt-1 block">John · 9:16 AM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 mt-2">
                    <Flame size={13} className="text-red-400 shrink-0" />
                    <span className="text-[11px] text-red-400 font-medium">Hot lead flagged, ready to hand off to you</span>
                  </div>
                </div>
              </div>

              <div className="absolute -right-10 top-10 bg-dim/5 border border-dim/10 backdrop-blur rounded-xl px-3.5 py-2.5 shadow-xl">
                <p className="text-[10px] text-muted mb-0.5">Follow-ups sent</p>
                <p className="font-display font-bold text-lg text-text-primary">6 / 6</p>
              </div>
              <div className="absolute -left-10 bottom-16 bg-dim/5 border border-dim/10 backdrop-blur rounded-xl px-3.5 py-2.5 shadow-xl">
                <p className="text-[10px] text-muted mb-0.5">Response rate</p>
                <p className="font-display font-bold text-lg text-accent">84%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-dim/6 bg-dim/[0.015]">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 divide-x divide-white/6">
          {[
            { value: '6×', label: 'More follow-ups than the average wholesaler' },
            { value: '80%', label: 'Of deals close on follow-up #5 or later' },
            { value: '24/7', label: 'AI works nights, weekends, and holidays' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-8">
              <p className="font-display font-bold text-3xl text-accent mb-1">{value}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem / Solution ── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-accent tracking-widest uppercase mb-3">The problem</p>
            <h2 className="font-display font-bold text-4xl text-text-primary mb-4">
              80% of deals need 5+ follow-ups.
            </h2>
            <p className="text-xl text-text-secondary">Most wholesalers give up after 2.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-red-500/15 bg-red-500/4 p-7">
              <p className="font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                  <X size={11} className="text-red-400" />
                </span>
                Without REW AI
              </p>
              <ul className="space-y-3.5">
                {BEFORE.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                    <X size={13} className="text-red-400/60 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-accent/15 bg-accent/[0.04] p-7">
              <p className="font-display font-semibold text-text-primary mb-5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
                  <Check size={11} className="text-accent" />
                </span>
                With REW AI
              </p>
              <ul className="space-y-3.5">
                {AFTER.map(item => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                    <Check size={13} className="text-accent/60 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-6 border-t border-dim/6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="text-xs text-accent tracking-widest uppercase mb-4">Features</p>
            <h2 className="font-display font-bold text-4xl text-text-primary mb-4">
              Everything you need to scale follow-up
            </h2>
            <p className="text-text-secondary max-w-lg">
              Most deals die because nobody followed up. REW AI makes sure that never happens again.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 border border-dim/8 rounded-2xl overflow-hidden divide-y divide-dim/8 md:divide-y-0"
            style={{ background: 'rgba(255,255,255,0.01)' }}>
            {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
              <div
                key={title}
                className={`feature-cell p-8 transition-colors duration-200
                  ${i % 3 !== 2 ? 'lg:border-r border-dim/8' : ''}
                  ${i < 3 ? 'md:border-b border-dim/8' : ''}
                `}
              >
                <Icon size={22} className="mb-5" style={{ color }} />
                <h3 className="font-display font-semibold text-text-primary mb-2 text-[15px]">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-28 px-6 border-t border-dim/6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-xs text-accent tracking-widest uppercase mb-4">How it works</p>
            <h2 className="font-display font-bold text-4xl text-text-primary mb-4">
              Up and running in minutes
            </h2>
            <p className="text-text-secondary">
              No complex setup. Import your list, connect your Twilio number, and AI handles the rest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map(step => (
              <div key={step.num}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-display font-bold text-4xl text-accent leading-none select-none">
                    {step.num}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(56,189,248,0.2)' }} />
                </div>
                <h3 className="font-display font-semibold text-text-primary text-lg mb-3">{step.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-28 px-6 border-t border-dim/6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-xs text-accent tracking-widest uppercase mb-4">Pricing</p>
            <h2 className="font-display font-bold text-4xl text-text-primary mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-text-secondary">Upgrade or cancel anytime. No lock-in.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className="relative rounded-2xl p-7 flex flex-col transition-all duration-200"
                style={{
                  border: plan.highlight ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
                  background: plan.highlight ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap"
                    style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)' }}>
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <p className="font-display font-semibold text-text-primary mb-3">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-1.5">
                    <span className="font-display font-bold text-5xl text-text-primary">{plan.price}</span>
                    <span className="text-muted text-sm pb-2">/mo</span>
                  </div>
                  <p className="text-xs text-muted">{plan.contacts}</p>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <Check size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/login?signup=1')}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90
                    ${plan.highlight ? 'glow-cta bg-accent text-bg' : 'text-text-secondary'}`}
                  style={!plan.highlight ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' } : {}}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-28 px-6 border-t border-dim/6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative inline-block mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <MessageSquare size={26} className="text-text-secondary" />
            </div>
          </div>

          <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mb-5 leading-tight">
            Stop losing deals to<br />slow follow-up
          </h2>
          <p className="text-lg text-text-secondary mb-10 leading-relaxed">
            Every day you wait, motivated sellers are talking to someone else. REW AI keeps your pipeline moving 24/7, so you don't have to.
          </p>

          <button
            onClick={() => navigate('/login?signup=1')}
            className={`${ctaBtn} glow-cta text-slate-900 px-9 py-4 rounded-xl text-base`}
            style={{ background: '#f1f5f9' }}
          >
            Start for free today <ArrowRight size={18} />
          </button>
          <p className="text-xs text-muted mt-5">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-dim/6 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="REW AI" className="h-6 w-auto logo-img" />
            <span className="font-display font-semibold text-sm text-text-primary">REW AI</span>
          </div>
          <p className="text-xs text-muted">© 2026 REW AI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-xs text-muted">
            <a href="#features" className="hover:text-text-secondary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-text-secondary transition-colors">Pricing</a>
            <button onClick={() => navigate('/login')} className="hover:text-text-secondary transition-colors">Sign in</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
