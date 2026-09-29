// DEMO_MODE router. Mirrors the shapes of /leads and /users so the frontend
// pages work unchanged, plus the guided demo flow. All state is in memory.
import express from 'express';
import {
  getSession, destroySession, listLeads, getLead, getConversations, createLead, updateLead,
  addMessage, loadSampleLeads, sendCampaign, startReplies, sessionState, stats,
  DEMO_USER, DEMO_CAMPAIGN, SAMPLE_LEADS_CSV,
} from '../demo/store.js';
import { ipLimiter, actionLimiter } from '../demo/rateLimit.js';

const router = express.Router();

router.use(ipLimiter);

// Public: the sample CSV, so the Import page can offer it as a one-click file.
router.get('/sample-leads.csv', (_req, res) => {
  res.set('Content-Type', 'text/csv').set('Content-Disposition', 'inline; filename="sample_leads.csv"').send(SAMPLE_LEADS_CSV);
});

// Every other route needs a visitor session id from the browser.
router.use((req, res, next) => {
  const id = req.headers['x-demo-session'];
  if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    return res.status(400).json({ error: 'Missing demo session' });
  }
  req.demoSessionId = id;
  req.demo = getSession(id);
  next();
});

// ── Demo flow ──
router.get('/state', (req, res) => res.json(sessionState(req.demo)));

router.post('/load', actionLimiter, (req, res) => {
  res.json({ imported: loadSampleLeads(req.demo), state: sessionState(req.demo) });
});

router.post('/send', actionLimiter, (req, res) => {
  res.json({ sent: sendCampaign(req.demo), state: sessionState(req.demo) });
});

router.post('/replies', actionLimiter, (req, res) => {
  res.json({ ...startReplies(req.demo), state: sessionState(req.demo) });
});

router.post('/reset', (req, res) => {
  destroySession(req.demoSessionId);
  res.json({ ok: true });
});

// ── /users/me mirror ──
router.get('/users/me', (_req, res) => res.json(DEMO_USER));
router.patch('/users/me', (req, res) => res.json({ ...DEMO_USER, ...req.body, id: DEMO_USER.id }));
router.get('/users/me/campaigns', (_req, res) => res.json([DEMO_CAMPAIGN]));
router.post('/users/me/campaigns', (req, res) => res.status(201).json({ ...DEMO_CAMPAIGN, ...req.body }));
router.get('/users/me/stats', (req, res) => res.json(stats(req.demo)));

// ── /leads mirror ──
router.get('/leads', (req, res) => {
  let leads = listLeads(req.demo);
  if (req.query.status) leads = leads.filter(l => l.status === req.query.status);
  res.json(leads);
});

router.get('/leads/archived', (req, res) => res.json(listLeads(req.demo, { archived: true })));

router.get('/leads/:id', (req, res) => {
  const lead = getLead(req.demo, req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ ...lead, conversations: getConversations(req.demo, lead.id), schedules: [] });
});

router.post('/leads', actionLimiter, (req, res) => {
  const r = createLead(req.demo, req.body || {});
  if (r.error) return res.status(400).json({ error: r.error });
  if (r.duplicate) return res.status(409).json({ error: 'Lead with this phone number already exists' });
  res.status(201).json(r.lead);
});

router.post('/leads/bulk', actionLimiter, (req, res) => {
  const { leads } = req.body || {};
  if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'leads array required' });
  let imported = 0;
  for (const l of leads.slice(0, 200)) {
    const r = createLead(req.demo, {
      ...l,
      asking_price: l.asking_price ? Number(String(l.asking_price).replace(/[^0-9.]/g, '')) || null : null,
    });
    if (r.lead) imported++;
  }
  res.json({ imported });
});

router.patch('/leads/:id', (req, res) => {
  const allowed = ['status', 'ai_enabled', 'ai_notes', 'situation', 'asking_price', 'timeline', 'name', 'address', 'phone', 'position'];
  const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
  const lead = updateLead(req.demo, req.params.id, updates);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

router.delete('/leads/:id/permanent', (req, res) => {
  req.demo.leads.delete(req.params.id);
  res.status(204).end();
});

router.delete('/leads/:id', (req, res) => {
  if (!updateLead(req.demo, req.params.id, { archived: true, archived_at: new Date().toISOString() })) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  res.status(204).end();
});

router.post('/leads/:id/restore', (req, res) => {
  const lead = updateLead(req.demo, req.params.id, { archived: false, archived_at: null });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

router.post('/leads/:id/message', actionLimiter, (req, res) => {
  const { body } = req.body || {};
  if (!body || typeof body !== 'string') return res.status(400).json({ error: 'body is required' });
  if (!getLead(req.demo, req.params.id)) return res.status(404).json({ error: 'Lead not found' });
  const msg = addMessage(req.demo, req.params.id, { direction: 'outbound', body: body.slice(0, 1000) });
  res.status(201).json(msg);
});

export default router;
