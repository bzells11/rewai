import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// GET /users/me — auto-creates the users row if missing (handles new signups)
router.get('/me', async (req, res) => {
  let { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, company_name, buying_area, twilio_number, twilio_sid, twilio_auth_token, plan, handoff_retention_days, created_at')
    .eq('id', req.userId)
    .single();

  // PGRST116 = no rows found — create the row for this auth user
  if (error?.code === 'PGRST116') {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(req.userId);
    const { data: created, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({ id: req.userId, email: authUser?.email ?? '', plan: 'starter' })
      .select('id, email, name, company_name, buying_area, twilio_number, plan, created_at')
      .single();
    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.json(created);
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, has_twilio_token: !!data.twilio_auth_token, twilio_auth_token: undefined });
});

// PATCH /users/me
router.patch('/me', async (req, res) => {
  const allowed = ['name', 'company_name', 'buying_area', 'twilio_number', 'twilio_sid', 'twilio_auth_token', 'handoff_retention_days'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', req.userId)
    .select('id, email, name, company_name, buying_area, twilio_number, plan, handoff_retention_days')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /users/me/campaigns
router.get('/me/campaigns', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /users/me/campaigns
router.post('/me/campaigns', async (req, res) => {
  const { name, intro_template } = req.body;
  if (!intro_template) return res.status(400).json({ error: 'intro_template is required' });

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .insert({ user_id: req.userId, name: name || 'Default', intro_template })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// GET /users/me/stats
router.get('/me/stats', async (req, res) => {
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('status')
    .eq('user_id', req.userId);

  if (!leads) return res.json({ total: 0, hot: 0, active: 0, warm: 0, response_rate: 0 });

  const total = leads.length;
  const hot = leads.filter(l => l.status === 'hot').length;
  const active = leads.filter(l => l.status === 'active').length;
  const warm = leads.filter(l => l.status === 'warm').length;
  const responded = leads.filter(l => ['active', 'warm', 'hot', 'handed_off'].includes(l.status)).length;

  res.json({
    total,
    hot,
    active,
    warm,
    response_rate: total > 0 ? Math.round((responded / total) * 100) : 0,
  });
});

export default router;
