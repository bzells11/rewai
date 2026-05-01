import twilio from 'twilio';

export async function sendSMS({ to, from, body, twilioAccountSid, twilioAuthToken }) {
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
