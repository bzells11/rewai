import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Send, MessagesSquare, Check, Loader, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/supabase';

const STEPS = [
  { key: 'load',    label: 'Load sample leads', icon: Upload,         action: '/load',    hint: '25 fake property owners' },
  { key: 'send',    label: 'Send campaign',     icon: Send,           action: '/send',    hint: 'Simulated intro texts' },
  { key: 'replies', label: 'Simulate replies',  icon: MessagesSquare, action: '/replies', hint: 'Watch the AI sort each lead' },
];

export default function DemoControls() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const { data: state } = useQuery({
    queryKey: ['demo-state'],
    queryFn: () => apiFetch('/state'),
    refetchInterval: (q) => (q.state.data?.replies?.started && !q.state.data?.replies?.done ? 1000 : 4000),
  });

  const replying = state?.replies?.started && !state?.replies?.done;
  const done = {
    load:    !!state?.loaded,
    send:    !!state?.campaign_sent,
    replies: !!state?.replies?.done,
  };
  // Exactly one step is the next action at any time, and it is the one we spotlight.
  const nextStep = !done.load ? 'load' : !done.send ? 'send' : !state?.replies?.started ? 'replies' : null;

  async function run(step) {
    setBusy(step.key);
    setError('');
    try {
      await apiFetch(step.action, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['demo-state'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const allDone = done.load && done.send && done.replies;
  const hint =
    replying ? `${state.replies.received} of ${state.replies.total} replies received` :
    allDone  ? 'Done. Open Conversations to read the threads, or reset to run it again.' :
    !state?.loaded ? 'Nothing is really sent. Every step is simulated.' :
    !done.send ? 'Leads are in the Cold column. Send the campaign to text them.' :
    'Texts sent. Now simulate the owners replying.';

  return (
    <div className="mb-5 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-semibold text-accent shrink-0">Try it:</span>

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = done[step.key];
          const isNext = nextStep === step.key;
          const isBusy = busy === step.key || (step.key === 'replies' && replying);
          const canRun = isNext && !busy;

          if (isDone) {
            return (
              <span
                key={step.key}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-600"
              >
                <Check size={12} />
                {step.label}
              </span>
            );
          }

          if (isNext) {
            return (
              <button
                key={step.key}
                onClick={() => canRun && run(step)}
                disabled={!canRun}
                title={step.hint}
                className="demo-next-step flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-xl text-sm font-bold bg-accent text-bg hover:bg-accent/90 transition-all duration-150 disabled:opacity-70"
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold bg-black/15 shrink-0">
                  {i + 1}
                </span>
                {isBusy ? <Loader size={14} className="animate-spin" /> : <Icon size={14} />}
                {step.label}
                {!isBusy && <ArrowRight size={14} className="demo-next-arrow" />}
              </button>
            );
          }

          return (
            <span
              key={step.key}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-dim/5 text-muted"
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-dim/10 shrink-0">
                {i + 1}
              </span>
              {step.label}
            </span>
          );
        })}

        <span className="ml-auto text-xs text-muted">{hint}</span>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
