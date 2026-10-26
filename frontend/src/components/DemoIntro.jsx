import { useEffect, useState } from 'react';

// Plays on every page load, since a refresh also restarts the demo: the logo
// resolves in, then the whole screen fades away to reveal the app already
// rendered underneath. On phones and tablets it then stays up with a
// "use a computer" message, since the demo is built for desktop.
const HOLD_MS = 2700;  // everything is in by 1.5s, then hold on the full logo
const FADE_MS = 700;   // overlay fade out

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac, but Macs have no touch points
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 1024;
}

export default function DemoIntro() {
  const [mobile] = useState(isMobileDevice);
  const [phase, setPhase] = useState('waiting');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Start once the logo is decoded so it never pops in half-loaded.
    const img = new Image();
    img.src = '/logo-white.png';
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (reduced) setPhase(mobile ? 'blocked' : 'leaving');
      else setPhase('playing');
    };
    img.onload = start;
    img.decode?.().then(start, start);
    const fallback = setTimeout(start, 800);
    return () => clearTimeout(fallback);
  }, [phase, mobile]);

  useEffect(() => {
    if (phase === 'playing') {
      const t = setTimeout(() => setPhase(mobile ? 'blocked' : 'leaving'), HOLD_MS);
      return () => clearTimeout(t);
    }
    if (phase === 'leaving') {
      const t = setTimeout(() => setPhase('done'), FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase, mobile]);

  if (phase === 'done') return null;

  const skip = () => { if (!mobile && phase !== 'leaving') setPhase('leaving'); };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch { /* clipboard blocked, the URL is still in the address bar */ }
  };

  return (
    <div
      onClick={skip}
      aria-hidden={phase !== 'blocked'}
      className={`demo-intro ${phase === 'leaving' ? 'demo-intro-leave' : ''} ${mobile ? 'demo-intro-mobile' : ''}`}
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
          {phase === 'blocked' ? (
            <div className="demo-intro-blocked mt-5 px-8 max-w-xs text-center">
              <p className="text-base font-semibold text-white">Best on a computer</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                The REW AI demo is built for desktop. Open this link on a laptop or PC to try it out.
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="mt-6 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white active:bg-white/10"
              >
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          ) : (
            <p className="demo-intro-tag mt-5 text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">
              Live demo
            </p>
          )}
        </div>
      )}
    </div>
  );
}
