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
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversations.length === 0 && (
          <div className="text-center text-muted text-sm py-12">No messages yet</div>
        )}
        {conversations.map((msg) => {
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
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — only shown when wholesaler has taken over */}
      {!lead.ai_enabled ? (
        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-bg hover:bg-accent/90 disabled:opacity-40 transition-all"
          >
            <Send size={15} />
          </button>
        </form>
      ) : (
        <div className="border-t border-border p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Bot size={13} className="text-accent" />
            <span>AI is managing this conversation</span>
          </div>
        </div>
      )}
    </div>
  );
}
