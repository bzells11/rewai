import { createClient } from '@supabase/supabase-js';
import { DEMO_MODE, getDemoSessionId } from './demo';

// In demo mode there is no Supabase account. A placeholder client keeps imports working.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://demo.invalid',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo'
);

export async function getAuthHeader() {
  if (DEMO_MODE) return { 'X-Demo-Session': getDemoSessionId() };
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const headers = await getAuthHeader();
  const base = DEMO_MODE ? `${API}/demo` : API;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...headers, ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}
