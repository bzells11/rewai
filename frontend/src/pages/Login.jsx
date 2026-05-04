import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState(searchParams.get('signup') === '1' ? 'signup' : 'login');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  const input = 'w-full rounded-md px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-colors';
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Left — brand panel ── */}
      <div
        className="hidden md:flex w-1/2 items-center justify-center px-16 relative"
        style={{ background: '#080a0c' }}
      >
        <div className="flex flex-col items-center relative z-10">

          {/* radial glow behind logo */}
          <div style={{
            position: 'absolute',
            width: 320,
            height: 320,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <button
            onClick={() => navigate('/')}
            className="relative hover:opacity-80 transition-opacity"
          >
            <img src="/logo-white.png" alt="REW AI" className="h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </button>

          {/* teal accent line */}
          <div className="mt-5 rounded-full" style={{ width: 32, height: 2, background: '#0ea5e9' }} />

          <p className="mt-7 font-display font-semibold text-white text-center tracking-tight" style={{ fontSize: 22 }}>
            Your deals are waiting.
          </p>
          <p className="mt-2.5 text-center tracking-wide" style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
            AI-powered wholesaling. Built for closers.
          </p>

        </div>
      </div>

      {/* vertical divider */}
      <div className="hidden md:block w-px flex-shrink-0 self-stretch" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* ── Right — form panel ── */}
      <div
        className="flex-1 flex items-center justify-center px-8"
        style={{ background: '#111827' }}
      >
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <button
            onClick={() => navigate('/')}
            className="flex md:hidden items-center gap-2.5 mb-10 hover:opacity-75 transition-opacity"
          >
            <img src="/logo-white.png" alt="REW AI" className="h-6 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </button>

          <h1 className="font-display font-semibold text-white tracking-tight leading-tight mb-8" style={{ fontSize: 28 }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-md text-sm font-medium text-white transition-all duration-150 disabled:opacity-50 mb-5"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.20)' }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting...' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* First name — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>First name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={input}
                  style={inputStyle}
                  placeholder="First name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={input}
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-xs transition-colors"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className={input}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {error   && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-green-400">{success}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              style={{
                background: '#ffffff',
                color: '#0a0b0d',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
              }}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.30)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); setFirstName(''); }}
              className="transition-colors underline underline-offset-2"
              style={{ color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.85)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
