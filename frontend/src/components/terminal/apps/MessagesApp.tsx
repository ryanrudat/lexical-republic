import { useEffect, useState, useRef } from 'react';
import { usePearlStore } from '../../../stores/pearlStore';

const PEARL_RESPONSES: Record<string, string> = {
  help: 'The Ministry is always here to help. What specifically requires clarification, Citizen?',
  score: 'Your compliance metrics are within acceptable parameters. Continue working diligently.',
  hint: 'Review the current task instructions carefully. The answer is always in the approved materials.',
  default: 'Your query has been logged. P.E.A.R.L. recommends focusing on your current assignment.',
};

function getPearlResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('help') || lower.includes('how')) return PEARL_RESPONSES.help;
  if (lower.includes('score') || lower.includes('grade') || lower.includes('progress')) return PEARL_RESPONSES.score;
  if (lower.includes('hint') || lower.includes('answer') || lower.includes('stuck')) return PEARL_RESPONSES.hint;
  return PEARL_RESPONSES.default;
}

export default function MessagesApp() {
  const { messages, loadMessages, barkHistory } = usePearlStore();
  const [studentInput, setStudentInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ from: 'student' | 'pearl'; text: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) loadMessages();
  }, [messages.length, loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInput.trim()) return;
    const input = studentInput.trim();
    setStudentInput('');
    setChatLog((prev) => [...prev, { from: 'student', text: input }]);
    setTimeout(() => {
      setChatLog((prev) => [...prev, { from: 'pearl', text: getPearlResponse(input) }]);
    }, 500 + Math.random() * 500);
  };

  const recentBarks = barkHistory.slice(-15).reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Greeting */}
        <div className="mb-6">
          <p className="font-ibm-sans text-sm text-white/70 leading-relaxed">
            Hello, Citizen! This is your direct line to P.E.A.R.L.
            <br />
            Ask anything about your assignments or{' '}
            <span className="text-neon-cyan">approved vocabulary</span>.
          </p>
        </div>

        {/* Broadcast messages */}
        {messages.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 bg-neon-cyan" />
              <span className="font-ibm-mono text-[10px] text-neon-cyan/70 tracking-[0.2em] uppercase">
                Ministry Broadcasts
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto">
              {messages.slice(0, 5).map((msg, i) => (
                <div key={i} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-ibm-mono text-[11px] text-neon-cyan/70 leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bark history */}
        {recentBarks.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 bg-neon-mint" />
              <span className="font-ibm-mono text-[10px] text-neon-mint/60 tracking-[0.2em] uppercase">
                Recent Messages
              </span>
            </div>
            <div className="space-y-2 max-h-32 overflow-auto">
              {recentBarks.map((bark) => (
                <div key={bark.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <span className="font-ibm-mono text-[9px] text-white/30 tracking-wider uppercase">
                    {bark.type}
                  </span>
                  <p className="font-ibm-mono text-[11px] text-white/60 leading-relaxed mt-0.5">
                    {bark.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat log */}
        {chatLog.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-1 bg-neon-cyan" />
              <span className="font-ibm-mono text-[10px] text-neon-cyan/60 tracking-[0.2em] uppercase">
                Conversation
              </span>
            </div>
            <div className="space-y-2">
              {chatLog.map((entry, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-lg border ${
                    entry.from === 'student'
                      ? 'border-neon-cyan/20 text-neon-cyan/80 ml-8'
                      : 'border-neon-mint/20 text-neon-mint/70 mr-8'
                  }`}
                >
                  <span className="font-ibm-mono text-[9px] tracking-wider uppercase block mb-1 opacity-50">
                    {entry.from === 'student' ? 'YOU' : 'P.E.A.R.L.'}
                  </span>
                  <p className="font-ibm-mono text-sm leading-relaxed">{entry.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 px-4 py-3 flex items-center gap-2">
        <span className="font-ibm-mono text-xs text-white/50 flex-shrink-0">
          ASK PEARL {'\u25B8'}
        </span>
        <input
          type="text"
          value={studentInput}
          onChange={(e) => setStudentInput(e.target.value)}
          placeholder="type your question..."
          className="ios-glass-input flex-1 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="font-ibm-mono text-xs text-white/50 hover:text-neon-cyan transition-colors px-3"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
