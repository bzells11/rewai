// Demo mode: set VITE_DEMO_MODE=true at build time for the public demo deployment.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const KEY = 'rewai-demo-session';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'demo-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDemoSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) { id = newId(); localStorage.setItem(KEY, id); }
  return id;
}

export function rotateDemoSessionId() {
  const id = newId();
  localStorage.setItem(KEY, id);
  return id;
}
