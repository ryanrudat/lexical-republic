import { useEffect } from 'react';
import { useMessagingStore } from '../../stores/messagingStore';

/**
 * Clarity Minder direct messages (the teacher's in-world channel) BLOCK the
 * screen — a centered, full-overlay message box that overrides everything until
 * the student acknowledges. NPC barks stay in the ambient corner toast
 * (MessageNotification); only `characterName === 'Clarity Minder'` lands here,
 * routed via `messagingStore.clarityAlert`.
 *
 * Mounted at App root (next to RemediationOverlay) so it can appear over any
 * surface — terminal desktop, Office, Harmony, a shift, even another overlay.
 * z-[1200] sits above the Remediation modal (z-[1000]) so a teacher reaching
 * out always wins.
 */
export default function ClarityMinderAlert() {
  const alert = useMessagingStore(s => s.clarityAlert);
  const dismissClarityAlert = useMessagingStore(s => s.dismissClarityAlert);
  const markAsRead = useMessagingStore(s => s.markAsRead);
  const selectConversation = useMessagingStore(s => s.selectConversation);
  const openPanel = useMessagingStore(s => s.openPanel);

  // Suppress the ambient PEARL island + covert spy surfaces while the directive
  // blocks the screen (mirrors compliance-check-active / remediation-active).
  useEffect(() => {
    if (!alert) return;
    document.body.classList.add('clarity-message-active');
    return () => document.body.classList.remove('clarity-message-active');
  }, [alert]);

  if (!alert) return null;

  // The minder's content: the original message plus any teacher follow-ups in
  // the thread. Student replies are omitted here (available via Reply → panel) —
  // this box surfaces what the minder said, not the back-and-forth.
  const teacherEntries = (alert.thread ?? []).filter(e => e.sender === 'teacher');

  const acknowledge = () => {
    if (!alert.isRead) void markAsRead(alert.id);
    dismissClarityAlert();
  };

  const reply = () => {
    if (!alert.isRead) void markAsRead(alert.id);
    dismissClarityAlert();
    selectConversation(alert.characterName);
    openPanel();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-fade-in">
      <div className="clarity-alert-pop w-full max-w-md bg-[#FAF7F0] border border-amber-300 rounded-2xl shadow-2xl overflow-hidden">
        {/* Authority header */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-ibm-mono text-[10px] text-amber-700 tracking-[0.22em] uppercase">
              Priority Transmission
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-special-elite text-base text-amber-900 tracking-wider">
              {alert.characterName}
            </span>
            {alert.designation && (
              <span className="font-ibm-mono text-[9px] text-amber-600 tracking-wider uppercase">
                {alert.designation}
              </span>
            )}
          </div>
        </div>

        {/* Message body */}
        <div className="px-5 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-[#2C3340] leading-relaxed whitespace-pre-wrap">
            {alert.messageText}
          </p>
          {teacherEntries.map((e, i) => (
            <p
              key={i}
              className="text-sm text-[#2C3340] leading-relaxed whitespace-pre-wrap border-l-2 border-amber-200 pl-3"
            >
              {e.text}
            </p>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-[#EDE8DE] flex items-center justify-end gap-2">
          <button
            onClick={reply}
            className="px-4 py-2 rounded-xl text-xs font-medium tracking-wider text-amber-700 border border-amber-300 hover:bg-amber-50 active:scale-[0.98] transition-all"
          >
            Reply
          </button>
          <button
            onClick={acknowledge}
            className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-medium tracking-wider hover:bg-amber-700 active:bg-amber-800 active:scale-[0.98] transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
