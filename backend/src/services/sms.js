import twilio from 'twilio';

const DEMO_MODE = process.env.DEMO_MODE === 'true';

export async function sendSMS({ to, from, body, twilioAccountSid, twilioAuthToken }) {
  if (DEMO_MODE) {
    // Never construct a Twilio client in demo mode. Return a fake SID so callers proceed normally.
    console.log(`[sms] DEMO_MODE: simulated send to ${to}`);
    return 'SM_demo_' + Math.random().toString(36).slice(2, 14);
  }
  const client = twilio(twilioAccountSid, twilioAuthToken);

  const message = await client.messages.create({ to, from, body });
  return message.sid;
}

export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}
