import { useRef, useEffect, useState } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { apiFetch } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export default function ConversationThread({ lead, conversations, onUpdate }) {
  const bottomRef = useRef(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch(`/leads/${lead.id}/message`, {
        method: 'POST',
        body: JSON.stringify({ body: message.trim() }),
      });
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      onUpdate?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {conversations.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--muted)', opacity: 0.35 }}>
              <path d="M4 7a4 4 0 014-4h16a4 4 0 014 4v12a4 4 0 01-4 4h-7l-5.5 4v-4H8a4 4 0 01-4-4V7z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-sm text-muted font-medium">No messages yet</p>
              <p className="text-xs mt-2 leading-relaxed max-w-[240px] mx-auto" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                The AI will begin texting this seller once a campaign is active.
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-1.5 rounded-lg text-xs font-medium border border-border text-muted hover:text-text-secondary hover:border-accent/40 transition-all"
              >
                Start Campaign
              </button>
            </div>
          </div>
        ) : (
          conversations.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isOutbound ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${isOutbound
                        ? 'bg-accent text-bg rounded-br-sm'
                        : 'glass rounded-bl-sm text-text-primary'
                      }`}
                  >
                    {msg.body}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted px-1">
                    {msg.ai_generated && isOutbound && <Bot size={10} className="text-accent/60" />}
                    {formatTime(msg.sent_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — always visible */}
      <div className="border-t border-border">
        {lead.ai_enabled && (
          <div className="flex items-center gap-1.5 px-5 pt-2.5 pb-0">
            <Bot size={10} className="text-muted/50" />
            <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.7 }}>
              AI is managing this conversation
            </span>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3 px-4 py-3">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={lead.ai_enabled ? 'Message as yourself or let AI handle it…' : 'Type a message…'}
            className="flex-1 bg-dim/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-bg hover:bg-accent/90 disabled:opacity-40 transition-all shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
