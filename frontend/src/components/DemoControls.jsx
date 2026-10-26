import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Send, MessagesSquare, Check, Loader, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/supabase';

const STEPS = [
  { key: 'load',    label: 'Load sample leads', icon: Upload,         action: '/load',    hint: '25 fake property owners' },
  { key: 'send',    label: 'Send campaign',     icon: Send,           action: '/send',    hint: 'Simulated intro texts' },
  { key: 'replies', label: 'Simulate replies',  icon: MessagesSquare, action: '/replies', hint: 'Watch the AI sort each lead' },
];

// One guide entry per stage of the walkthrough. `focus` names the board
// columns to highlight so people know where to look after each step.
const GUIDE = {
  load: {
    eyebrow: 'Step 1 of 3',
    title: 'Bring in your leads',
    body: 'In the real app you upload a CSV of property owners from your list provider. Here we load 25 fake owners so you can see the whole flow.',
    watch: 'They land in the Cold column.',
    focus: ['cold'],
  },
  send: {
    eyebrow: 'Step 2 of 3',
    title: 'Text every lead',
    body: 'REW AI writes a personal intro text for each cold lead and sends them out spaced apart, like a person would. In the demo nothing actually goes out.',
    watch: 'Leads move from Cold to Active once they have been texted.',
    focus: ['cold', 'active'],
  },
  replies: {
    eyebrow: 'Step 3 of 3',
    title: 'Let the AI sort the replies',
    body: 'Owners start texting back. REW AI reads each reply, answers it, and decides if the seller is warm, hot, not interested, or wants to be left alone.',
    watch: 'Leads leave Active and drop into the column that fits their reply.',
    focus: ['active'],
  },
  replying: {
    eyebrow: 'Live',
    title: 'Replies are coming in',
    body: 'Each card moves the moment its reply is read. Nobody is sorting these by hand.',
    focus: ['warm', 'hot', 'not_interested', 'do_not_contact'],
  },
  done: {
    eyebrow: 'Done',
    title: 'That is the whole loop',
    body: 'Hot leads are the ones to call first. Click any card to read the conversation and see why it was sorted there, or open Conversations to see every thread.',
    focus: ['hot'],
  },
};

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
  const guide = GUIDE[replying ? 'replying' : allDone ? 'done' : nextStep || 'replying'];
  const focus = state ? guide.focus.join(' ') : '';

  // The board highlights these columns via CSS, so it needs no demo state of its own.
  useEffect(() => {
    if (focus) document.documentElement.dataset.demoFocus = focus;
    return () => { delete document.documentElement.dataset.demoFocus; };
  }, [focus]);

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

        <span className="ml-auto text-xs text-muted">Nothing is really sent. Every step is simulated.</span>
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-accent/15">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {guide.eyebrow}
          {replying && <span className="ml-2 normal-case tracking-normal text-muted font-medium">{state.replies.received} of {state.replies.total} replies read</span>}
        </p>
        <p className="mt-1 text-sm font-semibold text-text-primary">{guide.title}</p>
        <p className="mt-1 text-sm text-muted leading-relaxed max-w-3xl">
          {guide.body}
          {guide.watch && <span className="text-text-primary"> {guide.watch}</span>}
        </p>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
