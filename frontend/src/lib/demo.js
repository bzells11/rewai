// Demo mode: set VITE_DEMO_MODE=true at build time for the public demo deployment.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// The session id lives only in memory, so every page load gets a fresh sandbox
// and the demo starts over. Abandoned sandboxes expire on the server.
let sessionId = null;

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'demo-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDemoSessionId() {
  if (!sessionId) sessionId = newId();
  return sessionId;
}

export function rotateDemoSessionId() {
  sessionId = newId();
  return sessionId;
}
