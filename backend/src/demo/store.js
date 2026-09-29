// Per-visitor in-memory sandbox for DEMO_MODE. Nothing here touches Supabase.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCSV } from './csv.js';
import { normalizePhone } from '../services/sms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.resolve(__dirname, '../../demo');

export const SAMPLE_LEADS_CSV = fs.readFileSync(path.join(DEMO_DIR, 'sample_leads.csv'), 'utf8');
const SAMPLE_LEADS = parseCSV(SAMPLE_LEADS_CSV).map(r => ({
  name: [r.first_name, r.last_name].filter(Boolean).join(' '),
  phone: normalizePhone(r.phone),
  address: r.address || null,
}));

const SAMPLE_REPLIES = parseCSV(fs.readFileSync(path.join(DEMO_DIR, 'sample_replies.csv'), 'utf8')).map(r => ({
  phone: normalizePhone(r.phone),
  reply: r.reply,
  category: r.category,
  reason: r.reason,
  ai_reply: r.ai_reply || null,
  situation: r.situation || null,
  asking_price: r.asking_price ? Number(r.asking_price) : null,
  timeline: r.timeline || null,
}));

export const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@rewai.app',
  name: 'Demo Account',
  company_name: 'REW Homes',
  buying_area: 'Columbus, OH',
  twilio_number: '+16145550100',
  plan: 'growth',
  handoff_retention_days: 30,
  is_admin: false,
  has_twilio_token: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

export const DEMO_CAMPAIGN = {
  id: 'demo-campaign',
  user_id: DEMO_USER.id,
  name: 'Default',
  intro_template: "Hi {{name}}, this is {{wholesaler}} with REW Homes. I buy houses in your area for cash and noticed {{address}}. Would you consider an offer if the numbers made sense?",
  active: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

const SESSION_TTL_MS = Number(process.env.DEMO_SESSION_TTL_MINUTES || 60) * 60 * 1000;
const MAX_SESSIONS = Number(process.env.DEMO_MAX_SESSIONS || 500);
const REPLY_GAP_MS = Number(process.env.DEMO_REPLY_GAP_MS || 1400);
const MAX_LEADS_PER_SESSION = 200;

const sessions = new Map();

function fakeSid() {
  return 'SM_demo_' + randomUUID().replace(/-/g, '').slice(0, 24);
}

export function getSession(id) {
  let s = sessions.get(id);
  if (!s) {
    if (sessions.size >= MAX_SESSIONS) {
      // Evict the least recently seen session.
      let oldestId = null, oldest = Infinity;
      for (const [k, v] of sessions) if (v.lastSeen < oldest) { oldest = v.lastSeen; oldestId = k; }
      if (oldestId) destroySession(oldestId);
    }
    s = {
      id,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      leads: new Map(),
      conversations: [],
      campaignSent: false,
      replies: { started: false, done: false, total: 0, received: 0, timer: null },
    };
    sessions.set(id, s);
  }
  s.lastSeen = Date.now();
  return s;
}

export function destroySession(id) {
  const s = sessions.get(id);
  if (!s) return;
  if (s.replies.timer) clearTimeout(s.replies.timer);
  sessions.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.lastSeen > SESSION_TTL_MS) destroySession(id);
}, 5 * 60 * 1000).unref();

// ── Leads ──

export function publicLead(l) {
  const { _internal, ...rest } = l;
  return rest;
}

export function listLeads(s, { archived = false } = {}) {
  return [...s.leads.values()]
    .filter(l => !!l.archived === archived)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(publicLead);
}

export function getLead(s, id) {
  const l = s.leads.get(id);
  return l ? publicLead(l) : null;
}

export function getConversations(s, leadId) {
  return s.conversations.filter(c => c.lead_id === leadId);
}

export function createLead(s, { name, phone, address, situation, asking_price, timeline }) {
  if (!name || !phone) return { error: 'name and phone are required' };
  if (s.leads.size >= MAX_LEADS_PER_SESSION) return { error: 'Demo lead limit reached' };
  const normalized = normalizePhone(phone);
  for (const l of s.leads.values()) if (l.phone === normalized) return { duplicate: true };
  const lead = {
    id: randomUUID(),
    user_id: DEMO_USER.id,
    name, phone: normalized,
    address: address || null,
    situation: situation || null,
    asking_price: asking_price || null,
    timeline: timeline || null,
    status: 'cold',
    ai_notes: null,
    ai_enabled: true,
    imported_at: new Date().toISOString(),
    last_contact_at: null,
    position: (s.leads.size + 1) * 1000,
    archived: false,
    archived_at: null,
  };
  s.leads.set(lead.id, lead);
  return { lead };
}

export function updateLead(s, id, updates) {
  const l = s.leads.get(id);
  if (!l) return null;
  Object.assign(l, updates);
  return publicLead(l);
}

export function addMessage(s, leadId, { direction, body, ai_generated = false }) {
  const msg = {
    id: randomUUID(),
    lead_id: leadId,
    direction,
    body,
    sent_at: new Date().toISOString(),
    ai_generated,
    twilio_sid: direction === 'outbound' ? fakeSid() : null,
  };
  s.conversations.push(msg);
  const l = s.leads.get(leadId);
  if (l) l.last_contact_at = msg.sent_at;
  return msg;
}

// ── Demo flow ──

export function loadSampleLeads(s) {
  let imported = 0;
  for (const row of SAMPLE_LEADS) {
    const r = createLead(s, row);
    if (r.lead) imported++;
  }
  return imported;
}

function fillTemplate(template, lead) {
  return template
    .replace('{{name}}', lead.name.split(' ')[0])
    .replace('{{address}}', lead.address || 'your property')
    .replace('{{wholesaler}}', 'Brandon');
}

export function sendCampaign(s) {
  let sent = 0;
  for (const l of s.leads.values()) {
    if (l.archived || l.status !== 'cold' || !l.ai_enabled) continue;
    addMessage(s, l.id, { direction: 'outbound', body: fillTemplate(DEMO_CAMPAIGN.intro_template, l), ai_generated: true });
    l.status = 'active';
    sent++;
  }
  s.campaignSent = true;
  return sent;
}

const STATUS_FOR_CATEGORY = {
  hot: 'hot',
  warm: 'warm',
  not_interested: 'not_interested',
  do_not_contact: 'do_not_contact',
};

const OPT_OUT = /^\s*(stop|stopall|unsubscribe|cancel|quit|end)\b|\b(remove me|opt.?out|do not (text|contact|message)|don'?t (text|contact|message)|stop (texting|contacting|messaging)|take me off|not text me)\b/i;

function applyReply(s, leadId, r) {
  const l = s.leads.get(leadId);
  if (!l || l.archived) return;
  addMessage(s, l.id, { direction: 'inbound', body: r.reply });

  // Compliance rule runs regardless of classification.
  const category = OPT_OUT.test(r.reply) ? 'do_not_contact' : r.category;
  l.status = STATUS_FOR_CATEGORY[category] || 'active';
  l.ai_notes = r.reason;
  if (r.situation) l.situation = r.situation;
  if (r.asking_price) l.asking_price = r.asking_price;
  if (r.timeline) l.timeline = r.timeline;

  if (category === 'do_not_contact') {
    l.ai_enabled = false;
    return;
  }
  if (r.ai_reply && l.ai_enabled && (category === 'hot' || category === 'warm')) {
    s.replies.timer = setTimeout(() => {
      if (!sessions.has(s.id)) return;
      addMessage(s, l.id, { direction: 'outbound', body: r.ai_reply, ai_generated: true });
    }, 900);
    s.replies.timer.unref?.();
  }
}

export function startReplies(s) {
  if (s.replies.started && !s.replies.done) return { alreadyRunning: true };

  // Match scripted replies to leads by phone. Only leads that were actually messaged reply.
  const byPhone = new Map();
  for (const l of s.leads.values()) if (!l.archived && l.status === 'active') byPhone.set(l.phone, l.id);
  const queue = SAMPLE_REPLIES
    .filter(r => byPhone.has(r.phone))
    .map(r => ({ leadId: byPhone.get(r.phone), r }));

  // Shuffle so the pipeline fills in a natural-looking order.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  s.replies = { started: true, done: queue.length === 0, total: queue.length, received: 0, timer: null };

  const step = () => {
    if (!sessions.has(s.id)) return;
    const item = queue.shift();
    if (!item) { s.replies.done = true; return; }
    applyReply(s, item.leadId, item.r);
    s.replies.received++;
    if (queue.length === 0) {
      // Give the last AI reply time to land, plus one dashboard poll interval,
      // so "Done." never appears before the board shows its final counts.
      s.replies.timer = setTimeout(() => { s.replies.done = true; }, 3400);
    } else {
      s.replies.timer = setTimeout(step, REPLY_GAP_MS);
    }
    s.replies.timer.unref?.();
  };

  if (queue.length) {
    s.replies.timer = setTimeout(step, 600);
    s.replies.timer.unref?.();
  }
  return { queued: queue.length };
}

export function sessionState(s) {
  const leads = [...s.leads.values()].filter(l => !l.archived);
  return {
    loaded: leads.length > 0,
    lead_count: leads.length,
    campaign_sent: s.campaignSent,
    replies: { started: s.replies.started, done: s.replies.done, total: s.replies.total, received: s.replies.received },
  };
}

export function stats(s) {
  const leads = [...s.leads.values()].filter(l => !l.archived);
  const total = leads.length;
  const count = st => leads.filter(l => l.status === st).length;
  const repliedIds = new Set(s.conversations.filter(c => c.direction === 'inbound').map(c => c.lead_id));
  return {
    total,
    hot: count('hot'),
    active: count('active'),
    warm: count('warm'),
    not_interested: count('not_interested'),
    do_not_contact: count('do_not_contact'),
    response_rate: total > 0 ? Math.round((repliedIds.size / total) * 100) : 0,
  };
}
