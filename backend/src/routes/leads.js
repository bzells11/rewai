import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createFollowUpSchedule, cancelPendingFollowUps } from '../services/scheduler.js';
import { normalizePhone } from '../services/sms.js';

const router = express.Router();

router.use(requireAuth);

// GET /leads — list all leads for the current user
router.get('/', async (req, res) => {
  const { status, limit = 200 } = req.query;

  let query = supabaseAdmin
    .from('leads')
    .select('id, name, phone, address, status, situation, asking_price, timeline, ai_notes, ai_enabled, imported_at, last_contact_at')
    .eq('user_id', req.userId)
    .order('imported_at', { ascending: false })
    .limit(Number(limit));

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /leads/:id — single lead with conversation history
router.get('/:id', async (req, res) => {
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !lead) return res.status(404).json({ error: 'Lead not found' });

  const { data: conversations } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('lead_id', lead.id)
    .order('sent_at', { ascending: true });

  const { data: schedules } = await supabaseAdmin
    .from('follow_up_schedules')
    .select('*')
    .eq('lead_id', lead.id)
    .order('scheduled_at', { ascending: true });

  res.json({ ...lead, conversations: conversations || [], schedules: schedules || [] });
});

// POST /leads — create a single lead
router.post('/', async (req, res) => {
  const { name, phone, address } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

  const normalizedPhone = normalizePhone(phone);

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({ user_id: req.userId, name, phone: normalizedPhone, address })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Lead with this phone number already exists' });
    return res.status(500).json({ error: error.message });
  }

  await createFollowUpSchedule(lead.id);
  res.status(201).json(lead);
});

// POST /leads/bulk — import multiple leads from CSV parse result
router.post('/bulk', async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'leads array required' });

  const normalized = leads.map(l => ({
    user_id: req.userId,
    name: l.name,
    phone: normalizePhone(l.phone),
    address: l.address || null,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .upsert(normalized, { onConflict: 'user_id,phone', ignoreDuplicates: true })
    .select('id');

  if (error) return res.status(500).json({ error: error.message });

  // Create follow-up schedules for all newly inserted leads
  await Promise.all((inserted || []).map(l => createFollowUpSchedule(l.id)));

  res.json({ imported: inserted?.length || 0 });
});

// PATCH /leads/:id — update status, ai_enabled, or notes
router.patch('/:id', async (req, res) => {
  const allowed = ['status', 'ai_enabled', 'ai_notes', 'situation', 'asking_price', 'timeline'];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

  // If wholesaler is taking over, cancel AI follow-ups
  if (updates.ai_enabled === false) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (lead) await cancelPendingFollowUps(lead.id);
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /leads/:id/message — wholesaler manually sends a message
router.post('/:id/message', async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('*, users(twilio_number, twilio_sid, twilio_auth_token)')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const user = lead.users;
  if (!user?.twilio_sid) return res.status(400).json({ error: 'Twilio not configured' });

  const { sendSMS } = await import('../services/sms.js');
  const sid = await sendSMS({
    to: lead.phone,
    from: user.twilio_number,
    body,
    twilioAccountSid: user.twilio_sid,
    twilioAuthToken: user.twilio_auth_token,
  });

  const { data: msg } = await supabaseAdmin.from('conversations').insert({
    lead_id: lead.id,
    direction: 'outbound',
    body,
    ai_generated: false,
    twilio_sid: sid,
  }).select().single();

  await supabaseAdmin.from('leads').update({ last_contact_at: new Date().toISOString() }).eq('id', lead.id);

  res.status(201).json(msg);
});

export default router;
