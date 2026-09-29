import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { generateReply, classifySentiment, extractLeadInfo } from '../services/claude.js';
import { sendSMS, normalizePhone } from '../services/sms.js';
import { cancelPendingFollowUps } from '../services/scheduler.js';

const router = express.Router();

router.post('/webhook', express.urlencoded({ extended: false }), async (req, res) => {
  const { From: fromRaw, To: toPhone, Body: messageBody } = req.body;
  if (!fromRaw || !toPhone || !messageBody) return res.status(400).end();

  // Acknowledge Twilio immediately — they need a 200 within 15s
  res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');

  const fromPhone = normalizePhone(fromRaw);

  try {
    // Find user by their Twilio number
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, company_name, buying_area, twilio_number, twilio_sid, twilio_auth_token')
      .eq('twilio_number', toPhone)
      .single();

    if (!user?.twilio_sid) return;

    // Find lead by phone number
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .eq('phone', fromPhone)
      .single();

    if (!lead) return;

    // Log inbound message
    await supabaseAdmin.from('conversations').insert({
      lead_id: lead.id,
      direction: 'inbound',
      body: messageBody,
      ai_generated: false,
    });

    // Cancel pending follow-ups — they responded
    await cancelPendingFollowUps(lead.id);

    // Opt-out detection — stop all contact immediately
    // Carrier keywords only count at the start of the message, so "end of the year" is not an opt-out.
    const optOutPattern = /^\s*(stop|stopall|unsubscribe|cancel|quit|end)\b|\b(remove me|opt.?out|do not (text|contact|message)|don'?t (text|contact|message)|stop (texting|contacting|messaging)|take me off|not text me)\b/i;
    if (optOutPattern.test(messageBody)) {
      await supabaseAdmin.from('leads').update({
        status: 'dead',
        ai_enabled: false,
        last_contact_at: new Date().toISOString(),
      }).eq('id', lead.id);
      return;
    }

    // If wholesaler has taken over, stop AI
    if (!lead.ai_enabled) return;

    // Get full conversation history
    const { data: history } = await supabaseAdmin
      .from('conversations')
      .select('direction, body, sent_at')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: true });

    // Generate and send AI reply
    const reply = await generateReply({
      lead,
      conversationHistory: history,
      wholesalerName: user.name,
      companyName: user.company_name,
      buyingArea: user.buying_area,
    });

    const sid = await sendSMS({
      to: fromPhone,
      from: toPhone,
      body: reply,
      twilioAccountSid: user.twilio_sid,
      twilioAuthToken: user.twilio_auth_token,
    });

    // Log outbound reply
    await supabaseAdmin.from('conversations').insert({
      lead_id: lead.id,
      direction: 'outbound',
      body: reply,
      ai_generated: true,
      twilio_sid: sid,
    });

    // Classify sentiment + extract info in parallel
    const fullHistory = [...history,
      { direction: 'inbound', body: messageBody },
      { direction: 'outbound', body: reply },
    ];

    const [sentiment, info] = await Promise.all([
      classifySentiment({ conversationHistory: fullHistory }),
      extractLeadInfo({ conversationHistory: fullHistory }),
    ]);

    await supabaseAdmin.from('leads').update({
      status: sentiment,
      last_contact_at: new Date().toISOString(),
      ...(info.situation && { situation: info.situation }),
      ...(info.asking_price && { asking_price: info.asking_price }),
      ...(info.timeline && { timeline: info.timeline }),
      ...(info.ai_notes && { ai_notes: info.ai_notes }),
    }).eq('id', lead.id);

  } catch (err) {
    console.error('[twilio webhook] error:', err.message);
  }
});

export default router;
