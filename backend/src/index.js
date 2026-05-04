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

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

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
