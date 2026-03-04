import { useMessagingStore } from '../../stores/messagingStore';

const CHARACTER_COLORS: Record<string, string> = {
  'Betty Lyle': 'border-neon-mint/40',
  'Ivan Petrov': 'border-neon-cyan/40',
  'M.K. Catskil': 'border-terminal-amber/40',
  'Chad Worthington': 'border-violet-400/40',
};

export default function MessageNotification() {
  const activeNotification = useMessagingStore((s) => s.activeNotification);
  const openPanel = useMessagingStore((s) => s.openPanel);
  const dismissNotification = useMessagingStore((s) => s.dismissNotification);

  if (!activeNotification) return null;

  const msg = activeNotification.message;
  const borderColor = CHARACTER_COLORS[msg.characterName] || 'border-white/20';
  const firstLine = msg.messageText.length > 80
    ? msg.messageText.slice(0, 80) + '...'
    : msg.messageText;

  return (
    <div className="fixed top-16 right-4 z-[35] animate-slideInRight">
      <button
        onClick={() => {
          dismissNotification();
          openPanel();
        }}
        className={`ios-glass-card border-l-2 ${borderColor} p-3 max-w-[280px] text-left hover:bg-white/5 transition-colors cursor-pointer`}
      >
        <div className="flex items-center gap-2 mb-1">
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
  );
}
