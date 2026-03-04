import { useMessagingStore } from '../../stores/messagingStore';

const CHARACTER_COLORS: Record<string, string> = {
  'Betty': 'border-neon-mint/40',
  'Ivan': 'border-neon-cyan/40',
  'M.K.': 'border-terminal-amber/40',
  'Chad': 'border-violet-400/40',
};

export default function MessageNotification() {
  const activeNotification = useMessagingStore((s) => s.activeNotification);
  const openPanel = useMessagingStore((s) => s.openPanel);
  const selectMessage = useMessagingStore((s) => s.selectMessage);
  const dismissNotification = useMessagingStore((s) => s.dismissNotification);

  if (!activeNotification) return null;

  const msg = activeNotification.message;
  const borderColor = CHARACTER_COLORS[msg.characterName] || 'border-white/20';
  const firstLine = msg.messageText.length > 80
    ? msg.messageText.slice(0, 80) + '...'
    : msg.messageText;

  return (
    <div className="fixed top-16 right-4 z-[35] animate-slideInRight">
      <div className={`ios-glass-card border-l-2 ${borderColor} p-3 max-w-[280px] relative`}>
        {/* X dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissNotification();
          }}
          className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors text-white/30 hover:text-white/60"
          aria-label="Dismiss notification"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l6 6M7 1l-6 6" />
          </svg>
        </button>

        {/* Click body to open messages panel */}
        <button
          onClick={() => {
            dismissNotification();
            selectMessage(msg.id);
            openPanel();
          }}
          className="text-left w-full hover:bg-white/5 transition-colors cursor-pointer rounded"
        >
          <div className="flex items-center gap-2 mb-1 pr-4">
            <span className="font-special-elite text-xs text-white/70">
              {msg.characterName}
            </span>
            {msg.designation && (
              <span className="font-ibm-mono text-[8px] text-white/30 tracking-wider">
                {msg.designation}
              </span>
            )}
          </div>
          <p className="font-ibm-mono text-[11px] text-white/50 leading-relaxed">
            {firstLine}
          </p>
        </button>
      </div>
    </div>
  );
}
