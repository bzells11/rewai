import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createFollowUpSchedule, cancelPendingFollowUps } from '../services/scheduler.js';
import { normalizePhone } from '../services/sms.js';

const router = express.Router();

router.use(requireAuth);

// GET /leads — list active leads (excludes archived)
router.get('/', async (req, res) => {
  const { status, limit = 200 } = req.query;
  let q = supabaseAdmin
    .from('leads')
    .select('id, name, phone, address, status, situation, asking_price, timeline, ai_notes, ai_enabled, imported_at, last_contact_at, position')
    .eq('user_id', req.userId)
    .or('archived.is.null,archived.eq.false')
    .order('position', { ascending: true })
    .limit(Number(limit));
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /leads/archived — all archived leads
router.get('/archived', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, name, phone, address, status, archived_at, last_contact_at')
    .eq('user_id', req.userId)
    .eq('archived', true)
    .order('archived_at', { ascending: false });
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
  const { name, phone, address, situation } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'name and phone are required' });

  const normalizedPhone = normalizePhone(phone);

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .insert({ user_id: req.userId, name, phone: normalizedPhone, address, situation: situation || null })
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

  const normalized = leads
    .map(l => ({
      user_id: req.userId,
      name: l.name,
      phone: normalizePhone(l.phone),
      address: l.address || null,
      situation: l.situation || null,
      asking_price: l.asking_price ? Number(String(l.asking_price).replace(/[^0-9.]/g, '')) || null : null,
      timeline: l.timeline || null,
    }))
    .filter(l => l.name && l.phone);

  console.log('[bulk] normalized count:', normalized.length, 'sample:', JSON.stringify(normalized[0]));
  if (!normalized.length) return res.json({ imported: 0 });

  // Fetch existing phones for this user (including soft-deleted) to skip duplicates
  const phones = normalized.map(l => l.phone);
  const { data: existing, error: existErr } = await supabaseAdmin
    .from('leads')
    .select('phone')
    .eq('user_id', req.userId)
    .in('phone', phones);

  console.log('[bulk] existing phones check error:', existErr?.message);
  console.log('[bulk] existing count:', existing?.length, 'toCheck phones:', phones.slice(0, 3));

  const existingPhones = new Set((existing || []).map(l => l.phone));
  const toInsert = normalized.filter(l => !existingPhones.has(l.phone));

  console.log('[bulk] toInsert count:', toInsert.length);
  if (!toInsert.length) return res.json({ imported: 0 });

  const { data: inserted, error } = await supabaseAdmin
    .from('leads')
    .insert(toInsert)
    .select('id');

  console.log('[bulk] insert error:', error?.message, 'inserted:', inserted?.length);
  if (error) return res.status(500).json({ error: error.message });

  await Promise.all((inserted || []).map(l => createFollowUpSchedule(l.id)));
  res.json({ imported: inserted?.length || 0 });
});

// PATCH /leads/:id — update status, ai_enabled, or notes
router.patch('/:id', async (req, res) => {
  const allowed = ['status', 'ai_enabled', 'ai_notes', 'situation', 'asking_price', 'timeline', 'name', 'address', 'phone', 'position'];
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

// DELETE /leads/:id — archive a lead (soft-delete)
router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// POST /leads/:id/restore — restore an archived lead
router.post('/:id/restore', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ archived: false, archived_at: null })
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /leads/:id/permanent — permanently delete a lead
router.delete('/:id/permanent', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
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
  let sid = null;
  try {
    sid = await sendSMS({
      to: lead.phone,
      from: user.twilio_number,
      body,
      twilioAccountSid: user.twilio_sid,
      twilioAuthToken: user.twilio_auth_token,
    });
  } catch (smsErr) {
    console.error('[SMS] send failed:', smsErr.message);
    return res.status(502).json({ error: 'SMS send failed: ' + smsErr.message });
  }

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
