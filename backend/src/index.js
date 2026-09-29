import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import twilioRoutes from './routes/twilio.js';
import leadsRoutes from './routes/leads.js';
import usersRoutes from './routes/users.js';
import billingRoutes from './routes/billing.js';
import adminRoutes from './routes/admin.js';
import demoRoutes from './routes/demo.js';
import { startScheduler } from './services/scheduler.js';

// DEMO_MODE: full demo posture. Mounts /demo, stubs every Twilio send, pauses the follow-up cron.
export const DEMO_MODE = process.env.DEMO_MODE === 'true';
// DEMO_ROUTES: mounts /demo only. Lets one backend serve the public demo while real
// texting keeps working, because the /demo sandbox never calls Twilio or Supabase.
const DEMO_ROUTES = DEMO_MODE || process.env.DEMO_ROUTES === 'true';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Any local dev or preview port
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  // Vercel deployments and aliases for the app and the demo project
  if (/^https:\/\/(frontend|rewai-demo)[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(cors({
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-Session'],
}));

// Webhook must receive raw body — register before express.json()
app.use('/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, demo: DEMO_MODE, demo_routes: DEMO_ROUTES }));

app.use('/twilio', twilioRoutes);
app.use('/leads', leadsRoutes);
app.use('/users', usersRoutes);
app.use('/billing', billingRoutes);
app.use('/admin', adminRoutes);
if (DEMO_ROUTES) {
  app.use('/demo', demoRoutes);
  console.log(DEMO_MODE
    ? '[demo] DEMO_MODE on: /demo mounted, Twilio sends stubbed, follow-up cron paused'
    : '[demo] DEMO_ROUTES on: /demo mounted (sandboxed); real Twilio sending unaffected');
}

app.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
  startScheduler();
});
