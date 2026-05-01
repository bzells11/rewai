import Anthropic from 'anthropic';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';

const CONVERSATION_SYSTEM = `You are an AI assistant texting motivated home sellers on behalf of a real estate wholesaler. Your job is to have natural, empathetic SMS conversations that build rapport and qualify leads.

Qualification goals (work toward these naturally — never all at once):
- Why are they selling?
- What's their timeline?
- What price range do they need?
- What's the property condition?

Rules:
- Keep every message to 2-4 sentences max — this is SMS, not email
- Sound like a real person, never a bot
- Match the seller's energy and brevity
- Be empathetic if they're distressed — lead with that before business
- Never make up offer amounts or guarantees
- Don't discuss specific numbers — that's for the human wholesaler
- If they're clearly not interested or hostile, acknowledge it and close gracefully`;

const SENTIMENT_SYSTEM = `You classify real estate seller leads from SMS transcripts. Always respond with exactly one word.

Classifications:
cold = no response or unsubscribe request
active = engaged but not yet qualified
warm = interested, has shared timeline or price range
hot = highly motivated, wants to move fast or get an offer
dead = explicitly not interested, listed with agent, or hostile`;

const EXTRACT_SYSTEM = `You extract structured lead data from real estate SMS conversations. Always respond with valid JSON only — no explanation.`;

export async function generateReply({ lead, conversationHistory, wholesalerName, companyName, buyingArea }) {
  const messages = conversationHistory.map(msg => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.body,
  }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: [
      {
        type: 'text',
        text: CONVERSATION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `You are texting on behalf of ${wholesalerName} from ${companyName}. They buy houses in ${buyingArea || 'your area'}.

Lead: ${lead.name} | ${lead.address || 'address unknown'} | Status: ${lead.status}${lead.situation ? ` | Situation: ${lead.situation}` : ''}`,
      },
    ],
    messages,
  });

  return response.content[0].text.trim();
}

export async function generateFollowUp({ lead, attemptNumber, wholesalerName, companyName }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 150,
    system: [
      {
        type: 'text',
        text: CONVERSATION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Write a brief, natural follow-up SMS (attempt #${attemptNumber}) to ${lead.name} who owns a property at ${lead.address || 'their property'}. They haven't responded yet. This is from ${wholesalerName} at ${companyName}. Keep it 1-2 sentences, casual and genuine — not salesy.`,
      },
    ],
  });

  return response.content[0].text.trim();
}

export async function classifySentiment({ conversationHistory }) {
  const transcript = conversationHistory
    .map(m => `${m.direction === 'inbound' ? 'Seller' : 'Wholesaler'}: ${m.body}`)
    .join('\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 10,
    system: [
      {
        type: 'text',
        text: SENTIMENT_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Classify this seller:\n\n${transcript}`,
      },
    ],
  });

  const result = response.content[0].text.trim().toLowerCase();
  const valid = ['cold', 'active', 'warm', 'hot', 'dead'];
  return valid.includes(result) ? result : 'active';
}

export async function extractLeadInfo({ conversationHistory }) {
  const transcript = conversationHistory
    .map(m => `${m.direction === 'inbound' ? 'Seller' : 'Wholesaler'}: ${m.body}`)
    .join('\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 250,
    system: [
      {
        type: 'text',
        text: EXTRACT_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Extract info from this conversation. Return JSON with these keys (null if unknown):
{
  "situation": "brief reason for selling",
  "asking_price": number or null,
  "timeline": "timeline string or null",
  "ai_notes": "1-2 sentence wholesaler summary"
}

Conversation:
${transcript}`,
      },
    ],
  });

  try {
    const text = response.content[0].text.trim();
    const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json);
  } catch {
    return { situation: null, asking_price: null, timeline: null, ai_notes: null };
  }
}
