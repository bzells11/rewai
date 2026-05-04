// MOCK AI SERVICE — swap this file for the real Claude/Gemini implementation when ready

const REPLY_POOL = [
  "Hey, thanks for reaching out — are you still looking to sell the property?",
  "Got it, appreciate you sharing that — what kind of timeline are you working with?",
  "That makes sense — have you had a chance to think about what price range would work for you?",
  "Totally understand the situation — would a fast cash offer with a flexible closing date help?",
  "Thanks for letting me know — is the property currently occupied or vacant?",
  "Appreciate your time — what's the biggest thing you need from a buyer right now?",
];

const FOLLOWUP_POOL = [
  "Hey {name}, just checking in — still interested in a cash offer on the property?",
  "Hi {name}, wanted to follow up — is selling still something you're considering?",
  "Hey {name}, touching base again — any update on the property at {address}?",
  "Hi {name}, still here if you're open to a quick cash offer — any interest?",
  "Hey {name}, just wanted to check — has anything changed with the property?",
];

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generateReply({ lead }) {
  return pick(REPLY_POOL);
}

export async function generateFollowUp({ lead, attemptNumber }) {
  return pick(FOLLOWUP_POOL)
    .replace('{name}', lead.name.split(' ')[0])
    .replace('{address}', lead.address || 'your property');
}

export async function classifySentiment({ conversationHistory }) {
  const lastInbound = [...conversationHistory]
    .reverse()
    .find(m => m.direction === 'inbound');

  if (!lastInbound) return 'cold';

  const body = lastInbound.body.toLowerCase();
  if (/yes|interested|definitely|let's|lets|call|offer|how much/i.test(body)) return 'hot';
  if (/maybe|possibly|thinking|considering|depends/i.test(body)) return 'warm';
  if (/not|no|stop|remove|unsubscribe|don't/i.test(body)) return 'dead';
  return 'active';
}

export async function extractLeadInfo({ conversationHistory }) {
  const transcript = conversationHistory.map(m => m.body).join(' ').toLowerCase();

  const asking_price = transcript.match(/\$?([\d,]+)k?\b/)?.[1]
    ? parseInt(transcript.match(/\$?([\d,]+)k?\b/)[1].replace(',', '')) * (transcript.includes('k') ? 1000 : 1)
    : null;

  return {
    situation: transcript.includes('divorce') ? 'Going through divorce' :
               transcript.includes('inherit') ? 'Inherited property' :
               transcript.includes('behind') || transcript.includes('foreclosure') ? 'Behind on payments' :
               null,
    asking_price,
    timeline: transcript.includes('asap') || transcript.includes('fast') ? 'ASAP' :
              transcript.includes('month') ? 'Within a few months' :
              null,
    ai_notes: `Mock lead — ${conversationHistory.length} messages exchanged.`,
  };
}
