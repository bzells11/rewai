import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Send, MessagesSquare, Check, Loader } from 'lucide-react';
import { apiFetch } from '../lib/supabase';

const STEPS = [
  { key: 'load',    label: 'Load sample leads',  icon: Upload,        action: '/load',    hint: '25 fake property owners' },
  { key: 'send',    label: 'Send campaign',      icon: Send,          action: '/send',    hint: 'Simulated intro texts' },
  { key: 'replies', label: 'Simulate replies',   icon: MessagesSquare, action: '/replies', hint: 'Watch the AI sort each lead' },
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
  const enabled = {
    load:    !done.load,
    send:    done.load && !done.send,
    replies: done.send && !state?.replies?.started,
  };

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

  return (
    <div className="mb-5 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-accent mr-1">Try it:</span>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = done[step.key];
          const isBusy = busy === step.key || (step.key === 'replies' && replying);
          const canRun = enabled[step.key] && !busy;
          return (
            <button
              key={step.key}
              onClick={() => canRun && run(step)}
              disabled={!canRun}
              title={step.hint}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                ${isDone
                  ? 'bg-emerald-500/15 text-emerald-600 cursor-default'
                  : canRun
                    ? 'bg-accent text-bg hover:bg-accent/90 shadow-sm'
                    : 'bg-dim/5 text-muted cursor-not-allowed'
                }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/10">
                {i + 1}
              </span>
              {isBusy ? <Loader size={12} className="animate-spin" /> : isDone ? <Check size={12} /> : <Icon size={12} />}
              {step.label}
            </button>
          );
        })}

        <span className="ml-auto text-xs text-muted">
          {replying && `${state.replies.received} of ${state.replies.total} replies received`}
          {allDone && 'Done. Open Conversations to read the threads, or reset to run it again.'}
          {!state?.loaded && 'Start with step 1. Every step is simulated, nothing is really sent.'}
          {state?.loaded && !done.send && 'Leads are in the Cold column. Send the campaign to text them.'}
          {done.send && !state?.replies?.started && 'Texts sent. Now simulate the owners replying.'}
        </span>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
