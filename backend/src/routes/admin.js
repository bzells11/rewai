import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

// ── Helpers ────────────────────────────────────────────────────────

async function getAdminEmail(userId) {
  const { data } = await supabaseAdmin.from('users').select('email').eq('id', userId).single();
  return data?.email || 'unknown';
}

async function logAction(adminEmail, action, targetType, targetId, metadata = {}) {
  await supabaseAdmin.from('admin_audit_log').insert({
    admin_email: adminEmail,
    action,
    target_type: targetType,
    target_id: String(targetId || ''),
    metadata,
  }).catch(() => {}); // never block the main response
}

// ── Users ──────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, plan, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = supabaseAdmin
    .from('users')
    .select('id, email, name, company_name, plan, created_at, is_admin, twilio_number, twilio_sid, admin_notes, admin_notes_updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (plan) q = q.eq('plan', plan);
  if (search) q = q.or(`email.ilike.%${search}%,name.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });

  // Batch-enrich with onboarding status
  let users = data || [];
  if (users.length) {
    const ids = users.map(u => u.id);
    const [{ data: campaigns }, { data: leads }] = await Promise.all([
      supabaseAdmin.from('campaigns').select('user_id').in('user_id', ids),
      supabaseAdmin.from('leads').select('user_id, last_contact_at').in('user_id', ids).or('archived.is.null,archived.eq.false'),
    ]);
    const hasCampaign = new Set((campaigns || []).map(c => c.user_id));
    const hasLead     = new Set((leads || []).map(l => l.user_id));
    const hasContact  = new Set((leads || []).filter(l => l.last_contact_at).map(l => l.user_id));
    users = users.map(u => ({
      ...u,
      onboarding: {
        account:  true,
        twilio:   !!u.twilio_sid,
        campaign: hasCampaign.has(u.id),
        lead:     hasLead.has(u.id),
        message:  hasContact.has(u.id),
      },
    }));
  }

  res.json({ users, total: count || 0, page: Number(page), limit: Number(limit) });
});

router.get('/users/export', async (req, res) => {
  const { plan, search } = req.query;
  let q = supabaseAdmin.from('users')
    .select('id, email, name, company_name, plan, created_at, twilio_number')
    .order('created_at', { ascending: false }).limit(5000);
  if (plan) q = q.eq('plan', plan);
  if (search) q = q.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/users/:id', async (req, res) => {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, email, name, company_name, buying_area, plan, twilio_number, twilio_sid, handoff_retention_days, created_at, is_admin, admin_notes, admin_notes_updated_at')
    .eq('id', req.params.id)
    .single();
  if (error || !user) return res.status(404).json({ error: 'User not found' });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: leads }, { data: campaigns }, { count: aiTotal }, { count: ai30d }] = await Promise.all([
    supabaseAdmin.from('leads').select('id, name, phone, status, last_contact_at').eq('user_id', req.params.id).limit(100),
    supabaseAdmin.from('campaigns').select('*').eq('user_id', req.params.id),
    supabaseAdmin.from('conversations').select('leads!inner(user_id)', { count: 'exact', head: true }).eq('ai_generated', true).eq('leads.user_id', req.params.id),
    supabaseAdmin.from('conversations').select('leads!inner(user_id)', { count: 'exact', head: true }).eq('ai_generated', true).eq('leads.user_id', req.params.id).gte('sent_at', thirtyDaysAgo),
  ]);

  const allLeads = leads || [];
  res.json({
    ...user,
    leads: allLeads,
    campaigns: campaigns || [],
    ai_messages_total: aiTotal || 0,
    ai_messages_30d: ai30d || 0,
    onboarding: {
      account:  true,
      twilio:   !!user.twilio_sid,
      campaign: (campaigns || []).length > 0,
      lead:     allLeads.length > 0,
      message:  allLeads.some(l => l.last_contact_at),
    },
  });
});

// ── User actions ───────────────────────────────────────────────────

router.post('/users/:id/reset-password', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { data: user } = await supabaseAdmin.from('users').select('email').eq('id', req.params.id).single();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(user.email, { redirectTo: `${process.env.FRONTEND_URL}/login` });
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'reset_password', 'user', req.params.id, { target_email: user.email });
  res.json({ ok: true });
});

router.patch('/users/:id/email', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { email });
  if (error) return res.status(500).json({ error: error.message });
  await supabaseAdmin.from('users').update({ email }).eq('id', req.params.id);
  await logAction(adminEmail, 'change_email', 'user', req.params.id, { new_email: email });
  res.json({ ok: true });
});

router.patch('/users/:id/password', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, { password });
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'change_password', 'user', req.params.id);
  res.json({ ok: true });
});

router.delete('/users/:id', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { data: user } = await supabaseAdmin.from('users').select('email').eq('id', req.params.id).single();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'delete_account', 'user', req.params.id, { deleted_email: user?.email });
  res.status(204).end();
});

router.post('/users/:id/force-logout', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { error } = await supabaseAdmin.auth.admin.signOut(req.params.id, 'global');
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'force_logout', 'user', req.params.id);
  res.json({ ok: true });
});

router.patch('/users/:id', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const allowed = ['plan', 'is_admin'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields' });
  const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'update_user', 'user', req.params.id, updates);
  res.json(data);
});

router.post('/users/:id/cancel-subscription', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { data: user } = await supabaseAdmin.from('users').select('stripe_customer_id').eq('id', req.params.id).single();
  if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer on file' });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const subs = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active', limit: 1 });
  if (!subs.data.length) return res.status(400).json({ error: 'No active subscription found' });
  await stripe.subscriptions.cancel(subs.data[0].id);
  await supabaseAdmin.from('users').update({ plan: 'starter' }).eq('id', req.params.id);
  await logAction(adminEmail, 'cancel_subscription', 'user', req.params.id);
  res.json({ ok: true });
});

router.post('/users/:id/extend-trial', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { days } = req.body;
  if (!days || days < 1) return res.status(400).json({ error: 'days required' });
  const { data: user } = await supabaseAdmin.from('users').select('stripe_customer_id').eq('id', req.params.id).single();
  if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer on file' });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const subs = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active', limit: 1 });
  if (!subs.data.length) return res.status(400).json({ error: 'No active subscription found' });
  const trialEnd = Math.floor(Date.now() / 1000) + Number(days) * 86400;
  await stripe.subscriptions.update(subs.data[0].id, { trial_end: trialEnd });
  await logAction(adminEmail, 'extend_trial', 'user', req.params.id, { days });
  res.json({ ok: true });
});

router.patch('/users/:id/billing-date', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { billing_date } = req.body;
  if (!billing_date) return res.status(400).json({ error: 'billing_date (unix timestamp) required' });
  const { data: user } = await supabaseAdmin.from('users').select('stripe_customer_id').eq('id', req.params.id).single();
  if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No Stripe customer on file' });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const subs = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active', limit: 1 });
  if (!subs.data.length) return res.status(400).json({ error: 'No active subscription found' });
  await stripe.subscriptions.update(subs.data[0].id, { billing_cycle_anchor: Number(billing_date), proration_behavior: 'none' });
  await logAction(adminEmail, 'override_billing_date', 'user', req.params.id, { billing_date });
  res.json({ ok: true });
});

router.post('/users/:id/impersonate', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { data: target } = await supabaseAdmin.from('users').select('email').eq('id', req.params.id).single();
  if (!target) return res.status(404).json({ error: 'User not found' });
  const redirectTo = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?impersonating=${encodeURIComponent(target.email)}`;
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: target.email, options: { redirectTo } });
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'impersonate', 'user', req.params.id, { target_email: target.email });
  res.json({ link: data.properties.action_link, email: target.email });
});

router.patch('/users/:id/notes', async (req, res) => {
  const adminEmail = await getAdminEmail(req.userId);
  const { notes } = req.body;
  if (notes === undefined) return res.status(400).json({ error: 'notes required' });
  const { data, error } = await supabaseAdmin.from('users')
    .update({ admin_notes: notes, admin_notes_updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select('admin_notes, admin_notes_updated_at').single();
  if (error) return res.status(500).json({ error: error.message });
  await logAction(adminEmail, 'update_notes', 'user', req.params.id);
  res.json(data);
});

// ── Leads ──────────────────────────────────────────────────────────

router.get('/leads', async (req, res) => {
  const { page = 1, limit = 25, user_id, status, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = supabaseAdmin
    .from('leads')
    .select('id, name, phone, address, status, last_contact_at, imported_at, user_id, ai_enabled, users(name, email)', { count: 'exact' })
    .or('archived.is.null,archived.eq.false')
    .order('imported_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (user_id) q = q.eq('user_id', user_id);
  if (status) q = q.eq('status', status);
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ leads: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
});

router.get('/leads/export', async (req, res) => {
  const { user_id, status, search } = req.query;
  let q = supabaseAdmin.from('leads')
    .select('id, name, phone, address, status, last_contact_at, imported_at, users(email)')
    .or('archived.is.null,archived.eq.false').order('imported_at', { ascending: false }).limit(5000);
  if (user_id) q = q.eq('user_id', user_id);
  if (status)  q = q.eq('status', status);
  if (search)  q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/leads/:id', async (req, res) => {
  const { data: lead, error } = await supabaseAdmin
    .from('leads').select('*, users(name, email)').eq('id', req.params.id).single();
  if (error || !lead) return res.status(404).json({ error: 'Lead not found' });

  const { data: conversations } = await supabaseAdmin
    .from('conversations').select('*').eq('lead_id', req.params.id).order('sent_at', { ascending: true });

  res.json({ ...lead, conversations: conversations || [] });
});

// ── Campaigns ──────────────────────────────────────────────────────

router.get('/campaigns', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*, users(name, email)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const enriched = await Promise.all((data || []).map(async (c) => {
    const { count: leadsCount } = await supabaseAdmin
      .from('leads').select('*', { count: 'exact', head: true }).eq('user_id', c.user_id);
    const { count: msgsCount } = await supabaseAdmin
      .from('conversations').select('*', { count: 'exact', head: true }).eq('ai_generated', true);
    return { ...c, leads_count: leadsCount || 0, messages_count: msgsCount || 0 };
  }));

  res.json(enriched);
});

router.patch('/campaigns/:id', async (req, res) => {
  const allowed = ['active', 'flagged'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin
    .from('campaigns').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── SMS Logs ───────────────────────────────────────────────────────

router.get('/sms-logs/export', async (req, res) => {
  const { direction, search } = req.query;
  let q = supabaseAdmin.from('conversations')
    .select('id, body, direction, ai_generated, sent_at, leads(name, phone, users(email))')
    .order('sent_at', { ascending: false }).limit(5000);
  if (direction) q = q.eq('direction', direction);
  if (search)    q = q.ilike('body', `%${search}%`);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/sms-logs', async (req, res) => {
  const { page = 1, limit = 50, direction, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = supabaseAdmin
    .from('conversations')
    .select(`id, body, direction, ai_generated, sent_at, twilio_sid,
      leads(id, name, phone, user_id, users(name, email))`, { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (direction) q = q.eq('direction', direction);
  if (search) q = q.ilike('body', `%${search}%`);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
});

// ── Billing ────────────────────────────────────────────────────────

router.get('/billing', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ subscriptions: [], mrr: 0, note: 'Stripe not configured' });
  }
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const subs = await stripe.subscriptions.list({ status: 'active', limit: 100, expand: ['data.customer'] });
    const subscriptions = subs.data.map(s => ({
      id: s.id,
      customer_email: s.customer?.email,
      customer_id: s.customer?.id,
      plan: s.items.data[0]?.price?.nickname || s.items.data[0]?.price?.id || 'Unknown',
      amount: (s.items.data[0]?.price?.unit_amount || 0) / 100,
      currency: s.items.data[0]?.price?.currency || 'usd',
      status: s.status,
      current_period_end: s.current_period_end,
      stripe_url: `https://dashboard.stripe.com/customers/${s.customer?.id}`,
    }));
    const mrr = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);
    res.json({ subscriptions, mrr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Analytics ──────────────────────────────────────────────────────

router.get('/analytics', async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalLeads },
    { count: totalMessages },
    { count: hotLeads },
    { count: warmLeads },
    { data: recentMessages },
    { data: recentUsers },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).or('archived.is.null,archived.eq.false'),
    supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'hot').or('archived.is.null,archived.eq.false'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'warm').or('archived.is.null,archived.eq.false'),
    supabaseAdmin.from('conversations').select('sent_at').gte('sent_at', thirtyDaysAgo).order('sent_at'),
    supabaseAdmin.from('users').select('created_at').gte('created_at', thirtyDaysAgo).order('created_at'),
  ]);

  const msgByDay = {};
  (recentMessages || []).forEach(m => {
    const day = m.sent_at.slice(0, 10);
    msgByDay[day] = (msgByDay[day] || 0) + 1;
  });

  const usersByDay = {};
  (recentUsers || []).forEach(u => {
    const day = u.created_at.slice(0, 10);
    usersByDay[day] = (usersByDay[day] || 0) + 1;
  });

  res.json({
    total_users: totalUsers || 0,
    total_leads: totalLeads || 0,
    total_messages: totalMessages || 0,
    hot_leads: hotLeads || 0,
    warm_leads: warmLeads || 0,
    messages_by_day: msgByDay,
    users_by_day: usersByDay,
  });
});

// ── Health ─────────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  const now = new Date().toISOString();

  const results = await Promise.allSettled([
    supabaseAdmin.from('users').select('id').limit(1),
    Promise.resolve(process.env.TWILIO_ACCOUNT_SID ? 'ok' : 'missing'),
    Promise.resolve(process.env.STRIPE_SECRET_KEY ? 'ok' : 'missing'),
    Promise.resolve(process.env.ANTHROPIC_API_KEY ? 'ok' : 'missing'),
    Promise.resolve('ok'),
  ]);

  const names = ['Supabase', 'Twilio', 'Stripe', 'Claude API', 'Railway Backend'];
  const services = results.map((r, i) => ({
    service: names[i],
    status: r.status === 'fulfilled' && r.value !== 'missing' ? 'ok' : r.value === 'missing' ? 'missing_config' : 'error',
    checked_at: now,
  }));

  res.json({ services, checked_at: now });
});


// ── Audit Log ──────────────────────────────────────────────────────

router.get('/audit-log', async (req, res) => {
  const { page = 1, limit = 50, admin_email, action, date_from, date_to } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let q = supabaseAdmin.from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (admin_email) q = q.eq('admin_email', admin_email);
  if (action)      q = q.eq('action', action);
  if (date_from)   q = q.gte('created_at', date_from);
  if (date_to)     q = q.lte('created_at', date_to);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
});

export default router;
