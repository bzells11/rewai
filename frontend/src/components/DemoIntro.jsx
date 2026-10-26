import { useEffect, useState } from 'react';

// Plays once per browser tab session: the logo resolves in, then the whole
// screen fades away to reveal the app already rendered underneath.
const SEEN_KEY = 'rewai-demo-intro-seen';
const HOLD_MS = 1900;  // logo + accent line finish animating
const FADE_MS = 700;   // overlay fade out

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}

function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked, intro just replays */ }
}

export default function DemoIntro() {
  const [phase, setPhase] = useState(() => (alreadySeen() ? 'done' : 'waiting'));

  useEffect(() => {
    if (phase !== 'waiting') return;
    markSeen();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Start once the logo is decoded so it never pops in half-loaded.
    const img = new Image();
    img.src = '/logo-white.png';
    let started = false;
    const start = () => { if (!started) { started = true; setPhase(reduced ? 'leaving' : 'playing'); } };
    img.onload = start;
    img.decode?.().then(start, start);
    const fallback = setTimeout(start, 800);
    return () => clearTimeout(fallback);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing') {
      const t = setTimeout(() => setPhase('leaving'), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'leaving') {
      const t = setTimeout(() => setPhase('done'), FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === 'done') return null;

  const skip = () => { if (phase !== 'leaving') setPhase('leaving'); };

  return (
    <div
      onClick={skip}
      aria-hidden="true"
      className={`demo-intro ${phase === 'leaving' ? 'demo-intro-leave' : ''}`}
      style={{ '--intro-fade': `${FADE_MS}ms` }}
    >
      {phase !== 'waiting' && (
        <div className="flex flex-col items-center">
          <div className="demo-intro-glow" />
          <img
            src="/logo-white.png"
            alt=""
            className="demo-intro-logo h-12 sm:h-14 w-auto"
          />
          <div className="demo-intro-line mt-6 rounded-full" />
          <p className="demo-intro-tag mt-5 text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">
            Live demo
          </p>
        </div>
      )}
    </div>
  );
}
