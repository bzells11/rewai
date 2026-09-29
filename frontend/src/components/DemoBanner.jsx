import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, FlaskConical } from 'lucide-react';
import { apiFetch } from '../lib/supabase';
import { rotateDemoSessionId } from '../lib/demo';

export default function DemoBanner() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  async function reset() {
    if (resetting) return;
    setResetting(true);
    try {
      await apiFetch('/reset', { method: 'POST' });
    } catch {
      // A failed reset on the server is harmless: rotating the session id gives a fresh sandbox anyway.
    }
    rotateDemoSessionId();
    queryClient.clear();
    navigate('/dashboard');
    setResetting(false);
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-2 bg-amber-400 text-amber-950 text-xs font-medium shrink-0">
      <span className="flex items-center gap-2">
        <FlaskConical size={13} />
        Demo with sample data. No real messages are sent.
      </span>
      <button
        onClick={reset}
        disabled={resetting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/10 hover:bg-amber-950/20 transition-colors font-semibold disabled:opacity-50"
      >
        <RotateCcw size={12} className={resetting ? 'animate-spin' : ''} />
        Reset demo
      </button>
    </div>
  );
}
