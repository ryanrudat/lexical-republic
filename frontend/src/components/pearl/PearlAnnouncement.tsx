import { usePearlStore } from '../../stores/pearlStore';
import type { AnnouncementType } from '../../stores/pearlStore';

const TYPE_STYLES: Record<AnnouncementType, { accent: string; icon: string }> = {
  introduction: { accent: 'border-terminal-green/40', icon: '[ WELCOME ]' },
  story_beat: { accent: 'border-terminal-amber/40', icon: '[ NOTICE ]' },
  disciplinary: { accent: 'border-terminal-red/40', icon: '[ CONCERN ]' },
  shift_transition: { accent: 'border-terminal-green/40', icon: '[ TRANSITION ]' },
};

/**
 * Full-screen PEARL announcement modal.
 * Used ONLY for rare, consequential moments:
 * - Story beats / cliffhangers
 * - First-time introductions
 * - Disciplinary "concern" notices
 * - Shift transitions
 */
export default function PearlAnnouncement() {
  const announcement = usePearlStore(s => s.activeAnnouncement);
  const dismiss = usePearlStore(s => s.dismissAnnouncement);

  if (!announcement) return null;

  const style = TYPE_STYLES[announcement.type];

  const handleDismiss = () => {
    dismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <div
        className={`max-w-md w-full mx-6 glass-card p-8 border-2 ${style.accent}`}
        onClick={e => e.stopPropagation()}
      >
        {/* PEARL header */}
        <div className="text-center mb-6">
          <div className="font-ibm-mono text-[10px] text-terminal-green-dim/60 tracking-[0.4em] uppercase mb-2">
            P.E.A.R.L. {style.icon}
          </div>
          <h2 className="font-special-elite text-xl text-terminal-green tracking-wider text-glow leading-relaxed">
            {announcement.title}
          </h2>
        </div>

        {/* Body */}
        <div className="mb-8">
          <p className="font-ibm-mono text-sm text-terminal-green/80 leading-relaxed text-center">
            {announcement.body}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="w-full py-3 rounded-lg font-ibm-mono text-xs uppercase tracking-[0.25em] border border-terminal-green/40 text-terminal-green hover:bg-terminal-green/10 transition-all"
        >
          {announcement.dismissLabel || 'Acknowledged'}
        </button>
      </div>
    </div>
  );
}
