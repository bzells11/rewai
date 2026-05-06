import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import twilioRoutes from './routes/twilio.js';
import leadsRoutes from './routes/leads.js';
import usersRoutes from './routes/users.js';
import billingRoutes from './routes/billing.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }));

// Webhook must receive raw body — register before express.json()
app.use('/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/twilio', twilioRoutes);
app.use('/leads', leadsRoutes);
app.use('/users', usersRoutes);
app.use('/billing', billingRoutes);

app.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
  startScheduler();
});
