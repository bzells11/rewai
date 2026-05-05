import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabase.js';
import { generateFollowUp } from './claude.js';
import { sendSMS, normalizePhone } from './sms.js';

export const FOLLOW_UP_DAYS = [1, 3, 7, 21, 45, 90];

export async function createFollowUpSchedule(leadId) {
  const now = new Date();
  const schedules = FOLLOW_UP_DAYS.map((days, index) => ({
    lead_id: leadId,
    scheduled_at: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
    attempt_number: index + 1,
    status: 'pending',
  }));

  await supabaseAdmin.from('follow_up_schedules').insert(schedules);
}

export async function cancelPendingFollowUps(leadId) {
  await supabaseAdmin
    .from('follow_up_schedules')
    .update({ status: 'cancelled' })
    .eq('lead_id', leadId)
    .eq('status', 'pending');
}

async function processDueFollowUps() {
  const { data: dueSchedules, error } = await supabaseAdmin
    .from('follow_up_schedules')
    .select(`
      *,
      leads (
        id, user_id, name, phone, address, status, ai_enabled,
        users (name, company_name, buying_area, twilio_number, twilio_sid, twilio_auth_token, plan)
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50);

  if (error || !dueSchedules?.length) return;

  for (const schedule of dueSchedules) {
    const lead = schedule.leads;
    const user = lead?.users;
    if (!lead || !user || !lead.ai_enabled) continue;
    if (!user.twilio_sid || !user.twilio_auth_token || !user.twilio_number) continue;

    try {
      let body;

      if (schedule.attempt_number === 1) {
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .select('intro_template')
          .eq('user_id', lead.user_id)
          .eq('active', true)
          .single();

        if (!campaign) continue;
        body = campaign.intro_template
          .replace('{{name}}', lead.name.split(' ')[0])
          .replace('{{address}}', lead.address || 'your property')
          .replace('{{wholesaler}}', user.name || user.company_name);
      } else {
        body = await generateFollowUp({
          lead,
          attemptNumber: schedule.attempt_number,
          wholesalerName: user.name,
          companyName: user.company_name,
        });
      }

      const sid = await sendSMS({
        to: normalizePhone(lead.phone),
        from: user.twilio_number,
        body,
        twilioAccountSid: user.twilio_sid,
        twilioAuthToken: user.twilio_auth_token,
      });

      await Promise.all([
        supabaseAdmin.from('conversations').insert({
          lead_id: lead.id,
          direction: 'outbound',
          body,
          ai_generated: true,
          twilio_sid: sid,
        }),
        supabaseAdmin.from('follow_up_schedules').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', schedule.id),
        supabaseAdmin.from('leads').update({
          last_contact_at: new Date().toISOString(),
        }).eq('id', lead.id),
      ]);
    } catch (err) {
      console.error(`Follow-up failed for schedule ${schedule.id}:`, err.message);
      await supabaseAdmin
        .from('follow_up_schedules')
        .update({ status: 'failed' })
        .eq('id', schedule.id);
    }
  }
}

// Archive handed_off leads older than each user's retention setting
async function autoArchiveHandedOff() {
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, handoff_retention_days');
  if (!users?.length) return;

  for (const user of users) {
    const days = user.handoff_retention_days ?? 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('leads')
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'handed_off')
      .or('archived.is.null,archived.eq.false')
      .lt('last_contact_at', cutoff);
  }
  console.log('[scheduler] auto-archived old handed_off leads');
}

export function startScheduler() {
  // Follow-up messages — every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[scheduler] checking for due follow-ups...');
    await processDueFollowUps();
  });

  // Auto-archive handed_off leads past retention — daily at 2am
  cron.schedule('0 2 * * *', async () => {
    await autoArchiveHandedOff();
  });

  console.log('[scheduler] started');
}
